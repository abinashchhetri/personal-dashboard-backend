// src/common/aws/aws.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// AwsService
// ─────────────────────────────────────────────────────────────────────────────
// Generic S3 operations shared by any feature that stores files.
// buildMusicKey centralises the S3 key convention — use it everywhere, never
// hand-construct music paths outside this service.
// getStreamRange proxies byte-range audio through the Node response without
// exposing the S3 URL to the client.
// ─────────────────────────────────────────────────────────────────────────────

import { ServerResponse } from 'http';
import { Readable } from 'stream';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly defaultPresignedUrlExpiry: number;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: configService.get<string>('AWS_ACCESS_KEY')!,
        secretAccessKey: configService.get<string>('AWS_SECRET_KEY')!,
      },
    });
    this.bucket = configService.get<string>('AWS_S3_BUCKET')!;
    this.defaultPresignedUrlExpiry =
      configService.get<number>('AWS_S3_PRESIGNED_URL_EXPIRY') ?? 3600;
  }

  // Returns the s3Key, not a URL. Callers call getPresignedUrl separately when needed.
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        StorageClass: 'STANDARD',
        ...(metadata && { Metadata: metadata }),
      }),
    );
    this.logger.log(`Uploaded ${key} (${mimeType})`);
    return key;
  }

  async getPresignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, {
      expiresIn: expiresInSeconds ?? this.defaultPresignedUrlExpiry,
    });
  }

  // Proxies byte-range audio to the raw Node ServerResponse — S3 URL is never
  // sent to the client. Pipe Body as a Readable; SDK v3 returns Readable in Node.
  async getStreamRange(
    key: string,
    rangeHeader: string | undefined,
    res: ServerResponse,
  ): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(rangeHeader && { Range: rangeHeader }),
    });

    const response = await this.s3.send(command);

    if (!response.Body) {
      res.writeHead(500);
      res.end();
      return;
    }

    const stream = response.Body as Readable;
    const contentLength = String(response.ContentLength ?? 0);

    if (rangeHeader) {
      res.writeHead(206, {
        'Content-Range': response.ContentRange ?? '',
        'Accept-Ranges': 'bytes',
        'Content-Type': 'audio/mpeg',
        'Content-Length': contentLength,
      });
    } else {
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': contentLength,
      });
    }

    stream.pipe(res);
  }

  // Never throws — returns false on any 404 variant so callers can branch safely.
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) return false;
      throw error;
    }
  }

  // Idempotent — no error if the key is already gone.
  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted ${key}`);
  }

  // Returns 0 if the key does not exist — same catch pattern as fileExists.
  async getFileSizeBytes(key: string): Promise<number> {
    try {
      const response = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return response.ContentLength ?? 0;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) return 0;
      throw error;
    }
  }

  // Centralised key convention — use this everywhere, never hand-build paths.
  buildMusicKey(trackId: string, format = 'mp3'): string {
    return `music/tracks/${trackId}.${format}`;
  }

  private isNotFoundError(error: unknown): boolean {
    const e = error as Record<string, any>;
    return (
      e?.['$metadata']?.httpStatusCode === 404 ||
      e?.name === 'NoSuchKey' ||
      e?.name === 'NotFound'
    );
  }
}
