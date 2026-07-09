// src/meals/dto/consume-prep.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// ConsumePrepDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ConsumePrepDto {
  @ApiPropertyOptional({ example: '2026-07-08T12:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  consumedAt?: string;

  @ApiPropertyOptional({ example: 'Ate the last portion' })
  @IsOptional()
  @IsString()
  notes?: string;
}
