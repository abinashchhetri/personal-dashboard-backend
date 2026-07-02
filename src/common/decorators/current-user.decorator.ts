// src/common/decorators/current-user.decorator.ts
// ─────────────────────────────────────────────────────────────────────────────
// @CurrentUser()
// ─────────────────────────────────────────────────────────────────────────────
// Extracts the JWT payload from the request object.
// Only works on routes protected by JwtGuard or JwtRoleGuard.
// ─────────────────────────────────────────────────────────────────────────────

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { IPayload } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IPayload => {
    return ctx.switchToHttp().getRequest<{ user: IPayload }>().user;
  },
);
