// src/workout/services/workout-session.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutSessionService
// ─────────────────────────────────────────────────────────────────────────────
// Session lifecycle: start (pre-populates sets from the active plan for that
// weekday), per-set upsert logging, ad-hoc add-set, completion, and progress.
//
// startSession is the ONLY place a plan snapshot is copied into a session —
// planExerciseId on each set links back to the plan row purely for UI
// actual-vs-target comparison; editing the plan afterward never rewrites an
// already-started session's sets.
// ─────────────────────────────────────────────────────────────────────────────

import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { WorkoutPlanRepository } from '../repositories/workout-plan.repository';
import { WorkoutPlanExerciseRepository } from '../repositories/workout-plan-exercise.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import {
  IProgressRow,
  WorkoutSessionSetRepository,
} from '../repositories/workout-session-set.repository';
import { WorkoutSession } from '../entities/workout-session.entity';
import { WorkoutSessionSet } from '../entities/workout-session-set.entity';
import { DayOfWeekEnum } from '../enums/day-of-week.enum';
import { LogSessionSetDto } from '../dto/log-session-set.dto';
import { AddSetDto } from '../dto/add-set.dto';
import { FindWorkoutSessionsDto } from '../dto/find-workout-sessions.dto';

export type TWorkoutSessionWithExercises = WorkoutSession & {
  exercises: { exerciseName: string; bodyPart: string; sets: WorkoutSessionSet[] }[];
};

export type IProgressDataPoint = IProgressRow;

const JS_DAY_TO_ENUM: DayOfWeekEnum[] = [
  DayOfWeekEnum.SUNDAY,
  DayOfWeekEnum.MONDAY,
  DayOfWeekEnum.TUESDAY,
  DayOfWeekEnum.WEDNESDAY,
  DayOfWeekEnum.THURSDAY,
  DayOfWeekEnum.FRIDAY,
  DayOfWeekEnum.SATURDAY,
];

