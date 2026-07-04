// src/music/services/music-queue.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// MusicQueueService
// ─────────────────────────────────────────────────────────────────────────────
// Maintains a per-user in-memory queue of upcoming tracks (max 5).
// In-memory is correct here — queues are session-scoped, not persistent.
// If the server restarts the queue resets, which is acceptable.
//
// fillQueueInBackground calls prepareNextTrack in a loop rather than calling
// ensureCached directly with recommendedExternalId — that field starts as a
// "lastfm:artist:title" placeholder and is only resolved to a real YouTube ID
// once prepareNextTrack runs yt-dlp search on it.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';

import { Track } from '../entities/track.entity';
import { RecommendationsService } from './recommendations.service';
import { MusicStorageService } from './music-storage.service';

interface IQueueEntry {
  track: Track;
  streamUrl: string; // presigned S3 URL — self-authenticating, no extra token needed
  preparedAt: Date;
}

interface IUserQueue {
  userId: string;
  entries: IQueueEntry[];
  currentTrackId: string | null;
  lastRefreshedAt: Date;
}

@Injectable()
export class MusicQueueService {
  private readonly logger = new Logger(MusicQueueService.name);
  // Map: userId → IUserQueue. In-memory only — intentionally not persisted.
  private readonly queues = new Map<string, IUserQueue>();
  private readonly MAX_QUEUE_SIZE = 5;
  private readonly MIN_QUEUE_SIZE = 2; // refill when below this

  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly musicStorageService: MusicStorageService,
  ) {}

  // Called when a track starts playing — sets current track and begins background
  // queue population. Fire-and-forget from the controller.
  async onTrackStarted(userId: string, track: Track): Promise<void> {
    const queue = this.getOrCreateQueue(userId);
    queue.currentTrackId = track.id;
    queue.lastRefreshedAt = new Date();

    // Remove this track from the queue if it was pre-queued (user advanced to it).
    queue.entries = queue.entries.filter((e) => e.track.id !== track.id);

    // Background: fill without blocking the play response.
    this.fillQueueInBackground(userId, track).catch((err: unknown) =>
      this.logger.error(
        `Queue fill failed for user ${userId}: ${(err as Error).message}`,
      ),
    );
  }

  // Called by the frontend ~30 s before the current track ends — ensures at least
  // one track is ready. Returns the next entry without removing it from the queue.
  async peekNext(userId: string): Promise<IQueueEntry | null> {
    const queue = this.getOrCreateQueue(userId);
    return queue.entries[0] ?? null;
  }

  // Called when the current track ends — pops the front of the queue and triggers
  // a background refill if the queue is getting thin.
  async advance(userId: string): Promise<IQueueEntry | null> {
    const queue = this.getOrCreateQueue(userId);
    const next = queue.entries.shift() ?? null;

    if (next) {
      queue.currentTrackId = next.track.id;
      if (queue.entries.length < this.MIN_QUEUE_SIZE) {
        this.fillQueueInBackground(userId, next.track).catch((err: unknown) =>
          this.logger.error(`Queue refill failed: ${(err as Error).message}`),
        );
      }
    }

    return next;
  }

  // Returns current queue state — for frontend queue display and debugging.
  getQueue(userId: string): IQueueEntry[] {
    return this.getOrCreateQueue(userId).entries;
  }

  clearQueue(userId: string): void {
    this.queues.delete(userId);
  }

  private getOrCreateQueue(userId: string): IUserQueue {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, {
        userId,
        entries: [],
        currentTrackId: null,
        lastRefreshedAt: new Date(),
      });
    }
    return this.queues.get(userId)!;
  }

  private async fillQueueInBackground(
    userId: string,
    currentTrack: Track,
  ): Promise<void> {
    const queue = this.getOrCreateQueue(userId);
    const needed = this.MAX_QUEUE_SIZE - queue.entries.length;
    if (needed <= 0) return;

    this.logger.log(
      `Filling queue for user ${userId}: need ${needed} more tracks`,
    );

    // The play handler fires fetchAndStoreRecommendations concurrently — it may
    // not have finished by the time we reach here. Check and wait if needed so
    // prepareNextTrack has rows to pick from.
    const existing = await this.recommendationsService.getTopNRecommendations(
      currentTrack.id,
      1,
    );
    if (existing.length === 0) {
      this.logger.log(
        `No recommendations yet for track ${currentTrack.id} — fetching from Last.fm`,
      );
      await this.recommendationsService.fetchAndStoreRecommendations(
        currentTrack.id,
        currentTrack.artist,
        currentTrack.title,
      );
    }

    // Track IDs already in queue or currently playing — used to deduplicate.
    const existingIds = new Set<string>([
      currentTrack.id,
      ...queue.entries.map((e) => e.track.id),
    ]);

    for (let i = 0; i < needed; i++) {
      if (queue.entries.length >= this.MAX_QUEUE_SIZE) break;

      try {
        // prepareNextTrack handles: yt-dlp search → real YouTube ID resolution
        // → ensureCached (S3 download + upload) → mark recommendation as prepared.
        // Each call picks the next highest-scoring UNPREPARED recommendation and
        // marks it prepared, so successive calls naturally step through the ranked list.
        const track = await this.recommendationsService.prepareNextTrack(
          currentTrack.id,
        );

        if (!track) {
          this.logger.warn(
            `No more recommendations to prepare for track ${currentTrack.id}`,
          );
          break;
        }

        // Skip duplicates — same track can appear in multiple recommendation sets.
        if (existingIds.has(track.id)) continue;

        // ensureCached guarantees isCached=true and s3Key is set — but guard anyway
        // in case of an unexpected partial-cache state.
        if (!track.isCached || !track.s3Key) {
          this.logger.warn(
            `Track ${track.id} not fully cached — skipping queue entry`,
          );
          continue;
        }

        existingIds.add(track.id);

        const streamUrl = await this.musicStorageService.getPresignedStreamUrl(
          track.s3Key,
        );

        queue.entries.push({ track, streamUrl, preparedAt: new Date() });
        this.logger.log(
          `Queued: "${track.title}" (position ${queue.entries.length})`,
        );
      } catch (err: unknown) {
        // Per-candidate error — log and continue to the next candidate so one
        // failed download never aborts the entire queue fill.
        this.logger.warn(
          `Could not queue candidate: ${(err as Error).message}`,
        );
      }
    }
  }
}
