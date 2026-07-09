// src/meals/dto/create-meal-log.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// CreateMealLogDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { MealTypeEnum } from '../enums/meal-type.enum';

export class CreateMealLogDto {
  @ApiProperty({ example: 'Chicken rice bowl' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '2026-07-08T12:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  consumedAt?: string;

  @ApiPropertyOptional({ enum: MealTypeEnum })
  @IsOptional()
  @IsEnum(MealTypeEnum)
  mealType?: MealTypeEnum;

  @ApiPropertyOptional({ example: 'uuid-of-plan-item' })
  @IsOptional()
  @IsUUID()
  planItemId?: string;

  @ApiPropertyOptional({ enum: ['plan', 'freeform', 'prep'], default: 'freeform' })
  @IsOptional()
  @IsIn(['plan', 'freeform', 'prep'])
  source?: string;

  @ApiPropertyOptional({ example: 650 })
  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinG?: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbsG?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fatG?: number;

  @ApiPropertyOptional({ enum: ['form', 'voice', 'csv'], default: 'form' })
  @IsOptional()
  @IsIn(['form', 'voice', 'csv'])
  entryMethod?: string;

  @ApiPropertyOptional({ example: 'Ate half, saved the rest' })
  @IsOptional()
  @IsString()
  notes?: string;
}
