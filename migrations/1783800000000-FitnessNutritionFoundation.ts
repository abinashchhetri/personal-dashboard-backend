import { MigrationInterface, QueryRunner } from 'typeorm';

// Fitness & Nutrition foundation — purely additive. Six new tables, no
// changes to any existing table. Every statement is idempotent (IF NOT
// EXISTS / pg_constraint guards) so it can run on a dev DB where
// synchronize=true already created these tables.
export class FitnessNutritionFoundation1783800000000 implements MigrationInterface {
  name = 'FitnessNutritionFoundation1783800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── workout_plan_exercises ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workout_plan_exercises" (
        "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"       uuid                     NOT NULL,
        "dayOfWeek"    smallint                 NOT NULL,
        "exerciseName" character varying        NOT NULL,
        "orderIndex"   integer                  NOT NULL DEFAULT 0,
        "targetSets"   integer,
        "targetReps"   integer,
        "targetWeight" numeric(6,2),
        "notes"        character varying,
        CONSTRAINT "PK_workout_plan_exercises" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workout_plan_user_day" ON "workout_plan_exercises" ("userId", "dayOfWeek")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_workout_plan_user_day_exercise"
        ON "workout_plan_exercises" ("userId", "dayOfWeek", "exerciseName")
    `);

    // ── workout_sessions ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workout_sessions" (
        "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"          uuid                     NOT NULL,
        "performedAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "dayOfWeek"       smallint                 NOT NULL,
        "title"           character varying,
        "feeling"         smallint,
        "durationMinutes" integer,
        "notes"           character varying,
        "entryMethod"     character varying        NOT NULL DEFAULT 'form',
        CONSTRAINT "PK_workout_sessions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workout_sessions_user_performed" ON "workout_sessions" ("userId", "performedAt")`,
    );

    // ── workout_session_exercises ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workout_session_exercises" (
        "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "sessionId"     uuid                     NOT NULL,
        "userId"        uuid                     NOT NULL,
        "performedAt"   TIMESTAMP WITH TIME ZONE NOT NULL,
        "exerciseName"  character varying        NOT NULL,
        "orderIndex"    integer                  NOT NULL DEFAULT 0,
        "plannedSets"   integer,
        "plannedReps"   integer,
        "plannedWeight" numeric(6,2),
        "completedSets" integer,
        "actualReps"    integer,
        "actualWeight"  numeric(6,2),
        "setDetails"    jsonb,
        "skipped"       boolean                  NOT NULL DEFAULT false,
        CONSTRAINT "PK_workout_session_exercises" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wse_sessionId" ON "workout_session_exercises" ("sessionId")`,
    );
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wse_user_exercise_time"
        ON "workout_session_exercises" ("userId", "exerciseName", "performedAt")
    `);

    // ── meal_plan_items ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meal_plan_items" (
        "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"      uuid                     NOT NULL,
        "dayOfWeek"   smallint                 NOT NULL,
        "mealType"    character varying        NOT NULL,
        "name"        character varying        NOT NULL,
        "orderIndex"  integer                  NOT NULL DEFAULT 0,
        "calories"    integer,
        "proteinG"    numeric(6,2),
        "carbsG"      numeric(6,2),
        "fatG"        numeric(6,2),
        "notes"       character varying,
        CONSTRAINT "PK_meal_plan_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_meal_plan_user_day" ON "meal_plan_items" ("userId", "dayOfWeek")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_meal_plan_user_day_type_name"
        ON "meal_plan_items" ("userId", "dayOfWeek", "mealType", "name")
    `);

    // ── meal_prep_batches ────────────────────────────────────────────────────
    // Created before meal_logs since meal_logs.prepBatchId references it.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meal_prep_batches" (
        "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"             uuid                     NOT NULL,
        "name"               character varying        NOT NULL,
        "preppedAt"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "mealType"           character varying,
        "totalPortions"      integer                  NOT NULL,
        "consumedPortions"   integer                  NOT NULL DEFAULT 0,
        "caloriesPerPortion" integer,
        "proteinPerPortionG" numeric(6,2),
        "carbsPerPortionG"   numeric(6,2),
        "fatPerPortionG"     numeric(6,2),
        "expiresAt"          TIMESTAMP WITH TIME ZONE,
        "notes"              character varying,
        CONSTRAINT "PK_meal_prep_batches" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_meal_prep_user_prepped" ON "meal_prep_batches" ("userId", "preppedAt")`,
    );

    // ── meal_logs ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meal_logs" (
        "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"       uuid                     NOT NULL,
        "consumedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "mealType"     character varying,
        "name"         character varying        NOT NULL,
        "planItemId"   uuid,
        "prepBatchId"  uuid,
        "source"       character varying        NOT NULL DEFAULT 'freeform',
        "calories"     integer,
        "proteinG"     numeric(6,2),
        "carbsG"       numeric(6,2),
        "fatG"         numeric(6,2),
        "entryMethod"  character varying        NOT NULL DEFAULT 'form',
        "notes"        character varying,
        CONSTRAINT "PK_meal_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_meal_logs_user_consumed" ON "meal_logs" ("userId", "consumedAt")`,
    );

    // ── Foreign keys (guarded — Postgres has no ADD CONSTRAINT IF NOT EXISTS) ─
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_wse_sessionId'
        ) THEN
          ALTER TABLE "workout_session_exercises"
            ADD CONSTRAINT "FK_wse_sessionId"
            FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_meal_logs_planItemId'
        ) THEN
          ALTER TABLE "meal_logs"
            ADD CONSTRAINT "FK_meal_logs_planItemId"
            FOREIGN KEY ("planItemId") REFERENCES "meal_plan_items"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_meal_logs_prepBatchId'
        ) THEN
          ALTER TABLE "meal_logs"
            ADD CONSTRAINT "FK_meal_logs_prepBatchId"
            FOREIGN KEY ("prepBatchId") REFERENCES "meal_prep_batches"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── FKs ──────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "meal_logs" DROP CONSTRAINT IF EXISTS "FK_meal_logs_prepBatchId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_logs" DROP CONSTRAINT IF EXISTS "FK_meal_logs_planItemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workout_session_exercises" DROP CONSTRAINT IF EXISTS "FK_wse_sessionId"`,
    );

    // ── meal_logs ────────────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_meal_logs_user_consumed"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meal_logs"`);

    // ── meal_prep_batches ────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_meal_prep_user_prepped"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meal_prep_batches"`);

    // ── meal_plan_items ──────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_meal_plan_user_day_type_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_meal_plan_user_day"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meal_plan_items"`);

    // ── workout_session_exercises ───────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_wse_user_exercise_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_wse_sessionId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_session_exercises"`);

    // ── workout_sessions ─────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_workout_sessions_user_performed"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_sessions"`);

    // ── workout_plan_exercises ───────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_workout_plan_user_day_exercise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_workout_plan_user_day"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_plan_exercises"`);
  }
}
