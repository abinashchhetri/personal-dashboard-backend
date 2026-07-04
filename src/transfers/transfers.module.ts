import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountsModule } from 'src/accounts/accounts.module';
import { OnboardingGuard } from 'src/common/guards';

import { Transfer } from './entities/transfer.entity';
import { TransfersController } from './transfers.controller';
import { TransfersRepository } from './repositories/transfers.repository';
import { TransfersService } from './transfers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transfer]),
    AccountsModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService, TransfersRepository, OnboardingGuard],
  exports: [TransfersService],
})
export class TransfersModule {}
