import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { X402Service } from '../services/x402.service';
import { OwnerResolverService } from '../services/owner-resolver.service';
import { PaymentRequiredException } from '../exceptions/payment-required.exception';
import { X402PaymentHeaderDto } from '../dto/x402-header.dto';

@Injectable()
export class X402PaymentGuard implements CanActivate {
  private readonly logger = new Logger(X402PaymentGuard.name);

  constructor(
    private readonly x402Service: X402Service,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Resolve the data owner (from env var or first user in DB)
    const dataOwnerId = await this.ownerResolver.getOwnerId();

    const paymentHeader = request.headers['x-payment'] as string | undefined;

    // ── No payment header → issue fresh 402 challenge ─────────────────────
    if (!paymentHeader) {
      const quote = await this.x402Service.issueQuote(dataOwnerId);
      throw this.buildChallenge(quote);
    }

    // ── Parse and validate the header ────────────────────────────────────
    let headerDto: X402PaymentHeaderDto;
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const json = JSON.parse(decoded);
      headerDto = plainToInstance(X402PaymentHeaderDto, json);
      const errors = await validate(headerDto);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }
    } catch (err) {
      throw new BadRequestException(
        `Malformed X-PAYMENT header: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // ── Verify the payment on-chain ──────────────────────────────────────
    try {
      const verified = await this.x402Service.verifyPayment(dataOwnerId, {
        quoteId: headerDto.quoteId,
        signature: headerDto.signature,
      });
      request.x402 = verified;
      this.logger.log(
        `✅ X402 payment verified: quote=${verified.quoteId}, sig=${verified.signature.substring(0, 8)}...`,
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Payment verification failed: ${message}`);

      // If verification fails, issue a fresh quote for retry
      const quote = await this.x402Service.issueQuote(dataOwnerId);
      throw this.buildChallenge(quote);
    }
  }


  private buildChallenge(quote: {
    quoteId: string;
    referencePublicKey: string;
    expiresAt: Date;
  }) {
    const challenge = {
      x402Version: 1,
      error: 'Payment required',
      accepts: [
        {
          scheme: 'exact',
          network: 'solana-devnet',
          resource: 'https://api.abinashchhetri.com.np/api/v1/x402/plans/generate',
          description:
            'AI-generated personalized 7-day workout + meal plan based on your 90-day fitness and nutrition history',
          mimeType: 'application/json',
          payTo: process.env.X402_PAY_TO,
          asset: process.env.X402_USDC_MINT,
          maxAmountRequired: process.env.X402_PRICE_BASE_UNITS || '10000',
          maxTimeoutSeconds: parseInt(
            process.env.X402_QUOTE_TTL_SECONDS || '600',
          ),
          extra: {
            quoteId: quote.quoteId,
            memo: `x402:${quote.quoteId}`,
            decimals: 6,
            flow: 'signature-presentation',
            instructions:
              'Send an SPL transfer of maxAmountRequired base units of the specified asset (0.01 USDC) to payTo, ' +
              'attach a Memo instruction containing the memo value, await confirmed, then retry this request with ' +
              'header X-PAYMENT: base64(JSON{quoteId, signature}).',
          },
        },
      ],
    };

    return new PaymentRequiredException(challenge);
  }
}

// Type augmentation for Express Request to hold x402 data
declare global {
  namespace Express {
    interface Request {
      x402?: {
        quoteId: string;
        signature: string;
        settledAt: Date;
      };
    }
  }
}
