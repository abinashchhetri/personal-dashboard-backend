import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTracksTable1783066631447 implements MigrationInterface {
    name = 'CreateTracksTable1783066631447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tracks_source_enum" AS ENUM('YOUTUBE')`);
        await queryRunner.query(`CREATE TABLE "tracks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "externalId" character varying NOT NULL, "title" character varying NOT NULL, "artist" character varying NOT NULL, "album" character varying, "duration" integer, "s3Key" character varying, "coverUrl" character varying, "genre" character varying, "bitrate" integer NOT NULL DEFAULT '320', "source" "public"."tracks_source_enum" NOT NULL DEFAULT 'YOUTUBE', "isCached" boolean NOT NULL DEFAULT false, "playCount" integer NOT NULL DEFAULT '0', "lastPlayedAt" TIMESTAMP WITH TIME ZONE, "fileSizeBytes" bigint, "metadata" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_242a37ffc7870380f0e611986e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3342064294204ecce48c6dfbad" ON "tracks" ("isCached", "lastPlayedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_44b8a29530fd01c70f5d1848fa" ON "tracks" ("externalId") `);
        await queryRunner.query(`CREATE TABLE "playlist_tracks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "playlistId" uuid NOT NULL, "trackId" uuid NOT NULL, "position" integer NOT NULL, "addedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_57408befb7b28ce3a7b38ee1437" UNIQUE ("playlistId", "position"), CONSTRAINT "UQ_ec4577af58f7574864feb8112e3" UNIQUE ("playlistId", "trackId"), CONSTRAINT "PK_0f93b1a2df4de2e5b48c1459617" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_57408befb7b28ce3a7b38ee143" ON "playlist_tracks" ("playlistId", "position") `);
        await queryRunner.query(`CREATE TABLE "playlists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, "coverUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "trackCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_a4597f4189a75d20507f3f7ef0d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_708a919e9aa49019000d9e9b68" ON "playlists" ("userId") `);
        await queryRunner.query(`CREATE TABLE "user_music_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "seedArtists" jsonb NOT NULL DEFAULT '[]', "seedGenres" jsonb NOT NULL DEFAULT '[]', "preferredBitrate" integer NOT NULL DEFAULT '320', CONSTRAINT "UQ_9526c6f73a90cfcf2abab844cd3" UNIQUE ("userId"), CONSTRAINT "PK_ca0ad2a9490912af8747a9eaf8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9526c6f73a90cfcf2abab844cd" ON "user_music_preferences" ("userId") `);
        await queryRunner.query(`CREATE TABLE "recommendation_cache" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sourceTrackId" uuid NOT NULL, "sourceExternalId" character varying NOT NULL, "recommendedExternalId" character varying NOT NULL, "recommendedTitle" character varying NOT NULL, "recommendedArtist" character varying NOT NULL, "recommendedCoverUrl" character varying, "matchScore" numeric(5,4) NOT NULL DEFAULT '0', "apiSource" character varying NOT NULL DEFAULT 'lastfm', "isPrepared" boolean NOT NULL DEFAULT false, "cachedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d4e27a46171815138b7030b12a3" UNIQUE ("sourceTrackId", "recommendedExternalId"), CONSTRAINT "PK_02e9cd00874e5a53b0791a6eb10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "playlist_tracks" ADD CONSTRAINT "FK_502ada93a48b5f9f7d7d2b3f0d7" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "playlist_tracks" ADD CONSTRAINT "FK_8a14e4cccc182c57a83e4f4d95a" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "playlists" ADD CONSTRAINT "FK_708a919e9aa49019000d9e9b68e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "playlists" DROP CONSTRAINT "FK_708a919e9aa49019000d9e9b68e"`);
        await queryRunner.query(`ALTER TABLE "playlist_tracks" DROP CONSTRAINT "FK_8a14e4cccc182c57a83e4f4d95a"`);
        await queryRunner.query(`ALTER TABLE "playlist_tracks" DROP CONSTRAINT "FK_502ada93a48b5f9f7d7d2b3f0d7"`);
        await queryRunner.query(`DROP TABLE "recommendation_cache"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9526c6f73a90cfcf2abab844cd"`);
        await queryRunner.query(`DROP TABLE "user_music_preferences"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_708a919e9aa49019000d9e9b68"`);
        await queryRunner.query(`DROP TABLE "playlists"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_57408befb7b28ce3a7b38ee143"`);
        await queryRunner.query(`DROP TABLE "playlist_tracks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_44b8a29530fd01c70f5d1848fa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3342064294204ecce48c6dfbad"`);
        await queryRunner.query(`DROP TABLE "tracks"`);
        await queryRunner.query(`DROP TYPE "public"."tracks_source_enum"`);
    }

}
