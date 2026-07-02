// src/accounts/repositories/accounts.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// AccountsRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the Account entity.
// incrementBalance / decrementBalance use SQL arithmetic for atomic updates —
// never read-modify-write, which would race under concurrent transactions.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { Account } from '../entities/account.entity';
import { AccountTypeEnum } from '../enums/account-type.enum';

@Injectable()
export class AccountsRepository extends AbstractRepository<Account> {
  protected readonly logger = new Logger(AccountsRepository.name);

  constructor(
    @InjectRepository(Account)
    entityRepository: Repository<Account>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async createAccount(data: {
    userId: string;
    type: AccountTypeEnum;
    name: string;
    initialBalance: number;
    currentBalance: number;
    isDefault: boolean;
    isArchived: boolean;
  }): Promise<Account> {
    const account = this.entityRepository.create(data);
    return this.entityRepository.save(account);
  }

  async findAllByUser(
    userId: string,
    filters: {
      type?: AccountTypeEnum;
      includeArchived?: boolean;
      page: number;
      limit: number;
    },
  ): Promise<[Account[], number]> {
    const qb = this.entityRepository
      .createQueryBuilder('account')
      .where('account.userId = :userId', { userId });

    if (filters.type) {
      qb.andWhere('account.type = :type', { type: filters.type });
    }

    if (!filters.includeArchived) {
      qb.andWhere('account.isArchived = false');
    }

    return qb
      .orderBy('account.isDefault', 'DESC')
      .addOrderBy('account.createdAt', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();
  }

  async findDefaultForUser(userId: string): Promise<Account | null> {
    return this.entityRepository.findOne({ where: { userId, isDefault: true } });
  }

  async incrementBalance(accountId: string, amount: number): Promise<void> {
    await this.entityRepository.increment({ id: accountId }, 'currentBalance', amount);
  }

  async decrementBalance(accountId: string, amount: number): Promise<void> {
    await this.entityRepository.decrement({ id: accountId }, 'currentBalance', amount);
  }
}
