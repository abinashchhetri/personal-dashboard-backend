// src/auth/strategies/jwt.strategy.ts
// ─────────────────────────────────────────────────────────────────────────────
// JwtStrategy
// ─────────────────────────────────────────────────────────────────────────────
// Validates the access token read from the httpOnly access_token cookie.
// Returns IPayload which Passport sets on req.user.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IPayload } from 'src/common/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies?.['access_token'] as string | undefined) ?? null,
      ]),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  validate(payload: IPayload): IPayload {
    return payload;
  }
}
