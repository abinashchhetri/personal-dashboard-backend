// src/music/entities/track.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Track Entity
// ─────────────────────────────────────────────────────────────────────────────
// Shared audio cache — not user-owned. One row per unique external video/track.
// isCached flips to true only after the S3 upload confirms. s3Key and
// fileSizeBytes are set at the same time as isCached.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { TrackSourceEnum } from '../enums/track-source.enum';

const bigintToNumber = {
  to: (v: number | null): number | null => v,
  from: (v: string | number | null): number | null => (v !== null ? Number(v) : null),
};

@Index(['externalId'])
@Index(['isCached', 'lastPlayedAt'])
@Entity('tracks')
export class Track extends AbstractEntity<Track> {
  @Column({ type: 'varchar' })
  externalId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  artist!: string;

  @Column({ type: 'varchar', nullable: true })
  album!: string | null;

  // Set after yt-dlp confirms the actual duration — null until then.
  @Column({ type: 'integer', nullable: true })
  duration!: number | null;

  // Null until the S3 upload succeeds.
  @Column({ type: 'varchar', nullable: true })
  s3Key!: string | null;

  @Column({ type: 'varchar', nullable: true })
  coverUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  genre!: string | null;

  @Column({ type: 'integer', default: 320 })
  bitrate!: number;

  @Column({ type: 'enum', enum: TrackSourceEnum, default: TrackSourceEnum.YOUTUBE })
  source!: TrackSourceEnum;

  // Flips to true only after the S3 upload confirms — never set this directly.
  @Column({ default: false })
  isCached!: boolean;

  @Column({ type: 'integer', default: 0 })
  playCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastPlayedAt!: Date | null;

  // Set at the same time as isCached. bigint — postgres returns strings, transformer converts.
  @Column({ type: 'bigint', nullable: true, transformer: bigintToNumber })
  fileSizeBytes!: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;
}
