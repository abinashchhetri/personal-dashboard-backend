// src/music/music.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// MusicController
// ─────────────────────────────────────────────────────────────────────────────
// Route order matters: static segments (search, history, presigned, stream,
// next, recommendations, prepare-next) MUST be declared before param routes
// (play/:trackId) to prevent NestJS from matching a literal segment as a param.
// ─────────────────────────────────────────────────────────────────────────────

import { IncomingMessage, ServerResponse } from 'http';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';
import { IPayload } from 'src/common/interfaces';
import { AwsService } from 'src/common/aws/aws.service';

import { FindMusicDto } from './dto/find-music.dto';
import { FindMusicQueryDto, IDiscoveryTrack } from './dto/find-music-query.dto';
import { PlayDiscoveryDto } from './dto/play-discovery.dto';
import { PrepareNextDto } from './dto/prepare-next.dto';
import { YtDlpProvider } from './providers/ytdlp.provider';
import { TracksRepository } from './repositories/tracks.repository';
import { LiveStreamService } from './services/live-stream.service';
import { MusicQueueService } from './services/music-queue.service';
import { RecommendationsService } from './services/recommendations.service';
import { TrackCacheService } from './services/track-cache.service';

@ApiTags('Music')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('music')
export class MusicController {
  private readonly logger = new Logger(MusicController.name);

  constructor(
    private readonly tracksRepository: TracksRepository,
    private readonly awsService: AwsService,
    private readonly liveStreamService: LiveStreamService,
    private readonly recommendationsService: RecommendationsService,
    private readonly ytDlpProvider: YtDlpProvider,
    private readonly musicQueueService: MusicQueueService,
    private readonly trackCacheService: TrackCacheService,
  ) {}

  // ── Static routes first — must be declared before any /:trackId param routes ──

  @Get('search')
  @ApiOperation({ summary: 'Search cached tracks by title or artist' })
  async search(@Query() dto: FindMusicDto, @CurrentUser() _payload: IPayload) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    if (!dto.q) {
      return { data: [], total: 0, page, limit };
    }

