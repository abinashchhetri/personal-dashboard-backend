// src/workout/enums/day-of-week.enum.ts
// ─────────────────────────────────────────────────────────────────────────────
// DayOfWeekEnum
// ─────────────────────────────────────────────────────────────────────────────
// Full weekday names (not ISO numbers) — matches the CSV plan format exactly
// so imported rows and derived session days compare without translation.
// ─────────────────────────────────────────────────────────────────────────────

export enum DayOfWeekEnum {
  SUNDAY = 'Sunday',
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
}
