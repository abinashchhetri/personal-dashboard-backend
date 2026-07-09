// src/auth/auth.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// AuthController
// ─────────────────────────────────────────────────────────────────────────────
// HTTP handlers for the /auth route group.
// Tokens are delivered exclusively via httpOnly cookies — never in response bodies.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';

import { AccountsService } from 'src/accounts/accounts.service';
import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { User } from 'src/users/entities/user.entity';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly frontendUrl: string;
  private readonly cookieBase: CookieOptions;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly accountsService: AccountsService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'https://dashboard.abinashchhetri.com.np';

    // Production (cross-origin): Secure=true + SameSite=none required for
    // cross-domain cookie delivery (frontend on Vercel, backend on tunnel).
    // Development (same-host localhost): Secure=false + SameSite=lax because
    // browsers reject Secure cookies over plain HTTP even on localhost.
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.cookieBase = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth — redirects to Google consent screen' })
  googleAuth() {
    // GoogleAuthGuard intercepts and redirects — this body is never reached
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — sets auth cookies and redirects to frontend' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken } = this.authService.generateTokens(
      req.user as User,
    );
    // Set httpOnly cookies for Chrome/Firefox (cross-origin cookies work).
    this.setTokenCookies(res, accessToken, refreshToken);
    // Also embed tokens in the URL hash fragment for Safari ITP compatibility.
    // Hash fragments are never sent to the server and are stripped from the
    // Referer header, so they don't appear in server logs. The /callback page
    // reads them, stores them in localStorage, and redirects to /dashboard.
    res.redirect(`${this.frontendUrl}/callback#at=${accessToken}&rt=${refreshToken}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user profile' })
  getMe(@CurrentUser() payload: IPayload) {
    return this.authService.getProfile(payload.id);
  }

  @Get('onboarding-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check whether the user has completed initial account setup' })
  async onboardingStatus(@CurrentUser() payload: IPayload) {
    const accountCount = await this.accountsService.countActive(payload.id);
    const hasAccount = accountCount >= 1;
    return {
      hasAccount,
      accountCount,
      isOnboardingComplete: hasAccount,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate access and refresh tokens using the refresh cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { id } = req.user as { id: string };
    const { accessToken, refreshToken } = await this.authService.refreshTokens(id);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { message: 'Tokens refreshed successfully', data: null };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear auth cookies and end the session' })
  logout(@Res({ passthrough: true }) res: Response) {
    // Must pass the same options used when setting the cookie — browsers match
    // on path + domain + secure + sameSite before honouring a clearCookie call.
    res.clearCookie('access_token', this.cookieBase);
    res.clearCookie('refresh_token', this.cookieBase);
    return { message: 'Logged out successfully', data: null };
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('access_token', accessToken, {
      ...this.cookieBase,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      ...this.cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
