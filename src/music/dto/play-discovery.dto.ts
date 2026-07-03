// src/music/dto/play-discovery.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// PlayDiscoveryDto
// ─────────────────────────────────────────────────────────────────────────────
// Body for POST /music/play-discovery — plays a track from a discovery result
// that may not yet exist in the local DB (id: null from GET /music/find).
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PlayDiscoveryDto {
  @ApiProperty({ description: 'YouTube video ID from GET /music/find' })
  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  artist!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  coverUrl?: string | null;
}
