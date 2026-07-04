// src/common/guards/onboarding.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// OnboardingGuard
// ─────────────────────────────────────────────────────────────────────────────
// Blocks mutation routes until the user has at least one non-archived account.
// Must always run AFTER JwtAuthGuard so that req.user (IPayload) is populated.
// Applied only to POST /transactions and POST /transfers — not globally, and
// never to GET routes or POST /accounts (that's how the first account is created).
// ─────────────────────────────────────────────────────────────────────────────

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import { AccountsService } from 'src/accounts/accounts.service';
import { IPayload } from 'src/common/interfaces';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly accountsService: AccountsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as IPayload;
    const count = await this.accountsService.countActive(user.id);
    if (count >= 1) return true;
    throw new ForbiddenException(
      'Please create at least one account before continuing',
    );
  }
}
