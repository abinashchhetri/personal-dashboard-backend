// src/music/music.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// MusicModule
// ─────────────────────────────────────────────────────────────────────────────
// Registers all music feature providers: track cache pipeline, Last.fm service,
// recommendations engine, the 3 AM daily cleanup scheduler, and the HTTP controller.
// ScheduleModule.forRoot() is registered here — it does not need to live in AppModule.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AwsModule } from 'src/common/aws/aws.module';
import { RecommendationCache } from './entities/recommendation-cache.entity';
import { Track } from './entities/track.entity';
import { UserMusicPreference } from './entities/user-music-preference.entity';
import { MusicController } from './music.controller';
import { YtDlpProvider } from './providers/ytdlp.provider';
import { RecommendationCacheRepository } from './repositories/recommendation-cache.repository';
import { TracksRepository } from './repositories/tracks.repository';
import { LastFmService } from './services/lastfm.service';
import { LiveStreamService } from './services/live-stream.service';
import { MusicQueueService } from './services/music-queue.service';
import { MusicStorageService } from './services/music-storage.service';
import { RecommendationsService } from './services/recommendations.service';
import { TrackCacheService } from './services/track-cache.service';
import { MusicCleanupTask } from './tasks/music-cleanup.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, RecommendationCache, UserMusicPreference]),
    ScheduleModule.forRoot(),
    AwsModule,
  ],
  controllers: [MusicController],
  providers: [
    TracksRepository,
    RecommendationCacheRepository,
    YtDlpProvider,
    TrackCacheService,
    LiveStreamService,
    LastFmService,
    RecommendationsService,
    MusicStorageService,
    MusicQueueService,
    MusicCleanupTask,
  ],
  exports: [TrackCacheService, RecommendationsService, LastFmService, MusicQueueService],
})
export class MusicModule {}
