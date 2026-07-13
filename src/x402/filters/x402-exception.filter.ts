import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentRequiredException } from '../exceptions/payment-required.exception';

@Catch(PaymentRequiredException)
export class X402ExceptionFilter implements ExceptionFilter {
  catch(exception: PaymentRequiredException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.PAYMENT_REQUIRED).json(exception.challenge);
  }
}
