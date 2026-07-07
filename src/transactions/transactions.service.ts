import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, QueryFailedError } from 'typeorm';

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
import { DuplicateCheckDto } from './dto/duplicate-check.dto';

// PostgreSQL unique-violation SQLSTATE code.
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateTransactionDto,
    userId: string,
    idempotencyKey?: string,
  ): Promise<Transaction> {
    // ── Idempotency check ──────────────────────────────────────────────────
    // Return the existing transaction immediately — no double-processing.
    if (idempotencyKey) {
      const existing = await this.transactionsRepository.findByIdempotencyKey(
        userId,
        idempotencyKey,
      );
      if (existing) return existing;
    }

    const isInTransit = dto.type === TransactionTypeEnum.IN_TRANSIT;

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

    await this.accountsService.findOne(dto.accountId, userId);

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

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const lineItemEntities = preparedItems.map((item) =>
        qr.manager.create(LineItem, item),
      );

      const transaction = qr.manager.create(Transaction, {
        userId,
        accountId: dto.accountId,
        categoryId: transactionCategoryId,
        type: dto.type,
        totalAmount,
        isPersonal: !isInTransit,
        voiceTranscript: dto.voiceTranscript ?? null,
        note: dto.note ?? null,
        entryMethod: dto.entryMethod ?? 'form',
        transactedAt: dto.transactedAt ? new Date(dto.transactedAt) : new Date(),
        lineItems: lineItemEntities,
        idempotencyKey: idempotencyKey ?? null,
      });

      const saved = await qr.manager.save(Transaction, transaction);

      if (dto.type === TransactionTypeEnum.EXPENSE) {
        await qr.manager.decrement(Account, { id: dto.accountId }, 'currentBalance', totalAmount);
      } else if (dto.type === TransactionTypeEnum.INCOME) {
        await qr.manager.increment(Account, { id: dto.accountId }, 'currentBalance', totalAmount);
      }

      await qr.commitTransaction();

      return this.transactionsRepository.findOneWithLineItems(saved.id, userId);
    } catch (err) {
      await qr.rollbackTransaction();

      // Two requests with the same Idempotency-Key arrived simultaneously — the
      // second one hits the unique constraint. Resolve by returning the winner.
      if (
        idempotencyKey &&
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        const winner = await this.transactionsRepository.findByIdempotencyKey(
          userId,
          idempotencyKey,
        );
        if (winner) return winner;
      }

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
    await this.transactionsRepository.findOne({ id, userId } as any);

    await this.transactionsRepository.findOneAndUpdate(
      { id, userId } as any,
      dto as any,
    );

    return this.transactionsRepository.findOneWithLineItems(id, userId);
  }

  // Soft-delete: sets deletedAt and reverses the balance effect, atomically.
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const transaction = await this.transactionsRepository.findOneWithLineItems(id, userId);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      if (transaction.type === TransactionTypeEnum.EXPENSE) {
        await qr.manager.increment(
          Account,
          { id: transaction.accountId },
          'currentBalance',
          Number(transaction.totalAmount),
        );
      } else if (transaction.type === TransactionTypeEnum.INCOME) {
        await qr.manager.decrement(
          Account,
          { id: transaction.accountId },
          'currentBalance',
          Number(transaction.totalAmount),
        );
      }

      await qr.manager.getRepository(Transaction).softDelete({ id, userId });

      await qr.commitTransaction();
      return { message: 'Transaction moved to trash' };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // Restores a soft-deleted transaction and re-applies its balance effect.
  async restore(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOneWithLineItems(
      id,
      userId,
      true, // include soft-deleted
    );
    if (!transaction.deletedAt) {
      throw new BadRequestException('Transaction is not in trash');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Re-apply the original balance effect (inverse of what remove() did).
      if (transaction.type === TransactionTypeEnum.EXPENSE) {
        await qr.manager.decrement(
          Account,
          { id: transaction.accountId },
          'currentBalance',
          Number(transaction.totalAmount),
        );
      } else if (transaction.type === TransactionTypeEnum.INCOME) {
        await qr.manager.increment(
          Account,
          { id: transaction.accountId },
          'currentBalance',
          Number(transaction.totalAmount),
        );
      }

      await qr.manager.getRepository(Transaction).restore({ id, userId });

      await qr.commitTransaction();
      return this.transactionsRepository.findOneWithLineItems(id, userId);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // Lists soft-deleted transactions for the user (paginated).
  async findTrash(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.transactionsRepository.findTrash(userId, { skip, take: limit });

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

  // Hard-deletes a row that is already in the trash. Line items cascade via DB FK.
  // Does NOT touch account balance — it was already reversed when the row was trashed.
  async permanentDelete(id: string, userId: string): Promise<{ message: string }> {
    const transaction = await this.transactionsRepository.findOneWithLineItems(
      id,
      userId,
      true,
    );
    if (!transaction.deletedAt) {
      throw new BadRequestException(
        'Transaction must be moved to trash before permanent deletion',
      );
    }

    // Hard delete — the existing DB CASCADE on line_items handles child rows.
    await this.transactionsRepository.entityRepository.delete({ id, userId });

    return { message: 'Transaction permanently deleted' };
  }

  // Advisory duplicate check — never blocks creation.
  async duplicateCheck(
    dto: DuplicateCheckDto,
    userId: string,
  ): Promise<{ likelyDuplicate: boolean; match?: Partial<Transaction> }> {
    const withinMs = (dto.withinMinutes ?? 10) * 60 * 1000;
    const since = new Date(Date.now() - withinMs);

    const match = await this.transactionsRepository.findDuplicateCandidate(
      userId,
      dto.accountId,
      dto.amount,
      since,
    );

    if (!match) return { likelyDuplicate: false };

    return {
      likelyDuplicate: true,
      match: {
        id: match.id,
        totalAmount: match.totalAmount,
        type: match.type,
        transactedAt: match.transactedAt,
        accountId: match.accountId,
        note: match.note,
      },
    };
  }

  // Runs daily at 03:00 — purges transactions trashed more than 30 days ago.
  // Hard-deletes so line items cascade at the DB level.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldTrash(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await this.transactionsRepository.entityRepository
      .createQueryBuilder()
      .delete()
      .from(Transaction)
      .where('"deletedAt" IS NOT NULL')
      .andWhere('"deletedAt" < :cutoff', { cutoff })
      .execute();

    this.logger.log(`purgeOldTrash: permanently removed ${result.affected ?? 0} trashed transaction(s)`);
  }

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
