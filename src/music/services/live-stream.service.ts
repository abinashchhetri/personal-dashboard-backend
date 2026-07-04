// src/music/services/live-stream.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// LiveStreamService
// ─────────────────────────────────────────────────────────────────────────────
// Implements "live tee" streaming for uncached tracks:
//
//   yt-dlp → stdout → ffmpeg stdin → ffmpeg stdout
//     ├─ Branch A: chunked HTTP to the current client
//     └─ Branch B: temp file → S3 upload → isCached: true (runs in background)
//
// WHY yt-dlp piped directly into ffmpeg (not --get-url):
// YouTube CDN URLs are IP-bound to the session that resolved them. When ffmpeg
// makes a separate TCP connection to the URL, YouTube sees a different IP
// context and returns 403 Forbidden. Piping yt-dlp stdout → ffmpeg stdin keeps
// everything in one process tree — yt-dlp handles cookies/IP/auth, ffmpeg just
// remuxes the raw bytes it receives.
//
// WHY Opus/WebM (not MP3): Opus at 128 kbps is ~3.8 MB for a 4-minute track
// versus ~10 MB at raw DASH bitrate. iOS Safari 15.4+ supports audio/webm with
// Opus. For older iOS, the stream path is the fallback (isCached=false) which
// redirects to the live stream; the presigned S3 URL path serves the webm directly.
//
// WHY no seek on the live path: we don't know Content-Length until the remux
// finishes, so we can't serve HTTP 206 byte-range responses. Seek becomes
// available automatically on next play once isCached flips true (S3 path).
//
// WHY StreamBroadcaster: a single ffmpeg process fans out to N HTTP responses
// without spawning N yt-dlp + ffmpeg processes. Branch B keeps running even
// after all HTTP consumers disconnect — a 90% downloaded track is never wasted.
// ─────────────────────────────────────────────────────────────────────────────

import { createWriteStream, promises as fsp } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import { PassThrough } from 'stream';
import { execSync, spawn } from 'child_process';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AwsService } from 'src/common/aws/aws.service';
import { Track } from '../entities/track.entity';
import { YtDlpProvider } from '../providers/ytdlp.provider';
import { TracksRepository } from '../repositories/tracks.repository';
import { MusicStorageService } from './music-storage.service';

// ─────────────────────────────────────────────────────────────────────────────
// StreamBroadcaster
// ─────────────────────────────────────────────────────────────────────────────
// Fans a single ffmpeg stdout out to multiple PassThrough consumers.
// All chunks are buffered in memory so late subscribers (e.g. a second tab
// that opens while the track is already 30 s in) hear from the beginning.
// Memory cost: ~3-15 MB per in-flight track (native opus bitrate).
// Chunks are retained until the broadcaster is GC'd (after inFlight deletion).
class StreamBroadcaster {
  private readonly chunks: Buffer[] = [];
  private readonly consumers = new Set<PassThrough>();
  private ended = false;
  private error?: Error;

  push(chunk: Buffer): void {
    this.chunks.push(chunk);
    for (const c of this.consumers) {
      if (!c.destroyed) c.write(chunk);
    }
  }

  finish(): void {
    this.ended = true;
    for (const c of this.consumers) {
      if (!c.destroyed) c.end();
    }
    this.consumers.clear();
  }

  fail(err: Error): void {
    this.error = err;
    for (const c of this.consumers) {
      if (!c.destroyed) c.destroy(err);
    }
    this.consumers.clear();
  }

  // Returns a PassThrough pre-loaded with every chunk received so far so that
  // late subscribers get the full audio from the beginning (replay semantics).
  // If the broadcaster already finished, the returned stream ends immediately
  // after replay. If it already errored, the error fires on the next tick.
  subscribe(): PassThrough {
    const consumer = new PassThrough();

    if (this.error) {
      // Use nextTick so the caller can attach .on('error') before it fires.
      const err = this.error;
      process.nextTick(() => consumer.destroy(err));
      return consumer;
    }

    for (const chunk of this.chunks) consumer.write(chunk);

    if (this.ended) {
      consumer.end();
      return consumer;
    }

    this.consumers.add(consumer);
    return consumer;
  }

