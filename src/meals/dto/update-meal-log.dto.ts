// src/meals/dto/update-meal-log.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// UpdateMealLogDto
// ─────────────────────────────────────────────────────────────────────────────

import { PartialType } from '@nestjs/swagger';

import { CreateMealLogDto } from './create-meal-log.dto';

export class UpdateMealLogDto extends PartialType(CreateMealLogDto) {}
