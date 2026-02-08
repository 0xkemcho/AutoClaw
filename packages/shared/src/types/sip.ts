export type SIPFrequency = 'daily' | 'weekly' | 'monthly';

export interface SIPConfig {
  id: string;
  userId: string;
  sourceToken: string;
  targetToken: string;
  amount: string;
  frequency: SIPFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  isActive: boolean;
  allowanceTxHash: string | null;
  nextExecution: string | null;
  totalInvested: string;
  totalExecutions: number;
  createdAt: string;
  updatedAt: string;
}
