// src/music/interfaces/music-source-provider.interface.ts
// ─────────────────────────────────────────────────────────────────────────────
// IMusicSourceProvider
// ─────────────────────────────────────────────────────────────────────────────
// Contract for any audio source backend (YouTube via yt-dlp today, others later).
// YtDlpProvider is the only implementation; the interface keeps the cache service
// decoupled from the concrete provider.
// ─────────────────────────────────────────────────────────────────────────────

import { TrackSourceEnum } from '../enums/track-source.enum';

export interface IExternalTrackResult {
  externalId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  durationSeconds: number;
  source: TrackSourceEnum;
}

export interface IMusicSourceProvider {
  searchTrack(title: string, artist: string): Promise<IExternalTrackResult | null>;
  downloadTrack(
    externalId: string,
    title: string,
    artist: string,
  ): Promise<{
    buffer: Buffer;
    durationSeconds: number;
    fileSizeBytes: number;
  }>;
}
