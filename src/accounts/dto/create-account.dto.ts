// src/accounts/dto/create-account.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// CreateAccountDto
// ─────────────────────────────────────────────────────────────────────────────
// Validates the request body for POST /accounts.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { AccountTypeEnum } from '../enums/account-type.enum';

export class CreateAccountDto {
  @ApiProperty({ enum: AccountTypeEnum, example: AccountTypeEnum.BANK })
  @IsEnum(AccountTypeEnum)
  type!: AccountTypeEnum;

  @ApiProperty({ example: 'Nabil Bank' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 5000, default: 0 })
  @IsNumber()
  @IsOptional()
  initialBalance?: number = 0;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
