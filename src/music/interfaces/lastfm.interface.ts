// src/music/interfaces/lastfm.interface.ts
// ─────────────────────────────────────────────────────────────────────────────
// ILastFmTrack
// ─────────────────────────────────────────────────────────────────────────────
// Shape returned by LastFmService.getSimilarTracks. externalId is always null
// from Last.fm — the YouTube ID is resolved lazily in prepareNextTrack via
// YtDlpProvider.searchTrack.
// ─────────────────────────────────────────────────────────────────────────────

export interface ILastFmTrack {
  title: string;
  artist: string;
  coverUrl: string | null;
  matchScore: number;
  externalId: string | null;
}
