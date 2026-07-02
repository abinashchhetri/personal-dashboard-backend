// src/auth/guards/jwt-auth.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// JwtAuthGuard
// ─────────────────────────────────────────────────────────────────────────────
// Validates the access token on every protected route.
// Attach with @UseGuards(JwtAuthGuard).
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
