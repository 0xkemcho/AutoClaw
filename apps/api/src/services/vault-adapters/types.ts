import type { Address, PublicClient } from 'viem';

export interface VaultInfo {
  address: Address;
  token0: Address;
  token1: Address;
  allowToken0: boolean;
  allowToken1: boolean;
  totalSupply: bigint;
  totalAmounts: [bigint, bigint];
  deposit0Max: bigint;
  deposit1Max: bigint;
}

export interface VaultPosition {
  vaultAddress: string;
  lpShares: bigint;
  token0Amount: bigint;
  token1Amount: bigint;
  token0: Address;
  token1: Address;
}

export interface DepositParams {
  vaultAddress: Address;
  amount: bigint;
  depositor: Address;
  walletClient: any; // WalletClient type
  publicClient: PublicClient;
}

export interface WithdrawParams {
  vaultAddress: Address;
  shares: bigint;
  recipient: Address;
  walletClient: any; // WalletClient type
  publicClient: PublicClient;
}

export interface TxResult {
  txHash: string;
  success: boolean;
  gasUsed?: bigint;
}

export interface VaultAdapter {
  protocol: string;
  getVaultInfo(address: Address, client: PublicClient): Promise<VaultInfo>;
  deposit(params: DepositParams): Promise<TxResult>;
  withdraw(params: WithdrawParams): Promise<TxResult>;
  getPosition(vaultAddress: Address, walletAddress: Address, client: PublicClient): Promise<VaultPosition>;
  getDepositToken(info: VaultInfo): { token: Address; decimals: number };
}
