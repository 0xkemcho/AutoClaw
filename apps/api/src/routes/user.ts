import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { createSupabaseAdmin } from '@autoclaw/db';
import { computeRiskScore, scoreToProfile } from '../lib/risk-scoring';
import type { RiskAnswers } from '@autoclaw/shared';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function userRoutes(app: FastifyInstance) {
  // Submit risk profile answers
  app.post(
    '/api/user/risk-profile',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const answers = request.body as RiskAnswers;

      const score = computeRiskScore({
        experience: answers.experience,
        horizon: answers.horizon,
        volatility: answers.volatility,
        investmentAmount: answers.investmentAmount,
      });
      const profile = scoreToProfile(score);

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .upsert(
          {
            wallet_address: walletAddress,
            display_name: answers.name,
            risk_profile: profile,
            risk_answers: answers as unknown as Record<string, unknown>,
            preferred_currencies: answers.currencies,
            onboarding_completed: true,
          },
          { onConflict: 'wallet_address' },
        )
        .select()
        .single();

      if (error) {
        console.error('Failed to save risk profile:', error);
        return reply.status(500).send({ error: 'Failed to save risk profile' });
      }

      return { profile: data, riskProfile: profile, score };
    },
  );

  // Get current risk profile
  app.get(
    '/api/user/risk-profile',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('display_name, risk_profile, risk_answers, preferred_currencies, onboarding_completed')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) {
        return reply.status(500).send({ error: 'Failed to fetch risk profile' });
      }

      return data;
    },
  );
}
