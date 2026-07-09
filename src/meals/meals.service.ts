// src/meals/meals.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealsService
// ─────────────────────────────────────────────────────────────────────────────
// Owns the weekly meal plan (CSV-seeded template), meal logs (actuals), and
// meal-prep batches with atomic portion accounting. Macros are always
// nullable end-to-end — never coerced to 0.
// ─────────────────────────────────────────────────────────────────────────────

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  currentDayOfWeek,
  dayOfWeekName,
  DayOfWeek,
  parseDayOfWeek,
} from 'src/common/csv/day-of-week.util';
import { parseCsvRows, toOptionalDecimal, toOptionalInt } from 'src/common/csv/csv.util';

import { MealPlanRepository } from './repositories/meal-plan.repository';
import { MealLogRepository } from './repositories/meal-log.repository';
import { MealPrepRepository } from './repositories/meal-prep.repository';
import { MealPlanItem } from './entities/meal-plan-item.entity';
import { MealLog } from './entities/meal-log.entity';
import { MealPrepBatch } from './entities/meal-prep-batch.entity';
import { parseMealType } from './enums/meal-type.enum';
import { CreateMealLogDto } from './dto/create-meal-log.dto';
import { UpdateMealLogDto } from './dto/update-meal-log.dto';
import { CreatePrepDto } from './dto/create-prep.dto';
import { UpdatePrepDto } from './dto/update-prep.dto';
import { ConsumePrepDto } from './dto/consume-prep.dto';
import { FindLogsDto } from './dto/find-logs.dto';

function utcDayBounds(date: Date = new Date()): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0),
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  return { dayStart, dayEnd };
}

function withRemaining(batch: MealPrepBatch) {
  return {
    ...batch,
    remainingPortions: batch.totalPortions - batch.consumedPortions,
  };
}

@Injectable()
export class MealsService {
  constructor(
    private readonly mealPlanRepository: MealPlanRepository,
    private readonly mealLogRepository: MealLogRepository,
    private readonly mealPrepRepository: MealPrepRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Plan (CSV-seeded template) ──────────────────────────────────────────

  async importPlan(csv: string, userId: string) {
    const parsedRows = parseCsvRows(csv);

    if (
      parsedRows.length === 0 ||
      !('day' in parsedRows[0]) ||
      !('meal' in parsedRows[0]) ||
      !('name' in parsedRows[0])
    ) {
      throw new BadRequestException(
        'CSV must have at least "day", "meal", and "name" columns',
      );
    }

    const warnings: string[] = [];
    let skippedCount = 0;
    const orderCounters = new Map<string, number>();
    // Dedupe on (dayOfWeek, mealType, name) — last row wins — so the unique
    // index on the plan table can never be violated by a re-import.
    const dedup = new Map<string, Partial<MealPlanItem>>();

    parsedRows.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for the header row
      const dayOfWeek = parseDayOfWeek(row.day ?? '');
      if (!dayOfWeek) {
        warnings.push(`Row ${rowNum}: invalid day '${row.day}'`);
        skippedCount++;
        return;
      }

      const mealType = parseMealType(row.meal ?? '');
      if (!mealType) {
        warnings.push(`Row ${rowNum}: invalid meal type '${row.meal}'`);
        skippedCount++;
        return;
      }

      const name = (row.name ?? '').trim();
      if (!name) {
        warnings.push(`Row ${rowNum}: missing meal name`);
        skippedCount++;
        return;
      }

      const counterKey = `${dayOfWeek}::${mealType}`;
      const orderIndex = orderCounters.get(counterKey) ?? 0;
      orderCounters.set(counterKey, orderIndex + 1);

      const planRow: Partial<MealPlanItem> = {
        userId,
        dayOfWeek,
        mealType,
        name,
        orderIndex,
        calories: toOptionalInt(row.calories),
        proteinG: toOptionalDecimal(row.protein),
        carbsG: toOptionalDecimal(row.carbs),
        fatG: toOptionalDecimal(row.fat),
        notes: row.notes || null,
      };

      dedup.set(`${dayOfWeek}::${mealType}::${name.toLowerCase()}`, planRow);
    });

