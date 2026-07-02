// src/common/decorators/roles.decorator.ts
// ─────────────────────────────────────────────────────────────────────────────
// @Roles()
// ─────────────────────────────────────────────────────────────────────────────
// Attaches required role(s) to a route as metadata.
// Read by JwtRoleGuard via Reflector to enforce access control.
// ─────────────────────────────────────────────────────────────────────────────

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
