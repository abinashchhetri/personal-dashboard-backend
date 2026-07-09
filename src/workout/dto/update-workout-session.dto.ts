// src/workout/dto/update-workout-session.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// UpdateWorkoutSessionDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWorkoutSessionDto {
  @ApiPropertyOptional({ example: 'Felt strong today' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;
}
