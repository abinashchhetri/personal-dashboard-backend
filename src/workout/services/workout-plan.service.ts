// src/workout/services/workout-plan.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutPlanService
// ─────────────────────────────────────────────────────────────────────────────
// Parses and validates the CSV workout plan, then replaces the user's active
// plan atomically. No CSV library — the format is simple enough that a manual
// line/comma split (with basic quoted-field support) avoids an extra dependency.
//
// Validation collects EVERY error across the whole file before rejecting, so
// the caller (and the frontend's preview step) can show the user everything
// wrong in one pass instead of a fix-one-resubmit loop.
// ─────────────────────────────────────────────────────────────────────────────

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { WorkoutPlanRepository } from '../repositories/workout-plan.repository';
import { WorkoutPlanExerciseRepository } from '../repositories/workout-plan-exercise.repository';
import { WorkoutPlan } from '../entities/workout-plan.entity';
import { WorkoutPlanExercise } from '../entities/workout-plan-exercise.entity';
import { DayOfWeekEnum } from '../enums/day-of-week.enum';
import { FeelingEnum } from '../enums/feeling.enum';

const REQUIRED_COLUMNS = [
  'day',
  'body_part',
  'exercise',
  'set_number',
  'target_weight_kg',
  'target_reps',
  'target_feeling',
] as const;

interface IParsedPlanRow {
  day: DayOfWeekEnum;
  bodyPart: string;
  exerciseName: string;
  setNumber: number;
  targetWeightKg: number;
  targetReps: number;
  targetFeeling: FeelingEnum;
}

