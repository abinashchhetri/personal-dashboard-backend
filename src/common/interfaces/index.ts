// src/common/interfaces/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared Interfaces
// ─────────────────────────────────────────────────────────────────────────────
// Cross-feature TypeScript interfaces.
// Feature-scoped interfaces live inside src/[feature]/interfaces/ instead.
// ─────────────────────────────────────────────────────────────────────────────

export interface IPayload {
  id: string;
  email: string;
  role?: string;
}

export interface ISuccessResponse<T = null> {
  success: true;
  message: string;
  data: T;
}
