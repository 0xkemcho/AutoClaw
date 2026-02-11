import { type Address, type PublicClient, parseUnits } from 'viem';
import {
  getQuote,
  buildSwapInTxs,
  applySlippage,
  checkAllowance,
  buildApproveTx,
  BROKER_ADDRESS,
  USDM_ADDRESS,
} from '@autoclaw/contracts';
import { getTokenAddress, getTokenDecimals } from '@autoclaw/shared';
import { celoClient } from '../lib/celo-client';
import { getAgentWalletClient } from '../lib/turnkey-wallet';

const DEFAULT_SLIPPAGE_PCT = 0.5;
const approvedTokens = new Set<string>();

export interface TradeResult {
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
  rate: number;
}

/**
 * Execute a trade on the Mento Broker via the Turnkey wallet.
 */
export async function executeTrade(params: {
  turnkeyAddress: string;
  currency: string;
  direction: 'buy' | 'sell';
  amountUsd: number;
}): Promise<TradeResult> {
  const { turnkeyAddress, currency, direction, amountUsd } = params;

  const tokenIn = direction === 'buy' ? USDM_ADDRESS : getTokenAddress(currency) as Address;
  const tokenOut = direction === 'buy' ? getTokenAddress(currency) as Address : USDM_ADDRESS;

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unknown token address for currency: ${currency}`);
  }

  const tokenInDecimals = direction === 'buy' ? 18 : getTokenDecimals(currency);
  const tokenOutDecimals = direction === 'buy' ? getTokenDecimals(currency) : 18;

  const amountIn = parseUnits(amountUsd.toString(), tokenInDecimals);

  // 1. Get quote
  const quote = await getQuote({
    tokenIn,
    tokenOut,
    amountIn,
    tokenInDecimals,
    tokenOutDecimals,
    celoClient: celoClient as unknown as PublicClient,
  });

  // 2. Apply slippage
  const amountOutMin = applySlippage(quote.amountOut, DEFAULT_SLIPPAGE_PCT);

  // 3. Get wallet client
  const walletClient = await getAgentWalletClient(turnkeyAddress);

  // 4. Check and set approval if needed
  const approvalKey = `${tokenIn}-${turnkeyAddress}`;
  if (!approvedTokens.has(approvalKey)) {
    const allowance = await checkAllowance({
      token: tokenIn,
      owner: turnkeyAddress as Address,
      spender: BROKER_ADDRESS,
      celoClient: celoClient as unknown as PublicClient,
    });

    if (allowance < amountIn) {
      const approveTx = buildApproveTx({ token: tokenIn, spender: BROKER_ADDRESS });
      const approveHash = await walletClient.sendTransaction({
        to: approveTx.to,
        data: approveTx.data,
        chain: walletClient.chain,
      });
      await celoClient.waitForTransactionReceipt({ hash: approveHash });
    }
    approvedTokens.add(approvalKey);
  }

  // 5. Build swap txs
  const txs = buildSwapInTxs({
    route: quote.route,
    amountIn,
    amountOutMin,
  });

  // 6. Execute each hop
  let lastHash: `0x${string}` = '0x';
  for (const tx of txs) {
    lastHash = await walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      chain: walletClient.chain,
    });
    await celoClient.waitForTransactionReceipt({ hash: lastHash });
  }

  return {
    txHash: lastHash,
    amountIn,
    amountOut: quote.amountOut,
    rate: quote.rate,
  };
}

/** Clear the approval cache (useful for testing) */
export function clearApprovalCache(): void {
  approvedTokens.clear();
}
