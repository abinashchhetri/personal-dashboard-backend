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
import { cleanYouTubeTitle } from '../utils/title-cleaner.util';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  // Per-sourceTrackId in-flight map. Stores the active Promise so that concurrent
  // callers (play handler fire-and-forget + fillQueueInBackground) await the SAME
  // Last.fm call instead of each starting their own. A Set<string> only prevents
  // double execution — it caused the queue to stay empty because the second caller
  // returned immediately, called prepareNextTrack with 0 rows, and exited the loop
  // before the first caller finished writing to the DB.
  private readonly runningFetches = new Map<string, Promise<void>>();

  constructor(
    private readonly lastFmService: LastFmService,
    private readonly recommendationCacheRepository: RecommendationCacheRepository,
    private readonly trackCacheService: TrackCacheService,
    private readonly tracksRepository: TracksRepository,
    private readonly ytDlpProvider: YtDlpProvider,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // Public entry point. The play handler fires this as void (fire-and-forget)
  // while fillQueueInBackground also calls it when 0 rows exist — which happens on
  // every first play because the fire-and-forget hasn't resolved yet.
  // Both callers receive the SAME in-flight Promise. When Last.fm returns, both
  // unblock together and prepareNextTrack finds rows in the DB.
  // (Old behaviour: second caller got an immediate return, called prepareNextTrack
  // with 0 rows, and the fill loop exited — queue stayed empty.)
  async fetchAndStoreRecommendations(
    sourceTrackId: string,
    artist: string,
    title: string,
  ): Promise<void> {
    const inFlight = this.runningFetches.get(sourceTrackId);
    if (inFlight) {
      this.logger.log(`fetchAndStoreRecommendations in-flight for ${sourceTrackId} — joining existing call`);
      return inFlight;
    }

    const promise = this.doFetchAndStore(sourceTrackId, artist, title)
      .finally(() => this.runningFetches.delete(sourceTrackId));
    this.runningFetches.set(sourceTrackId, promise);
    return promise;
  }

  // Actual Last.fm + fallback logic. Never called directly — always through
  // fetchAndStoreRecommendations which ensures at most one execution per sourceTrackId.
  private async doFetchAndStore(
    sourceTrackId: string,
    artist: string,
    title: string,
  ): Promise<void> {
    try {
      // Prefer cleanTitle/cleanArtist already stored on the Track entity — raw YouTube
      // titles ("Lil Jhola @KRIZN (Official Music Video)") return zero Last.fm results.
      // Fall back to running the cleaner if the Track row is unavailable or predates
      // the cleanTitle column (null on rows created before this fix was deployed).
      let track: Track | null = null;
      try {
        track = await this.tracksRepository.findOne({ id: sourceTrackId } as any);
      } catch {
        // Track row not reachable yet — proceed without it.
      }

      const cleaned = cleanYouTubeTitle(title, artist);
      const searchArtist = track?.cleanArtist ?? cleaned.cleanArtist;
      const searchTitle = track?.cleanTitle ?? cleaned.cleanTitle;

      // Lazily backfill cleanTitle/cleanArtist for pre-migration rows.
      if (track && (!track.cleanTitle || !track.cleanArtist)) {
        try {
          await this.tracksRepository.findOneAndUpdate(
            { id: track.id } as any,
            { cleanTitle: searchTitle, cleanArtist: searchArtist } as any,
          );
        } catch {
          // Non-critical — the recommendation can still proceed without saving.
        }
      }

      this.logger.log(`Last.fm search: "${searchArtist}" — "${searchTitle}"`);

      const similar: ILastFmTrack[] = await this.lastFmService.getSimilarTracks(
        searchArtist,
        searchTitle,
      );

      if (similar.length === 0) {
        this.logger.warn(
          `Last.fm: no results for "${searchArtist} - ${searchTitle}". Running fallbacks.`,
        );
        await this.runFallbackRecommendations(sourceTrackId, track);
        return;
      }

      await this.storeRecommendations(sourceTrackId, similar);
    } catch (err: unknown) {
      this.logger.error(
        `fetchAndStoreRecommendations failed for ${sourceTrackId}: ${(err as Error).message}`,
      );
    }
  }

  // Stores a batch of recommendations, replacing any stale rows for this source track.
  // All three code paths (Last.fm similar, artist top tracks, recently played) funnel here.
  private async storeRecommendations(
    sourceTrackId: string,
    items: ILastFmTrack[],
  ): Promise<void> {
    let sourceExternalId = '';
    try {
      const sourceTrack = await this.tracksRepository.findOne({ id: sourceTrackId } as any);
      sourceExternalId = sourceTrack.externalId;
    } catch {
      // Proceed with empty string if the track row isn't reachable yet.
    }

    await this.recommendationCacheRepository.deleteBySourceTrack(sourceTrackId);

    const rows = items.map((t) =>
      this.dataSource.manager.create(RecommendationCache, {
        sourceTrackId,
        sourceExternalId,
        // Placeholder overwritten with the real YouTube ID in prepareNextTrack.
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
  }

  // Called when Last.fm track.getSimilar returns zero results.
  // Three escalating fallbacks so playback never stops with an empty queue.
  private async runFallbackRecommendations(
    sourceTrackId: string,
    track: Track | null,
  ): Promise<void> {
    // Fallback 1: artist.getTopTracks — broader than track.getSimilar, works when the
    // track is too obscure for Last.fm but the artist is known.
    if (track?.cleanArtist) {
      const artistTracks = await this.lastFmService.getTopTracksForArtist(track.cleanArtist);
      if (artistTracks.length > 0) {
        this.logger.log(`Fallback 1 success: artist top tracks for "${track.cleanArtist}"`);
        await this.storeRecommendations(sourceTrackId, artistTracks);
        return;
      }
    }

    // Fallback 2: Recently cached tracks the user has actually played.
    // These are guaranteed streamable (isCached=true) and genre-adjacent
    // since the user chose to play them before.
    const recentTracks = await this.tracksRepository.entityRepository.find({
      where: { isCached: true },
      order: { lastPlayedAt: 'DESC' },
      take: 10,
    });

    if (recentTracks.length > 0) {
      this.logger.log(`Fallback 2: using ${recentTracks.length} recently played tracks`);
      const candidates = recentTracks.filter((t) => t.id !== sourceTrackId);
      const fallbackItems: ILastFmTrack[] = candidates.map((t) => ({
        title: t.cleanTitle ?? t.title,
        artist: t.cleanArtist ?? t.artist,
        coverUrl: t.coverUrl,
        matchScore: 0.3, // low score — these are fallbacks, not real recommendations
        externalId: null,
      }));
      await this.storeRecommendations(sourceTrackId, fallbackItems);
      return;
    }

    // Fallback 3: Nothing at all — log and give up gracefully.
    this.logger.warn(`All recommendation fallbacks exhausted for track ${sourceTrackId}`);
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

  // Returns the top N recommendations by matchScore for a source track.
  // Includes both prepared and unprepared rows — used by MusicQueueService to
  // check whether recommendations exist before deciding to call Last.fm again.
  async getTopNRecommendations(
    sourceTrackId: string,
    limit: number = 5,
  ): Promise<RecommendationCache[]> {
    return this.recommendationCacheRepository.entityRepository.find({
      where: { sourceTrackId },
      order: { matchScore: 'DESC' },
      take: limit,
    });
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
      // Use entityRepository.update directly (not findOneAndUpdate) because
      // a concurrent fetchAndStoreRecommendations may have already called
      // deleteBySourceTrack and re-inserted fresh rows with new IDs — meaning
      // this specific row was deleted. That is recoverable: skip and retry.
      const { affected } = await this.recommendationCacheRepository.entityRepository.update(
        { id: recommendation.id },
        { recommendedExternalId: searchResult.externalId },
      );
      if (!affected) {
        this.logger.warn(
          `Recommendation ${recommendation.id} was invalidated by a concurrent fetch — skipping to next`,
        );
        if (attempt < 1) return this.doPrepareNextTrack(sourceTrackId, attempt + 1);
        return null;
      }

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
