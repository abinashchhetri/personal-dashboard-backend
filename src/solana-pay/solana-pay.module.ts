import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentRequest } from './entities/payment-request.entity';
import { SolanaPayService } from './services/solana-pay.service';
import { SolanaPayAutoLogService } from './services/solana-pay-auto-log.service';
import { SolanaPayController } from './solana-pay.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentRequest]), ConfigModule],
  controllers: [SolanaPayController],
  providers: [SolanaPayService, SolanaPayAutoLogService],
  exports: [SolanaPayService],
})
export class SolanaPayModule {}