@Injectable()
export class WorkoutPlanService {
  constructor(
    private readonly workoutPlanRepository: WorkoutPlanRepository,
    private readonly workoutPlanExerciseRepository: WorkoutPlanExerciseRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async importPlan(
    userId: string,
    csv: string,
    planName: string,
  ): Promise<{
    plan: WorkoutPlan;
    exerciseCount: number;
    daysCount: number;
    errors: string[];
  }> {
    const lines = csv
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      // The global HttpExceptionFilter treats a string[] `message` as a
      // multi-error response — passing the array directly (not wrapped in an
      // object) is what surfaces every entry in the response's `errors` field.
      throw new BadRequestException(['CSV is empty']);
    }

    const headerCells = this.splitCsvLine(lines[0]).map((h) =>
      h.trim().toLowerCase(),
    );
    const colIndex: Record<string, number> = {};
    for (const col of REQUIRED_COLUMNS) {
      const idx = headerCells.indexOf(col);
      if (idx === -1) {
        throw new BadRequestException([`CSV is missing required column "${col}"`]);
      }
      colIndex[col] = idx;
    }

    const errors: string[] = [];
    const seen = new Set<string>();
    const parsedRows: IParsedPlanRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1; // matches the 1-indexed line number in the file
      const cells = this.splitCsvLine(lines[i]);

      // Empty rows (all fields blank) are skipped silently — not an error.
      if (cells.every((c) => c.trim() === '')) continue;

      const rawDay = (cells[colIndex.day] ?? '').trim();
      const rawBodyPart = (cells[colIndex.body_part] ?? '').trim();
      const rawExercise = (cells[colIndex.exercise] ?? '').trim();
      const rawSetNumber = (cells[colIndex.set_number] ?? '').trim();
      const rawWeight = (cells[colIndex.target_weight_kg] ?? '').trim();
      const rawReps = (cells[colIndex.target_reps] ?? '').trim();
      const rawFeeling = (cells[colIndex.target_feeling] ?? '').trim();

      let rowHasError = false;

      const day = this.parseDay(rawDay);
      if (!day) {
        errors.push(`Row ${rowNum}: invalid day '${rawDay}'`);
        rowHasError = true;
      }

      if (!rawBodyPart) {
        errors.push(`Row ${rowNum}: missing body_part`);
        rowHasError = true;
      }

      if (!rawExercise) {
        errors.push(`Row ${rowNum}: missing exercise`);
        rowHasError = true;
      }

      const setNumber = Number(rawSetNumber);
      if (!Number.isInteger(setNumber) || setNumber < 1) {
        errors.push(
          `Row ${rowNum}: set_number must be an integer >= 1 (got '${rawSetNumber}')`,
        );
        rowHasError = true;
      }

      const targetWeightKg = this.parseWeightKg(rawWeight);
      if (targetWeightKg === null) {
        errors.push(
          `Row ${rowNum}: target_weight_kg must be a number (got '${rawWeight}')`,
        );
        rowHasError = true;
      }

      const targetReps = Number(rawReps);
      if (!Number.isInteger(targetReps) || targetReps < 0) {
        errors.push(
          `Row ${rowNum}: target_reps must be an integer >= 0 (got '${rawReps}')`,
        );
        rowHasError = true;
      }

      const targetFeeling = this.parseFeeling(rawFeeling);
      if (!targetFeeling) {
        errors.push(
          `Row ${rowNum}: invalid target_feeling '${rawFeeling}' (expected light|average|medium|hard)`,
        );
        rowHasError = true;
      }

      if (rowHasError) continue;

      // Duplicate day+exercise+set_number is rejected, not silently deduped —
      // this indicates a mistake in the source CSV, unlike the plan-level
      // idempotent replace (deactivate-old + insert-new) below.
      const dupKey = `${day}|${rawExercise.toLowerCase()}|${setNumber}`;
      if (seen.has(dupKey)) {
        errors.push(`Duplicate: ${day} / ${rawExercise} / set ${setNumber}`);
        continue;
      }
      seen.add(dupKey);

      parsedRows.push({
        day: day!,
        bodyPart: rawBodyPart,
        exerciseName: rawExercise,
        setNumber,
        targetWeightKg: targetWeightKg!,
        targetReps,
        targetFeeling: targetFeeling!,
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (parsedRows.length === 0) {
      throw new BadRequestException(['No valid rows found in CSV']);
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Idempotent: deactivate any existing active plan, then insert the new
      // one — re-uploading the same CSV replaces the plan, never duplicates.
      await this.workoutPlanRepository.deactivateActivePlans(userId, qr.manager);

      const plan = qr.manager.create(WorkoutPlan, {
        userId,
        name: planName,
        isActive: true,
        importedAt: new Date(),
      });
      const savedPlan = await qr.manager.save(WorkoutPlan, plan);

      const exerciseRows = parsedRows.map((row) => ({
        planId: savedPlan.id,
        day: row.day,
        bodyPart: row.bodyPart,
        exerciseName: row.exerciseName,
        setNumber: row.setNumber,
        targetWeightKg: row.targetWeightKg,
        targetReps: row.targetReps,
        targetFeeling: row.targetFeeling,
      }));

      await this.workoutPlanExerciseRepository.bulkInsert(
        exerciseRows,
        qr.manager,
      );

      await qr.commitTransaction();

      const daysCount = new Set(parsedRows.map((r) => r.day)).size;

      return {
        plan: savedPlan,
        exerciseCount: parsedRows.length,
        daysCount,
        errors: [],
      };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // Returns the active plan WITH every day's exercises grouped by
  // day -> bodyPart -> exercise -> sets, so a single call renders the whole
  // week. Returns null when there is no active plan.
  async getActivePlan(userId: string) {
    const plan = await this.workoutPlanRepository.findActivePlan(userId);
    if (!plan) return null;

    const exercises = await this.workoutPlanExerciseRepository.findByPlan(plan.id);

    const dayMap = new Map<DayOfWeekEnum, WorkoutPlanExercise[]>();
    for (const ex of exercises) {
      if (!dayMap.has(ex.day)) dayMap.set(ex.day, []);
      dayMap.get(ex.day)!.push(ex);
    }

    const days = Object.values(DayOfWeekEnum)
      .filter((day) => dayMap.has(day))
      .map((day) => ({
        day,
        bodyParts: this.groupByBodyPartAndExercise(dayMap.get(day)!),
      }));

    return { ...plan, days };
  }

  async getPlanForDay(userId: string, day: DayOfWeekEnum) {
    const plan = await this.workoutPlanRepository.findActivePlan(userId);
    if (!plan) return [];

    const exercises = await this.workoutPlanExerciseRepository.findByPlanAndDay(
      plan.id,
      day,
    );

    return this.groupByBodyPartAndExercise(exercises);
  }

  // Shared grouping used by both getActivePlan (per day) and getPlanForDay.
  // Input must already be ordered bodyPart, exerciseName, setNumber (both
  // findByPlan and findByPlanAndDay guarantee this) — Map insertion order
  // preserves it without re-sorting.
  private groupByBodyPartAndExercise(exercises: WorkoutPlanExercise[]) {
    const bodyPartMap = new Map<string, Map<string, WorkoutPlanExercise[]>>();
    for (const ex of exercises) {
      if (!bodyPartMap.has(ex.bodyPart)) {
        bodyPartMap.set(ex.bodyPart, new Map());
      }
      const exerciseMap = bodyPartMap.get(ex.bodyPart)!;
      if (!exerciseMap.has(ex.exerciseName)) {
        exerciseMap.set(ex.exerciseName, []);
      }
      exerciseMap.get(ex.exerciseName)!.push(ex);
    }

    return Array.from(bodyPartMap.entries()).map(([bodyPart, exerciseMap]) => ({
      bodyPart,
      exercises: Array.from(exerciseMap.entries()).map(
        ([exerciseName, sets]) => ({
          exerciseName,
          sets: sets.map((s) => ({
            setNumber: s.setNumber,
            targetWeightKg: s.targetWeightKg,
            targetReps: s.targetReps,
            targetFeeling: s.targetFeeling,
          })),
        }),
      ),
    }));
  }

  async deactivatePlan(userId: string): Promise<{ message: string }> {
    await this.workoutPlanRepository.deactivateActivePlans(userId);
    return { message: 'Workout plan deactivated' };
  }

  // ── CSV parsing helpers ─────────────────────────────────────────────────

  private parseDay(raw: string): DayOfWeekEnum | null {
    const normalized = raw.trim().toLowerCase();
    return (
      Object.values(DayOfWeekEnum).find((d) => d.toLowerCase() === normalized) ??
      null
    );
  }

  private parseFeeling(raw: string): FeelingEnum | null {
    const normalized = raw.trim().toLowerCase();
    return (
      Object.values(FeelingEnum).find((f) => f === normalized) ?? null
    );
  }

  // Strips a trailing "kg" suffix (case-insensitive) before parsing, e.g. "20kg" -> 20.
  private parseWeightKg(raw: string): number | null {
    const cleaned = raw.replace(/kg$/i, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  // Simple CSV line splitter supporting double-quoted fields (with "" escaping)
  // that may contain commas. Sufficient for this plan's flat, simple format.
  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
