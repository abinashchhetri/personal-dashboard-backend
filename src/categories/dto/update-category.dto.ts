// src/categories/dto/update-category.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

// All fields optional — inherits validators from CreateCategoryDto.
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
