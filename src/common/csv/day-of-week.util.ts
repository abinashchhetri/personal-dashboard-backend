// src/common/csv/day-of-week.util.ts
// ─────────────────────────────────────────────────────────────────────────────
// Day-of-Week Utilities
// ─────────────────────────────────────────────────────────────────────────────
// ISO convention: 1=Mon … 7=Sun. Used by both the workouts and meals plan
// tables to key a weekly template. JS's native getDay() returns 0=Sun, so
// currentDayOfWeek() converts before returning.
// ─────────────────────────────────────────────────────────────────────────────

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const DAY_NAMES: Record<DayOfWeek, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

const NAME_TO_DAY: Record<string, DayOfWeek> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

// Accepts "1"–"7" or a case-insensitive day name (matched by first 3 letters).
// Returns null for anything else — caller treats null as an invalid row.
export function parseDayOfWeek(raw: string): DayOfWeek | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 7) {
    return asNumber as DayOfWeek;
  }

  const key = trimmed.toLowerCase().slice(0, 3);
  return NAME_TO_DAY[key] ?? null;
}

export function dayOfWeekName(day: DayOfWeek): string {
  return DAY_NAMES[day];
}

// Converts JS's 0=Sun..6=Sat to the ISO 1=Mon..7=Sun convention used everywhere else.
export function currentDayOfWeek(date: Date = new Date()): DayOfWeek {
  const jsDay = date.getDay();
  return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
}
