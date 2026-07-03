// src/playlists/dto/reorder-tracks.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// ReorderTracksDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class ReorderTracksDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  trackId!: string;

  @ApiProperty({ minimum: 0, description: 'Target position (0-indexed)' })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  newPosition!: number;
}
