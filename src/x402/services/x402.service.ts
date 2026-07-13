import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

import { X402Quote } from '../entities/x402-quote.entity';
import { X402Payment } from '../entities/x402-payment.entity';
import { PaymentStatusEnum } from '../enums/payment-status.enum';

@Injectable()
export class X402Service {
  private readonly logger = new Logger(X402Service.name);
  private readonly connection: Connection;
  private readonly payToWallet: PublicKey;
  private readonly usdcMint: PublicKey;
  private readonly priceBaseUnits: number;
  private readonly quoteTtlSeconds: number;

  constructor(
    @InjectRepository(X402Quote)
    private readonly quoteRepo: Repository<X402Quote>,
    @InjectRepository(X402Payment)
    private readonly paymentRepo: Repository<X402Payment>,
    private readonly configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL') ||
      'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    this.payToWallet = new PublicKey(
      this.configService.get<string>('X402_PAY_TO')!,
    );
    this.usdcMint = new PublicKey(
      this.configService.get<string>('X402_USDC_MINT')!,
    );
    this.priceBaseUnits = parseInt(
      this.configService.get<string>('X402_PRICE_BASE_UNITS') || '10000',
    );
    this.quoteTtlSeconds = parseInt(
      this.configService.get<string>('X402_QUOTE_TTL_SECONDS') || '600',
    );

    this.logger.log(
      `X402Service initialized: payTo=${this.payToWallet}, price=${this.priceBaseUnits} base units`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // ISSUE QUOTE
  // ─────────────────────────────────────────────────────────────────────

  async issueQuote(
    dataOwnerId: string,
  ): Promise<{
    quoteId: string;
    referencePublicKey: string;
    expiresAt: Date;
  }> {
    const referenceKeypair = Keypair.generate();
    const referencePublicKey = referenceKeypair.publicKey;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.quoteTtlSeconds);

    const quote = this.quoteRepo.create({
      dataOwnerId,
      status: PaymentStatusEnum.ISSUED,
      referencePublicKey: referencePublicKey.toBase58(),
      expiresAt,
    });

    await this.quoteRepo.save(quote);

    this.logger.log(
      `Quote issued: ${quote.id} for dataOwner ${dataOwnerId}, expires ${expiresAt.toISOString()}`,
    );

    return {
      quoteId: quote.id,
      referencePublicKey: referencePublicKey.toBase58(),
      expiresAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // VERIFY PAYMENT (10-point check)
  // ─────────────────────────────────────────────────────────────────────

  async verifyPayment(
    dataOwnerId: string,
    dto: {
      quoteId: string;
      signature: string;
    },
  ): Promise<{
    quoteId: string;
    signature: string;
    settledAt: Date;
  }> {
    const { quoteId, signature } = dto;

    // ─── CHECK 1: Quote exists ──────────────────────────────────────────
    const quote = await this.quoteRepo.findOne({ where: { id: quoteId } });
    if (!quote) {
      throw new BadRequestException(`Quote not found: ${quoteId}`);
    }

    // ─── CHECK 2: Quote not expired ──────────────────────────────────────
    if (new Date() > quote.expiresAt) {
      throw new BadRequestException(`Quote expired: ${quoteId}`);
    }

    // ─── CHECK 3: Quote not already paid ────────────────────────────────
    if (quote.status === PaymentStatusEnum.PAID) {
      throw new BadRequestException(
        `Quote already paid: ${quoteId}`,
      );
    }

    // ─── CHECK 4: Signature not replayed (unique constraint on payment) ──
    const existing = await this.paymentRepo.findOne({
      where: { transactionSignature: signature },
    });
    if (existing) {
      throw new ConflictException(
        `Signature already used: ${signature}`,
      );
    }

    const referencePublicKey = new PublicKey(quote.referencePublicKey);

    try {
      // ─── CHECK 5: Transaction exists on-chain ─────────────────────────
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
      });
      if (!tx) {
        throw new BadRequestException(
          `Transaction not found on-chain: ${signature}`,
        );
      }

      // ─── CHECK 6: Transaction succeeded (no error) ─────────────────────
      if (tx.meta?.err) {
        throw new BadRequestException(
          `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
        );
      }

      // ─── CHECK 7-10: Verify transfer details ──────────────────────────
      // Using @solana/pay validateTransfer for checks 7-10:
      // 7. Correct recipient
      // 8. Correct USDC mint
      // 9. Correct amount (minSendAmount)
      // 10. Memo matches (if present)
      const memoText = `x402:${quoteId}`;
      await validateTransfer(
        this.connection as any,
        signature as any,
        {
          recipient: this.payToWallet.toString() as any,
          amount: this.priceBaseUnits,
          splToken: this.usdcMint.toString() as any,
          reference: referencePublicKey.toString() as any,
          memo: memoText as any,
        },
        { commitment: 'confirmed' } as any,
      );

      this.logger.log(
        `✅ Payment verified for quote ${quoteId}: signature=${signature.substring(
          0,
          8,
        )}...`,
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Payment verification failed for quote ${quoteId}: ${errMsg}`,
      );
      throw new BadRequestException(
        `Payment verification failed: ${errMsg}`,
      );
    }

    // ─── Record the payment ──────────────────────────────────────────────
    const settledAt = new Date();
    const payment = this.paymentRepo.create({
      quoteId,
      dataOwnerId,
      transactionSignature: signature,
      recipientPublicKey: this.payToWallet.toBase58(),
      tokenMint: this.usdcMint.toBase58(),
      amountBaseUnits: this.priceBaseUnits,
      memo: `x402:${quoteId}`,
      paidAt: settledAt,
    });
    await this.paymentRepo.save(payment);

    // ─── Update quote status ────────────────────────────────────────────
    await this.quoteRepo.update(quoteId, {
      status: PaymentStatusEnum.PAID,
    });

    this.logger.log(
      `Payment recorded: quote=${quoteId}, sig=${signature.substring(0, 8)}..., settledAt=${settledAt.toISOString()}`,
    );

    return { quoteId, signature, settledAt };
  }

  // ─────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────

  async getQuote(id: string): Promise<X402Quote> {
    const quote = await this.quoteRepo.findOne({ where: { id } });
    if (!quote) {
      throw new BadRequestException(`Quote not found: ${id}`);
    }
    return quote;
  }

  async getPayment(quoteId: string): Promise<X402Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { quoteId },
    });
    if (!payment) {
      throw new BadRequestException(`Payment not found for quote: ${quoteId}`);
    }
    return payment;
  }
}
