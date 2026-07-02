// src/auth/guards/google-auth.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// GoogleAuthGuard
// ─────────────────────────────────────────────────────────────────────────────
// Triggers the Google OAuth redirect on GET /auth/google.
// Also validates the callback on GET /auth/google/callback.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
