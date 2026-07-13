// src/workout/repositories/workout-plan-exercise.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutPlanExerciseRepository
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { WorkoutPlanExercise } from '../entities/workout-plan-exercise.entity';
import { DayOfWeekEnum } from '../enums/day-of-week.enum';

@Injectable()
export class WorkoutPlanExerciseRepository extends AbstractRepository<WorkoutPlanExercise> {
  protected readonly logger = new Logger(WorkoutPlanExerciseRepository.name);

  constructor(
    @InjectRepository(WorkoutPlanExercise)
    entityRepository: Repository<WorkoutPlanExercise>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findByPlan(planId: string): Promise<WorkoutPlanExercise[]> {
    return this.entityRepository
      .createQueryBuilder('ex')
      .where('ex.planId = :planId', { planId })
      .orderBy('ex.bodyPart', 'ASC')
      .addOrderBy('ex.exerciseName', 'ASC')
      .addOrderBy('ex.setNumber', 'ASC')
      .getMany();
  }

  async findByPlanAndDay(
    planId: string,
    day: DayOfWeekEnum,
  ): Promise<WorkoutPlanExercise[]> {
    return this.entityRepository
      .createQueryBuilder('ex')
      .where('ex.planId = :planId', { planId })
      .andWhere('ex.day = :day', { day })
      .orderBy('ex.bodyPart', 'ASC')
      .addOrderBy('ex.exerciseName', 'ASC')
      .addOrderBy('ex.setNumber', 'ASC')
      .getMany();
  }

  // Bulk-insert within an (optional) external transaction — used by the CSV
  // import so all rows commit atomically with the plan they belong to.
  async bulkInsert(
    rows: Partial<WorkoutPlanExercise>[],
    manager?: EntityManager,
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const em = manager ?? this.entityRepository.manager;
    await em.insert(WorkoutPlanExercise, rows);
    return rows.length;
  }
}
