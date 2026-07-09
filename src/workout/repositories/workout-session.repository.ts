// src/workout/repositories/workout-session.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutSessionRepository
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { WorkoutSession } from '../entities/workout-session.entity';

@Injectable()
export class WorkoutSessionRepository extends AbstractRepository<WorkoutSession> {
  protected readonly logger = new Logger(WorkoutSessionRepository.name);

  constructor(
    @InjectRepository(WorkoutSession)
    entityRepository: Repository<WorkoutSession>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findForUser(
    userId: string,
    pagination: {
      skip: number;
      take: number;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<[WorkoutSession[], number]> {
    const qb = this.entityRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId });

    if (pagination.startDate) {
      qb.andWhere('session.sessionDate >= :startDate', {
        startDate: pagination.startDate,
      });
    }
    if (pagination.endDate) {
      qb.andWhere('session.sessionDate <= :endDate', {
        endDate: pagination.endDate,
      });
    }

    return qb
      .orderBy('session.sessionDate', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }

  async findByDate(
    userId: string,
    sessionDate: string,
  ): Promise<WorkoutSession | null> {
    return this.entityRepository.findOne({ where: { userId, sessionDate } });
  }

  async findOneForUser(id: string, userId: string): Promise<WorkoutSession> {
    const session = await this.entityRepository.findOne({
      where: { id, userId },
    });
    if (!session) {
      throw new NotFoundException('Workout session not found');
    }
    return session;
  }
}
