import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Account } from 'src/accounts/entities/account.entity';
import { TransfersRepository } from './repositories/transfers.repository';
import { Transfer } from './entities/transfer.entity';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { FindAllTransfersDto } from './dto/find-all-transfers.dto';

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTransferDto, userId: string): Promise<Transfer> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException(
        'fromAccountId and toAccountId must be different accounts',
      );
    }

    // Verify both accounts exist and belong to this user before opening a
    // transaction — throws 404/403 immediately so the QueryRunner never opens.
    await Promise.all([
      this.assertOwnership(dto.fromAccountId, userId),
      this.assertOwnership(dto.toAccountId, userId),
    ]);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Re-fetch the source account inside the transaction with a pessimistic_read
      // lock so two concurrent transfers cannot both pass the balance check before
      // either write lands — without the lock, two 500-unit transfers against a
      // 600-unit balance can both read 600 and both succeed.
      const fromAccount = await qr.manager.findOne(Account, {
        where: { id: dto.fromAccountId, userId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!fromAccount) throw new NotFoundException('Source account not found');

      // TypeORM decimal columns arrive as strings from PostgreSQL even when a
      // transformer is defined — raw QueryRunner reads bypass the entity transformer.
      // Always parseFloat() before comparing. String comparison ("9" > "10") is
      // lexicographic and returns true, silently passing an underfunded transfer.
      const availableBalance = parseFloat(fromAccount.currentBalance.toString());
      const transferAmount = parseFloat(dto.amount.toString());

      if (availableBalance < transferAmount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${availableBalance.toFixed(2)}, Required: ${transferAmount.toFixed(2)}`,
        );
      }

      // Decrement source, increment destination — both on the same connection.
      await qr.manager.decrement(
        Account,
        { id: dto.fromAccountId },
        'currentBalance',
        dto.amount,
      );
      await qr.manager.increment(
        Account,
        { id: dto.toAccountId },
        'currentBalance',
        dto.amount,
      );

      const transfer = qr.manager.create(Transfer, {
        userId,
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amount: dto.amount,
        note: dto.note ?? null,
        transactedAt: dto.transactedAt ? new Date(dto.transactedAt) : new Date(),
      });
      const saved = await qr.manager.save(Transfer, transfer);

      await qr.commitTransaction();

      // Reload with account relations for the response.
      return this.transfersRepository.findOne({ id: saved.id } as any);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async findAll(dto: FindAllTransfersDto, userId: string) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.transfersRepository.findAllForUser(
      userId,
      dto,
      { skip, take: limit },
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  async findOne(id: string, userId: string): Promise<Transfer> {
    return this.transfersRepository.findOne({ id, userId } as any);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const transfer = await this.transfersRepository.findOne({ id, userId } as any);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Reverse: re-credit the source and re-debit the destination.
      await qr.manager.increment(
        Account,
        { id: transfer.fromAccountId },
        'currentBalance',
        Number(transfer.amount),
      );
      await qr.manager.decrement(
        Account,
        { id: transfer.toAccountId },
        'currentBalance',
        Number(transfer.amount),
      );

      await qr.manager.delete(Transfer, { id, userId });

      await qr.commitTransaction();
      return { message: 'Transfer deleted successfully' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // Fetches the account by id alone, then checks ownership explicitly so we can
  // throw ForbiddenException (not NotFoundException) when the account belongs to
  // a different user — preventing account-existence information leakage.
  private async assertOwnership(accountId: string, userId: string): Promise<Account> {
    const account = await this.dataSource
      .getRepository(Account)
      .findOne({ where: { id: accountId } });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }
    if (account.userId !== userId) {
      throw new ForbiddenException(
        `Account ${accountId} does not belong to you`,
      );
    }

    return account;
  }
}
