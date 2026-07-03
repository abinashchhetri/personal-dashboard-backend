// src/music/repositories/tracks.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// TracksRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the Track entity.
// findByExternalId returns null (not NotFoundException) — callers decide whether
// a missing track is an error or a cache-miss that triggers a download.
// incrementPlayCount uses a SQL arithmetic update — never read-then-save.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { TrackSourceEnum } from '../enums/track-source.enum';
import { Track } from '../entities/track.entity';

@Injectable()
export class TracksRepository extends AbstractRepository<Track> {
  protected readonly logger = new Logger(TracksRepository.name);

  constructor(
    @InjectRepository(Track)
    entityRepository: Repository<Track>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findByExternalId(externalId: string): Promise<Track | null> {
    return this.entityRepository.findOne({ where: { externalId } });
  }

  // Returns the existing row or inserts a new uncached stub. Safe to call
  // concurrently — the second writer gets the row the first one just inserted.
  async findOrCreate(
    externalId: string,
    title: string,
    artist: string,
    coverUrl: string | null,
  ): Promise<Track> {
    const existing = await this.findByExternalId(externalId);
    if (existing) return existing;

    const track = this.entityRepository.create({
      externalId,
      title,
      artist,
      coverUrl,
      isCached: false,
      playCount: 0,
      source: TrackSourceEnum.YOUTUBE,
      metadata: {},
    });
    return this.entityRepository.save(track);
  }

  async findByExternalIds(externalIds: string[]): Promise<Track[]> {
    if (externalIds.length === 0) return [];
    return this.entityRepository.findBy({ externalId: In(externalIds) });
  }

  async findCachedTracks(page: number, limit: number): Promise<[Track[], number]> {
    return this.entityRepository
      .createQueryBuilder('track')
      .where('track.isCached = true')
      .orderBy('track.lastPlayedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('track.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async searchByQuery(q: string, page: number, limit: number): Promise<[Track[], number]> {
    return this.entityRepository
      .createQueryBuilder('track')
      .where('track.isCached = true')
      .andWhere('(track.title ILIKE :q OR track.artist ILIKE :q)', { q: `%${q}%` })
      .orderBy('track.playCount', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  // Atomic SQL increment — avoids the read-modify-write race that entity.save() would introduce.
  async incrementPlayCount(id: string): Promise<void> {
    await this.entityRepository
      .createQueryBuilder()
      .update(Track)
      .set({
        playCount: () => '"playCount" + 1',
        lastPlayedAt: () => 'NOW()',
      })
      .where('id = :id', { id })
      .execute();
  }
}
