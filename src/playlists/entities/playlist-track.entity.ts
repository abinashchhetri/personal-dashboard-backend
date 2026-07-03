// src/playlists/entities/playlist-track.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// PlaylistTrack Entity
// ─────────────────────────────────────────────────────────────────────────────
// Junction between playlists and tracks with an explicit position (0-indexed,
// no gaps). Composite unique on (playlistId, position) prevents two tracks from
// occupying the same slot — enforce this invariant before every insert/reorder.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { Track } from 'src/music/entities/track.entity';
import { Playlist } from './playlist.entity';

@Unique(['playlistId', 'trackId'])
@Unique(['playlistId', 'position'])
@Index(['playlistId', 'position'])
@Entity('playlist_tracks')
export class PlaylistTrack extends AbstractEntity<PlaylistTrack> {
  @Column({ type: 'uuid' })
  playlistId!: string;

  @ManyToOne(() => Playlist, (p) => p.playlistTracks, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'playlistId' })
  playlist!: Playlist;

  @Column({ type: 'uuid' })
  trackId!: string;

  @ManyToOne(() => Track, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'trackId' })
  track!: Track;

  // 0-indexed. No gaps allowed — reorderAfterRemoval must be called on every delete.
  @Column({ type: 'integer' })
  position!: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  addedAt!: Date;
}
