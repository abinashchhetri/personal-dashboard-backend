// src/common/csv/csv.util.ts
// ─────────────────────────────────────────────────────────────────────────────
// CSV Utilities
// ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper around papaparse for the workout/meal plan CSV imports.
// Pure functions — no NestJS DI, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

import Papa from 'papaparse';

// Parses a raw CSV string into an array of lowercase-keyed string records.
// skipEmptyLines: 'greedy' (not `true`) drops rows that are only commas/whitespace,
// which plain `true` does not catch. Headers are lowercased so "Day", "DAY",
// "day" all resolve to the same key.
export function parseCsvRows(raw: string): Record<string, string>[] {
  const { data } = Papa.parse<Record<string, string>>(raw.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });

  return data.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = (value ?? '').toString().trim();
    }
    return normalized;
  });
}

// Returns null for empty/whitespace/non-numeric input, otherwise the parsed integer.
export function toOptionalInt(v: string | undefined): number | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n) : null;
}

// Returns null for empty/whitespace/non-numeric input, otherwise the parsed decimal.
export function toOptionalDecimal(v: string | undefined): number | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
