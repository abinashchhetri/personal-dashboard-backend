import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSolanaPayTables1783697232342 implements MigrationInterface {
    name = 'AddSolanaPayTables1783697232342'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attachments" DROP CONSTRAINT "FK_attachments_transactionId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_attachments_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_recurring_rules_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_merchant_category_map_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_budgets_userId"`);
        await queryRunner.query(`ALTER TABLE "merchant_category_map" DROP CONSTRAINT "UQ_merchant_category_map_user_key"`);
        await queryRunner.query(`CREATE TABLE "payment_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "amountUsdc" numeric(14,6) NOT NULL, "label" text, "message" text, "memo" text, "referencePublicKey" text NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "transactionSignature" text, "accountId" uuid, "autoLoggedTransactionId" uuid, "confirmedAt" TIMESTAMP WITH TIME ZONE, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_9299e570c6d9babbe54752e16ec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6f4b7f82cfe456a35235c189e9" ON "payment_requests" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_c53f83bf63ca26f33674c5a78e" ON "payment_requests" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_35138b11d46d53c48ed932afa4" ON "attachments" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_71df27ebc5aca170edbc2e84b4" ON "recurring_rules" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_520f55a6115ba52325af89b90b" ON "merchant_category_map" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_merchant_category_map_user_key" ON "merchant_category_map" ("userId", "merchantKey") `);
        await queryRunner.query(`CREATE INDEX "IDX_27e688ddf1ff3893b43065899f" ON "budgets" ("userId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_27e688ddf1ff3893b43065899f"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_merchant_category_map_user_key"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_520f55a6115ba52325af89b90b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71df27ebc5aca170edbc2e84b4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_35138b11d46d53c48ed932afa4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c53f83bf63ca26f33674c5a78e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6f4b7f82cfe456a35235c189e9"`);
        await queryRunner.query(`DROP TABLE "payment_requests"`);
        await queryRunner.query(`ALTER TABLE "merchant_category_map" ADD CONSTRAINT "UQ_merchant_category_map_user_key" UNIQUE ("userId", "merchantKey")`);
        await queryRunner.query(`CREATE INDEX "IDX_budgets_userId" ON "budgets" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_merchant_category_map_userId" ON "merchant_category_map" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_recurring_rules_userId" ON "recurring_rules" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_attachments_userId" ON "attachments" ("userId") `);
        await queryRunner.query(`ALTER TABLE "attachments" ADD CONSTRAINT "FK_attachments_transactionId" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