  unsubscribe(consumer: PassThrough): void {
    this.consumers.delete(consumer);
    if (!consumer.destroyed) consumer.destroy();
  }
}

interface InFlightEntry {
  broadcaster: StreamBroadcaster;
}

@Injectable()
export class LiveStreamService {
  private readonly logger = new Logger(LiveStreamService.name);

  // Keyed by externalId (YouTube video ID). Entries live for the duration of
  // the ffmpeg remux + background S3 upload so that concurrent requests for the
  // same track fan-out to the same process rather than spawning twice.
  private readonly inFlight = new Map<string, InFlightEntry>();

  private readonly ffmpegPath: string;

  constructor(
    private readonly ytDlpProvider: YtDlpProvider,
    private readonly awsService: AwsService,
    private readonly tracksRepository: TracksRepository,
    private readonly configService: ConfigService,
    private readonly musicStorageService: MusicStorageService,
  ) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH') ?? 'ffmpeg';

    try {
      execSync(`"${this.ffmpegPath}" -version`, { stdio: 'ignore' });
    } catch {
      this.logger.error(
        'ffmpeg not found — live streaming will fail. ' +
          'Install: winget install ffmpeg (Windows) | apt install ffmpeg (Linux) | brew install ffmpeg (Mac)',
      );
    }

