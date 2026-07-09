// src/workout/entities/workout-plan-exercise.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutPlanExercise Entity
// ─────────────────────────────────────────────────────────────────────────────
// One row per exercise per set, per weekday, within a WorkoutPlan — the
// per-set granularity mirrors the CSV import format exactly (one CSV row =
// one WorkoutPlanExercise row). Re-importing a plan replaces these rows via
// deactivate-old + insert-new; never updated in place.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { DayOfWeekEnum } from '../enums/day-of-week.enum';
import { FeelingEnum } from '../enums/feeling.enum';
import { WorkoutPlan } from './workout-plan.entity';

const decimalToNumber = {
  to: (v: number | null): number | null => v,
  from: (v: string | number | null): number | null =>
    v != null ? Number(v) : null,
};

@Index(['planId'])
@Index('UQ_plan_day_exercise_set', ['planId', 'day', 'exerciseName', 'setNumber'], {
  unique: true,
})
@Entity('workout_plan_exercises')
export class WorkoutPlanExercise extends AbstractEntity<WorkoutPlanExercise> {
  @Column({ type: 'uuid' })
  planId!: string;

  @ManyToOne(() => WorkoutPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan!: WorkoutPlan;

  @Column({ type: 'enum', enum: DayOfWeekEnum })
  day!: DayOfWeekEnum;

  @Column({ type: 'varchar' })
  bodyPart!: string;

  @Column({ type: 'varchar' })
  exerciseName!: string;

  @Column({ type: 'int' })
  setNumber!: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, transformer: decimalToNumber })
  targetWeightKg!: number;

  @Column({ type: 'int' })
  targetReps!: number;

  @Column({ type: 'enum', enum: FeelingEnum })
  targetFeeling!: FeelingEnum;
}
