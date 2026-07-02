import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountsService } from 'src/accounts/accounts.service';
import { Account } from 'src/accounts/entities/account.entity';
import { CategoriesService } from 'src/categories/categories.service';
import { TransactionsRepository } from './repositories/transactions.repository';
import { Transaction } from './entities/transaction.entity';
import { LineItem } from './entities/line-item.entity';
import { TransactionTypeEnum } from './enums/transaction-type.enum';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindAllTransactionsDto } from './dto/find-all-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTransactionDto, userId: string): Promise<Transaction> {
    const isInTransit = dto.type === TransactionTypeEnum.IN_TRANSIT;

    // Type-specific input validation before we touch the DB.
    if (!isInTransit && (!dto.lineItems || dto.lineItems.length === 0)) {
      throw new BadRequestException(
        'lineItems are required for expense and income transactions',
      );
    }
    if (isInTransit && (dto.totalAmount == null || dto.totalAmount <= 0)) {
      throw new BadRequestException(
        'totalAmount is required for in_transit transactions',
      );
    }

    // Verify the account belongs to this user (throws NotFoundException if not).
    await this.accountsService.findOne(dto.accountId, userId);

    // ── Auto-categorization ────────────────────────────────────────────────────
    // Performed BEFORE opening the QueryRunner so we don't hold a DB transaction
    // open during external/async I/O.
    let totalAmount: number;
    let preparedItems: Array<{ name: string; amount: number; categoryId: string | null }> = [];
    let transactionCategoryId: string | null = null;

    if (!isInTransit) {
      preparedItems = await Promise.all(
        dto.lineItems!.map(async (item) => {
          const cat = await this.categoriesService.detectCategory(item.name, userId);
          return { name: item.name, amount: item.amount, categoryId: cat?.id ?? null };
        }),
      );

      totalAmount = Math.round(
        preparedItems.reduce((sum, item) => sum + item.amount, 0) * 100,
      ) / 100;

      transactionCategoryId = this.pickModeCategory(
        preparedItems.map((i) => i.categoryId),
      );
    } else {
      totalAmount = dto.totalAmount!;
    }

    // ── QueryRunner transaction ────────────────────────────────────────────────
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Build line item entities inside the QueryRunner's EntityManager so that
      // the cascade save is part of the same connection/transaction.
      const lineItemEntities = preparedItems.map((item) =>
        qr.manager.create(LineItem, item),
      );

      const transaction = qr.manager.create(Transaction, {
        userId,
        accountId: dto.accountId,
        categoryId: transactionCategoryId,
        type: dto.type,
        totalAmount,
        // in_transit transactions are never personal; expense/income always are.
        isPersonal: !isInTransit,
        voiceTranscript: dto.voiceTranscript ?? null,
        note: dto.note ?? null,
        entryMethod: dto.entryMethod ?? 'form',
        transactedAt: dto.transactedAt ? new Date(dto.transactedAt) : new Date(),
        lineItems: lineItemEntities,
      });

      // cascade:true on the OneToMany saves line items via the same QueryRunner.
      const saved = await qr.manager.save(Transaction, transaction);

      // Atomic balance update — operates on the same DB connection as the insert.
      if (dto.type === TransactionTypeEnum.EXPENSE) {
        await qr.manager.decrement(Account, { id: dto.accountId }, 'currentBalance', totalAmount);
      } else if (dto.type === TransactionTypeEnum.INCOME) {
        await qr.manager.increment(Account, { id: dto.accountId }, 'currentBalance', totalAmount);
      }
      // IN_TRANSIT: no balance change.

      await qr.commitTransaction();

      // Reload with relations so the response includes lineItems and category.
      return this.transactionsRepository.findOneWithLineItems(saved.id, userId);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async findAll(dto: FindAllTransactionsDto, userId: string) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionsRepository.findAllForUser(
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

  async findOne(id: string, userId: string): Promise<Transaction> {
    return this.transactionsRepository.findOneWithLineItems(id, userId);
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    userId: string,
  ): Promise<Transaction> {
    // findOne scopes by userId — throws if not found or not owned.
    await this.transactionsRepository.findOne({ id, userId } as any);

    await this.transactionsRepository.findOneAndUpdate(
      { id, userId } as any,
      dto as any,
    );

    return this.transactionsRepository.findOneWithLineItems(id, userId);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Load first so we know the type/totalAmount for balance reversal.
    const transaction = await this.transactionsRepository.findOneWithLineItems(id, userId);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Reverse the original balance effect atomically.
      if (transaction.type === TransactionTypeEnum.EXPENSE) {
        // Was decremented on create → re-increment to restore.
        await qr.manager.increment(
          Account,
          { id: transaction.accountId },
          'currentBalance',
          Number(transaction.totalAmount),
        );
      } else if (transaction.type === TransactionTypeEnum.INCOME) {
        // Was incremented on create → re-decrement to restore.
        await qr.manager.decrement(
          Account,
          { id: transaction.accountId },
          'currentBalance',
          Number(transaction.totalAmount),
        );
      }
      // IN_TRANSIT: no balance was changed, nothing to reverse.

      // Deleting the transaction row triggers the DB-level CASCADE on line_items.
      await qr.manager.delete(Transaction, { id, userId });

      await qr.commitTransaction();
      return { message: 'Transaction deleted successfully' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // Returns the most-frequent non-null category ID among line items.
  // First occurrence wins on a tie (preserves insertion order).
  private pickModeCategory(categoryIds: (string | null)[]): string | null {
    const freq = new Map<string, number>();
    let mode: string | null = null;
    let maxCount = 0;

    for (const id of categoryIds) {
      if (!id) continue;
      const count = (freq.get(id) ?? 0) + 1;
      freq.set(id, count);
      if (count > maxCount) {
        maxCount = count;
        mode = id;
      }
    }

    return mode;
  }
}
