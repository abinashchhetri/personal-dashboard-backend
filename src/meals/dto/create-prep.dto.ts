// src/meals/dto/create-prep.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// CreatePrepDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { MealTypeEnum } from '../enums/meal-type.enum';

export class CreatePrepDto {
  @ApiProperty({ example: 'Chicken & rice lunches' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '2026-07-06T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  preppedAt?: string;

  @ApiPropertyOptional({ enum: MealTypeEnum })
  @IsOptional()
  @IsEnum(MealTypeEnum)
  mealType?: MealTypeEnum;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  totalPortions!: number;

  @ApiPropertyOptional({ example: 650 })
  @IsOptional()
  @IsInt()
  @Min(0)
  caloriesPerPortion?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinPerPortionG?: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbsPerPortionG?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fatPerPortionG?: number;

  @ApiPropertyOptional({ example: '2026-07-13T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Stored in the blue containers' })
  @IsOptional()
  @IsString()
  notes?: string;
}
