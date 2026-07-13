import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OwnerResolverService {
  private readonly logger = new Logger(OwnerResolverService.name);
  private cachedOwnerId: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeOwner();
  }

  private async initializeOwner() {
    try {
      const ownerId = await this.resolveOwnerId();
      this.cachedOwnerId = ownerId;
      this.logger.log(`✅ Owner resolved: ${ownerId}`);
    } catch (err) {
      this.logger.warn(
        `⚠️ Could not resolve owner on startup: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getOwnerId(): Promise<string> {
    if (this.cachedOwnerId) {
      return this.cachedOwnerId;
    }

    const ownerId = await this.resolveOwnerId();
    this.cachedOwnerId = ownerId;
    return ownerId;
  }

  private async resolveOwnerId(): Promise<string> {
    // Check explicit X402_DATA_OWNER_ID env var (merchant-configured)
    const envId = this.configService.get<string>('X402_DATA_OWNER_ID');
    if (envId && envId.trim()) {
      this.logger.log(`Using explicit X402_DATA_OWNER_ID from env: ${envId}`);
      return envId;
    }

    // No owner configured — service unavailable
    // Note: For future multi-user support, add DB resolution or JWT context resolution here
    throw new ServiceUnavailableException(
      'X402_DATA_OWNER_ID not configured. Set X402_DATA_OWNER_ID in .env for single-user deployment.',
    );
  }

  // Reset cache (for testing or dynamic owner changes)
  clearCache() {
    this.cachedOwnerId = null;
  }
}
