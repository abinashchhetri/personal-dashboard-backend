import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { PlanResponseDto } from '../dto/plan-response.dto';

@Injectable()
export class PlanGenerationService {
  private readonly logger = new Logger(PlanGenerationService.name);
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeGemini();
  }

  private initializeGemini() {
    try {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (apiKey) {
        this.geminiClient = new GoogleGenerativeAI(apiKey);
        this.logger.log('✅ Gemini AI initialized');
      } else {
        this.logger.warn(
          '⚠️ GEMINI_API_KEY not set. Plan generation will use deterministic fallback.',
        );
      }
    } catch (err) {
      this.logger.warn(
        `⚠️ Gemini initialization failed: ${err instanceof Error ? err.message : String(err)}. Using deterministic fallback.`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // MAIN ENTRY POINT
  // ─────────────────────────────────────────────────────────────────────

  async generatePlan(userId: string): Promise<PlanResponseDto> {
    this.logger.log(`Generating plan for user ${userId}...`);

    // Analyze 90-day history
    const analysis = await this.analyzeHistory(userId);

    // Try Gemini first; fall back to deterministic if it fails
    let generatedPlan;
    if (this.geminiClient) {
      try {
        generatedPlan = await this.synthesizePlanWithGemini(analysis);
        this.logger.log(`✅ Plan generated via Gemini`);
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `⚠️ Gemini failed: ${errMsg}. Falling back to deterministic plan.`,
        );
        generatedPlan = this.synthesizePlanDeterministic(analysis);
      }
    } else {
      this.logger.log('Using deterministic plan generation (Gemini not configured)');
      generatedPlan = this.synthesizePlanDeterministic(analysis);
    }

    return {
      generatedAt: new Date().toISOString(),
      historyAnalysis: analysis,
      generatedPlan,
      nextSteps:
        'Follow this plan for consistency. Log your actual performance daily. If you skip more than 2 workouts, re-generate for an adjusted plan.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // HISTORY ANALYSIS
  // ─────────────────────────────────────────────────────────────────────

  private async analyzeHistory(userId: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Stub: In a real implementation, query WorkoutSession + MealLog repos
    // For now, return synthetic data so the rest of the flow works
    return {
      workoutDays: 24,
      plannedDays: 30,
      adherence: 0.8,
      focusMuscles: ['back', 'chest', 'legs'],
      recentProgress:
        'Deadlift +18kg in 12 weeks, Bench +8kg, consistent strength gains',
      mealsLogged: 87,
      adherenceMeals: 0.78,
      averageDailyCalories: 2420,
      macroBalance: 'Protein-heavy (145g/day avg), carbs adequate',
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // GEMINI PLAN SYNTHESIS
  // ─────────────────────────────────────────────────────────────────────

  private async synthesizePlanWithGemini(analysis: any) {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    const model = this.geminiClient.getGenerativeModel({
      model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash',
    });

    const prompt = `You are an elite fitness coach AI. Generate a personalized 7-day workout and meal plan based on the user's 90-day history.

USER'S HISTORY:
- Workout adherence: ${(analysis.adherence * 100).toFixed(0)}% (${analysis.workoutDays}/${analysis.plannedDays} sessions completed)
- Focus muscle groups: ${analysis.focusMuscles.join(', ')}
- Recent progress: ${analysis.recentProgress}
- Meal adherence: ${(analysis.adherenceMeals * 100).toFixed(0)}% (${analysis.mealsLogged} meals logged)
- Average daily calories: ${analysis.averageDailyCalories}
- Macro balance: ${analysis.macroBalance}

INSTRUCTIONS:
1. Generate a 7-day plan (startDate: next Monday, endDate: next Sunday)
2. For each day, include:
   - A workout day object with: day (name), name (theme), exercises array, duration (minutes), notes
   - Each exercise: name, sets, reps, weight (kg), notes
   - 3-5 meal objects with: day (name), type (breakfast/lunch/dinner/snack), name, calories, protein/carbs/fat (grams), notes
3. Base intensity on their ${(analysis.adherence * 100).toFixed(0)}% adherence (if <70%, reduce complexity; if >80%, increase intensity)
4. Respect their focus areas (${analysis.focusMuscles.join(', ')})
5. Scale meals to ${analysis.averageDailyCalories} calories/day
6. Include a short rationale explaining why this plan fits their profile

RESPONSE FORMAT (valid JSON only, no markdown, no code blocks):
{
  "startDate": "2026-07-14",
  "endDate": "2026-07-20",
  "rationale": "Based on your 80% adherence and focus on [muscles], we are [strategy]...",
  "workouts": [
    {
      "day": "Monday",
      "name": "Chest & Triceps",
      "exercises": [
        {"name": "Bench Press", "sets": 4, "reps": 6, "weight": 100, "notes": "Focus on form"}
      ],
      "duration": 60,
      "notes": "Rest 2 min between compound sets"
    }
  ],
  "meals": [
    {
      "day": "Monday",
      "type": "breakfast",
      "name": "Scrambled eggs with toast",
      "calories": 400,
      "protein": 20,
      "carbs": 50,
      "fat": 15,
      "notes": "Pre-workout energy"
    }
  ]
}`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Clean up response (remove markdown code blocks if present)
      let cleanedJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      return parsed;
    } catch (err) {
      this.logger.error(
        `Gemini API error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // DETERMINISTIC FALLBACK (no API calls, always works)
  // ─────────────────────────────────────────────────────────────────────

  private synthesizePlanDeterministic(analysis: any) {
    const nextMonday = this.getNextMonday();
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextSunday.getDate() + 6);

    const intensity =
      analysis.adherence > 0.8
        ? 'high'
        : analysis.adherence > 0.6
          ? 'medium'
          : 'low';

    return {
      startDate: nextMonday.toISOString().split('T')[0],
      endDate: nextSunday.toISOString().split('T')[0],
      rationale: `Based on your ${(analysis.adherence * 100).toFixed(0)}% workout adherence and focus on ${analysis.focusMuscles.join(', ')}, we are emphasizing ${intensity} intensity compound movements with consistent meal prep to support your progress.`,
      workouts: [
        {
          day: 'Monday',
          name: 'Heavy Back Day',
          exercises: [
            {
              name: 'Deadlift',
              sets: 5,
              reps: 3,
              weight: 160,
              notes: 'Estimated 1RM: 180kg. Maintain form.',
            },
            {
              name: 'Barbell Row',
              sets: 4,
              reps: 6,
              weight: 115,
              notes: '+5kg from last PR',
            },
            {
              name: 'Lat Pulldown',
              sets: 3,
              reps: 10,
              weight: 115,
              notes: 'Hypertrophy focus',
            },
          ],
          duration: 50,
          notes: 'Rest 3 min between compound sets',
        },
        {
          day: 'Tuesday',
          name: 'Chest & Triceps',
          exercises: [
            {
              name: 'Bench Press',
              sets: 4,
              reps: 6,
              weight: 100,
              notes: 'Explosive reps',
            },
            {
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: 8,
              weight: 35,
              notes: 'Per hand',
            },
            {
              name: 'Tricep Dips',
              sets: 3,
              reps: 10,
              weight: 20,
              notes: 'Weighted if needed',
            },
          ],
          duration: 45,
          notes: 'Rest 2 min between sets',
        },
        {
          day: 'Wednesday',
          name: 'Leg Day',
          exercises: [
            {
              name: 'Squat',
              sets: 4,
              reps: 5,
              weight: 140,
              notes: 'ATG depth',
            },
            {
              name: 'Romanian Deadlift',
              sets: 3,
              reps: 8,
              weight: 130,
              notes: 'Hamstring focus',
            },
            {
              name: 'Leg Press',
              sets: 3,
              reps: 10,
              weight: 300,
              notes: 'Hypertrophy',
            },
          ],
          duration: 60,
          notes: 'Stretch after',
        },
        {
          day: 'Thursday',
          name: 'Shoulder & Arms',
          exercises: [
            {
              name: 'Overhead Press',
              sets: 4,
              reps: 6,
              weight: 70,
              notes: 'Strict form',
            },
            {
              name: 'Lateral Raises',
              sets: 3,
              reps: 12,
              weight: 12,
              notes: 'Per hand',
            },
            {
              name: 'Barbell Curl',
              sets: 3,
              reps: 8,
              weight: 50,
              notes: 'Controlled eccentrics',
            },
          ],
          duration: 45,
          notes: 'Rest 90s between sets',
        },
        {
          day: 'Friday',
          name: 'Light Cardio & Accessories',
          exercises: [
            {
              name: 'Treadmill',
              sets: 1,
              reps: 20,
              weight: 0,
              notes: 'Steady state, 120 BPM',
            },
            {
              name: 'Face Pulls',
              sets: 3,
              reps: 15,
              weight: 40,
              notes: 'Shoulder health',
            },
            {
              name: 'Ab Wheel',
              sets: 3,
              reps: 12,
              weight: 0,
              notes: 'Core stability',
            },
          ],
          duration: 30,
          notes: 'Recovery focus',
        },
        {
          day: 'Saturday',
          name: 'Rest Day',
          exercises: [],
          duration: 0,
          notes: 'Active recovery: walk, stretch, foam roll',
        },
        {
          day: 'Sunday',
          name: 'Rest Day',
          exercises: [],
          duration: 0,
          notes: 'Meal prep, plan for next week',
        },
      ],
      meals: [
        {
          day: 'Monday',
          type: 'breakfast',
          name: 'Oatmeal with berries & almonds',
          calories: 420,
          protein: 15,
          carbs: 65,
          fat: 12,
          notes: 'Pre-workout fuel',
        },
        {
          day: 'Monday',
          type: 'lunch',
          name: 'Grilled chicken breast with rice & broccoli',
          calories: 580,
          protein: 45,
          carbs: 70,
          fat: 8,
          notes: 'Post-workout meal',
        },
        {
          day: 'Monday',
          type: 'dinner',
          name: 'Salmon with sweet potato & green beans',
          calories: 650,
          protein: 40,
          carbs: 60,
          fat: 18,
          notes: 'Omega-3 rich, steady digestion',
        },
      ],
    };
  }

  private getNextMonday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }
}
