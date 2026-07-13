import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  IsPositive,
  Max,
} from 'class-validator';

export class CreatePaymentRequestDto {
  @ApiProperty({
    example: 0.01,
    description: 'Amount in USDC (e.g. 0.01, max 100 for devnet safety)',
  })
  @IsNumber()
  @IsPositive()
  @Max(100)
  amountUsdc!: number;

  @ApiProperty({ example: 'Coffee at Himalayan Java' })
  @IsString()
  label!: string;

  @ApiPropertyOptional({ example: 'Morning coffee expense' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Account ID to log the payment to; if omitted, logs to default account',
  })
  @IsUUID()
  @IsOptional()
  accountId?: string;
}
