// src/auth/auth.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// AuthModule
// ─────────────────────────────────────────────────────────────────────────────
// Owns all authentication logic: strategies, guards, service, controller.
// Imports UsersModule to access UsersRepository without coupling to its internals.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AccountsModule } from 'src/accounts/accounts.module';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRoleGuard } from './guards/role-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    AccountsModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY') ?? '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    RefreshStrategy,
    JwtAuthGuard,
    JwtRoleGuard,
    GoogleAuthGuard,
    RefreshAuthGuard,
  ],
  exports: [JwtAuthGuard, JwtRoleGuard],
})
export class AuthModule {}
