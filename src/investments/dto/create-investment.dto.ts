import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

import { InvestmentTypeEnum } from '../enums/investment-type.enum';

export class CreateInvestmentDto {
  @ApiProperty({ enum: InvestmentTypeEnum })
  @IsEnum(InvestmentTypeEnum)
  type!: InvestmentTypeEnum;

  @ApiProperty({ example: 'NABIL Bank Shares' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  investedAmount!: number;

  @ApiPropertyOptional({ example: 55000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  currentValue?: number;

  @ApiPropertyOptional({
    example: { scrip: 'NABIL', quantity: 100, buyPricePerUnit: 500, broker: 'Sunrise' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;
}
