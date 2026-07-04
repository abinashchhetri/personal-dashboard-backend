// src/auth/strategies/jwt.strategy.ts
// ─────────────────────────────────────────────────────────────────────────────
// JwtStrategy
// ─────────────────────────────────────────────────────────────────────────────
// Token extraction order (first non-null value wins):
//   1. httpOnly cookie — Chrome / Firefox (cross-origin cookies work)
//   2. Authorization: Bearer header — Safari (ITP blocks 3rd-party cookies,
//      so the frontend stores the token in localStorage after OAuth and sends
//      it as a header on every API request)
//   3. ?token= query param — <audio> / <video> elements that cannot set
//      request headers; the frontend appends the token to the stream URL
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
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => (req?.query?.['token'] as string | undefined) ?? null,
      ]),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  validate(payload: IPayload): IPayload {
    return payload;
  }
}
