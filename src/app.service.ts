// src/app.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// AppService
// ─────────────────────────────────────────────────────────────────────────────
// App-level health and utility service.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
