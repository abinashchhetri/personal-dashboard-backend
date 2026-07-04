// src/accounts/dto/update-account.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// UpdateAccountDto
// ─────────────────────────────────────────────────────────────────────────────
// Validates PATCH /accounts/:id.
// type is intentionally excluded — account type cannot change after creation.
// isArchived is added here only (not on create) — accounts are never created archived.
// ─────────────────────────────────────────────────────────────────────────────

import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['type'] as const),
) {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiPropertyOptional({ example: ['esewa', 'eSewa wallet', 'mobile banking'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  voiceKeywords?: string[];
}
