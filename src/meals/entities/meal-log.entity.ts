// src/meals/entities/meal-log.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealLog Entity
// ─────────────────────────────────────────────────────────────────────────────
// One row per meal actually eaten — on-plan (planItemId set), from a prep
// batch (prepBatchId set), or free-form (both null). planItemId/prepBatchId
// are plain nullable uuid columns with ON DELETE SET NULL at the DB level
// (see the FitnessNutritionFoundation migration) so deleting a plan item or
// prep batch never deletes log history.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

const decimalToNumber = {
  to: (v: number | null): number | null => v,
  from: (v: string | number | null): number | null =>
    v !== null && v !== undefined ? Number(v) : null,
};

@Index(['userId', 'consumedAt'])
@Entity('meal_logs')
export class MealLog extends AbstractEntity<MealLog> {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  consumedAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  mealType!: string | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'uuid', nullable: true })
  planItemId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  prepBatchId!: string | null;

  @Column({ type: 'varchar', default: 'freeform' })
  source!: string;

  @Column({ type: 'int', nullable: true })
  calories!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  proteinG!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  carbsG!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  fatG!: number | null;

  @Column({ type: 'varchar', default: 'form' })
  entryMethod!: string;

  @Column({ type: 'varchar', nullable: true })
  notes!: string | null;
}
