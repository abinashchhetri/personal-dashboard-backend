import { Injectable, Logger } from '@nestjs/common';
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
      .where('transaction.userId = :userId', { userId });

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

  async findOneWithLineItems(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.entityRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.lineItems', 'lineItem')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.id = :id', { id })
      .andWhere('transaction.userId = :userId', { userId })
      .getOne();

    if (!transaction) {
      this.logger.warn('Transaction not found', { id, userId });
      // Reuse base findOne to throw NotFoundException with the standard message.
      return this.findOne({ id, userId } as any);
    }

    return transaction;
  }
}
