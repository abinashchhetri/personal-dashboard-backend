// src/workout/workout.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutModule
// ─────────────────────────────────────────────────────────────────────────────
// CSV plan uploads are held entirely in memory (memoryStorage) and never
// written to disk or S3 — the file only exists long enough to be parsed.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';

import { WorkoutPlan } from './entities/workout-plan.entity';
import { WorkoutPlanExercise } from './entities/workout-plan-exercise.entity';
import { WorkoutSession } from './entities/workout-session.entity';
import { WorkoutSessionSet } from './entities/workout-session-set.entity';
import { WorkoutPlanRepository } from './repositories/workout-plan.repository';
import { WorkoutPlanExerciseRepository } from './repositories/workout-plan-exercise.repository';
import { WorkoutSessionRepository } from './repositories/workout-session.repository';
import { WorkoutSessionSetRepository } from './repositories/workout-session-set.repository';
import { WorkoutPlanService } from './services/workout-plan.service';
import { WorkoutSessionService } from './services/workout-session.service';
import { WorkoutController } from './workout.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutPlan,
      WorkoutPlanExercise,
      WorkoutSession,
      WorkoutSessionSet,
    ]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 }, // 1MB
      fileFilter: (_req, file, cb) => {
        const isCsv =
          file.mimetype === 'text/csv' ||
          file.originalname.toLowerCase().endsWith('.csv');
        cb(null, isCsv);
      },
    }),
  ],
  controllers: [WorkoutController],
  providers: [
    WorkoutPlanService,
    WorkoutSessionService,
    WorkoutPlanRepository,
    WorkoutPlanExerciseRepository,
    WorkoutSessionRepository,
    WorkoutSessionSetRepository,
  ],
})
export class WorkoutModule {}
