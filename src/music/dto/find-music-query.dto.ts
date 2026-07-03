// src/music/dto/find-music-query.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// FindMusicQueryDto + IDiscoveryTrack
// ─────────────────────────────────────────────────────────────────────────────
// Used by GET /music/find — live YouTube search via yt-dlp.
// q is required and must be at least 2 chars (enforced by ValidationPipe).
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class FindMusicQueryDto {
  @ApiProperty({ description: 'Search query — artist, title, or both', minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q!: string;
}

// Shape returned by GET /music/find.
// id is null when the track has never been played and is not yet in the local DB.
export interface IDiscoveryTrack {
  id: string | null;
  externalId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  durationSeconds: number;
  isCached: boolean;
  source: 'YOUTUBE';
}
