// src/auth/guards/refresh-auth.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// RefreshAuthGuard
// ─────────────────────────────────────────────────────────────────────────────
// Validates the refresh token cookie on POST /auth/refresh.
// Uses the jwt-refresh Passport strategy (separate secret from access token).
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshAuthGuard extends AuthGuard('jwt-refresh') {}
