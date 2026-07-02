// src/auth/strategies/refresh.strategy.ts
// ─────────────────────────────────────────────────────────────────────────────
// RefreshStrategy
// ─────────────────────────────────────────────────────────────────────────────
// Validates the refresh token read from the httpOnly refresh_token cookie.
// Uses a separate secret from the access token so the two cannot substitute each other.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies?.['refresh_token'] as string | undefined) ?? null,
      ]),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      ignoreExpiration: false,
    });
  }

  validate(payload: { id: string }): { id: string } {
    return { id: payload.id };
  }
}