@Injectable()
export class WorkoutSessionService {
  constructor(
    private readonly workoutPlanRepository: WorkoutPlanRepository,
    private readonly workoutPlanExerciseRepository: WorkoutPlanExerciseRepository,
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly workoutSessionSetRepository: WorkoutSessionSetRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async startSession(
    userId: string,
    sessionDate: string,
  ): Promise<TWorkoutSessionWithExercises> {
    const existing = await this.workoutSessionRepository.findByDate(
      userId,
      sessionDate,
    );
    if (existing) {
      throw new ConflictException('A session already exists for this date');
    }

    const plan = await this.workoutPlanRepository.findActivePlan(userId);
    const dayOfWeek = this.deriveDayOfWeek(sessionDate);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let sessionId!: string;

    try {
      const session = qr.manager.create(WorkoutSession, {
        userId,
        sessionDate,
        dayOfWeek,
        planId: plan?.id ?? null,
      });
      const savedSession = await qr.manager.save(WorkoutSession, session);
      sessionId = savedSession.id;

      if (plan) {
        const planExercises = await this.workoutPlanExerciseRepository.findByPlanAndDay(
          plan.id,
          dayOfWeek,
        );

        if (planExercises.length > 0) {
          const setRows = planExercises.map((pe) => ({
            sessionId,
            exerciseName: pe.exerciseName,
            bodyPart: pe.bodyPart,
            setNumber: pe.setNumber,
            actualWeightKg: null,
            actualReps: null,
            actualFeeling: null,
            planExerciseId: pe.id,
            isCompleted: false,
          }));
          await this.workoutSessionSetRepository.bulkInsert(setRows, qr.manager);
        }
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return this.getSessionWithSets(userId, sessionId);
  }

  // Upserts by (sessionId, exerciseName, setNumber) — updates actuals on an
  // existing row (pre-populated from the plan or added via addSet), or
  // creates a fresh row if the user logs a set the plan/addSet never created.
  // Provided fields overwrite; omitted fields keep their prior value.
  async logSet(
    userId: string,
    sessionId: string,
    dto: LogSessionSetDto,
  ): Promise<WorkoutSessionSet> {
    await this.workoutSessionRepository.findOneForUser(sessionId, userId);

    const existing = await this.workoutSessionSetRepository.findOneBySessionExerciseSet(
      sessionId,
      dto.exerciseName,
      dto.setNumber,
    );

    const hasActual = dto.actualReps != null || dto.actualWeightKg != null;

    if (existing) {
      existing.bodyPart = dto.bodyPart;
      existing.actualWeightKg = dto.actualWeightKg ?? existing.actualWeightKg;
      existing.actualReps = dto.actualReps ?? existing.actualReps;
      existing.actualFeeling = dto.actualFeeling ?? existing.actualFeeling;
      existing.planExerciseId = dto.planExerciseId ?? existing.planExerciseId;
      existing.isCompleted = hasActual || existing.isCompleted;
      return this.workoutSessionSetRepository.entityRepository.save(existing);
    }

    const created = this.workoutSessionSetRepository.entityRepository.create({
      sessionId,
      exerciseName: dto.exerciseName,
      bodyPart: dto.bodyPart,
      setNumber: dto.setNumber,
      actualWeightKg: dto.actualWeightKg ?? null,
      actualReps: dto.actualReps ?? null,
      actualFeeling: dto.actualFeeling ?? null,
      planExerciseId: dto.planExerciseId ?? null,
      isCompleted: hasActual,
    });
    return this.workoutSessionSetRepository.entityRepository.save(created);
  }

  // "Add Set" button behavior — appends the next setNumber for this exercise.
  async addSet(
    userId: string,
    sessionId: string,
    dto: AddSetDto,
  ): Promise<WorkoutSessionSet> {
    await this.workoutSessionRepository.findOneForUser(sessionId, userId);

    const nextSetNumber =
      (await this.workoutSessionSetRepository.maxSetNumber(
        sessionId,
        dto.exerciseName,
      )) + 1;

    const created = this.workoutSessionSetRepository.entityRepository.create({
      sessionId,
      exerciseName: dto.exerciseName,
      bodyPart: dto.bodyPart,
      setNumber: nextSetNumber,
      actualWeightKg: null,
      actualReps: null,
      actualFeeling: null,
      planExerciseId: null,
      isCompleted: false,
    });
    return this.workoutSessionSetRepository.entityRepository.save(created);
  }

  async removeSet(
    userId: string,
    sessionId: string,
    setId: string,
  ): Promise<{ message: string }> {
    await this.workoutSessionRepository.findOneForUser(sessionId, userId);
    await this.workoutSessionSetRepository.entityRepository.delete({
      id: setId,
      sessionId,
    });
    return { message: 'Set deleted' };
  }

  // Deletes a session (e.g. one started before an active plan existed, so it
  // has no exercises) so the user can start a fresh one for the same date.
  // Child workout_session_sets rows cascade via the DB-level FK.
  async removeSession(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    await this.workoutSessionRepository.findOneForUser(sessionId, userId);
    await this.workoutSessionRepository.entityRepository.delete({
      id: sessionId,
      userId,
    });
    return { message: 'Workout session deleted' };
  }

  async completeSession(
    userId: string,
    sessionId: string,
  ): Promise<WorkoutSession> {
    const session = await this.workoutSessionRepository.findOneForUser(
      sessionId,
      userId,
    );
    session.completedAt = new Date();
    return this.workoutSessionRepository.entityRepository.save(session);
  }

  async getSessionWithSets(
    userId: string,
    sessionId: string,
  ): Promise<TWorkoutSessionWithExercises> {
    const session = await this.workoutSessionRepository.findOneForUser(
      sessionId,
      userId,
    );
    const sets = await this.workoutSessionSetRepository.findBySession(sessionId);

    const grouped = new Map<string, { bodyPart: string; sets: WorkoutSessionSet[] }>();
    for (const s of sets) {
      if (!grouped.has(s.exerciseName)) {
        grouped.set(s.exerciseName, { bodyPart: s.bodyPart, sets: [] });
      }
      grouped.get(s.exerciseName)!.sets.push(s);
    }

    const exercises = Array.from(grouped.entries()).map(
      ([exerciseName, { bodyPart, sets: exerciseSets }]) => ({
        exerciseName,
        bodyPart,
        sets: exerciseSets,
      }),
    );

    return Object.assign(session, { exercises });
  }

  async getTodaySession(
    userId: string,
  ): Promise<TWorkoutSessionWithExercises | null> {
    const todayISO = new Date().toISOString().slice(0, 10);
    const session = await this.workoutSessionRepository.findByDate(
      userId,
      todayISO,
    );
    if (!session) return null;
    return this.getSessionWithSets(userId, session.id);
  }

  async findSessions(userId: string, dto: FindWorkoutSessionsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.workoutSessionRepository.findForUser(
      userId,
      { skip, take: limit, startDate: dto.startDate, endDate: dto.endDate },
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  async getProgressForExercise(
    userId: string,
    exerciseName: string,
    limit = 10,
  ): Promise<IProgressDataPoint[]> {
    const rows = await this.workoutSessionSetRepository.progressForExercise(
      userId,
      exerciseName,
      limit,
    );
    // Repository returns most-recent-first (for the LIMIT to keep the latest
    // N); reverse here so the chart renders oldest -> newest, left to right.
    return rows.reverse();
  }

  private deriveDayOfWeek(sessionDate: string): DayOfWeekEnum {
    const jsDay = new Date(`${sessionDate}T00:00:00Z`).getUTCDay();
    return JS_DAY_TO_ENUM[jsDay];
  }
}
