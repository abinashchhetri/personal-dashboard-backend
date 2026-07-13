// src/meals/repositories/meal-log.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealLogRepository
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { MealLog } from '../entities/meal-log.entity';

@Injectable()
export class MealLogRepository extends AbstractRepository<MealLog> {
  protected readonly logger = new Logger(MealLogRepository.name);

  constructor(
    @InjectRepository(MealLog)
    entityRepository: Repository<MealLog>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findLogsForUser(
    userId: string,
    pagination: {
      skip: number;
      take: number;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<[MealLog[], number]> {
    const qb = this.entityRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId });

    if (pagination.startDate) {
      qb.andWhere('log.consumedAt >= :startDate', { startDate: pagination.startDate });
    }
    if (pagination.endDate) {
      qb.andWhere('log.consumedAt <= :endDate', { endDate: pagination.endDate });
    }

    return qb
      .orderBy('log.consumedAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }

  async findLogsForDay(userId: string, dayStart: Date, dayEnd: Date): Promise<MealLog[]> {
    return this.entityRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.consumedAt >= :dayStart', { dayStart })
      .andWhere('log.consumedAt < :dayEnd', { dayEnd })
      .orderBy('log.consumedAt', 'ASC')
      .getMany();
  }
}
