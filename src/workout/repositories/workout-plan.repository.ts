// src/workout/repositories/workout-plan.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutPlanRepository
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { WorkoutPlan } from '../entities/workout-plan.entity';

@Injectable()
export class WorkoutPlanRepository extends AbstractRepository<WorkoutPlan> {
  protected readonly logger = new Logger(WorkoutPlanRepository.name);

  constructor(
    @InjectRepository(WorkoutPlan)
    entityRepository: Repository<WorkoutPlan>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findActivePlan(userId: string): Promise<WorkoutPlan | null> {
    return this.entityRepository
      .createQueryBuilder('plan')
      .where('plan.userId = :userId', { userId })
      .andWhere('plan.isActive = true')
      .orderBy('plan.importedAt', 'DESC')
      .getOne();
  }

  // Deactivates every currently-active plan for the user. Accepts an optional
  // external EntityManager so a CSV re-import can run this inside the same
  // QueryRunner transaction as the new plan's insert.
  async deactivateActivePlans(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager ?? this.entityRepository.manager;
    await em.update(
      WorkoutPlan,
      { userId, isActive: true },
      { isActive: false },
    );
  }
}
