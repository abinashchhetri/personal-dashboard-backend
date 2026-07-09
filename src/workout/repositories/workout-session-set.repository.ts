// src/workout/repositories/workout-session-set.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutSessionSetRepository
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { WorkoutSessionSet } from '../entities/workout-session-set.entity';

export interface IProgressRow {
  sessionDate: string;
  maxWeightKg: number;
  setsCompleted: number;
}

@Injectable()
export class WorkoutSessionSetRepository extends AbstractRepository<WorkoutSessionSet> {
  protected readonly logger = new Logger(WorkoutSessionSetRepository.name);

  constructor(
    @InjectRepository(WorkoutSessionSet)
    entityRepository: Repository<WorkoutSessionSet>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findBySession(sessionId: string): Promise<WorkoutSessionSet[]> {
    return this.entityRepository
      .createQueryBuilder('set')
      .where('set.sessionId = :sessionId', { sessionId })
      .orderBy('set.exerciseName', 'ASC')
      .addOrderBy('set.setNumber', 'ASC')
      .getMany();
  }

  async findOneBySessionExerciseSet(
    sessionId: string,
    exerciseName: string,
    setNumber: number,
  ): Promise<WorkoutSessionSet | null> {
    return this.entityRepository.findOne({
      where: { sessionId, exerciseName, setNumber },
    });
  }

  // Highest existing setNumber for this exercise within the session — 0 when
  // no sets exist yet, so callers can always do `maxSetNumber + 1` safely.
  async maxSetNumber(sessionId: string, exerciseName: string): Promise<number> {
    const raw = await this.entityRepository
      .createQueryBuilder('set')
      .select('MAX(set."setNumber")', 'max')
      .where('set.sessionId = :sessionId', { sessionId })
      .andWhere('set.exerciseName = :exerciseName', { exerciseName })
      .getRawOne<{ max: string | null }>();

    return raw?.max != null ? Number(raw.max) : 0;
  }

  // Bulk-insert within an (optional) external transaction — used when a
  // session starts and its sets are pre-populated from the active plan.
  async bulkInsert(
    rows: Partial<WorkoutSessionSet>[],
    manager?: EntityManager,
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const em = manager ?? this.entityRepository.manager;
    await em.insert(WorkoutSessionSet, rows);
    return rows.length;
  }

  // One point per session the exercise was logged in, most recent first (the
  // service reverses to oldest→newest for charting). Only counts completed
  // sets. node-postgres returns numeric/bigint aggregates as strings, so every
  // value is coerced to a real number before returning.
  async progressForExercise(
    userId: string,
    exerciseName: string,
    limit: number,
  ): Promise<IProgressRow[]> {
    // Quoted camelCase column names are required in raw SELECT expressions —
    // TypeORM only auto-translates property names inside WHERE/GROUP BY clauses.
    // sessionDate is cast to text: raw queries bypass TypeORM's DATE-column
    // string handling, so node-postgres would otherwise return it as a JS
    // Date at local midnight, which JSON serialization then shifts by the
    // server's UTC offset (e.g. "2026-07-05" becoming "2026-07-04T18:15:00Z").
    const rows = await this.entityRepository
      .createQueryBuilder('set')
      .innerJoin('workout_sessions', 'session', 'session.id = set."sessionId"')
      .select('session."sessionDate"::text', 'sessionDate')
      .addSelect('MAX(set."actualWeightKg")', 'maxWeightKg')
      .addSelect('COUNT(*)', 'setsCompleted')
      .where('session.userId = :userId', { userId })
      .andWhere('LOWER(set.exerciseName) = LOWER(:exerciseName)', { exerciseName })
      .andWhere('set."isCompleted" = true')
      .groupBy('session."sessionDate"')
      .orderBy('session."sessionDate"', 'DESC')
      .limit(limit)
      .getRawMany<{
        sessionDate: string;
        maxWeightKg: string | null;
        setsCompleted: string;
      }>();

    return rows.map((r) => ({
      sessionDate: r.sessionDate,
      maxWeightKg: r.maxWeightKg != null ? Number(r.maxWeightKg) : 0,
      setsCompleted: Number(r.setsCompleted),
    }));
  }
}
