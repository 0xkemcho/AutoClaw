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
  displayName: string | null;
  riskProfile: RiskProfile | null;
  riskAnswers: Record<string, unknown> | null;
  preferredCurrencies: string[];
  onboardingCompleted: boolean;
  authMethod: AuthMethod | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAnswers {
  name: string;
  experience: 'beginner' | 'some_experience' | 'advanced';
  horizon: 'short' | 'medium' | 'long';
  volatility: 'sell' | 'hold' | 'buy';
  currencies: string[];
  investmentAmount: 'under_100' | '100_1000' | '1000_10000' | 'over_10000';
}
