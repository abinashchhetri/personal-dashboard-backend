import { MigrationInterface, QueryRunner } from 'typeorm';

// V2 schema foundation — purely additive.
// All statements are guarded with IF NOT EXISTS so the migration is idempotent:
// running it on a DB that was already partially migrated by synchronize=true
// (dev mode) will skip existing objects and still record completion.
export class V2SchemaFoundation1783700000000 implements MigrationInterface {
  name = 'V2SchemaFoundation1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── transactions: additive columns ──────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merchant" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "currency" character varying(3) NOT NULL DEFAULT 'NPR'`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "idempotencyKey" character varying`,
    );

    // ── line_items: additive columns ────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "line_items" ADD COLUMN IF NOT EXISTS "merchant" character varying`,
    );

    // ── accounts: additive columns ──────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "currency" character varying(3) NOT NULL DEFAULT 'NPR'`,
    );

    // ── budgets ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budgets" (
        "id"          uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"      uuid                     NOT NULL,
        "categoryId"  uuid,
        "period"      character varying        NOT NULL DEFAULT 'month',
        "month"       date                     NOT NULL,
        "limitAmount" numeric(14,2)            NOT NULL,
        "rollover"    boolean                  NOT NULL DEFAULT false,
        CONSTRAINT "PK_budgets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budgets_userId" ON "budgets" ("userId")`,
    );

    // ── recurring_rules ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_rules" (
        "id"                    uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt"             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"                uuid                     NOT NULL,
        "merchant"              character varying        NOT NULL,
        "amount"                numeric(14,2)            NOT NULL,
        "cadence"               character varying        NOT NULL,
        "nextDueDate"           date,
        "status"                character varying        NOT NULL DEFAULT 'active',
        "lastSeenTransactionId" uuid,
        "reminderAt"            TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_recurring_rules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_recurring_rules_userId" ON "recurring_rules" ("userId")`,
    );

    // ── merchant_category_map ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "merchant_category_map" (
        "id"          uuid             NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"      uuid             NOT NULL,
        "merchantKey" character varying NOT NULL,
        "categoryId"  uuid             NOT NULL,
        "hitCount"    integer          NOT NULL DEFAULT 1,
        CONSTRAINT "PK_merchant_category_map" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_merchant_category_map_user_key" UNIQUE ("userId", "merchantKey")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_merchant_category_map_userId" ON "merchant_category_map" ("userId")`,
    );

    // ── attachments ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attachments" (
        "id"            uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId"        uuid                     NOT NULL,
        "transactionId" uuid,
        "url"           character varying        NOT NULL,
        "kind"          character varying        NOT NULL,
        "meta"          jsonb                    NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_attachments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attachments_userId" ON "attachments" ("userId")`,
    );
    // ADD CONSTRAINT has no IF NOT EXISTS — guard via pg_constraint check.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_attachments_transactionId'
        ) THEN
          ALTER TABLE "attachments"
            ADD CONSTRAINT "FK_attachments_transactionId"
            FOREIGN KEY ("transactionId") REFERENCES "transactions"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // ── transactions: composite + partial indexes ───────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_userId_transactedAt"
         ON "transactions" ("userId", "transactedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_userId_categoryId_transactedAt"
         ON "transactions" ("userId", "categoryId", "transactedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_active"
         ON "transactions" ("userId", "transactedAt")
         WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_transactions_user_idempotency"
         ON "transactions" ("userId", "idempotencyKey")
         WHERE "idempotencyKey" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── transactions indexes ────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_transactions_user_idempotency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_transactions_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_transactions_userId_categoryId_transactedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_transactions_userId_transactedAt"`);

    // ── attachments ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "FK_attachments_transactionId"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_attachments_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attachments"`);

    // ── merchant_category_map ───────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_merchant_category_map_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "merchant_category_map"`);

    // ── recurring_rules ─────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_recurring_rules_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_rules"`);

    // ── budgets ─────────────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_budgets_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "budgets"`);

    // ── additive columns ────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "line_items" DROP COLUMN IF EXISTS "merchant"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "tags"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "merchant"`);
  }
}
