import { type Address } from 'viem';
import { createSupabaseAdmin } from '@autoclaw/db';
import { IchiVaultAdapter } from './vault-adapters/ichi';
import { celoClient } from '../lib/celo-client';
import type { PublicClient } from 'viem';
import type { YieldOpportunity } from '@autoclaw/shared';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ichiAdapter = new IchiVaultAdapter();

/**
 * Upsert yield_positions after a successful deposit.
 * Fetches lp_shares from the vault and records the position so it appears in the portfolio.
 */
export async function upsertYieldPositionAfterDeposit(params: {
  walletAddress: string;
  serverWalletAddress: string;
  vaultAddress: Address;
  amountUsd: number;
}): Promise<void> {
  const { walletAddress, serverWalletAddress, vaultAddress, amountUsd } = params;

  const publicClient = celoClient as unknown as PublicClient;
  const walletAddr = serverWalletAddress as Address;

  const [position, vaultInfo, existingRow] = await Promise.all([
    ichiAdapter.getPosition(vaultAddress, walletAddr, publicClient),
    ichiAdapter.getVaultInfo(vaultAddress, publicClient),
    supabaseAdmin
      .from('yield_positions')
      .select('deposit_amount_usd, deposited_at')
      .eq('wallet_address', walletAddress)
      .eq('vault_address', vaultAddress.toLowerCase())
      .maybeSingle(),
  ]);

  const { token: depositToken } = ichiAdapter.getDepositToken(vaultInfo);
  const existingDepositUsd = existingRow.data?.deposit_amount_usd ?? 0;
  const totalDepositUsd = existingDepositUsd + amountUsd;
  const depositedAt = existingRow.data?.deposited_at ?? new Date().toISOString();

  const { error } = await supabaseAdmin.from('yield_positions').upsert(
    {
      wallet_address: walletAddress,
      vault_address: vaultAddress.toLowerCase(),
      protocol: 'ichi',
      lp_shares: Number(position.lpShares),
      deposit_token: depositToken.toLowerCase(),
      deposit_amount_usd: totalDepositUsd,
      deposited_at: depositedAt,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'wallet_address,vault_address',
    },
  );

  if (error) {
    console.error('[yield-position-tracker] Failed to upsert yield position:', error);
  }
}

/**
 * Clear yield_positions after a successful withdraw.
 * Sets lp_shares and deposit_amount_usd to 0 so the position no longer appears in the portfolio.
 */
export async function clearYieldPositionAfterWithdraw(params: {
  walletAddress: string;
  vaultAddress: string;
}): Promise<void> {
  const { walletAddress, vaultAddress } = params;

  const { error } = await supabaseAdmin
    .from('yield_positions')
    .update({
      lp_shares: 0,
      deposit_amount_usd: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', walletAddress)
    .eq('vault_address', vaultAddress.toLowerCase());

  if (error) {
    console.error('[yield-position-tracker] Failed to clear yield position:', error);
  }
}

/**
 * Light sync: verify DB rows against on-chain. Clear any where on-chain shows 0 shares.
 * Call at cycle start to handle manual withdrawals.
 */
export async function syncYieldPositionsFromChain(params: {
  walletAddress: string;
  serverWalletAddress: string;
}): Promise<void> {
  const { walletAddress, serverWalletAddress } = params;
  const publicClient = celoClient as unknown as PublicClient;
  const walletAddr = serverWalletAddress as Address;

  const { data: positions, error: fetchError } = await supabaseAdmin
    .from('yield_positions')
    .select('vault_address, lp_shares')
    .eq('wallet_address', walletAddress)
    .gt('lp_shares', 0);

  if (fetchError || !positions?.length) return;

  for (const row of positions) {
    try {
      const position = await ichiAdapter.getPosition(
        row.vault_address as Address,
        walletAddr,
        publicClient,
      );
      if (position.lpShares === 0n) {
        await clearYieldPositionAfterWithdraw({
          walletAddress,
          vaultAddress: row.vault_address,
        });
      }
    } catch {
      // Skip vaults that fail (e.g. deprecated, wrong chain)
    }
  }
}

/**
 * Full sync: discover on-chain positions across all Ichi vaults and upsert yield_positions.
 * Backfills for users who deposited before position tracking was implemented.
 */
export async function fullSyncYieldPositionsFromChain(params: {
  walletAddress: string;
  serverWalletAddress: string;
  opportunities: YieldOpportunity[];
}): Promise<{ synced: number; cleared: number }> {
  const { walletAddress, serverWalletAddress, opportunities } = params;
  const publicClient = celoClient as unknown as PublicClient;
  const walletAddr = serverWalletAddress as Address;
  let synced = 0;
  let cleared = 0;

  // First, verify existing DB rows
  const { data: existingRows } = await supabaseAdmin
    .from('yield_positions')
    .select('vault_address, lp_shares')
    .eq('wallet_address', walletAddress);

  for (const row of existingRows ?? []) {
    try {
      const position = await ichiAdapter.getPosition(
        row.vault_address as Address,
        walletAddr,
        publicClient,
      );
      if (position.lpShares === 0n) {
        await clearYieldPositionAfterWithdraw({
          walletAddress,
          vaultAddress: row.vault_address,
        });
        cleared++;
      }
    } catch {
      // Skip
    }
  }

  // Discover positions in Ichi vaults from opportunities
  const ichiOpps = opportunities.filter((o) =>
    o.protocol?.toLowerCase().includes('ichi'),
  );

  for (const opp of ichiOpps) {
    const vaultAddr = opp.vaultAddress as Address;
    if (!vaultAddr?.startsWith('0x') || vaultAddr.length !== 42) continue;

    try {
      const [position, vaultInfo, existingRow] = await Promise.all([
        ichiAdapter.getPosition(vaultAddr, walletAddr, publicClient),
        ichiAdapter.getVaultInfo(vaultAddr, publicClient),
        supabaseAdmin
          .from('yield_positions')
          .select('deposit_amount_usd, deposited_at')
          .eq('wallet_address', walletAddress)
          .eq('vault_address', vaultAddr.toLowerCase())
          .maybeSingle(),
      ]);

      if (position.lpShares === 0n) continue;

      const { token: depositToken } = ichiAdapter.getDepositToken(vaultInfo);
      // Estimate USD from token0 (6-dec stable). Preserve existing if we have it.
      const existingUsd = existingRow.data?.deposit_amount_usd ?? 0;
      const estimatedUsd =
        Number(position.token0Amount) / 1e6 +
        Number(position.token1Amount) / 1e18;
      const depositAmountUsd =
        existingUsd > 0 ? existingUsd : Math.max(estimatedUsd, 0.01);

      const { error } = await supabaseAdmin.from('yield_positions').upsert(
        {
          wallet_address: walletAddress,
          vault_address: vaultAddr.toLowerCase(),
          protocol: 'ichi',
          lp_shares: Number(position.lpShares),
          deposit_token: depositToken.toLowerCase(),
          deposit_amount_usd: depositAmountUsd,
          deposited_at: existingRow.data?.deposited_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address,vault_address' },
      );

      if (!error) synced++;
    } catch {
      // Skip vaults that fail
    }
  }

  return { synced, cleared };
}
