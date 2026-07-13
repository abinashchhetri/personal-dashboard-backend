import { MigrationInterface, QueryRunner } from "typeorm";

export class AddX402Tables1783879858670 implements MigrationInterface {
    name = 'AddX402Tables1783879858670'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."x402_quotes_status_enum" AS ENUM('issued', 'paid', 'expired')`);
        await queryRunner.query(`CREATE TABLE "x402_quotes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dataOwnerId" uuid NOT NULL, "status" "public"."x402_quotes_status_enum" NOT NULL DEFAULT 'issued', "referencePublicKey" text NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d535c7f73b9b6692234180dbc57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a871365819aca76f71512fccb7" ON "x402_quotes" ("status", "expiresAt") `);
        await queryRunner.query(`CREATE TABLE "x402_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quoteId" uuid NOT NULL, "dataOwnerId" uuid NOT NULL, "transactionSignature" text NOT NULL, "recipientPublicKey" text NOT NULL, "tokenMint" text NOT NULL, "amountBaseUnits" bigint NOT NULL, "memo" text, "paidAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d2068956aa36fc6e59af6eb4102" UNIQUE ("quoteId"), CONSTRAINT "REL_d2068956aa36fc6e59af6eb410" UNIQUE ("quoteId"), CONSTRAINT "PK_978982e9033f5ed25cecbf945a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d2068956aa36fc6e59af6eb410" ON "x402_payments" ("quoteId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cf41afd5b5bf7cd862b048211b" ON "x402_payments" ("dataOwnerId", "paidAt") `);
        await queryRunner.query(`ALTER TABLE "x402_payments" ADD CONSTRAINT "FK_d2068956aa36fc6e59af6eb4102" FOREIGN KEY ("quoteId") REFERENCES "x402_quotes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "x402_payments" DROP CONSTRAINT "FK_d2068956aa36fc6e59af6eb4102"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cf41afd5b5bf7cd862b048211b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d2068956aa36fc6e59af6eb410"`);
        await queryRunner.query(`DROP TABLE "x402_payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a871365819aca76f71512fccb7"`);
        await queryRunner.query(`DROP TABLE "x402_quotes"`);
        await queryRunner.query(`DROP TYPE "public"."x402_quotes_status_enum"`);
    }

}
