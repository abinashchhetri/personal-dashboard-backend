// src/meals/repositories/meal-prep.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealPrepRepository
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { MealPrepBatch } from '../entities/meal-prep-batch.entity';

@Injectable()
export class MealPrepRepository extends AbstractRepository<MealPrepBatch> {
  protected readonly logger = new Logger(MealPrepRepository.name);

  constructor(
    @InjectRepository(MealPrepBatch)
    entityRepository: Repository<MealPrepBatch>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  // Batches with at least one portion remaining, most recently prepped first.
  async findActiveBatches(userId: string): Promise<MealPrepBatch[]> {
    return this.entityRepository
      .createQueryBuilder('batch')
      .where('batch.userId = :userId', { userId })
      .andWhere('batch."consumedPortions" < batch."totalPortions"')
      .orderBy('batch.preppedAt', 'DESC')
      .getMany();
  }

  async findAllBatches(
    userId: string,
    pagination: { skip: number; take: number },
  ): Promise<[MealPrepBatch[], number]> {
    return this.entityRepository
      .createQueryBuilder('batch')
      .where('batch.userId = :userId', { userId })
      .orderBy('batch.preppedAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }
}
