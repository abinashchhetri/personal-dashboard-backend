// src/music/dto/find-music.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// FindMusicDto
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

export class FindMusicDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search query (title or artist)', minLength: 2 })
  @IsString()
  @IsOptional()
  @MinLength(2)
  q?: string;
}
