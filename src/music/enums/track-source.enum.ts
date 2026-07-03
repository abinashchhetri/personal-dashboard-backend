// src/music/enums/track-source.enum.ts
// ─────────────────────────────────────────────────────────────────────────────
// TrackSourceEnum
// ─────────────────────────────────────────────────────────────────────────────
// Identifies where a track originates. Additional sources (Spotify, SoundCloud)
// can be added as new enum values without schema changes — the column is varchar.
// ─────────────────────────────────────────────────────────────────────────────

export enum TrackSourceEnum {
  YOUTUBE = 'YOUTUBE',
}
