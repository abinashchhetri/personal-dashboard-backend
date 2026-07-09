// src/meals/dto/import-plan.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// ImportMealPlanDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportMealPlanDto {
  @ApiProperty({
    description: 'Raw CSV text with columns: day,meal,name,calories,protein,carbs,fat,notes',
    example: 'day,meal,name,calories,protein,carbs,fat,notes\nMon,breakfast,Oats + banana,400,15,60,8,',
  })
  @IsString()
  @IsNotEmpty()
  csv!: string;
}
