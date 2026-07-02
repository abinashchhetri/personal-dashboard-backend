// src/auth/auth.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// AuthService
// ─────────────────────────────────────────────────────────────────────────────
// All business logic for authentication.
// Depends on UsersRepository for user lookup/creation and JwtService for tokens.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { IPayload } from 'src/common/interfaces';
import { User } from 'src/users/entities/user.entity';
import { UsersRepository } from 'src/users/repositories/users.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateGoogleUser(profile: {
    googleId: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const existing = await this.usersRepository.findByGoogleId(profile.googleId);
    if (existing) return existing;
    return this.usersRepository.createFromGoogleProfile(profile);
  }

  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload: IPayload = { id: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY') ?? '15m',
    });

    const refreshToken = this.jwtService.sign(
      { id: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY') ?? '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersRepository.findOne({ id: userId });
    return this.generateTokens(user);
  }

  async getProfile(userId: string): Promise<User> {
    return this.usersRepository.findOne({ id: userId });
  }
}
