import { MigrationInterface, QueryRunner } from 'typeorm';

// Replaces the old per-exercise workout schema (workout_plan_exercises /
// workout_sessions / workout_session_exercises from the superseded
// FitnessNutritionFoundation migration) with the new per-set schema:
// workout_plans -> workout_plan_exercises, and workout_sessions ->
// workout_session_sets. The old tables are dropped first since two of the
// new table names are reused with fully incompatible columns. Does NOT touch
// any meal_* table. Idempotent: safe to run against a dev DB where
// synchronize=true may have already created some of these tables.
export class CreateWorkoutTables1783900000000 implements MigrationInterface {
  name = 'CreateWorkoutTables1783900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Drop the old (incompatible) workout schema ──────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_session_exercises" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_session_sets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_plan_exercises" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_plans" CASCADE`);

    // ── workout_plans ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workout_plans" (
        "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"     uuid                     NOT NULL,
        "name"       character varying        NOT NULL,
        "isActive"   boolean                  NOT NULL DEFAULT true,
        "importedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workout_plans" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workout_plans_userId" ON "workout_plans" ("userId")`,
    );

    // ── workout_plan_exercises ───────────────────────────────────────────────
    // Enum columns modeled as varchar + CHECK (not native Postgres enum types)
    // — simplest option that avoids enum-type-name coordination with
    // synchronize's auto-generated names; the columns are empty on creation
    // so synchronize can freely reconcile the type in dev.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workout_plan_exercises" (
        "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "planId"         uuid                     NOT NULL,
        "day"            character varying        NOT NULL
          CONSTRAINT "CHK_workout_plan_exercises_day" CHECK ("day" IN
            ('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
        "bodyPart"       character varying        NOT NULL,
        "exerciseName"   character varying        NOT NULL,
        "setNumber"      integer                  NOT NULL,
        "targetWeightKg" numeric(6,2)             NOT NULL,
        "targetReps"     integer                  NOT NULL,
        "targetFeeling"  character varying        NOT NULL
          CONSTRAINT "CHK_workout_plan_exercises_target_feeling" CHECK ("targetFeeling" IN
            ('light','average','medium','hard')),
        CONSTRAINT "PK_workout_plan_exercises" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workout_plan_exercises_planId" ON "workout_plan_exercises" ("planId")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_plan_day_exercise_set"
        ON "workout_plan_exercises" ("planId", "day", "exerciseName", "setNumber")
    `);

    // ── workout_sessions ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workout_sessions" (
        "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"          uuid                     NOT NULL,
        "sessionDate"     date                     NOT NULL,
        "dayOfWeek"       character varying        NOT NULL
          CONSTRAINT "CHK_workout_sessions_day_of_week" CHECK ("dayOfWeek" IN
            ('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
        "planId"          uuid,
        "notes"           text,
        "completedAt"     TIMESTAMP WITH TIME ZONE,
        "durationMinutes" integer,
        CONSTRAINT "PK_workout_sessions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workout_sessions_user_date" ON "workout_sessions" ("userId", "sessionDate")`,
    );

    // ── workout_session_sets ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workout_session_sets" (
        "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
        "createdAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "sessionId"      uuid                     NOT NULL,
        "exerciseName"   character varying        NOT NULL,
        "bodyPart"       character varying        NOT NULL,
        "setNumber"      integer                  NOT NULL,
        "actualWeightKg" numeric(6,2),
        "actualReps"     integer,
        "actualFeeling"  character varying
          CONSTRAINT "CHK_workout_session_sets_actual_feeling" CHECK
            ("actualFeeling" IS NULL OR "actualFeeling" IN ('light','average','medium','hard')),
        "planExerciseId" uuid,
        "isCompleted"    boolean                  NOT NULL DEFAULT false,
        CONSTRAINT "PK_workout_session_sets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workout_session_sets_sessionId" ON "workout_session_sets" ("sessionId")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_session_exercise_set"
        ON "workout_session_sets" ("sessionId", "exerciseName", "setNumber")
    `);

    // ── Foreign keys (guarded — Postgres has no ADD CONSTRAINT IF NOT EXISTS) ─
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_workout_plan_exercises_planId'
        ) THEN
          ALTER TABLE "workout_plan_exercises"
            ADD CONSTRAINT "FK_workout_plan_exercises_planId"
            FOREIGN KEY ("planId") REFERENCES "workout_plans"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_workout_session_sets_sessionId'
        ) THEN
          ALTER TABLE "workout_session_sets"
            ADD CONSTRAINT "FK_workout_session_sets_sessionId"
            FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id")
            ON DELETE CASCADE;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── FKs ──────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "workout_session_sets" DROP CONSTRAINT IF EXISTS "FK_workout_session_sets_sessionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workout_plan_exercises" DROP CONSTRAINT IF EXISTS "FK_workout_plan_exercises_planId"`,
    );

    // ── workout_session_sets ─────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_session_exercise_set"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_workout_session_sets_sessionId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_session_sets"`);

    // ── workout_sessions ─────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_workout_sessions_user_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_sessions"`);

    // ── workout_plan_exercises ───────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_plan_day_exercise_set"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_workout_plan_exercises_planId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_plan_exercises"`);

    // ── workout_plans ────────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_workout_plans_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workout_plans"`);
  }
}
