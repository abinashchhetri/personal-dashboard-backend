// src/workout/dto/create-workout-session.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// CreateWorkoutSessionDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class CreateWorkoutSessionDto {
  @ApiProperty({ example: '2026-07-08' })
  @IsDateString()
  sessionDate!: string;
}
