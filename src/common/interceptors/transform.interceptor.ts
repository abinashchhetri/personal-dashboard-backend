// src/common/interceptors/transform.interceptor.ts
// ─────────────────────────────────────────────────────────────────────────────
// TransformInterceptor
// ─────────────────────────────────────────────────────────────────────────────
// Wraps every successful response in a standard envelope:
// { success: true, message: 'OK', data: <actual payload> }
// Applied globally in main.ts so no controller needs to do this manually.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: Record<string, unknown> | null | undefined) => ({
        success: true,
        message: data?.['message'] ?? 'Success',
        data: data?.['data'] ?? data,
      })),
    );
  }
}
