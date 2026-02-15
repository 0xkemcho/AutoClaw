import { generateText, Output } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { z } from 'zod';
import type { YieldOpportunity, YieldSignal, YieldAnalysisResult, YieldGuardrails } from '@autoclaw/shared';

const gemini = createGeminiProvider({
  authType: (process.env.GEMINI_CLI_AUTH_TYPE as 'oauth-personal') || 'oauth-personal',
});

const YieldSignalSchema = z.object({
  vaultAddress: z.string(),
  vaultName: z.string(),
  action: z.enum(['deposit', 'withdraw', 'hold']),
  amountUsd: z.number(),
  allocationPct: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  estimatedApr: z.number(),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

const YieldAnalysisSchema = z.object({
  strategySummary: z.string(),
  signals: z.array(YieldSignalSchema),
});

export type { YieldAnalysisResult };

interface YieldAnalysisInput {
  opportunities: YieldOpportunity[];
  currentPositions: Array<{ vaultAddress: string; depositAmountUsd: number; currentApr: number | null }>;
  portfolioValueUsd: number;
  guardrails: YieldGuardrails;
  customPrompt?: string | null;
}

export async function analyzeYieldOpportunities(input: YieldAnalysisInput): Promise<YieldAnalysisResult> {
  try {
    const result = await generateText({
      model: gemini('gemini-2.5-flash'),
      output: Output.object({ schema: YieldAnalysisSchema }),
      system: buildYieldSystemPrompt(input),
      prompt: buildYieldAnalysisPrompt(input),
    });

    if (!result.output) {
      console.error('[yield-analyzer] LLM returned no output');
      return { signals: [], strategySummary: 'Analysis failed: no output from LLM', sourcesUsed: 0 };
    }

    const signals: YieldSignal[] = result.output.signals.map((s) => ({
      vaultAddress: s.vaultAddress,
      vaultName: s.vaultName,
      action: s.action,
      amountUsd: s.amountUsd,
      allocationPct: s.allocationPct,
      confidence: s.confidence,
      reasoning: s.reasoning,
      estimatedApr: s.estimatedApr,
      riskLevel: s.riskLevel,
    }));

    return {
      signals,
      strategySummary: result.output.strategySummary,
      sourcesUsed: input.opportunities.length,
    };
  } catch (err) {
    console.error('[yield-analyzer] LLM analysis failed:', err);
    return {
      signals: [],
      strategySummary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      sourcesUsed: 0,
    };
  }
}

export function buildYieldSystemPrompt(input: YieldAnalysisInput): string {
  const { currentPositions, portfolioValueUsd, guardrails, customPrompt } = input;

  const positionList = currentPositions.length > 0
    ? currentPositions.map(p =>
        `- Vault ${p.vaultAddress.slice(0, 10)}...: $${p.depositAmountUsd.toFixed(2)} deposited, APR: ${p.currentApr?.toFixed(1) ?? 'unknown'}%`
      ).join('\n')
    : '- No current positions';

  return [
    'You are a DeFi yield optimization analyst. Analyze the available vault opportunities and current positions to recommend deposit, withdraw, or hold actions.',
    '',
    '## Portfolio',
    `Total portfolio value: $${portfolioValueUsd.toFixed(2)}`,
    '',
    '## Guardrails',
    `- Minimum APR: ${guardrails.minAprThreshold}%`,
    `- Max single vault allocation: ${guardrails.maxSingleVaultPct}%`,
    `- Min hold period: ${guardrails.minHoldPeriodDays} days`,
    `- Max vault count: ${guardrails.maxVaultCount}`,
    `- Min TVL: $${guardrails.minTvlUsd.toLocaleString()}`,
    '',
    '## Current Positions',
    positionList,
    '',
    '## Rules',
    '1. Prioritize higher APR vaults but consider TVL (low TVL = higher risk)',
    '2. Respect all guardrails — don\'t suggest allocations exceeding limits',
    '3. For existing positions: suggest withdraw if APR dropped significantly (>50% from entry)',
    '4. Use APR-weighted allocation — higher APR gets proportionally more allocation',
    '5. Never suggest more vaults than maxVaultCount',
    '6. Set confidence 0-100 based on data quality and risk assessment',
    '7. Only signals with confidence >= 60 will be acted upon',
    customPrompt ? `\nUser instructions: ${customPrompt}` : '',
  ].join('\n');
}

export function buildYieldAnalysisPrompt(input: YieldAnalysisInput): string {
  const { opportunities } = input;

  if (opportunities.length === 0) {
    return 'No vault opportunities available. Return empty signals array and a brief strategy summary.';
  }

  const vaultList = opportunities.slice(0, 20).map((o, i) =>
    `${i + 1}. ${o.name} (${o.vaultAddress})\n   APR: ${o.apr.toFixed(1)}%, TVL: $${o.tvl.toLocaleString()}, Protocol: ${o.protocol}, Tokens: ${o.tokens.map(t => t.symbol).join('/')}`
  ).join('\n');

  return `Analyze these ${Math.min(opportunities.length, 20)} vault opportunities and generate yield signals:\n\n${vaultList}`;
}
