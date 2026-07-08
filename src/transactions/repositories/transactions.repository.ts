import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { Transaction } from '../entities/transaction.entity';
import { FindAllTransactionsDto } from '../dto/find-all-transactions.dto';

@Injectable()
export class TransactionsRepository extends AbstractRepository<Transaction> {
  protected readonly logger = new Logger(TransactionsRepository.name);

  constructor(
    @InjectRepository(Transaction)
    entityRepository: Repository<Transaction>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findAllForUser(
    userId: string,
    filters: FindAllTransactionsDto,
    pagination: { skip: number; take: number },
  ): Promise<[Transaction[], number]> {
    const { accountId, type, categoryId, isPersonal, startDate, endDate } = filters;

    const qb = this.entityRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.lineItems', 'lineItem')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId })
      // Exclude soft-deleted rows from the main list.
      .andWhere('transaction.deletedAt IS NULL');

    if (accountId) {
      qb.andWhere('transaction.accountId = :accountId', { accountId });
    }
    if (type) {
      qb.andWhere('transaction.type = :type', { type });
    }
    if (categoryId) {
      qb.andWhere('transaction.categoryId = :categoryId', { categoryId });
    }
    if (isPersonal !== undefined) {
      qb.andWhere('transaction.isPersonal = :isPersonal', { isPersonal });
    }
    if (startDate) {
      qb.andWhere('transaction.transactedAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('transaction.transactedAt <= :endDate', { endDate });
    }

    return qb
      .orderBy('transaction.transactedAt', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }

  // withDeleted=true is required when loading a soft-deleted row (restore / permanent-delete).
  async findOneWithLineItems(
    id: string,
    userId: string,
    withDeleted = false,
  ): Promise<Transaction> {
    let qb = this.entityRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.lineItems', 'lineItem')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.id = :id', { id })
      .andWhere('transaction.userId = :userId', { userId });

    if (withDeleted) {
      qb = qb.withDeleted();
    } else {
      qb = qb.andWhere('transaction.deletedAt IS NULL');
    }

    const transaction = await qb.getOne();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  // Returns null instead of throwing — used by the idempotency check.
  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Transaction | null> {
    return this.entityRepository.findOne({ where: { userId, idempotencyKey } });
  }

  // Returns the most recent same-account + same-amount transaction within the window.
  // Scoped to userId and excludes soft-deleted rows.
  async findDuplicateCandidate(
    userId: string,
    accountId: string,
    amount: number,
    since: Date,
  ): Promise<Transaction | null> {
    return this.entityRepository
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .andWhere('t.accountId = :accountId', { accountId })
      .andWhere('t.totalAmount = :amount', { amount })
      .andWhere('t.transactedAt >= :since', { since })
      .andWhere('t.deletedAt IS NULL')
      .orderBy('t.transactedAt', 'DESC')
      .getOne();
  }

  // Lists soft-deleted rows for the user — reverse-chronological by deletedAt.
  async findTrash(
    userId: string,
    pagination: { skip: number; take: number },
  ): Promise<[Transaction[], number]> {
    return this.entityRepository
      .createQueryBuilder('transaction')
      .withDeleted()
      .leftJoinAndSelect('transaction.lineItems', 'lineItem')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.deletedAt IS NOT NULL')
      .orderBy('transaction.deletedAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }
}
