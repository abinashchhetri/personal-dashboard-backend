// src/workout/entities/workout-session-set.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutSessionSet Entity
// ─────────────────────────────────────────────────────────────────────────────
// One row per set actually performed within a session. Pre-populated (blank)
// from the active plan when a session starts; planExerciseId links back to
// that plan row purely for actual-vs-target comparison in the UI — it is
// never used to derive values at read time. isCompleted flips true the
// moment either actual field is logged.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { FeelingEnum } from '../enums/feeling.enum';
import { WorkoutSession } from './workout-session.entity';

const decimalToNumber = {
  to: (v: number | null): number | null => v,
  from: (v: string | number | null): number | null =>
    v != null ? Number(v) : null,
};

@Index(['sessionId'])
@Index('UQ_session_exercise_set', ['sessionId', 'exerciseName', 'setNumber'], {
  unique: true,
})
@Entity('workout_session_sets')
export class WorkoutSessionSet extends AbstractEntity<WorkoutSessionSet> {
  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => WorkoutSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: WorkoutSession;

  @Column({ type: 'varchar' })
  exerciseName!: string;

  @Column({ type: 'varchar' })
  bodyPart!: string;

  @Column({ type: 'int' })
  setNumber!: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, transformer: decimalToNumber })
  actualWeightKg!: number | null;

  @Column({ type: 'int', nullable: true })
  actualReps!: number | null;

  @Column({ type: 'enum', enum: FeelingEnum, nullable: true })
  actualFeeling!: FeelingEnum | null;

  @Column({ type: 'uuid', nullable: true })
  planExerciseId!: string | null;

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;
}
