// src/music/repositories/recommendation-cache.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// RecommendationCacheRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the RecommendationCache entity.
// deleteOldCache uses a parameterized interval — never string-interpolates the
// days value to prevent injection.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { RecommendationCache } from '../entities/recommendation-cache.entity';

@Injectable()
export class RecommendationCacheRepository extends AbstractRepository<RecommendationCache> {
  protected readonly logger = new Logger(RecommendationCacheRepository.name);

  constructor(
    @InjectRepository(RecommendationCache)
    entityRepository: Repository<RecommendationCache>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  // Highest-scoring unprepared recommendation for a given source track.
  async findTopRecommendation(sourceTrackId: string): Promise<RecommendationCache | null> {
    return this.entityRepository
      .createQueryBuilder('rc')
      .where('rc.sourceTrackId = :sourceTrackId', { sourceTrackId })
      .andWhere('rc.isPrepared = false')
      .orderBy('rc.matchScore', 'DESC')
      .limit(1)
      .getOne();
  }

  // Highest-scoring already-prepared recommendation — used by getNextTrack to
  // serve a pre-fetched track without waiting for a download.
  async findPreparedRecommendation(sourceTrackId: string): Promise<RecommendationCache | null> {
    return this.entityRepository
      .createQueryBuilder('rc')
      .where('rc.sourceTrackId = :sourceTrackId', { sourceTrackId })
      .andWhere('rc.isPrepared = true')
      .orderBy('rc.matchScore', 'DESC')
      .limit(1)
      .getOne();
  }

  async findBySourceTrack(sourceTrackId: string): Promise<RecommendationCache[]> {
    return this.entityRepository
      .createQueryBuilder('rc')
      .where('rc.sourceTrackId = :sourceTrackId', { sourceTrackId })
      .orderBy('rc.matchScore', 'DESC')
      .getMany();
  }

  async markAsPrepared(id: string): Promise<void> {
    await this.entityRepository.update({ id }, { isPrepared: true });
  }

  async deleteBySourceTrack(sourceTrackId: string): Promise<void> {
    await this.entityRepository.delete({ sourceTrackId });
  }

  // olderThanDays is passed as a bound parameter — never interpolated into the
  // query string. TypeORM replaces :days with $1 before sending to Postgres.
  async deleteOldCache(olderThanDays: number): Promise<void> {
    await this.entityRepository
      .createQueryBuilder()
      .delete()
      .from(RecommendationCache)
      .where('"cachedAt" < NOW() - (:days * INTERVAL \'1 day\')', { days: olderThanDays })
      .execute();
  }
}