    const rows = Array.from(dedup.values());
    if (rows.length === 0) {
      throw new BadRequestException('No valid rows found in CSV');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await this.mealPlanRepository.replacePlan(userId, rows, qr.manager);
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    const daysCovered = new Set(rows.map((r) => r.dayOfWeek)).size;

    return { inserted: rows.length, daysCovered, skipped: skippedCount, warnings };
  }

  async getPlan(userId: string) {
    const rows = await this.mealPlanRepository.findPlanForUser(userId);

    const grouped = new Map<number, MealPlanItem[]>();
    for (const row of rows) {
      const list = grouped.get(row.dayOfWeek) ?? [];
      list.push(row);
      grouped.set(row.dayOfWeek, list);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([dayOfWeek, meals]) => ({
        dayOfWeek,
        dayName: dayOfWeekName(dayOfWeek as DayOfWeek),
        meals,
      }));
  }

  async clearPlan(userId: string): Promise<{ message: string }> {
    await this.mealPlanRepository.entityRepository.delete({ userId });
    return { message: 'Meal plan cleared' };
  }

  // ── Today aggregate ─────────────────────────────────────────────────────

  async getToday(userId: string) {
    const dayOfWeek = currentDayOfWeek();
    const { dayStart, dayEnd } = utcDayBounds();

    const [plan, logs, prepBatches] = await Promise.all([
      this.mealPlanRepository.findPlanForDay(userId, dayOfWeek),
      this.mealLogRepository.findLogsForDay(userId, dayStart, dayEnd),
      this.mealPrepRepository.findActiveBatches(userId),
    ]);

    return {
      dayOfWeek,
      dayName: dayOfWeekName(dayOfWeek),
      plan,
      logs,
      prepBatches: prepBatches.map(withRemaining),
    };
  }

  // ── Meal logs ────────────────────────────────────────────────────────────

  async createLog(dto: CreateMealLogDto, userId: string): Promise<MealLog> {
    let calories = dto.calories ?? null;
    let proteinG = dto.proteinG ?? null;
    let carbsG = dto.carbsG ?? null;
    let fatG = dto.fatG ?? null;

    // On-plan logs may omit macros — backfill from the plan item when present.
    if (dto.source === 'plan' && dto.planItemId) {
      const planItem = await this.mealPlanRepository.entityRepository.findOne({
        where: { id: dto.planItemId, userId },
      });
      if (planItem) {
        calories = calories ?? planItem.calories;
        proteinG = proteinG ?? planItem.proteinG;
        carbsG = carbsG ?? planItem.carbsG;
        fatG = fatG ?? planItem.fatG;
      }
    }

    const log = this.mealLogRepository.entityRepository.create({
      userId,
      name: dto.name,
      consumedAt: dto.consumedAt ? new Date(dto.consumedAt) : new Date(),
      mealType: dto.mealType ?? null,
      planItemId: dto.planItemId ?? null,
      prepBatchId: null,
      source: dto.source ?? 'freeform',
      calories,
      proteinG,
      carbsG,
      fatG,
      entryMethod: dto.entryMethod ?? 'form',
      notes: dto.notes ?? null,
    });

    return this.mealLogRepository.entityRepository.save(log);
  }

