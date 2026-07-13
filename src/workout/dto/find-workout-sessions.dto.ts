// src/workout/dto/find-workout-sessions.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// FindWorkoutSessionsDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

export class FindWorkoutSessionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
