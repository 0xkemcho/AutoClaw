export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export type AuthMethod =
  | 'wallet'
  | 'email'
  | 'google'
  | 'apple'
  | 'passkey';

export interface UserProfile {
  id: string;
  walletAddress: string;
  riskProfile: RiskProfile | null;
  riskAnswers: Record<string, unknown> | null;
  preferredCurrencies: string[];
  onboardingCompleted: boolean;
  authMethod: AuthMethod | null;
  createdAt: string;
  updatedAt: string;
}
