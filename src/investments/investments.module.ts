import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Investment } from './entities/investment.entity';
import { InvestmentHistory } from './entities/investment-history.entity';
import { InvestmentTransaction } from './entities/investment-transaction.entity';
import { InvestmentsController } from './investments.controller';
import { InvestmentsRepository } from './repositories/investments.repository';
import { InvestmentTransactionsRepository } from './repositories/investment-transactions.repository';
import { InvestmentsService } from './investments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Investment, InvestmentHistory, InvestmentTransaction])],
  controllers: [InvestmentsController],
  providers: [InvestmentsService, InvestmentsRepository, InvestmentTransactionsRepository],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
