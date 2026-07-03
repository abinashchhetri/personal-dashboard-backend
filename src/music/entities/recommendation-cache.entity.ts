// src/music/entities/recommendation-cache.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// RecommendationCache Entity
// ─────────────────────────────────────────────────────────────────────────────
// Stores Last.fm-derived "next track" suggestions keyed by the currently playing
// track. sourceTrackId is NOT a FK — the playing track may not be in local DB
// yet (it could be streaming direct from YouTube without a cached entry).
// isPrepared flips to true once the recommended track has been downloaded to S3.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Unique } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Unique(['sourceTrackId', 'recommendedExternalId'])
@Entity('recommendation_cache')
export class RecommendationCache extends AbstractEntity<RecommendationCache> {
  // UUID of the playing track — plain column, NOT a FK (the track may not be in DB yet).
  @Column({ type: 'uuid' })
  sourceTrackId!: string;

  @Column({ type: 'varchar' })
  sourceExternalId!: string;

  @Column({ type: 'varchar' })
  recommendedExternalId!: string;

  @Column({ type: 'varchar' })
  recommendedTitle!: string;

  @Column({ type: 'varchar' })
  recommendedArtist!: string;

  @Column({ type: 'varchar', nullable: true })
  recommendedCoverUrl!: string | null;

  // Last.fm similarity score 0.0000–1.0000. precision 5, scale 4.
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0, transformer: decimalToNumber })
  matchScore!: number;

  @Column({ type: 'varchar', default: 'lastfm' })
  apiSource!: string;

  // Flips to true once the recommended track has been downloaded and cached in S3.
  @Column({ default: false })
  isPrepared!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  cachedAt!: Date;
}
