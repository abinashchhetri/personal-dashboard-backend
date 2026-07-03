// src/playlists/dto/add-track.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// AddTrackDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class AddTrackDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  trackId!: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Insertion position (0-indexed). Appends to end if omitted.' })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
