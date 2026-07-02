import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

import { InvestmentTransactionTypeEnum } from '../enums/transaction-type.enum';

export class CreateTransactionDto {
  @ApiProperty({ enum: InvestmentTransactionTypeEnum })
  @IsEnum(InvestmentTransactionTypeEnum)
  transactionType!: InvestmentTransactionTypeEnum;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  pricePerUnit!: number;

  @ApiPropertyOptional({ example: '2024-03-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  brokerageFee?: number;

  @ApiPropertyOptional({ example: 'Bought via Sunrise broker' })
  @IsOptional()
  @IsString()
  note?: string;
}
