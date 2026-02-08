export type TransactionType = 'swap' | 'sip';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  sourceToken: string;
  targetToken: string;
  sourceAmount: string;
  targetAmount: string;
  exchangeRate: string | null;
  txHash: string | null;
  status: TransactionStatus;
  sipId: string | null;
  createdAt: string;
}
