import { IsUUID, IsString } from 'class-validator';

export class X402PaymentHeaderDto {
  @IsUUID()
  quoteId!: string;

  @IsString()
  signature!: string;
}
