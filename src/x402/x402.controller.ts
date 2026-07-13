import {
  Controller,
  Get,
  UseFilters,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { X402Service } from './services/x402.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { OwnerResolverService } from './services/owner-resolver.service';
import { X402ExceptionFilter } from './filters/x402-exception.filter';
import { X402PaymentGuard } from './guards/x402-payment.guard';

@ApiTags('x402')
@UseFilters(X402ExceptionFilter)
@Controller('x402/plans')
export class X402Controller {
  constructor(
    private readonly x402Service: X402Service,
    private readonly planService: PlanGenerationService,
    private readonly ownerResolver: OwnerResolverService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // FREE PREVIEW (discovery endpoint)
  // ─────────────────────────────────────────────────────────────────────
  // Returns the shape of the paid endpoint + price. No auth, no payment.
  // Used by agents to understand the API before attempting payment.

  @Get('preview')
  @HttpCode(HttpStatus.OK)
  previewPlan() {
    return {
      resource: 'GET /api/v1/x402/plans/generate',
      priceUsdc: '0.01',
      network: 'solana-devnet',
      description:
        'AI-generated personalized 7-day workout + meal plan based on your 90-day fitness and nutrition history',
      example: {
        generatedAt: '2026-07-10T00:00:00.000Z',
        historyAnalysis: {
          workoutDays: 24,
          plannedDays: 30,
          adherence: 0.8,
          focusMuscles: ['back', 'chest', 'legs'],
          recentProgress: 'Deadlift +18kg in 12 weeks',
          mealsLogged: 87,
          adherenceMeals: 0.78,
          averageDailyCalories: 2420,
          macroBalance: 'Protein-heavy (145g/day avg), carbs adequate',
        },
        generatedPlan: {
          startDate: '2026-07-11',
          endDate: '2026-07-17',
          rationale:
            'Based on your 80% workout adherence and strength gains, we are increasing intensity on compound lifts.',
          workouts: [
            {
              day: 'Friday',
              name: 'Heavy Back Day',
              exercises: [
                {
                  name: 'Deadlift',
                  sets: 5,
                  reps: 3,
                  weight: 160,
                  notes: 'Estimated max from progress: 178kg 1RM. Maintain form.',
                },
              ],
              duration: 50,
              notes: 'Rest 3 min between compound sets',
            },
          ],
          meals: [
            {
              day: 'Friday',
              type: 'breakfast',
              name: 'High-protein oats with berries',
              calories: 380,
              protein: 18,
              carbs: 65,
              fat: 8,
              notes: 'Pre-workout fuel; eat 30 min before lift',
            },
          ],
        },
        nextSteps:
          'Follow this plan for consistency. Log your actual performance daily.',
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // PAID GENERATE (payment-gated endpoint)
  // ─────────────────────────────────────────────────────────────────────
  // Requires X-PAYMENT header with a valid Solana USDC transfer signature.
  // Returns a personalized 7-day workout + meal plan.
  // The @UseGuards(X402PaymentGuard) enforces payment:
  //   - No header → 402 challenge
  //   - Invalid header → 402 challenge
  //   - Valid payment → proceeds, request.x402 is populated

  @Get('generate')
  @UseGuards(X402PaymentGuard)
  @HttpCode(HttpStatus.OK)
  async generatePlan(@Request() req: any) {
    // The guard has validated the payment and populated req.x402
    const { quoteId, signature, settledAt } = req.x402;

    // Resolve the data owner (from env or DB)
    const ownerId = await this.ownerResolver.getOwnerId();

    // Call PlanGenerationService to generate a personalized plan
    // The service will try Gemini first; falls back to deterministic rules if needed
    const plan = await this.planService.generatePlan(ownerId);

    return plan;
  }
}
