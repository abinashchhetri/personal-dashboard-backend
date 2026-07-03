// src/music/tasks/music-cleanup.task.ts
// ─────────────────────────────────────────────────────────────────────────────
// MusicCleanupTask
// ─────────────────────────────────────────────────────────────────────────────
// Daily 3 AM cron job: removes recommendation rows older than 7 days and
// temp audio files left over from interrupted downloads.
// A crash here must NEVER take down the NestJS process — the outer try/catch
// swallows any error and logs it.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { RecommendationsService } from '../services/recommendations.service';
import { TrackCacheService } from '../services/track-cache.service';

@Injectable()
export class MusicCleanupTask {
  private readonly logger = new Logger(MusicCleanupTask.name);

  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly trackCacheService: TrackCacheService,
  ) {}

  @Cron('0 3 * * *')
  async runDailyCleanup(): Promise<void> {
    try {
      await this.recommendationsService.cleanOldRecommendations();
      await this.trackCacheService.cleanupTempFiles();
      this.logger.log('Daily music cleanup completed');
    } catch (err: unknown) {
      this.logger.error(`Daily music cleanup failed: ${(err as Error).message}`);
    }
  }
}
