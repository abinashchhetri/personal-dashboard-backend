// src/accounts/dto/find-all-accounts.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// FindAllAccountsDto
// ─────────────────────────────────────────────────────────────────────────────
// Query params for GET /accounts.
// Archived accounts are excluded by default — pass includeArchived=true to see them.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';
import { AccountTypeEnum } from '../enums/account-type.enum';

export class FindAllAccountsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AccountTypeEnum })
  @IsEnum(AccountTypeEnum)
  @IsOptional()
  type?: AccountTypeEnum;

  // Query strings arrive as 'true'/'false' strings — Transform converts them.
  @ApiPropertyOptional({ example: false, default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean = false;
}
