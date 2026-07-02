// src/accounts/accounts.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// AccountsModule
// ─────────────────────────────────────────────────────────────────────────────
// Owns all account domain logic.
// Exports AccountsService so the future TransactionsModule can call
// incrementBalance / decrementBalance without touching the repository directly.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from './entities/account.entity';
import { AccountsController } from './accounts.controller';
import { AccountsRepository } from './repositories/accounts.repository';
import { AccountsService } from './accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepository],
  exports: [AccountsService],
})
export class AccountsModule {}
