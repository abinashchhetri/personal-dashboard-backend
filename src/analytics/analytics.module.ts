import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Transaction } from 'src/transactions/entities/transaction.entity';
import { LineItem } from 'src/transactions/entities/line-item.entity';
import { Account } from 'src/accounts/entities/account.entity';
import { Investment } from 'src/investments/entities/investment.entity';
import { AccountsModule } from 'src/accounts/accounts.module';
import { InvestmentsModule } from 'src/investments/investments.module';
import { TransactionsModule } from 'src/transactions/transactions.module';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    // Register all four entities so @InjectRepository() resolves within this module.
    TypeOrmModule.forFeature([Transaction, LineItem, Account, Investment]),
    TransactionsModule,
    AccountsModule,
    InvestmentsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
