import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { createSupabaseAdmin } from '@autoclaw/db';
import { computeRiskScore, scoreToProfile } from '../lib/risk-scoring';
import { createAgentWallet } from '../lib/turnkey-wallet';
import { DEFAULT_GUARDRAILS, type RiskAnswers, type RiskProfile } from '@autoclaw/shared';

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

      // Create Turnkey wallet and agent config
      let turnkeyWalletAddress: string | null = null;
      try {
        // Check if agent config already exists
        const { data: existingConfig } = await supabaseAdmin
          .from('agent_configs')
          .select('turnkey_wallet_address')
          .eq('wallet_address', walletAddress)
          .single();

        if (existingConfig?.turnkey_wallet_address) {
          turnkeyWalletAddress = existingConfig.turnkey_wallet_address;
        } else {
          // Create new Turnkey wallet
          const wallet = await createAgentWallet(walletAddress);
          turnkeyWalletAddress = wallet.address;

          // Insert agent config with default guardrails based on risk profile
          const defaults = DEFAULT_GUARDRAILS[profile as RiskProfile] ?? DEFAULT_GUARDRAILS.moderate;

          await supabaseAdmin.from('agent_configs').upsert(
            {
              wallet_address: walletAddress,
              turnkey_wallet_address: wallet.address,
              turnkey_wallet_id: wallet.walletId,
              active: false,
              frequency: defaults.frequency,
              max_trade_size_usd: defaults.maxTradeSizeUsd,
              max_allocation_pct: defaults.maxAllocationPct,
              stop_loss_pct: defaults.stopLossPct,
              daily_trade_limit: defaults.dailyTradeLimit,
              allowed_currencies: answers.currencies.length > 0 ? answers.currencies : undefined,
            },
            { onConflict: 'wallet_address' },
          );
        }
      } catch (walletErr) {
        console.error('Failed to create agent wallet:', walletErr);
        // Non-fatal — user profile is saved, wallet creation can be retried
      }

      return {
        profile: data,
        riskProfile: profile,
        score,
        turnkeyWalletAddress,
      };
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
