// src/common/helpers/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared Helpers
// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions — no NestJS imports, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

export const calculatePagination = (
  page: number,
  limit: number,
): { skip: number; take: number } => ({
  skip: (page - 1) * limit,
  take: limit,
});
