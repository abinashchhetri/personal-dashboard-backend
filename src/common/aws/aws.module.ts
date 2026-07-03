// src/common/aws/aws.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// AwsModule
// ─────────────────────────────────────────────────────────────────────────────
// Generic S3 infrastructure — no feature logic. Import into any feature module
// that needs S3 access. MusicModule is the first consumer.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';

import { AwsService } from './aws.service';

@Module({
  providers: [AwsService],
  exports: [AwsService],
})
export class AwsModule {}
