// src/workout/entities/workout-plan.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutPlan Entity
// ─────────────────────────────────────────────────────────────────────────────
// The imported weekly template — what the user SHOULD do. Only one plan is
// ever isActive per user; importing a new CSV deactivates the previous plan
// instead of deleting it, so past sessions keep a valid planId reference.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

@Index(['userId'])
@Entity('workout_plans')
export class WorkoutPlan extends AbstractEntity<WorkoutPlan> {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  importedAt!: Date;
}
