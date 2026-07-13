// src/workout/dto/import-workout-plan.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// ImportWorkoutPlanDto
// ─────────────────────────────────────────────────────────────────────────────
// The CSV itself arrives as an uploaded multipart file, not a body field —
// this DTO only validates the accompanying form field.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportWorkoutPlanDto {
  @ApiProperty({ example: 'My Gym Plan Week 1' })
  @IsString()
  @IsNotEmpty()
  planName!: string;
}
