// src/meals/dto/update-prep.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// UpdatePrepDto
// ─────────────────────────────────────────────────────────────────────────────

import { PartialType } from '@nestjs/swagger';

import { CreatePrepDto } from './create-prep.dto';

export class UpdatePrepDto extends PartialType(CreatePrepDto) {}