  async findLogs(dto: FindLogsDto, userId: string) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.mealLogRepository.findLogsForUser(userId, {
      skip,
      take: limit,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

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

  async updateLog(id: string, dto: UpdateMealLogDto, userId: string): Promise<MealLog> {
    // Omit consumedAt entirely when not provided — passing an explicit
    // `undefined` value through to a TypeORM update() call is ambiguous and
    // must not overwrite the existing column.
    const { consumedAt: rawConsumedAt, ...rest } = dto;
    const updatePayload: Record<string, unknown> = { ...rest };
    if (rawConsumedAt) {
      updatePayload.consumedAt = new Date(rawConsumedAt);
    }

    await this.mealLogRepository.findOneAndUpdate(
      { id, userId } as any,
      updatePayload as any,
    );
    return this.mealLogRepository.findOne({ id, userId } as any);
  }

  async removeLog(id: string, userId: string): Promise<{ message: string }> {
    await this.mealLogRepository.findOne({ id, userId } as any);
    await this.mealLogRepository.entityRepository.delete({ id, userId });
    return { message: 'Meal log deleted' };
  }

  // ── Meal prep ────────────────────────────────────────────────────────────

  async createPrep(dto: CreatePrepDto, userId: string) {
    const batch = this.mealPrepRepository.entityRepository.create({
      userId,
      name: dto.name,
      preppedAt: dto.preppedAt ? new Date(dto.preppedAt) : new Date(),
      mealType: dto.mealType ?? null,
      totalPortions: dto.totalPortions,
      consumedPortions: 0,
      caloriesPerPortion: dto.caloriesPerPortion ?? null,
      proteinPerPortionG: dto.proteinPerPortionG ?? null,
      carbsPerPortionG: dto.carbsPerPortionG ?? null,
      fatPerPortionG: dto.fatPerPortionG ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      notes: dto.notes ?? null,
    });
    const saved = await this.mealPrepRepository.entityRepository.save(batch);
    return withRemaining(saved);
  }

  async findPrep(userId: string) {
    const batches = await this.mealPrepRepository.findActiveBatches(userId);
    return batches.map(withRemaining);
  }

  async updatePrep(id: string, dto: UpdatePrepDto, userId: string) {
    // Omit preppedAt/expiresAt entirely when not provided — see updateLog for why.
    const { preppedAt: rawPreppedAt, expiresAt: rawExpiresAt, ...rest } = dto;
    const updatePayload: Record<string, unknown> = { ...rest };
    if (rawPreppedAt) updatePayload.preppedAt = new Date(rawPreppedAt);
    if (rawExpiresAt) updatePayload.expiresAt = new Date(rawExpiresAt);

    await this.mealPrepRepository.findOneAndUpdate(
      { id, userId } as any,
      updatePayload as any,
    );
    const updated = await this.mealPrepRepository.findOne({ id, userId } as any);
    return withRemaining(updated);
  }

  async removePrep(id: string, userId: string): Promise<{ message: string }> {
    await this.mealPrepRepository.findOne({ id, userId } as any);
    await this.mealPrepRepository.entityRepository.delete({ id, userId });
    return { message: 'Meal prep batch deleted' };
  }

  // Atomic, race-safe: holds a pessimistic write lock on the batch row so two
  // rapid "ate a portion" taps can never push consumedPortions past totalPortions.
  async consumePortion(id: string, dto: ConsumePrepDto, userId: string) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const batch = await qr.manager.findOne(MealPrepBatch, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!batch) {
        throw new NotFoundException('Meal prep batch not found');
      }
      if (batch.consumedPortions >= batch.totalPortions) {
        throw new BadRequestException('No portions remaining');
      }

      batch.consumedPortions += 1;
      await qr.manager.save(MealPrepBatch, batch);

      const log = qr.manager.create(MealLog, {
        userId,
        name: batch.name,
        consumedAt: dto.consumedAt ? new Date(dto.consumedAt) : new Date(),
        mealType: batch.mealType,
        planItemId: null,
        prepBatchId: batch.id,
        source: 'prep',
        calories: batch.caloriesPerPortion,
        proteinG: batch.proteinPerPortionG,
        carbsG: batch.carbsPerPortionG,
        fatG: batch.fatPerPortionG,
        entryMethod: 'form',
        notes: dto.notes ?? null,
      });
      const savedLog = await qr.manager.save(MealLog, log);

      await qr.commitTransaction();

      return { batch: withRemaining(batch), log: savedLog };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
