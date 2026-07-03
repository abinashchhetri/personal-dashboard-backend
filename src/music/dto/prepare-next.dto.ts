// src/music/dto/prepare-next.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// PrepareNextDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class PrepareNextDto {
  @ApiProperty({ description: 'UUID of the track currently playing' })
  @IsUUID()
  @IsNotEmpty()
  currentTrackId!: string;
}
