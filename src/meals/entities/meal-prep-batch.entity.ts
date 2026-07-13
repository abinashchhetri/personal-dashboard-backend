// src/meals/entities/meal-prep-batch.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealPrepBatch Entity
// ─────────────────────────────────────────────────────────────────────────────
// A batch of meals prepped in advance (e.g. "5 lunches on Sunday"). Portions
// are consumed one at a time via MealsService.consumePortion, which atomically
// increments consumedPortions and creates a matching MealLog row. Never let
// consumedPortions exceed totalPortions — the service enforces this under a
// pessimistic lock.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

const decimalToNumber = {
  to: (v: number | null): number | null => v,
  from: (v: string | number | null): number | null =>
    v !== null && v !== undefined ? Number(v) : null,
};

@Index(['userId', 'preppedAt'])
@Entity('meal_prep_batches')
export class MealPrepBatch extends AbstractEntity<MealPrepBatch> {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  preppedAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  mealType!: string | null;

  @Column({ type: 'int' })
  totalPortions!: number;

  @Column({ type: 'int', default: 0 })
  consumedPortions!: number;

  @Column({ type: 'int', nullable: true })
  caloriesPerPortion!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  proteinPerPortionG!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  carbsPerPortionG!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  fatPerPortionG!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  notes!: string | null;
}
