import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountsModule } from 'src/accounts/accounts.module';
import { CategoriesModule } from 'src/categories/categories.module';

import { Transaction } from './entities/transaction.entity';
import { LineItem } from './entities/line-item.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './repositories/transactions.repository';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, LineItem]),
    AccountsModule,
    CategoriesModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
  exports: [TransactionsService],
})
export class TransactionsModule {}
