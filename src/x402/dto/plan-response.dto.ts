// ─────────────────────────────────────────────────────────────────────────────
// Plan Response DTOs
// ─────────────────────────────────────────────────────────────────────────────
// Mirrors the x402 plan generation response structure (blueprint §4.4).
// ─────────────────────────────────────────────────────────────────────────────

export class HistoryAnalysisDto {
  workoutDays!: number;
  plannedDays!: number;
  adherence!: number;
  focusMuscles!: string[];
  recentProgress!: string;
  mealsLogged!: number;
  adherenceMeals!: number;
  averageDailyCalories!: number;
  macroBalance!: string;
}

export class ExerciseDto {
  name!: string;
  sets!: number;
  reps!: number;
  weight!: number;
  notes!: string;
}

export class WorkoutDayDto {
  day!: string;
  name!: string;
  exercises!: ExerciseDto[];
  duration!: number;
  notes!: string;
}

export class MealDto {
  day!: string;
  type!: string;
  name!: string;
  calories!: number;
  protein!: number;
  carbs!: number;
  fat!: number;
  notes!: string;
}

export class GeneratedPlanDto {
  startDate!: string;
  endDate!: string;
  rationale!: string;
  workouts!: WorkoutDayDto[];
  meals!: MealDto[];
}

export class PlanResponseDto {
  generatedAt!: string;
  historyAnalysis!: HistoryAnalysisDto;
  generatedPlan!: GeneratedPlanDto;
  nextSteps!: string;
}
