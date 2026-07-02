// src/categories/dto/create-category.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// CreateCategoryDto
// ─────────────────────────────────────────────────────────────────────────────
// Validates the request body for POST /categories.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '🛒' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#4CAF50' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: ['grocery', 'supermarket'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[] = [];
}
