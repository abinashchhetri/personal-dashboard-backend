import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintOnExternalId1783601000000 implements MigrationInterface {
  name = 'AddUniqueConstraintOnExternalId1783601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove any accidental duplicates first — keep the oldest row per externalId.
    // In practice there should be none; this is a safety net before adding the constraint.
    await queryRunner.query(`
      DELETE FROM "tracks" a
      USING  "tracks" b
      WHERE  a."createdAt" > b."createdAt"
        AND  a."externalId" = b."externalId"
    `);
    await queryRunner.query(
      `ALTER TABLE "tracks" ADD CONSTRAINT "UQ_tracks_externalId" UNIQUE ("externalId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tracks" DROP CONSTRAINT "UQ_tracks_externalId"`,
    );
  }
}
