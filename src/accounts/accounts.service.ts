// src/accounts/accounts.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// AccountsService
// ─────────────────────────────────────────────────────────────────────────────
// All business logic for the accounts domain.
// Balance mutation (increment/decrement) is the transactions module's job —
// this service only manages account metadata and the default-account invariant.
// ─────────────────────────────────────────────────────────────────────────────

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Account } from './entities/account.entity';
import { AccountsRepository } from './repositories/accounts.repository';
import { CreateAccountDto } from './dto/create-account.dto';
import { FindAllAccountsDto } from './dto/find-all-accounts.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateAccountDto, userId: string): Promise<Account> {
    const initialBalance = dto.initialBalance ?? 0;

    if (!dto.isDefault) {
      return this.accountsRepository.createAccount({
        userId,
        type: dto.type,
        name: dto.name,
        initialBalance,
        currentBalance: initialBalance,
        isDefault: false,
        isArchived: false,
      });
    }

    // Atomically unset the existing default then create the new one.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        Account,
        { userId, isDefault: true },
        { isDefault: false },
      );

      const account = queryRunner.manager.create(Account, {
        userId,
        type: dto.type,
        name: dto.name,
        initialBalance,
        currentBalance: initialBalance,
        isDefault: true,
        isArchived: false,
      });
      const saved = await queryRunner.manager.save(account);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(dto: FindAllAccountsDto, userId: string) {
    const { page = 1, limit = 10, type, includeArchived } = dto;

    const [data, total] = await this.accountsRepository.findAllByUser(userId, {
      type,
      includeArchived,
      page,
      limit,
    });

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

  async findOne(id: string, userId: string): Promise<Account> {
    // Passing userId here scopes the lookup to the current user —
    // findOne throws NotFoundException if no matching row exists.
    return this.accountsRepository.findOne({ id, userId } as any);
  }

  async update(
    id: string,
    dto: UpdateAccountDto,
    userId: string,
  ): Promise<Account> {
    // Confirm ownership before touching data.
    await this.accountsRepository.findOne({ id, userId } as any);

    if (!dto.isDefault) {
      await this.accountsRepository.findOneAndUpdate(
        { id, userId } as any,
        dto as any,
      );
      return this.accountsRepository.findOne({ id } as any);
    }

    // Atomically unset the existing default then mark this account as default.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        Account,
        { userId, isDefault: true },
        { isDefault: false },
      );
      await queryRunner.manager.update(Account, { id }, dto);
      await queryRunner.commitTransaction();
      return this.accountsRepository.findOne({ id } as any);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.accountsRepository.findOne({ id, userId } as any);

    // TODO (Step 7 — Transactions module): before deleting, check whether any
    // transaction references this accountId. If so, throw:
    //   throw new BadRequestException(
    //     'Cannot delete an account with transaction history. Archive it instead.',
    //   );

    await this.accountsRepository.findOneAndDelete({ id, userId } as any);
    return { message: 'Account deleted successfully' };
  }
}
