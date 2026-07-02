import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ example: 'uuid-of-source-account' })
  @IsUUID()
  @IsNotEmpty()
  fromAccountId!: string;

  @ApiProperty({ example: 'uuid-of-destination-account' })
  @IsUUID()
  @IsNotEmpty()
  toAccountId!: string;

  @ApiProperty({ example: 2000.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Moving savings to eSewa' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '2026-06-27T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  transactedAt?: string;
}
