import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';
import { TransactionTypeEnum } from '../enums/transaction-type.enum';

export class FindAllTransactionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'uuid-of-account' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ enum: TransactionTypeEnum })
  @IsOptional()
  @IsEnum(TransactionTypeEnum)
  type?: TransactionTypeEnum;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPersonal?: boolean;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
