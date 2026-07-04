// src/music/utils/title-cleaner.util.ts
// ─────────────────────────────────────────────────────────────────────────────
// Title Cleaner Utility
// ─────────────────────────────────────────────────────────────────────────────
// YouTube video titles are not clean song titles. Last.fm needs just
// the song name and artist separately. This utility strips YouTube-specific
// noise and attempts to split "Artist - Song" format into its parts.
// ─────────────────────────────────────────────────────────────────────────────

export interface ICleanedTrackInfo {
  cleanTitle: string;
  cleanArtist: string;
}

// Suffixes that YouTube channels append — strip these before sending to Last.fm.
const YOUTUBE_NOISE_PATTERNS: RegExp[] = [
  /\(Official Music Video\)/gi,
  /\(Official Video\)/gi,
  /\(Official Audio\)/gi,
  /\(Official Lyric Video\)/gi,
  /\(Lyric Video\)/gi,
  /\(Audio\)/gi,
  /\(Lyrics\)/gi,
  /\(Full Song\)/gi,
  /\(HD\)/gi,
  /\(4K\)/gi,
  /\[Official Music Video\]/gi,
  /\[Official Video\]/gi,
  /\[Lyrics\]/gi,
  /\| .+$/g,       // everything after a pipe: "Song | Label Records"
  /@[\w]+/g,       // @mentions: @KRIZN @YABITheGOAT
  /ft\.?.+$/gi,    // features: "ft. Artist2" and everything after
  /feat\.?.+$/gi,
  /\s{2,}/g,       // collapse multiple spaces
];

export function cleanYouTubeTitle(rawTitle: string, rawArtist: string): ICleanedTrackInfo {
  // Step 1: Strip noise from the raw title.
  let title = rawTitle;
  for (const pattern of YOUTUBE_NOISE_PATTERNS) {
    title = title.replace(pattern, '');
  }
  title = title.trim();

  // Step 2: Try to split "Artist - Song Title" pattern.
  // Nepali YouTube titles often follow "Artist - Artist - Song" (channel name repeated).
  // Take the LAST segment as the song title so we don't confuse channel name for song.
  const dashParts = title
    .split(' - ')
    .map((p) => p.trim())
    .filter(Boolean);

  let cleanTitle: string;
  let cleanArtist: string;

  if (dashParts.length >= 2) {
    cleanTitle = dashParts[dashParts.length - 1];
    cleanArtist = dashParts[0];
  } else {
    cleanTitle = title;
    cleanArtist = rawArtist;
  }

  // Step 3: Clean the artist field — yt-dlp uploader often contains
  // "Artist - Topic" or "VEVO" suffixes that Last.fm won't recognise.
  cleanArtist = cleanArtist
    .replace(/ - Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/@[\w]+/g, '')
    .trim();

  return {
    cleanTitle: cleanTitle || rawTitle, // never return empty — fall back to raw
    cleanArtist: cleanArtist || rawArtist,
  };
}