    const [tracks, total] = await this.tracksRepository.searchByQuery(dto.q, page, limit);
    return { data: tracks, total, page, limit };
  }

  @Get('history')
  @ApiOperation({ summary: 'Recently played cached tracks ordered by lastPlayedAt' })
  async history(@Query() dto: PaginationQueryDto, @CurrentUser() _payload: IPayload) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const [tracks, total] = await this.tracksRepository.findCachedTracks(page, limit);
    return { data: tracks, total, page, limit };
  }

  @Get('find')
  @ApiOperation({ summary: 'Discover tracks from YouTube live — no caching required' })
  @ApiQuery({ name: 'q', required: true, description: 'Artist, title, or freeform query' })
  async find(
    @Query() dto: FindMusicQueryDto,
    @CurrentUser() _payload: IPayload,
  ): Promise<{ results: IDiscoveryTrack[]; total: number }> {
    const ytResults = await this.ytDlpProvider.searchTracks(dto.q, 8);

    if (ytResults.length === 0) {
      return { results: [], total: 0 };
    }

    const existing = await this.tracksRepository.findByExternalIds(
      ytResults.map((r) => r.externalId),
    );
    const existingMap = new Map(existing.map((t) => [t.externalId, t]));

    const results: IDiscoveryTrack[] = ytResults.map((r) => {
      const track = existingMap.get(r.externalId);
      if (track) {
        return {
          id: track.id,
          externalId: track.externalId,
          title: track.title,
          artist: track.artist,
          coverUrl: track.coverUrl ?? null,
          durationSeconds: track.duration ?? r.durationSeconds,
          isCached: track.isCached,
          source: 'YOUTUBE' as const,
        };
      }
      return {
        id: null,
        externalId: r.externalId,
        title: r.title,
        artist: r.artist,
        coverUrl: r.coverUrl,
        durationSeconds: r.durationSeconds,
        isCached: false,
        source: 'YOUTUBE' as const,
      };
    });

    return { results, total: results.length };
  }

  @Get('queue')
  @ApiOperation({ summary: 'Current queue state — track list and position count' })
  getQueue(@CurrentUser() payload: IPayload) {
    const entries = this.musicQueueService.getQueue(payload.id);
    return {
      length: entries.length,
      tracks: entries.map((e) => ({ track: e.track, preparedAt: e.preparedAt })),
    };
  }

  @Get('queue/peek')
  @ApiOperation({ summary: 'Return next queued track without advancing — call at ~30 s remaining' })
  async peekQueue(@CurrentUser() payload: IPayload) {
    const next = await this.musicQueueService.peekNext(payload.id);
    if (!next) return { ready: false, track: null, streamUrl: null };
    return { ready: true, track: next.track, streamUrl: next.streamUrl };
  }

  @Post('queue/advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pop the front of the queue and return the new next track — call on onEnded' })
  async advanceQueue(@CurrentUser() payload: IPayload) {
    const next = await this.musicQueueService.advance(payload.id);
    if (!next) return { ready: false, track: null, streamUrl: null };
    return { ready: true, track: next.track, streamUrl: next.streamUrl };
  }

  @Get('presigned/:trackId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get a short-lived pre-signed URL for direct audio playback' })
  async getPresignedUrl(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() _payload: IPayload,
  ) {
    const track = await this.tracksRepository.findOne({ id: trackId } as any);
    if (!track.isCached || !track.s3Key) {
      throw new NotFoundException('Track not yet cached');
    }
    const streamUrl = await this.awsService.getPresignedUrl(track.s3Key);
    return { streamUrl, track, expiresIn: 3600 };
  }

  // passthrough: false prevents NestJS from trying to wrap the piped stream in
  // the TransformInterceptor's { success, data } envelope — that would corrupt audio.
  @Get('stream/:trackId')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Audio stream — byte-range S3 proxy if cached, live tee from yt-dlp if not' })
  async streamTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
    @CurrentUser() _payload: IPayload,
  ): Promise<void> {
    const track = await this.tracksRepository.findOne({ id: trackId } as any);
    const serverRes = res as unknown as ServerResponse;

    if (track.isCached && track.s3Key) {
      // Cached path: full byte-range S3 proxy — seekable, behavior unchanged.
      // Content-Type from metadata for live-cached webm tracks; falls back to
      // audio/mpeg for legacy mp3 tracks cached via the old TrackCacheService path.
      const contentType = (track.metadata?.['mimeType'] as string | undefined) ?? 'audio/mpeg';
      const rangeHeader = req.headers['range'] as string | undefined;
      await this.awsService.getStreamRange(track.s3Key, rangeHeader, serverRes, contentType);
    } else {
      // Live path: yt-dlp stdout → client (branch A) + temp file → S3 (branch B).
      // No seek support on this path: we don't know Content-Length until the download
      // completes, so HTTP 206 byte-range responses are not possible. Seek becomes
      // available automatically on the next play once isCached flips true.
      await this.liveStreamService.streamLive(
        track,
        req as unknown as IncomingMessage,
        serverRes,
      );
    }
  }

  @Get('next/:currentTrackId')
  @ApiOperation({ summary: 'Return the already-prepared next-up track (instant, no download)' })
  async getNextTrack(
    @Param('currentTrackId', ParseUUIDPipe) currentTrackId: string,
    @CurrentUser() _payload: IPayload,
  ) {
    const track = await this.recommendationsService.getNextTrack(currentTrackId);
    if (!track || !track.s3Key) {
      return { ready: false, track: null, streamUrl: null };
    }
    const streamUrl = await this.awsService.getPresignedUrl(track.s3Key);
    return { ready: true, track, streamUrl };
  }

  @Get('recommendations/:trackId')
  @ApiOperation({ summary: 'Raw Last.fm recommendation rows for a source track' })
  async getRecommendations(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() _payload: IPayload,
  ) {
    return this.recommendationsService.getRawRecommendations(trackId);
  }

  // ── Param routes — declared after all static routes ──────────────────────────

  @Post('play-discovery')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Download (if needed) and play a discovery track — blocks until file is on S3' })
  async playDiscovery(
    @Body() dto: PlayDiscoveryDto,
    @CurrentUser() payload: IPayload,
  ) {
    // ensureCached blocks until the audio file is downloaded and uploaded to S3.
    // For already-cached tracks this returns instantly; for new tracks it takes
    // 5–30 s. The client shows a spinner for the whole duration and receives a
    // valid presigned S3 URL in the response — no more "streamUrl: null" race
    // that caused the live-stream path to fail through the Cloudflare tunnel.
    const track = await this.trackCacheService.ensureCached(
      dto.externalId,
      dto.title,
      dto.artist,
      dto.coverUrl ?? undefined,
    );

    void this.tracksRepository.incrementPlayCount(track.id);
    void this.recommendationsService.fetchAndStoreRecommendations(
      track.id,
      track.artist,
      track.title,
    );
    this.musicQueueService.onTrackStarted(payload.id, track).catch((err: unknown) =>
      this.logger.error(`Queue notification failed: ${(err as Error).message}`),
    );

    const streamUrl = await this.awsService.getPresignedUrl(track.s3Key!);
    return { track, streamUrl, caching: false };
  }

  @Post('play/:trackId')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Mark a track as playing; triggers recommendation fetch and play-count increment' })
  async play(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() payload: IPayload,
  ) {
    const track = await this.tracksRepository.findOne({ id: trackId } as any);

    if (!track.isCached) {
      // Not cached — live-tee handles download + S3 when the client calls GET /music/stream.
      return { track, streamUrl: null, caching: true };
    }

    // Both fire-and-forget — play response must not block on Last.fm or DB write.
    void this.tracksRepository.incrementPlayCount(track.id);
    void this.recommendationsService.fetchAndStoreRecommendations(
      track.id,
      track.artist,
      track.title,
    );
    // Notify queue service that this track started — triggers background queue fill.
    this.musicQueueService.onTrackStarted(payload.id, track).catch((err: unknown) =>
      this.logger.error(`Queue notification failed: ${(err as Error).message}`),
    );

    const streamUrl = await this.awsService.getPresignedUrl(track.s3Key!);
    return { track, streamUrl };
  }

  @Post('prepare-next')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Pre-fetch and cache the recommended next track (~30 s before current track ends)' })
  async prepareNext(
    @Body() dto: PrepareNextDto,
    @CurrentUser() _payload: IPayload,
  ) {
    // Verify the current track exists — throws NotFoundException if not.
    await this.tracksRepository.findOne({ id: dto.currentTrackId } as any);

    const track = await this.recommendationsService.prepareNextTrack(dto.currentTrackId);
    if (!track || !track.s3Key) {
      return { ready: false, track: null, streamUrl: null };
    }
    const streamUrl = await this.awsService.getPresignedUrl(track.s3Key);
    return { ready: true, track, streamUrl };
  }
}
