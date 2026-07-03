// src/music/services/lastfm.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// LastFmService
// ─────────────────────────────────────────────────────────────────────────────
// Fetches similar-track metadata from the Last.fm API.
// Never throws — always returns [] on any failure so a network error or
// missing API key cannot block the playback flow.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ILastFmTrack } from '../interfaces/lastfm.interface';

@Injectable()
export class LastFmService {
  private readonly logger = new Logger(LastFmService.name);

  constructor(private readonly configService: ConfigService) {}

  async getSimilarTracks(artist: string, title: string, limit = 10): Promise<ILastFmTrack[]> {
    const apiKey = this.configService.get<string>('LASTFM_API_KEY');
    if (!apiKey) {
      this.logger.warn('LASTFM_API_KEY is not configured — skipping Last.fm lookup');
      return [];
    }

    const url =
      `https://ws.audioscrobbler.com/2.0/?method=track.getSimilar` +
      `&artist=${encodeURIComponent(artist)}` +
      `&track=${encodeURIComponent(title)}` +
      `&api_key=${apiKey}` +
      `&format=json` +
      `&limit=${limit}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      const json = (await res.json()) as Record<string, unknown>;

      // Last.fm returns HTTP 200 for errors — check the 'error' field explicitly.
      if (json['error']) {
        this.logger.warn(
          `Last.fm error ${String(json['error'])}: ${String(json['message'])} — "${artist} - ${title}"`,
        );
        return [];
      }

      const rawTracks = (
        ((json['similartracks'] as Record<string, unknown>) ?? {})['track'] ?? []
      ) as Array<Record<string, unknown>>;

      return rawTracks.map((track) => {
        const images = (track['image'] as Array<Record<string, string>>) ?? [];
        const lastImage = images[images.length - 1];
        const coverUrl = lastImage?.['#text'] || null;

        return {
          title: track['name'] as string,
          artist: ((track['artist'] as Record<string, unknown>)?.['name'] as string) ?? '',
          coverUrl,
          matchScore: parseFloat((track['match'] as string) ?? '0'),
          externalId: null,
        };
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      this.logger.error(
        `Last.fm fetch failed for "${artist} - ${title}": ${(err as Error).message}`,
      );
      return [];
    }
  }
}
