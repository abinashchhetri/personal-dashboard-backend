// src/workout/dto/log-session-set.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// LogSessionSetDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { FeelingEnum } from '../enums/feeling.enum';

export class LogSessionSetDto {
  @ApiProperty({ example: 'Bench Press' })
  @IsString()
  @IsNotEmpty()
  exerciseName!: string;

  @ApiProperty({ example: 'Chest and Triceps' })
  @IsString()
  @IsNotEmpty()
  bodyPart!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  setNumber!: number;

  @ApiPropertyOptional({ example: 22.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualWeightKg?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  actualReps?: number;

  @ApiPropertyOptional({ enum: FeelingEnum })
  @IsOptional()
  @IsEnum(FeelingEnum)
  actualFeeling?: FeelingEnum;

  @ApiPropertyOptional({ example: 'uuid-of-plan-exercise' })
  @IsOptional()
  @IsUUID()
  planExerciseId?: string;
}
