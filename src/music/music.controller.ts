// src/music/music.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// MusicController
// ─────────────────────────────────────────────────────────────────────────────
// Route order matters: static segments (search, history, presigned, stream,
// next, recommendations, prepare-next) MUST be declared before param routes
// (play/:trackId) to prevent NestJS from matching a literal segment as a param.
// ─────────────────────────────────────────────────────────────────────────────

import { ServerResponse } from 'http';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { RecommendationsService } from './services/recommendations.service';
import { TrackCacheService } from './services/track-cache.service';

@ApiTags('Music')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('music')
export class MusicController {
  constructor(
    private readonly tracksRepository: TracksRepository,
    private readonly awsService: AwsService,
    private readonly trackCacheService: TrackCacheService,
    private readonly recommendationsService: RecommendationsService,
    private readonly ytDlpProvider: YtDlpProvider,
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
  @ApiOperation({ summary: 'Byte-range audio stream proxied through the server (S3 URL never exposed)' })
  async streamTrack(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
    @CurrentUser() _payload: IPayload,
  ): Promise<void> {
    const track = await this.tracksRepository.findOne({ id: trackId } as any);
    if (!track.isCached || !track.s3Key) {
      throw new NotFoundException('Track not yet cached');
    }
    const rangeHeader = req.headers['range'] as string | undefined;
    await this.awsService.getStreamRange(track.s3Key, rangeHeader, res as unknown as ServerResponse);
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
  @ApiOperation({ summary: 'Play a discovery result by externalId — creates a DB stub if needed, then caches' })
  async playDiscovery(
    @Body() dto: PlayDiscoveryDto,
    @CurrentUser() _payload: IPayload,
  ) {
    const track = await this.tracksRepository.findOrCreate(
      dto.externalId,
      dto.title,
      dto.artist,
      dto.coverUrl ?? null,
    );

    if (track.isCached && track.s3Key) {
      void this.tracksRepository.incrementPlayCount(track.id);
      void this.recommendationsService.fetchAndStoreRecommendations(track.id, track.artist, track.title);
      const streamUrl = await this.awsService.getPresignedUrl(track.s3Key);
      return { track, streamUrl, caching: false };
    }

    void this.trackCacheService.ensureCached(
      track.externalId,
      track.title,
      track.artist,
      track.coverUrl ?? undefined,
    );
    return { track, streamUrl: null, caching: true };
  }

  @Post('play/:trackId')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Mark a track as playing; triggers recommendation fetch and play-count increment' })
  async play(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() _payload: IPayload,
  ) {
    const track = await this.tracksRepository.findOne({ id: trackId } as any);

    if (!track.isCached) {
      // Kick off background caching — frontend polls /music/presigned until ready.
      void this.trackCacheService.ensureCached(
        track.externalId,
        track.title,
        track.artist,
        track.coverUrl ?? undefined,
      );
      return { track, streamUrl: null, caching: true };
    }

    // Both fire-and-forget — play response must not block on Last.fm or DB write.
    void this.tracksRepository.incrementPlayCount(track.id);
    void this.recommendationsService.fetchAndStoreRecommendations(
      track.id,
      track.artist,
      track.title,
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
