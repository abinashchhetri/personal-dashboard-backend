import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentRequest } from '../entities/payment-request.entity';
import { PaymentStatusEnum } from '../enums/payment-status.enum';
import { SolanaPayService } from './solana-pay.service';
// Import existing entities directly (no module import to avoid circular deps)
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { TransactionTypeEnum } from 'src/transactions/enums/transaction-type.enum';
import { LineItem } from 'src/transactions/entities/line-item.entity';
import { Account } from 'src/accounts/entities/account.entity';

@Injectable()
export class SolanaPayAutoLogService {
  private readonly logger = new Logger(SolanaPayAutoLogService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly solanaPayService: SolanaPayService,
  ) {}

  async autoLogPayment(request: PaymentRequest, userId: string): Promise<void> {
    // Guard: only log CONFIRMED payments that haven't been logged yet
    if (request.status !== PaymentStatusEnum.CONFIRMED) return;
    if (request.autoLoggedTransactionId) return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the target account — use provided accountId or first active account
      let accountId = request.accountId;
      if (!accountId) {
        const defaultAccount = await queryRunner.manager.findOne(Account, {
          where: { userId, isDefault: true, isArchived: false },
        });
        if (!defaultAccount) {
          const anyAccount = await queryRunner.manager.findOne(Account, {
            where: { userId, isArchived: false },
          });
          accountId = anyAccount?.id || null;
        } else {
          accountId = defaultAccount.id;
        }
      }

      if (!accountId) {
        this.logger.warn(`No account found to auto-log payment ${request.id}`);
        return;
      }

      // Create income transaction
      // Note: USDC amount used directly as NPR equivalent for demo purposes
      // In production: fetch live USDC/NPR exchange rate
      const amountNPR = parseFloat(request.amountUsdc.toString());

      const transaction = queryRunner.manager.create(Transaction, {
        userId,
        accountId,
        type: TransactionTypeEnum.INCOME,
        totalAmount: amountNPR,
        isPersonal: true,
        entryMethod: 'solana_pay',
        note: `Solana Pay: ${request.label || 'USDC Payment'} | TX: ${request.transactionSignature?.slice(0, 8)}...`,
        transactedAt: request.confirmedAt || new Date(),
      } as any);
      const savedTransaction = await queryRunner.manager.save(transaction);

      // Create line item (required for income transactions)
      const lineItem = queryRunner.manager.create(LineItem, {
        transactionId: savedTransaction.id,
        name: request.label || 'USDC Payment',
        amount: amountNPR,
        categoryId: null,
      });
      await queryRunner.manager.save(lineItem);

      // Increment account balance
      await queryRunner.manager.increment(
        Account,
        { id: accountId },
        'currentBalance',
        amountNPR,
      );

      await queryRunner.commitTransaction();

      // Mark as logged
      await this.solanaPayService.markAutoLogged(request.id, savedTransaction.id);

      this.logger.log(
        `Auto-logged Solana Pay payment ${request.id} as transaction ${savedTransaction.id}`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      const errMessage =
        err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Auto-log failed for payment ${request.id}: ${errMessage}`,
      );
      // Don't rethrow — auto-log failure should not crash the API
    } finally {
      await queryRunner.release();
    }
  }
}
