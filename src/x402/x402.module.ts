import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { X402Quote } from './entities/x402-quote.entity';
import { X402Payment } from './entities/x402-payment.entity';
import { X402Service } from './services/x402.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { OwnerResolverService } from './services/owner-resolver.service';
import { X402ExceptionFilter } from './filters/x402-exception.filter';
import { X402PaymentGuard } from './guards/x402-payment.guard';
import { X402Controller } from './x402.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([X402Quote, X402Payment]),
    ConfigModule,
  ],
  controllers: [X402Controller],
  providers: [
    X402Service,
    PlanGenerationService,
    OwnerResolverService,
    X402ExceptionFilter,
    X402PaymentGuard,
  ],
  exports: [X402Service, PlanGenerationService, OwnerResolverService, X402PaymentGuard],
})
export class X402Module {}
