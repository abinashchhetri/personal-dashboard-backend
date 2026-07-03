// src/common/ytdlp/ytdlp.utils.ts
// ─────────────────────────────────────────────────────────────────────────────
// yt-dlp Utility Functions
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions — no NestJS DI, no side effects beyond spawning a subprocess.
// buildSearchArgs and buildDumpJsonArgs return string[] for use with spawn(),
// never with exec() — spawn avoids shell injection when artist/title contain
// quotes, semicolons, or other shell-special characters.
// ─────────────────────────────────────────────────────────────────────────────

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Returns true if yt-dlp is available on PATH and responds to --version.
export async function checkYtDlpInstalled(): Promise<boolean> {
  try {
    await execAsync('yt-dlp --version');
    return true;
  } catch {
    return false;
  }
}

// Arguments for downloading and converting a track to mp3.
// Pass to spawn(ytDlpPath, buildSearchArgs(...)) — never shell.exec the result.
export function buildSearchArgs(
  artist: string,
  title: string,
  outputPath: string,
): string[] {
  return [
    `ytsearch1:${artist} ${title}`,
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', outputPath,
    '--no-playlist',
    '--quiet',
    '--no-warnings',
  ];
}

// Arguments for a metadata-only fetch (no audio download).
// Pipe the stdout JSON to parseDumpJsonOutput().
export function buildDumpJsonArgs(artist: string, title: string): string[] {
  return [
    `ytsearch1:${artist} ${title}`,
    '--dump-json',
    '--no-download',
    '--quiet',
  ];
}

export interface YtDlpTrackMeta {
  externalId: string;
  duration: number;
  title: string;
  artist: string;
  coverUrl: string | null;
}

// Parses the JSON line written to stdout by --dump-json.
// Returns null on any parse failure — caller should treat null as a search miss.
export function parseDumpJsonOutput(stdout: string): YtDlpTrackMeta | null {
  try {
    const data = JSON.parse(stdout.trim()) as Record<string, unknown>;
    return {
      externalId: data['id'] as string,
      duration: Math.round(Number(data['duration'])),
      title: data['title'] as string,
      artist: (data['uploader'] as string | undefined) ?? '',
      coverUrl: (data['thumbnail'] as string | null | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
