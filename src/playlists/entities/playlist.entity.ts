// src/playlists/entities/playlist.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Playlist Entity
// ─────────────────────────────────────────────────────────────────────────────
// User-owned ordered collection of tracks.
// trackCount is a denormalised counter — never recompute via COUNT(*) on read.
// It must stay in sync with playlist_tracks rows: increment on add, decrement on
// remove, always inside a QueryRunner to prevent drift on partial writes.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { User } from 'src/users/entities/user.entity';
import { Track } from 'src/music/entities/track.entity';
import { PlaylistTrack } from './playlist-track.entity';

@Entity('playlists')
export class Playlist extends AbstractEntity<Playlist> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  coverUrl!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  // Denormalised counter — must be kept in sync via QueryRunner on every add/remove.
  @Column({ type: 'integer', default: 0 })
  trackCount!: number;

  @OneToMany(() => PlaylistTrack, (pt) => pt.playlist, { cascade: ['insert', 'remove'], eager: false })
  playlistTracks!: PlaylistTrack[];

  // Not a column — populated manually by the service as the flattened,
  // position-ordered track list for API responses.
  tracks?: Track[];
}
