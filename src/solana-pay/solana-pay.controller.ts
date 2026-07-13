import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

import { SolanaPayService } from './services/solana-pay.service';
import { SolanaPayAutoLogService } from './services/solana-pay-auto-log.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { PaymentStatusEnum } from './enums/payment-status.enum';

@ApiTags('Solana Pay')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('solana-pay')
export class SolanaPayController {
  constructor(
    private readonly solanaPayService: SolanaPayService,
    private readonly autoLogService: SolanaPayAutoLogService,
  ) {}

  @Post('request')
  @ApiOperation({
    summary: 'Create a new Solana Pay payment request',
    description:
      'Generates a unique reference key, creates a Solana Pay URL, and returns a QR code data URL',
  })
  async createRequest(
    @Body() dto: CreatePaymentRequestDto,
    @CurrentUser() payload: IPayload,
  ) {
    const result = await this.solanaPayService.createPaymentRequest(
      payload.id,
      dto.amountUsdc,
      dto.label,
      dto.message || '',
      dto.accountId,
    );

    return {
      success: true,
      data: {
        id: result.paymentRequest.id,
        status: result.paymentRequest.status,
        amountUsdc: result.paymentRequest.amountUsdc,
        label: result.paymentRequest.label,
        expiresAt: result.paymentRequest.expiresAt,
        solanaPayUrl: result.solanaPayUrl,
        qrCodeDataUrl: result.qrCodeDataUrl,
        referencePublicKey: result.paymentRequest.referencePublicKey,
      },
    };
  }

  @Get('request/:id/status')
  @ApiOperation({
    summary: 'Poll for payment confirmation',
    description:
      'Checks on-chain for the payment using the reference key. Returns cached result if already confirmed.',
  })
  async checkStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    const statusResult = await this.solanaPayService.checkPaymentStatus(
      id,
      payload.id,
    );

    // Auto-log when payment just confirmed and hasn't been logged yet
    if (statusResult.status === PaymentStatusEnum.CONFIRMED) {
      const request = await this.solanaPayService.getPaymentRequest(
        id,
        payload.id,
      );
      if (!request.autoLoggedTransactionId) {
        // Fire and forget — don't block the status response
        this.autoLogService.autoLogPayment(request, payload.id).catch((err) =>
          console.error('Auto-log failed (non-critical):', err.message),
        );
      }
    }

    return {
      success: true,
      data: statusResult,
    };
  }

  @Get('request/:id')
  @ApiOperation({ summary: 'Get payment request details' })
  async getRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    const request = await this.solanaPayService.getPaymentRequest(
      id,
      payload.id,
    );
    return {
      success: true,
      data: request,
    };
  }
}
