// src/music/services/track-cache.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// TrackCacheService
// ─────────────────────────────────────────────────────────────────────────────
// Single entry point for audio caching: ensureCached() checks the local DB +
// S3 first, downloads via YtDlpProvider only when needed, then stores to S3.
//
// Transaction design: the DB record is committed with isCached: false BEFORE
// the download starts. A 90-second download must never hold a DB transaction
// open — that would lock the row and starve concurrent requests for the same
// track. The isCached: false flag acts as an application-level "in progress"
// lock; concurrent requests see it via checkLocalCache and wait for the next
// ensureCached cycle to find it cached.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fsp } from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AwsService } from 'src/common/aws/aws.service';
import { Track } from '../entities/track.entity';
import { TrackSourceEnum } from '../enums/track-source.enum';
import { TracksRepository } from '../repositories/tracks.repository';
import { YtDlpProvider } from '../providers/ytdlp.provider';

@Injectable()
export class TrackCacheService {
  private readonly logger = new Logger(TrackCacheService.name);

  constructor(
    private readonly tracksRepository: TracksRepository,
    private readonly awsService: AwsService,
    private readonly ytDlpProvider: YtDlpProvider,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // Cache hit only if the track exists AND isCached = true AND s3Key is set.
  // Returns null on a miss or if a previous download is still in progress.
  async checkLocalCache(externalId: string): Promise<Track | null> {
    const track = await this.tracksRepository.findByExternalId(externalId);
    if (track?.isCached && track.s3Key) return track;
    return null;
  }

  // Full download pipeline. Commits the DB record BEFORE the yt-dlp download
  // so the transaction never stays open for the 60-90 s the download takes.
  async cacheTrack(
    externalId: string,
    title: string,
    artist: string,
    coverUrl?: string,
  ): Promise<Track> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let committed = false;
    let track!: Track;

    try {
      // Re-check inside the transaction to prevent a race between two concurrent
      // requests for the same externalId.
      const existing = await qr.manager.findOne(Track, { where: { externalId } });
      if (existing?.isCached) {
        await qr.commitTransaction();
        return existing;
      }

      if (existing) {
        // Reuse the existing row — just re-attempt the download.
        track = existing;
      } else {
        track = qr.manager.create(Track, {
          externalId,
          title,
          artist,
          coverUrl: coverUrl ?? null,
          source: TrackSourceEnum.YOUTUBE,
          isCached: false,
        });
        track = await qr.manager.save(Track, track);
      }

      // Commit the record creation first — the download must NOT be inside a
      // DB transaction (see file-header comment).
      await qr.commitTransaction();
      committed = true;

      // ── Download (outside transaction) ─────────────────────────────────────
      const { buffer, durationSeconds, fileSizeBytes } =
        await this.ytDlpProvider.downloadTrack(externalId, title, artist);

      // ── S3 Upload ──────────────────────────────────────────────────────────
      // S3 metadata travels as HTTP headers — strip anything outside printable
      // ASCII (0x20–0x7E) so the SDK doesn't throw ERR_INVALID_CHAR.
      const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, '').trim() || 'Unknown';

      const s3Key = this.awsService.buildMusicKey(track.id);
      await this.awsService.uploadFile(buffer, s3Key, 'audio/mpeg', {
        'x-track-id': track.id,
        'x-external-id': externalId,
        'x-artist': ascii(artist),
        'x-title': ascii(title),
      });

      // ── Mark cached ────────────────────────────────────────────────────────
      await this.tracksRepository.findOneAndUpdate(
        { id: track.id } as any,
        {
          isCached: true,
          s3Key,
          duration: durationSeconds,
          fileSizeBytes,
          metadata: { source: 'youtube' },
        } as any,
      );

      return this.tracksRepository.findOne({ id: track.id } as any);
    } catch (err: unknown) {
      // Only rollback if the transaction hasn't been committed yet. After
      // commit, the isCached: false row stays — the next ensureCached call
      // will retry. Never delete it — a concurrent request may hold a reference.
      if (!committed) {
        await qr.rollbackTransaction();
      }
      this.logger.error(
        `cacheTrack failed for ${externalId}: ${(err as Error).message}`,
      );
      throw err;
    } finally {
      // release() is safe to call whether committed or rolled back.
      await qr.release();
    }
  }

  // Only public entry point — always call this, never checkLocalCache or
  // cacheTrack directly from outside this service.
  async ensureCached(
    externalId: string,
    title: string,
    artist: string,
    coverUrl?: string,
  ): Promise<Track> {
    const cached = await this.checkLocalCache(externalId);
    if (cached) return cached;
    return this.cacheTrack(externalId, title, artist, coverUrl);
  }

  // Maintenance task — removes stale temp files older than 1 hour.
  // Never throws — this runs as a background job, failures are logged only.
  async cleanupTempFiles(): Promise<void> {
    const tempDir =
      this.configService.get<string>('YTDLP_TEMP_DIR') ?? '/tmp/sajilo-khata-audio';

    try {
      const files = await fsp.readdir(tempDir).catch(() => [] as string[]);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.mp3')) continue;
        const filePath = path.join(tempDir, file);
        try {
          const stat = await fsp.stat(filePath);
          if (stat.mtimeMs < oneHourAgo) {
            await fsp.unlink(filePath);
            cleaned++;
          }
        } catch {
          // Stat or unlink failed — skip this file silently.
        }
      }

      this.logger.log(`cleanupTempFiles: removed ${cleaned} stale file(s) from ${tempDir}`);
    } catch (err: unknown) {
      this.logger.warn(`cleanupTempFiles: ${(err as Error).message}`);
    }
  }
}
