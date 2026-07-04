// src/auth/guards/google-auth.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// GoogleAuthGuard
// ─────────────────────────────────────────────────────────────────────────────
// Triggers the Google OAuth redirect on GET /auth/google.
// Also validates the callback on GET /auth/google/callback.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  // Override to log the full Google error code (not just the description).
  // passport-oauth2 sets err.code to the OAuth error type (e.g. "redirect_uri_mismatch")
  // but NestJS's default handler only logs err.message ("Bad Request").
  handleRequest<TUser = any>(err: any, user: TUser): TUser {
    if (err) {
      this.logger.error(
        `Google OAuth failed — code: ${String(err.code ?? 'unknown')}, message: ${String(err.message)}`,
      );
      throw err;
    }
    return user;
  }
}