    // libopus is required for the 128 kbps Opus/WebM transcode. It ships with
    // Homebrew ffmpeg and apt ffmpeg; it is NOT included in minimal static builds
    // (e.g. ffmpeg-static npm package or some Docker images).
    try {
      const codecs = execSync(`"${this.ffmpegPath}" -codecs`, { encoding: 'utf8', stdio: 'pipe' });
      if (!codecs.includes('libopus')) {
        this.logger.error(
          'libopus codec not found in ffmpeg build — audio will not transcode to Opus. ' +
            'Fix: brew install ffmpeg (macOS) or apt install ffmpeg (Ubuntu).',
        );
      }
    } catch {
      this.logger.warn('Could not verify libopus availability — ffmpeg -codecs failed');
    }
  }

  // Public entry point called by MusicController for every uncached stream request.
  // Returns when the consumer's stream ends, errors, or the client disconnects.
  async streamLive(track: Track, req: IncomingMessage, res: ServerResponse): Promise<void> {
    let entry = this.inFlight.get(track.externalId);

    if (!entry) {
      const broadcaster = new StreamBroadcaster();
      entry = { broadcaster };
      this.inFlight.set(track.externalId, entry);

      // runFfmpegStream manages URL resolution + ffmpeg lifecycle + branch-B upload.
      // Runs concurrently — NOT awaited here so the HTTP response isn't blocked
      // on the background S3 upload. inFlight is cleaned up in .finally().
      this.runFfmpegStream(track, broadcaster).finally(() => {
        this.inFlight.delete(track.externalId);
      });
    } else {
      this.logger.log(`Fan-out: attaching second consumer to in-flight stream for ${track.externalId}`);
    }

    return this.attachAndWait(entry.broadcaster, req, res);
  }

  // Subscribes one HTTP response to the broadcaster and waits until that
  // specific consumer is done (stream ended, error, or client disconnected).
  private attachAndWait(
    broadcaster: StreamBroadcaster,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const consumer = broadcaster.subscribe();

      consumer.on('data', (chunk: Buffer) => {
        if (!res.headersSent) {
          // Commit to streaming on first byte — we're past the point of no
          // return. No Content-Length: chunked transfer, no seek support.
          res.writeHead(200, {
            'Content-Type': 'audio/webm; codecs=opus',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-store',
            // Disable proxy/nginx buffering so bytes reach the player immediately.
            'X-Accel-Buffering': 'no',
            // Prevent MIME sniffing — browser must respect the declared Content-Type.
            'X-Content-Type-Options': 'nosniff',
            // Informational: signals that this is a live chunked stream, not a file.
            'X-Stream-Mode': 'live',
          });
        }
        if (!res.writableEnded) res.write(chunk);
      });

      consumer.on('end', () => {
        if (!res.writableEnded) res.end();
        resolve();
      });

      consumer.on('error', () => {
        // Error already logged in runFfmpegStream.
        if (!res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Track stream unavailable' }));
        } else if (!res.writableEnded) {
          res.end();
        }
        resolve();
      });

      // Client disconnected — detach from broadcaster so future chunks don't get
      // pushed to a closed socket. Branch B (file write + S3 upload) continues
      // independently because it reads from ffmpeg stdout via broadcaster.push(),
      // not from this consumer — a disconnect never cancels the background cache write.
      req.once('close', () => {
        broadcaster.unsubscribe(consumer);
        resolve();
      });
    });
  }

  // yt-dlp → ffmpeg pipe pipeline:
  //   yt-dlp downloads audio and writes raw bytes to stdout.
  //   ffmpeg reads from stdin and transcodes to MP3, writing to its stdout.
  //   All ffmpeg stdout bytes fan to: broadcaster (branch A) and temp file (branch B).
  //   On ffmpeg exit 0: broadcast ends, file flushed → S3 upload → isCached: true.
  private async runFfmpegStream(track: Track, broadcaster: StreamBroadcaster): Promise<void> {
    const tempDir = this.configService.get<string>('YTDLP_TEMP_DIR') ?? '/tmp/sajilo-khata-audio';
    await fsp.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `live-${track.id}-${Date.now()}.webm`);
    const fileStream = createWriteStream(tempFilePath);

    const ytDlpPath = this.configService.get<string>('YTDLP_PATH') ?? 'yt-dlp';

    // yt-dlp pipes raw audio bytes to stdout. Using -o - avoids the --get-url
    // approach where ffmpeg would fetch the CDN URL in a separate connection
    // and get 403 (YouTube CDN URLs are IP-bound to the resolving session).
    const ytDlpProc = spawn(
      ytDlpPath,
      [
        '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        '--no-playlist',
        '-o', '-',             // pipe audio bytes to stdout
        '--', track.externalId,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const ffmpegProc = spawn(
      this.ffmpegPath,
      [
        '-i', 'pipe:0',            // read from stdin (yt-dlp's bytes)
        '-vn',                     // strip video track
        '-c:a', 'libopus',         // transcode to Opus — 62% smaller than raw DASH bitrate
        '-b:a', '128k',            // 128 kbps target bitrate (~3.8 MB per 4-min track)
        '-vbr', 'on',              // variable bitrate: quiet passages use fewer bits
        '-compression_level', '10', // max Opus encoder effort — CPU-cheap, best size
        '-f', 'webm',
        'pipe:1',                  // output to stdout
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    // Wire yt-dlp stdout → ffmpeg stdin. Node stream pipe() ends the destination
    // automatically when the source ends, signalling ffmpeg to flush and exit.
    ytDlpProc.stdout!.pipe(ffmpegProc.stdin!);

    // Suppress EPIPE on ffmpeg stdin (fires if ffmpeg exits before yt-dlp finishes).
    ffmpegProc.stdin!.on('error', () => {});

    ytDlpProc.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString();
      if (msg.includes('ERROR') || msg.includes('error')) {
        this.logger.warn(`yt-dlp: ${msg.trim().slice(0, 200)}`);
      }
    });

    ytDlpProc.on('error', (err: Error) => {
      this.logger.error(`yt-dlp spawn error for ${track.externalId}: ${err.message}`);
      ffmpegProc.stdin?.destroy();
    });

    const ffmpegStdout = ffmpegProc.stdout!;
    let firstByteSeen = false;

    // Kill both processes if no MP3 bytes appear within 30 s. yt-dlp needs time
    // to fetch the manifest + start downloading before ffmpeg produces anything.
    const firstByteTimer = setTimeout(() => {
      ytDlpProc.kill('SIGKILL');
      ffmpegProc.kill('SIGKILL');
      this.logger.warn(`Pipeline timed out (no bytes in 30s) for ${track.externalId}`);
    }, 30_000);

    return new Promise<void>((resolve) => {
      ffmpegStdout.on('data', (chunk: Buffer) => {
        if (!firstByteSeen) {
          firstByteSeen = true;
          clearTimeout(firstByteTimer);
          this.logger.log(`First audio byte received for ${track.externalId}`);
        }
        // Branch A: fan to all HTTP consumers.
        broadcaster.push(chunk);
        // Branch B: write to temp file for S3 upload.
        if (!fileStream.destroyed) fileStream.write(chunk);
      });

      ffmpegStdout.on('error', (err: Error) => {
        clearTimeout(firstByteTimer);
        this.logger.error(`ffmpeg stdout error for ${track.externalId}: ${err.message}`);
        broadcaster.fail(err);
        fileStream.destroy();
        ytDlpProc.kill('SIGKILL');
        fsp.unlink(tempFilePath).catch(() => {});
        resolve();
      });

      ffmpegProc.stderr?.on('data', (chunk: Buffer) => {
        const msg = chunk.toString();
        if (msg.includes('Error') || msg.includes('error')) {
          this.logger.warn(`ffmpeg: ${msg.trim().slice(0, 200)}`);
        }
      });

      ffmpegProc.on('close', (code: number | null) => {
        clearTimeout(firstByteTimer);
        ytDlpProc.kill('SIGKILL'); // no-op if already exited

        if (!firstByteSeen) {
          const err = new Error(`Pipeline exited (${String(code)}) before producing output`);
          this.logger.warn(`Live stream failed before first byte for ${track.externalId}`);
          broadcaster.fail(err);
          fileStream.destroy();
          fsp.unlink(tempFilePath).catch(() => {});
          resolve();
          return;
        }

        broadcaster.finish();

        fileStream.end(() => {
          if (code === 0) {
            this.uploadAndMarkCached(track, tempFilePath)
              .catch((err: Error) =>
                this.logger.error(`S3 upload failed for ${track.id}: ${err.message}`),
              )
              .finally(resolve);
          } else {
            this.logger.warn(
              `ffmpeg exited ${String(code)} for ${track.externalId} — discarding temp file`,
            );
            fsp.unlink(tempFilePath).catch(() => {});
            resolve();
          }
        });
      });

      ffmpegProc.on('error', (err: Error) => {
        clearTimeout(firstByteTimer);
        this.logger.error(`ffmpeg spawn error for ${track.externalId}: ${err.message}`);
        broadcaster.fail(err);
        fileStream.destroy();
        ytDlpProc.kill('SIGKILL');
        fsp.unlink(tempFilePath).catch(() => {});
        resolve();
      });
    });
  }

  // Uploads the completed branch-B temp file to S3 and flips isCached: true.
  // Uses MusicStorageService.uploadTrack which delegates multipart/single-part
  // decision to AwsService — callers don't need to know the threshold.
  private async uploadAndMarkCached(track: Track, tempFilePath: string): Promise<void> {
    try {
      const buffer = await fsp.readFile(tempFilePath);
      const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, '').trim() || 'Unknown';

      const s3Key = await this.musicStorageService.uploadTrack(buffer, track.id, 'webm', {
        'x-track-id': track.id,
        'x-external-id': track.externalId,
        'x-artist': ascii(track.artist),
        'x-title': ascii(track.title),
      });

      const durationSeconds = await this.ytDlpProvider.getFileDuration(tempFilePath);

      await this.tracksRepository.findOneAndUpdate(
        { id: track.id } as any,
        {
          isCached: true,
          s3Key,
          duration: durationSeconds || null,
          fileSizeBytes: buffer.length,
          metadata: { source: 'youtube', mimeType: 'audio/webm' },
        } as any,
      );

      this.logger.log(`Live-cached track ${track.id} (${track.externalId}) → ${s3Key}`);
    } finally {
      fsp.unlink(tempFilePath).catch(() => {});
    }
  }
}
