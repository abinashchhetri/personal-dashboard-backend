// src/meals/dto/find-logs.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// FindLogsDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

export class FindLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
