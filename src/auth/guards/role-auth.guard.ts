// src/auth/guards/role-auth.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// JwtRoleGuard
// ─────────────────────────────────────────────────────────────────────────────
// Validates the access token AND checks that req.user.role matches @Roles(...).
// Use when a route is restricted to specific roles.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ROLES_KEY } from 'src/common/decorators/roles.decorator';

@Injectable()
export class JwtRoleGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user: { role: string } }>();
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
