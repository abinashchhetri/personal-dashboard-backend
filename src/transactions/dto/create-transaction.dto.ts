import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { TransactionTypeEnum } from '../enums/transaction-type.enum';
import { LineItemDto } from './line-item.dto';

export class CreateTransactionDto {
  @ApiProperty({ example: 'uuid-of-account' })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ enum: TransactionTypeEnum })
  @IsEnum(TransactionTypeEnum)
  type!: TransactionTypeEnum;

  // Required when type is EXPENSE or INCOME — validated in the service.
  @ApiPropertyOptional({ type: [LineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[];

  // Required when type is IN_TRANSIT — validated in the service.
  @ApiPropertyOptional({ example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  totalAmount?: number;

  @ApiPropertyOptional({ example: 'Dinner with friends' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ enum: ['voice', 'form'], default: 'form' })
  @IsOptional()
  @IsIn(['voice', 'form'])
  entryMethod?: 'voice' | 'form';

  @ApiPropertyOptional({ example: 'bought two plates of momo for 250 each' })
  @IsOptional()
  @IsString()
  voiceTranscript?: string;

  @ApiPropertyOptional({ example: '2026-06-27T14:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  transactedAt?: string;
}
