// src/common/dtos/pagination.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// PaginationQueryDto
// ─────────────────────────────────────────────────────────────────────────────
// Shared pagination query params used across all list endpoints.
// @Type(() => Number) is required because query string values arrive as strings.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
