// src/music/entities/user-music-preference.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// UserMusicPreference Entity
// ─────────────────────────────────────────────────────────────────────────────
// One row per user — created automatically on first play, never required up front.
// seedArtists and seedGenres bias the Last.fm recommendation queries.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

@Entity('user_music_preferences')
export class UserMusicPreference extends AbstractEntity<UserMusicPreference> {
  @Index()
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @Column({ type: 'jsonb', default: [] })
  seedArtists!: string[];

  @Column({ type: 'jsonb', default: [] })
  seedGenres!: string[];

  @Column({ type: 'integer', default: 320 })
  preferredBitrate!: number;
}
