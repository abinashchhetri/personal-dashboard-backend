// src/meals/meals.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealsModule
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MealPlanItem } from './entities/meal-plan-item.entity';
import { MealLog } from './entities/meal-log.entity';
import { MealPrepBatch } from './entities/meal-prep-batch.entity';
import { MealsController } from './meals.controller';
import { MealPlanRepository } from './repositories/meal-plan.repository';
import { MealLogRepository } from './repositories/meal-log.repository';
import { MealPrepRepository } from './repositories/meal-prep.repository';
import { MealsService } from './meals.service';

@Module({
  imports: [TypeOrmModule.forFeature([MealPlanItem, MealLog, MealPrepBatch])],
  controllers: [MealsController],
  providers: [MealsService, MealPlanRepository, MealLogRepository, MealPrepRepository],
})
export class MealsModule {}
