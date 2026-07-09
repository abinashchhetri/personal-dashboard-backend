// src/meals/entities/meal-plan-item.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealPlanItem Entity
// ─────────────────────────────────────────────────────────────────────────────
// One row per meal per weekday in the user's weekly meal template. Seeded via
// CSV import (see MealsService.importPlan) — re-import replaces the whole plan
// atomically. Macros are always nullable — never forced.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

const decimalToNumber = {
  to: (v: number | null): number | null => v,
  from: (v: string | number | null): number | null =>
    v !== null && v !== undefined ? Number(v) : null,
};

@Index(['userId', 'dayOfWeek'])
@Index('UQ_meal_plan_user_day_type_name', ['userId', 'dayOfWeek', 'mealType', 'name'], {
  unique: true,
})
@Entity('meal_plan_items')
export class MealPlanItem extends AbstractEntity<MealPlanItem> {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'smallint' })
  dayOfWeek!: number;

  @Column({ type: 'varchar' })
  mealType!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ type: 'int', nullable: true })
  calories!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  proteinG!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  carbsG!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  fatG!: number | null;

  @Column({ type: 'varchar', nullable: true })
  notes!: string | null;
}
