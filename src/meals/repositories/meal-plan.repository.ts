// src/meals/repositories/meal-plan.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealPlanRepository
// ─────────────────────────────────────────────────────────────────────────────
// Read/replace access to the weekly meal plan template.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { MealPlanItem } from '../entities/meal-plan-item.entity';

@Injectable()
export class MealPlanRepository extends AbstractRepository<MealPlanItem> {
  protected readonly logger = new Logger(MealPlanRepository.name);

  constructor(
    @InjectRepository(MealPlanItem)
    entityRepository: Repository<MealPlanItem>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findPlanForUser(userId: string): Promise<MealPlanItem[]> {
    return this.entityRepository
      .createQueryBuilder('plan')
      .where('plan.userId = :userId', { userId })
      .orderBy('plan.dayOfWeek', 'ASC')
      .addOrderBy('plan.mealType', 'ASC')
      .addOrderBy('plan.orderIndex', 'ASC')
      .getMany();
  }

  async findPlanForDay(userId: string, dayOfWeek: number): Promise<MealPlanItem[]> {
    return this.entityRepository
      .createQueryBuilder('plan')
      .where('plan.userId = :userId', { userId })
      .andWhere('plan.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .orderBy('plan.mealType', 'ASC')
      .addOrderBy('plan.orderIndex', 'ASC')
      .getMany();
  }

  // Full-replace within an (optional) external transaction — see
  // WorkoutPlanRepository.replacePlan for the same pattern.
  async replacePlan(
    userId: string,
    rows: Partial<MealPlanItem>[],
    manager?: EntityManager,
  ): Promise<number> {
    const em = manager ?? this.entityRepository.manager;
    await em.delete(MealPlanItem, { userId });
    if (rows.length === 0) return 0;
    await em.insert(MealPlanItem, rows);
    return rows.length;
  }
}
