// src/music/providers/ytdlp.provider.ts
// ─────────────────────────────────────────────────────────────────────────────
// YtDlpProvider
// ─────────────────────────────────────────────────────────────────────────────
// Implements IMusicSourceProvider using yt-dlp as the audio source.
// All subprocess calls use spawn() not exec() — spawn avoids shell injection
// when artist/title contain quotes, semicolons, or other shell-special chars.
// ─────────────────────────────────────────────────────────────────────────────

import { ChildProcess, spawn } from 'child_process';
import { promises as fsp } from 'fs';
import * as path from 'path';

import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  buildDumpJsonArgs,
  parseDumpJsonOutput,
} from 'src/common/ytdlp/ytdlp.utils';
import { TrackSourceEnum } from '../enums/track-source.enum';
import {
  IExternalTrackResult,
  IMusicSourceProvider,
} from '../interfaces/music-source-provider.interface';

@Injectable()
export class YtDlpProvider implements IMusicSourceProvider {
  private readonly logger = new Logger(YtDlpProvider.name);

  constructor(private readonly configService: ConfigService) {}

  // Metadata-only search — no audio downloaded. Returns null on any failure.
  async searchTrack(title: string, artist: string): Promise<IExternalTrackResult | null> {
    const ytDlpPath = this.configService.get<string>('YTDLP_PATH') ?? 'yt-dlp';
    const args = buildDumpJsonArgs(artist, title);

    return new Promise((resolve) => {
      const proc = spawn(ytDlpPath, args);
      const chunks: Buffer[] = [];
      let settled = false;

      const settle = (value: IExternalTrackResult | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const timer = setTimeout(() => {
        proc.kill();
        this.logger.warn(`searchTrack timed out for "${artist} - ${title}"`);
        settle(null);
      }, 30_000);

      proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);

        if (code !== 0) {
          this.logger.warn(`yt-dlp search exited ${code} for "${artist} - ${title}"`);
          settle(null);
          return;
        }

        const stdout = Buffer.concat(chunks).toString('utf-8');
        const parsed = parseDumpJsonOutput(stdout);

        if (!parsed) {
          this.logger.warn(`yt-dlp parse failed for "${artist} - ${title}"`);
          settle(null);
          return;
        }

        settle({
          externalId: parsed.externalId,
          title: parsed.title,
          artist: parsed.artist,
          coverUrl: parsed.coverUrl,
          durationSeconds: parsed.duration,
          source: TrackSourceEnum.YOUTUBE,
        });
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        this.logger.error(`yt-dlp spawn error for search: ${err.message}`);
        settle(null);
      });
    });
  }

  // Multi-result search — parses one JSON object per stdout line.
  // Returns [] on any failure; search errors must never propagate to the caller.
  async searchTracks(query: string, limit: number = 8): Promise<IExternalTrackResult[]> {
    const ytDlpPath = this.configService.get<string>('YTDLP_PATH') ?? 'yt-dlp';
    const args = [
      `ytsearch${limit}:${query}`,
      '--dump-json',
      '--no-download',
      '--flat-playlist',
    ];

    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let settled = false;

      const settle = (value: IExternalTrackResult[]) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const proc = spawn(ytDlpPath, args);

      const timer = setTimeout(() => {
        proc.kill();
        this.logger.warn(`searchTracks timed out for query: "${query}"`);
        settle([]);
      }, 30_000);

      proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);

        if (code !== 0) {
          this.logger.warn(`yt-dlp searchTracks exited ${code} for: "${query}"`);
          settle([]);
          return;
        }

        const stdout = Buffer.concat(chunks).toString('utf-8');
        if (!stdout.trim()) {
          this.logger.warn(`yt-dlp searchTracks: empty output for: "${query}"`);
          settle([]);
          return;
        }

        const results: IExternalTrackResult[] = stdout
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .flatMap((line) => {
            try {
              const data = JSON.parse(line) as Record<string, unknown>;
              const externalId = data['id'] as string | undefined;
              if (!externalId) return [];
              return [
                {
                  externalId,
                  title: (data['title'] as string | undefined) ?? 'Unknown',
                  artist: ((data['uploader'] ?? data['channel'] ?? 'Unknown') as string),
                  coverUrl: (data['thumbnail'] as string | null | undefined) ?? null,
                  durationSeconds: Math.round(Number(data['duration'] ?? 0)),
                  source: TrackSourceEnum.YOUTUBE,
                } satisfies IExternalTrackResult,
              ];
            } catch {
              return [];
            }
          });

        settle(results);
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        this.logger.error(`yt-dlp spawn error in searchTracks: ${err.message}`);
        settle([]);
      });
    });
  }

  // Downloads audio by externalId (direct ID, no re-search). Reads the result
  // into memory then deletes the temp file — always, even on error.
  async downloadTrack(
    externalId: string,
    title: string,
    artist: string,
  ): Promise<{ buffer: Buffer; durationSeconds: number; fileSizeBytes: number }> {
    const ytDlpPath = this.configService.get<string>('YTDLP_PATH') ?? 'yt-dlp';
    const tempDir =
      this.configService.get<string>('YTDLP_TEMP_DIR') ?? '/tmp/sajilo-khata-audio';
    // WebM container with Opus at 128 kbps — 62% smaller than raw DASH bitrate.
    // YouTube already serves DASH audio as opus/webm; when the source matches,
    // yt-dlp remuxes without re-encoding (fast). The postprocessor-args ensure
    // the bitrate cap is enforced by ffmpeg if a re-encode is needed.
    const tempFilePath = path.join(tempDir, `${externalId}.webm`);

    await fsp.mkdir(tempDir, { recursive: true });

    // Direct download by externalId — faster than re-searching by title.
    const downloadArgs = [
      externalId,
      '-x',
      '--audio-format', 'webm',
      '--postprocessor-args', 'ffmpeg:-c:a libopus -b:a 128k -vbr on -compression_level 10',
      '-o', tempFilePath,
      '--quiet',
      '--no-warnings',
    ];

    try {
      this.logger.log(`Downloading ${externalId} (${artist} - ${title})`);
      await this.runYtDlp(ytDlpPath, downloadArgs, 120_000);

      const buffer = await fsp.readFile(tempFilePath);
      const fileSizeBytes = buffer.length;
      const durationSeconds = await this.extractDuration(ytDlpPath, tempFilePath);

      this.logger.log(
        `Downloaded ${externalId}: ${fileSizeBytes} bytes, ${durationSeconds}s`,
      );
      return { buffer, durationSeconds, fileSizeBytes };
    } finally {
      // Swallow unlink errors — never let cleanup failure mask the real result.
      fsp.unlink(tempFilePath).catch(() => {});
    }
  }

  // Runs yt-dlp and resolves when done. Rejects with ServiceUnavailableException
  // on timeout or BadRequestException on non-zero exit.
  private runYtDlp(
    ytDlpPath: string,
    args: string[],
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(ytDlpPath, args);
      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const timer = setTimeout(() => {
        proc.kill();
        settle(() => reject(new ServiceUnavailableException('yt-dlp timed out')));
      }, timeoutMs);

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (code !== 0) {
          settle(() => reject(new BadRequestException('Track not available from source')));
        } else {
          settle(() => resolve());
        }
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        settle(() => reject(err));
      });
    });
  }

  // Resolves the direct CDN audio URL without downloading any audio data (~1-2 s).
  // Used by LiveStreamService as Phase 1 before handing the URL to ffmpeg.
  // Prefers webm/opus; falls back to m4a/aac; falls back to best available audio.
  resolveUrl(externalId: string): Promise<{ url: string; mimeType: string }> {
    const ytDlpPath = this.configService.get<string>('YTDLP_PATH') ?? 'yt-dlp';

    return new Promise((resolve, reject) => {
      let url = '';
      let stderr = '';

      const proc = spawn(ytDlpPath, [
        '--get-url',
        '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        '--no-playlist',
        '--',
        externalId,
      ]);

      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error('yt-dlp URL resolution timed out after 15s'));
      }, 15_000);

      proc.stdout.on('data', (chunk: Buffer) => { url += chunk.toString(); });
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      proc.on('close', (code: number | null) => {
        clearTimeout(timeout);
        const cleanUrl = url.trim().split('\n')[0] ?? '';
        if (code !== 0 || !cleanUrl.startsWith('http')) {
          this.logger.warn(`yt-dlp --get-url failed for ${externalId}: ${stderr.slice(0, 200)}`);
          reject(new Error('Could not resolve stream URL'));
          return;
        }
        const mimeType = cleanUrl.includes('.webm') ? 'audio/webm' : 'audio/mp4';
        resolve({ url: cleanUrl, mimeType });
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // Pipes bestaudio from YouTube directly to stdout — no temp file, no transcode.
  // The caller owns the ChildProcess lifecycle (kill, error handling, etc.).
  // stdout will be in the track's native container (typically webm/opus from YouTube).
  streamTrack(externalId: string): { process: ChildProcess } {
    const ytDlpPath = this.configService.get<string>('YTDLP_PATH') ?? 'yt-dlp';
    const proc = spawn(ytDlpPath, [
      externalId,
      '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      '-o', '-',
      '--no-playlist',
      '--quiet',
      '--no-warnings',
    ]);
    return { process: proc };
  }

  // Public wrapper so LiveStreamService can extract duration from a completed
  // branch-B temp file without duplicating the yt-dlp --print duration logic.
  async getFileDuration(filePath: string): Promise<number> {
    const ytDlpPath = this.configService.get<string>('YTDLP_PATH') ?? 'yt-dlp';
    return this.extractDuration(ytDlpPath, filePath);
  }

  // Reads duration from the already-downloaded local file. Returns 0 on any failure.
  private extractDuration(ytDlpPath: string, filePath: string): Promise<number> {
    return new Promise((resolve) => {
      const proc = spawn(ytDlpPath, ['--print', 'duration', filePath]);
      const chunks: Buffer[] = [];

      proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));

      proc.on('close', (code: number | null) => {
        if (code !== 0) {
          resolve(0);
          return;
        }
        const raw = Buffer.concat(chunks).toString('utf-8').trim();
        const n = parseInt(raw, 10);
        resolve(isNaN(n) ? 0 : n);
      });

      proc.on('error', () => resolve(0));
    });
  }
}
