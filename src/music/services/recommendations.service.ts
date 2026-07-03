// src/music/services/recommendations.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// RecommendationsService
// ─────────────────────────────────────────────────────────────────────────────
// Orchestrates the full recommendation pipeline:
//   fetchAndStoreRecommendations — fire-and-forget, calls Last.fm then bulk-saves
//   prepareNextTrack             — awaited ~30 s before track ends; runs yt-dlp
//                                  search + ensureCached so audio is ready
//   getNextTrack                 — instant; serves an already-prepared track
//
// All public methods swallow errors — a recommendation failure must never
// surface to the user or disrupt playback of the current track.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { RecommendationCache } from '../entities/recommendation-cache.entity';
import { Track } from '../entities/track.entity';
import { UserMusicPreference } from '../entities/user-music-preference.entity';
import { ILastFmTrack } from '../interfaces/lastfm.interface';
import { YtDlpProvider } from '../providers/ytdlp.provider';
import { RecommendationCacheRepository } from '../repositories/recommendation-cache.repository';
import { TracksRepository } from '../repositories/tracks.repository';
import { LastFmService } from './lastfm.service';
import { TrackCacheService } from './track-cache.service';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly lastFmService: LastFmService,
    private readonly recommendationCacheRepository: RecommendationCacheRepository,
    private readonly trackCacheService: TrackCacheService,
    private readonly tracksRepository: TracksRepository,
    private readonly ytDlpProvider: YtDlpProvider,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // Fire-and-forget — caller does: void this.recommendationsService.fetchAndStoreRecommendations(...)
  // Stale rows for this source track are deleted atomically before inserting the fresh batch.
  // recommendedExternalId is stored as a 'lastfm:{artist}:{title}' placeholder; the real
  // YouTube ID is resolved lazily in prepareNextTrack via yt-dlp search.
  async fetchAndStoreRecommendations(
    sourceTrackId: string,
    artist: string,
    title: string,
  ): Promise<void> {
    try {
      const similar: ILastFmTrack[] = await this.lastFmService.getSimilarTracks(artist, title);

      if (similar.length === 0) {
        this.logger.warn(`No Last.fm results for "${artist} - ${title}"`);
        return;
      }

      // Look up the source track's YouTube externalId for the cache record.
      let sourceExternalId = '';
      try {
        const sourceTrack = await this.tracksRepository.findOne({ id: sourceTrackId } as any);
        sourceExternalId = sourceTrack.externalId;
      } catch {
        // Proceed with empty string if the track row isn't reachable yet.
      }

      await this.recommendationCacheRepository.deleteBySourceTrack(sourceTrackId);

      const rows = similar.map((t) =>
        this.dataSource.manager.create(RecommendationCache, {
          sourceTrackId,
          sourceExternalId,
          // Placeholder unique per recommendation. Overwritten with the real
          // YouTube ID in prepareNextTrack once yt-dlp resolves it.
          recommendedExternalId: `lastfm:${t.artist}:${t.title}`,
          recommendedTitle: t.title,
          recommendedArtist: t.artist,
          recommendedCoverUrl: t.coverUrl,
          matchScore: t.matchScore,
          apiSource: 'lastfm',
          isPrepared: false,
        }),
      );

      await this.dataSource.manager.save(RecommendationCache, rows);
      this.logger.log(`Stored ${rows.length} recommendations for track ${sourceTrackId}`);
    } catch (err: unknown) {
      this.logger.error(
        `fetchAndStoreRecommendations failed for ${sourceTrackId}: ${(err as Error).message}`,
      );
    }
  }

  // Awaited by the controller ~30 s before the current track ends.
  // Resolves the best unprepared recommendation's YouTube ID via yt-dlp search,
  // caches the audio, then marks it prepared for instant serving via getNextTrack.
  async prepareNextTrack(sourceTrackId: string): Promise<Track | null> {
    return this.doPrepareNextTrack(sourceTrackId, 0);
  }

  // Serves the already-prepared next track — no download, instant response.
  async getNextTrack(sourceTrackId: string): Promise<Track | null> {
    const prepared =
      await this.recommendationCacheRepository.findPreparedRecommendation(sourceTrackId);
    if (!prepared) return null;

    return this.tracksRepository.findByExternalId(prepared.recommendedExternalId);
  }

  async getRawRecommendations(sourceTrackId: string): Promise<RecommendationCache[]> {
    return this.recommendationCacheRepository.findBySourceTrack(sourceTrackId);
  }

  async cleanOldRecommendations(): Promise<void> {
    await this.recommendationCacheRepository.deleteOldCache(7);
    this.logger.log('cleanOldRecommendations: removed stale recommendations older than 7 days');
  }

  async getOrCreateUserPreference(userId: string): Promise<UserMusicPreference> {
    let pref = await this.dataSource.manager.findOne(UserMusicPreference, {
      where: { userId },
    });
    if (!pref) {
      pref = this.dataSource.manager.create(UserMusicPreference, {
        userId,
        seedArtists: [],
        seedGenres: [],
        preferredBitrate: 320,
      });
      pref = await this.dataSource.manager.save(UserMusicPreference, pref);
    }
    return pref;
  }

  // Max 1 retry: if the best recommendation's yt-dlp search fails, mark it
  // as prepared (to skip it on the next call) and try the second-best once.
  private async doPrepareNextTrack(sourceTrackId: string, attempt: number): Promise<Track | null> {
    try {
      const recommendation =
        await this.recommendationCacheRepository.findTopRecommendation(sourceTrackId);

      if (!recommendation) {
        this.logger.warn(`No unprepared recommendations found for track ${sourceTrackId}`);
        return null;
      }

      const searchResult = await this.ytDlpProvider.searchTrack(
        recommendation.recommendedArtist,
        recommendation.recommendedTitle,
      );

      if (!searchResult) {
        this.logger.warn(
          `yt-dlp search returned null for "${recommendation.recommendedArtist} - ${recommendation.recommendedTitle}"`,
        );
        // Mark as prepared so it's skipped on the next findTopRecommendation call.
        await this.recommendationCacheRepository.markAsPrepared(recommendation.id);
        if (attempt < 1) {
          return this.doPrepareNextTrack(sourceTrackId, attempt + 1);
        }
        return null;
      }

      // Replace the lastfm: placeholder with the real YouTube externalId so
      // getNextTrack can locate the cached Track via findByExternalId.
      await this.recommendationCacheRepository.findOneAndUpdate(
        { id: recommendation.id } as any,
        { recommendedExternalId: searchResult.externalId } as any,
      );

      const track = await this.trackCacheService.ensureCached(
        searchResult.externalId,
        searchResult.title,
        searchResult.artist,
        searchResult.coverUrl ?? undefined,
      );

      await this.recommendationCacheRepository.markAsPrepared(recommendation.id);

      return track;
    } catch (err: unknown) {
      this.logger.error(
        `prepareNextTrack (attempt ${attempt}) failed for ${sourceTrackId}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
