// src/workout/entities/workout-session.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutSession Entity
// ─────────────────────────────────────────────────────────────────────────────
// One row per calendar day the user actually trained. sessionDate is a plain
// date (not timestamptz) — a workout belongs to a day, not a moment. dayOfWeek
// is derived once at creation from sessionDate and stored, so plan lookups for
// that session never depend on re-deriving the weekday later.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { DayOfWeekEnum } from '../enums/day-of-week.enum';

@Index(['userId', 'sessionDate'])
@Entity('workout_sessions')
export class WorkoutSession extends AbstractEntity<WorkoutSession> {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'date' })
  sessionDate!: string;

  @Column({ type: 'enum', enum: DayOfWeekEnum })
  dayOfWeek!: DayOfWeekEnum;

  @Column({ type: 'uuid', nullable: true })
  planId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes!: number | null;
}
