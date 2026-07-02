// src/auth/strategies/google.strategy.ts
// ─────────────────────────────────────────────────────────────────────────────
// GoogleStrategy
// ─────────────────────────────────────────────────────────────────────────────
// Passport strategy for Google OAuth 2.0.
// On success, validate() returns the User entity which Passport sets on req.user.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { User } from 'src/users/entities/user.entity';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    return this.authService.validateGoogleUser({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0].value ?? '',
      avatarUrl: profile.photos?.[0].value ?? null,
    });
  }
}
