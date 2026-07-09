// src/meals/enums/meal-type.enum.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealTypeEnum
// ─────────────────────────────────────────────────────────────────────────────
// The four meal slots used by the meal plan grid and meal logs.
// ─────────────────────────────────────────────────────────────────────────────

export enum MealTypeEnum {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

// Case-insensitive, trimmed parse from a raw CSV cell. Returns null on no match.
export function parseMealType(raw: string): MealTypeEnum | null {
  const key = raw.trim().toLowerCase();
  return (Object.values(MealTypeEnum) as string[]).includes(key)
    ? (key as MealTypeEnum)
    : null;
}
