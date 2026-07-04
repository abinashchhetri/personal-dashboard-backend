// src/music/services/music-storage.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// MusicStorageService
// ─────────────────────────────────────────────────────────────────────────────
// Music-specific wrapper around AwsService: key convention, presigned URLs,
// and the uploadTrack helper used by LiveStreamService and TrackCacheService.
// All S3 interaction goes through AwsService — never reference S3Client here.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';

import { AwsService } from 'src/common/aws/aws.service';

@Injectable()
export class MusicStorageService {
  constructor(private readonly awsService: AwsService) {}

  async getPresignedStreamUrl(s3Key: string): Promise<string> {
    return this.awsService.getPresignedUrl(s3Key);
  }

  // Uploads a finished audio buffer to S3 and returns the s3Key.
  // Delegates multipart/single-part decision to AwsService.uploadFile.
  // format should be 'webm' for new opus tracks; 'mp3' for legacy re-uploads.
  async uploadTrack(
    buffer: Buffer,
    trackId: string,
    format: string = 'webm',
    metadata?: Record<string, string>,
  ): Promise<string> {
    const s3Key = this.awsService.buildMusicKey(trackId, format);
    const contentType = format === 'webm' ? 'audio/webm' : 'audio/mpeg';
    return this.awsService.uploadFile(buffer, s3Key, contentType, metadata);
  }
}
