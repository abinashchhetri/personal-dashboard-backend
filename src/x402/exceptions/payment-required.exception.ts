import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentRequiredException extends HttpException {
  constructor(public readonly challenge: Record<string, unknown>) {
    super('Payment required', HttpStatus.PAYMENT_REQUIRED);
    this.getStatus = () => HttpStatus.PAYMENT_REQUIRED;
  }
}
