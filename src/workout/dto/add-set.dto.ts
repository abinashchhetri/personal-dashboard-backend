// src/workout/dto/add-set.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// AddSetDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddSetDto {
  @ApiProperty({ example: 'Bench Press' })
  @IsString()
  @IsNotEmpty()
  exerciseName!: string;

  @ApiProperty({ example: 'Chest and Triceps' })
  @IsString()
  @IsNotEmpty()
  bodyPart!: string;
}
