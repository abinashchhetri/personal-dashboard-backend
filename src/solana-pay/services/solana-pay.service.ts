import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  Keypair,
  clusterApiUrl,
} from '@solana/web3.js';
import { encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import * as QRCode from 'qrcode';

import { PaymentRequest } from '../entities/payment-request.entity';
import { PaymentStatusEnum } from '../enums/payment-status.enum';

@Injectable()
export class SolanaPayService {
  private readonly logger = new Logger(SolanaPayService.name);
  private readonly connection: Connection;
  private readonly merchantWallet: PublicKey;
  private readonly usdcMint: PublicKey;
  private readonly expiryMinutes: number;

  constructor(
    @InjectRepository(PaymentRequest)
    private readonly paymentRequestRepo: Repository<PaymentRequest>,
    private readonly configService: ConfigService,
  ) {
    const rpcUrl =
      this.configService.get<string>('SOLANA_RPC_URL') ||
      clusterApiUrl('devnet');
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.merchantWallet = new PublicKey(
      this.configService.get<string>('SOLANA_MERCHANT_WALLET')!,
    );
    this.usdcMint = new PublicKey(
      this.configService.get<string>('SOLANA_USDC_MINT')!,
    );
    this.expiryMinutes = parseInt(
      this.configService.get<string>('SOLANA_PAYMENT_EXPIRY_MINUTES') || '10',
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // CREATE PAYMENT REQUEST
  // ─────────────────────────────────────────────────────────────────────

  async createPaymentRequest(
    userId: string,
    amountUsdc: number,
    label: string,
    message: string,
    accountId?: string,
  ): Promise<{
    paymentRequest: PaymentRequest;
    solanaPayUrl: string;
    qrCodeDataUrl: string;
  }> {
    // Validate amount
    if (amountUsdc <= 0 || amountUsdc > 100) {
      throw new BadRequestException(
        'Amount must be between 0.01 and 100 USDC',
      );
    }

    // Generate a unique throwaway keypair per request
    const referenceKeypair = Keypair.generate();
    const referencePublicKey = referenceKeypair.publicKey;

    // Build the Solana Pay transfer request URL
    // Note: @solana/pay@1.0.20 has type compatibility with older APIs
    // Use 'as any' to bypass nominal typing until library is updated
    // IMPORTANT: Pass user-readable amount (0.01), NOT base units (10000)
    // Solana Pay library handles the conversion internally
    const solanaPayUrl = encodeURL({
      recipient: this.merchantWallet.toString() as any,
      amount: amountUsdc,
      splToken: this.usdcMint.toString() as any,
      reference: referencePublicKey.toString() as any,
      label: label || 'Sajilo Khata',
      message: message || `Payment of ${amountUsdc} USDC`,
      memo: `sajilo-${Date.now()}`,
    });

    // Debug: log the generated URL to verify spl-token is included
    const urlString = solanaPayUrl.toString();
    if (urlString.includes('spl-token=')) {
      this.logger.log(
        `✅ Solana Pay URL generated with SPL token: ${urlString.substring(0, 100)}...`,
      );
    } else {
      this.logger.warn(
        `⚠️ WARNING: spl-token NOT in URL: ${urlString.substring(0, 100)}...`,
      );
    }

    // Generate QR code as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(urlString, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.expiryMinutes);

    // Persist to DB
    const paymentRequest = this.paymentRequestRepo.create({
      userId,
      amountUsdc,
      label,
      message,
      referencePublicKey: referencePublicKey.toBase58(),
      status: PaymentStatusEnum.PENDING,
      accountId: accountId || null,
      expiresAt,
    });
    await this.paymentRequestRepo.save(paymentRequest);

    this.logger.log(
      `Payment request created: ${paymentRequest.id} for ${amountUsdc} USDC`,
    );

    return {
      paymentRequest,
      solanaPayUrl: solanaPayUrl.toString(),
      qrCodeDataUrl,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // CHECK PAYMENT STATUS (poll on-chain)
  // ─────────────────────────────────────────────────────────────────────

  async checkPaymentStatus(
    paymentRequestId: string,
    userId: string,
  ): Promise<{
    status: PaymentStatusEnum;
    signature: string | null;
    confirmedAt: Date | null;
  }> {
    const request = await this.paymentRequestRepo.findOne({
      where: { id: paymentRequestId, userId },
    });
    if (!request) {
      throw new NotFoundException('Payment request not found');
    }

    // Already confirmed — return cached result (no RPC call)
    if (request.status === PaymentStatusEnum.CONFIRMED) {
      return {
        status: request.status,
        signature: request.transactionSignature,
        confirmedAt: request.confirmedAt,
      };
    }

    // Check expiry
    if (
      new Date() > request.expiresAt &&
      request.status === PaymentStatusEnum.PENDING
    ) {
      await this.paymentRequestRepo.update(request.id, {
        status: PaymentStatusEnum.EXPIRED,
      });
      return {
        status: PaymentStatusEnum.EXPIRED,
        signature: null,
        confirmedAt: null,
      };
    }

    // Pending — check on-chain for the reference key
    try {
      const referencePublicKey = new PublicKey(request.referencePublicKey);

      // findReference scans recent transactions for ones with our reference key
      // Type cast needed due to @solana/pay@1.0.20 compatibility
      const signatureInfo = await findReference(
        this.connection as any,
        referencePublicKey as any,
        { finality: 'confirmed' } as any,
      );

      // Found a tx with our reference — validate it matches our expectations
      // Type cast needed due to @solana/pay@1.0.20 compatibility
      // IMPORTANT: validateTransfer expects user-readable amount, not base units
      await validateTransfer(
        this.connection as any,
        signatureInfo.signature as any,
        {
          recipient: this.merchantWallet.toString() as any,
          amount: request.amountUsdc,
          splToken: this.usdcMint.toString() as any,
          reference: referencePublicKey.toString() as any,
        },
        { commitment: 'confirmed' } as any,
      );

      // Validation passed — mark as confirmed
      const confirmedAt = new Date();
      await this.paymentRequestRepo.update(request.id, {
        status: PaymentStatusEnum.CONFIRMED,
        transactionSignature: signatureInfo.signature,
        confirmedAt,
      });

      this.logger.log(
        `Payment confirmed: ${paymentRequestId} sig: ${signatureInfo.signature}`,
      );

      return {
        status: PaymentStatusEnum.CONFIRMED,
        signature: signatureInfo.signature,
        confirmedAt,
      };
    } catch (err) {
      // findReference throws "not found" while waiting — this is EXPECTED
      // Only log if it's a different error
      const errMessage =
        err instanceof Error ? err.message : String(err);
      if (
        !errMessage.includes('not found') &&
        !errMessage.includes('No references')
      ) {
        this.logger.warn(
          `Payment check error for ${paymentRequestId}: ${errMessage}`,
        );
      }
      // Return pending status — frontend will poll again in 3 seconds
      return {
        status: PaymentStatusEnum.PENDING,
        signature: null,
        confirmedAt: null,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────

  async getPaymentRequest(id: string, userId: string): Promise<PaymentRequest> {
    const request = await this.paymentRequestRepo.findOne({
      where: { id, userId },
    });
    if (!request) {
      throw new NotFoundException('Payment request not found');
    }
    return request;
  }

  async markAutoLogged(
    paymentRequestId: string,
    transactionId: string,
  ): Promise<void> {
    await this.paymentRequestRepo.update(paymentRequestId, {
      autoLoggedTransactionId: transactionId,
    });
  }
}
