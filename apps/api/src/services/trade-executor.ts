import { type Address, type PublicClient, parseUnits, erc20Abi, encodeFunctionData } from 'viem';
import {
  getQuote,
  applySlippage,
  checkAllowance,
  buildApproveTx,
  BROKER_ADDRESS,
  BIPOOL_MANAGER_ADDRESS,
  USDM_ADDRESS,
  USDC_FEE_ADAPTER,
  USDT_FEE_ADAPTER,
  brokerAbi,
} from '@autoclaw/contracts';
import { getTokenAddress, getTokenDecimals, USDC_CELO_ADDRESS, USDT_CELO_ADDRESS } from '@autoclaw/shared';
import { celoClient } from '../lib/celo-client';
import { getAgentWalletClient } from '../lib/privy-wallet';

// Stable base tokens the wallet might hold, in priority order.
// The first one with sufficient balance is used as the source for buys.
const BASE_STABLE_TOKENS: Array<{ symbol: string; address: Address; decimals: number }> = [
  { symbol: 'USDC', address: USDC_CELO_ADDRESS as Address, decimals: 6 },
  { symbol: 'USDT', address: USDT_CELO_ADDRESS as Address, decimals: 6 },
  { symbol: 'USDm', address: USDM_ADDRESS, decimals: 18 },
];

const FEE_CURRENCY_MAP: Record<string, Address> = {
  USDC: USDC_FEE_ADAPTER,
  USDT: USDT_FEE_ADAPTER,
  USDm: USDM_ADDRESS,
};

const DEFAULT_SLIPPAGE_PCT = 0.5;
const approvalCache = new Map<string, number>(); // key -> timestamp
const APPROVAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface TradeResult {
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
  rate: number;
}

/**
 * Pick a fee currency for Celo CIP-64 transactions.
 * Returns the adapter address for 6-decimal tokens (USDC/USDT)
 * or the raw address for 18-decimal USDm.
 */
async function selectFeeCurrency(walletAddress: Address): Promise<Address> {
  for (const base of BASE_STABLE_TOKENS) {
    const bal = await celoClient.readContract({
      address: base.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress],
    });
    if (bal > 0n) {
      const feeAddr = FEE_CURRENCY_MAP[base.symbol];
      if (feeAddr) {
        console.log(`[trade] Using ${base.symbol} for gas fees (feeCurrency: ${feeAddr})`);
        return feeAddr;
      }
    }
  }
  console.warn('[trade] No base stable found for gas fees, defaulting to USDm');
  return USDM_ADDRESS;
}

/**
 * Translate viem/RPC errors into human-readable messages.
 */
function parseTransactionError(err: unknown, context: string): Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('insufficient funds for transfer') || msg.includes('insufficient funds for gas')) {
    return new Error(
      `${context}: Wallet has insufficient funds for gas fees. ` +
      `Ensure the wallet holds USDC, USDT, or USDm to cover Celo transaction fees.`
    );
  }
  if (msg.includes('execution reverted')) {
    return new Error(
      `${context}: Transaction rejected by contract — likely slippage exceeded or insufficient liquidity.`
    );
  }
  if (msg.includes('nonce') || msg.includes('replacement transaction underpriced')) {
    return new Error(
      `${context}: Transaction nonce conflict. A previous transaction may still be pending.`
    );
  }
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
    return new Error(
      `${context}: RPC request timed out. The Celo node may be under load.`
    );
  }
  return new Error(`${context}: ${msg}`);
}

/**
 * Execute a trade on the Mento Broker via the Privy server wallet.
 */
export async function executeTrade(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  currency: string;
  direction: 'buy' | 'sell';
  amountUsd: number;
}): Promise<TradeResult> {
  const { serverWalletId, serverWalletAddress, currency, direction, amountUsd } = params;

  const targetAddress = getTokenAddress(currency) as Address;
  if (!targetAddress) {
    throw new Error(`Unknown token address for currency: ${currency}`);
  }

  let tokenIn: Address;
  let tokenOut: Address;
  let sourceSymbol: string;
  let tokenInDecimals: number;
  let tokenOutDecimals: number;

  if (direction === 'sell') {
    // Selling: spend target currency, receive USDm
    tokenIn = targetAddress;
    tokenOut = USDM_ADDRESS;
    sourceSymbol = currency;
    tokenInDecimals = getTokenDecimals(currency);
    tokenOutDecimals = 18;
  } else {
    // Buying: pick the first base stable (USDC, USDT, USDm) with enough balance
    tokenOut = targetAddress;
    const needed = parseUnits(amountUsd.toString(), 6); // check against 6-decimal minimum
    let found: typeof BASE_STABLE_TOKENS[number] | null = null;

    for (const base of BASE_STABLE_TOKENS) {
      const bal = await celoClient.readContract({
        address: base.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [serverWalletAddress as Address],
      });
      const neededForBase = parseUnits(amountUsd.toString(), base.decimals);
      if (bal >= neededForBase) {
        found = base;
        console.log(`[trade] Using ${base.symbol} as source (balance: ${bal}, need: ${neededForBase})`);
        break;
      }
      console.log(`[trade] ${base.symbol} balance insufficient (have: ${bal}, need: ${neededForBase})`);
    }

    if (!found) {
      throw new Error(
        `Insufficient balance: no base token (USDC, USDT, USDm) has enough to cover $${amountUsd}`,
      );
    }

    tokenIn = found.address;
    sourceSymbol = found.symbol;
    tokenInDecimals = found.decimals;
    tokenOutDecimals = getTokenDecimals(currency);
  }

  let amountIn = parseUnits(amountUsd.toString(), tokenInDecimals);

  // Pre-flight balance check for sells (buys already checked in the loop above)
  if (direction === 'sell') {
    const walletBalance = await celoClient.readContract({
      address: tokenIn,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [serverWalletAddress as Address],
    });
    if (walletBalance < amountIn) {
      // Allow small rounding differences (floating-point → parseUnits can overshoot)
      // If the overshoot is < 0.01% of balance, clamp to actual balance
      const diff = amountIn - walletBalance;
      const threshold = walletBalance / 10000n; // 0.01%
      if (diff <= threshold) {
        console.log(`[trade] Clamping sell amount from ${amountIn} to wallet balance ${walletBalance} (diff: ${diff})`);
        amountIn = walletBalance;
      } else {
        throw new Error(
          `Insufficient ${sourceSymbol} balance: have ${walletBalance}, need ${amountIn}`,
        );
      }
    }
  }

  // Determine fee currency for Celo CIP-64 transactions
  const feeCurrency = await selectFeeCurrency(serverWalletAddress as Address);

  console.log(`Executing trade: ${direction} ${currency}, source=${sourceSymbol} (${tokenIn}) target=${direction === 'buy' ? currency : 'USDm'} (${tokenOut})`);

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
  const walletClient = await getAgentWalletClient(serverWalletId, serverWalletAddress);

  // 4. Check and set approval if needed (with TTL-based cache)
  const approvalKey = `${tokenIn}-${serverWalletAddress}`;
  const cachedAt = approvalCache.get(approvalKey);
  const isCacheValid = cachedAt && (Date.now() - cachedAt) < APPROVAL_CACHE_TTL_MS;

  if (!isCacheValid) {
    const allowance = await checkAllowance({
      token: tokenIn,
      owner: serverWalletAddress as Address,
      spender: BROKER_ADDRESS,
      celoClient: celoClient as unknown as PublicClient,
    });

    if (allowance < amountIn) {
      const approveTx = buildApproveTx({ token: tokenIn, spender: BROKER_ADDRESS });
      let approveHash: `0x${string}`;
      try {
        approveHash = await walletClient.sendTransaction({
          to: approveTx.to,
          data: approveTx.data,
          chain: walletClient.chain,
          feeCurrency,
        });
      } catch (err) {
        throw parseTransactionError(err, `Approval for ${sourceSymbol} failed`);
      }
      const approveReceipt = await celoClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status === 'reverted') {
        throw new Error(
          `Approval for ${sourceSymbol} reverted (tx: ${approveHash}). ` +
          `The token contract rejected the approval.`
        );
      }
    }
    approvalCache.set(approvalKey, Date.now());
  }

  // 5. Execute swap hops sequentially.
  // For multi-hop (e.g. USDC → USDm → BRLm), we execute each hop one at a time.
  // After each intermediate hop, we read the wallet's balance of the intermediate
  // token and use it as amountIn for the next hop.
  let lastHash: `0x${string}` = '0x';
  let currentAmountIn = amountIn;

  for (let i = 0; i < quote.route.length; i++) {
    const hop = quote.route[i];
    const isLastHop = i === quote.route.length - 1;
    const hopMinOut = isLastHop ? amountOutMin : 1n;

    // For intermediate hops (i > 0), read the wallet's actual balance of the
    // intermediate token to determine how much to swap.
    if (i > 0) {
      currentAmountIn = await celoClient.readContract({
        address: hop.tokenIn,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [serverWalletAddress as Address],
      });
      console.log(`[trade] Hop ${i + 1}: intermediate ${hop.tokenIn} balance = ${currentAmountIn}`);

      // Approve intermediate token for the Broker if needed
      const intermediateAllowance = await checkAllowance({
        token: hop.tokenIn,
        owner: serverWalletAddress as Address,
        spender: BROKER_ADDRESS,
        celoClient: celoClient as unknown as PublicClient,
      });
      if (intermediateAllowance < currentAmountIn) {
        const approveTx = buildApproveTx({ token: hop.tokenIn, spender: BROKER_ADDRESS });
        try {
          const approveHash = await walletClient.sendTransaction({
            to: approveTx.to,
            data: approveTx.data,
            chain: walletClient.chain,
            feeCurrency,
          });
          await celoClient.waitForTransactionReceipt({ hash: approveHash });
        } catch (err) {
          throw parseTransactionError(err, `Approval for intermediate token failed`);
        }
      }
    }

    const data = encodeFunctionData({
      abi: brokerAbi,
      functionName: 'swapIn',
      args: [
        BIPOOL_MANAGER_ADDRESS,
        hop.exchangeId,
        hop.tokenIn,
        hop.tokenOut,
        currentAmountIn,
        hopMinOut,
      ],
    });

    try {
      lastHash = await walletClient.sendTransaction({
        to: BROKER_ADDRESS,
        data,
        chain: walletClient.chain,
        feeCurrency,
      });
    } catch (err) {
      throw parseTransactionError(err, `Swap ${direction} ${currency} failed`);
    }
    const receipt = await celoClient.waitForTransactionReceipt({ hash: lastHash });
    if (receipt.status === 'reverted') {
      throw new Error(
        `Swap ${direction} ${currency} reverted (tx: ${lastHash}). ` +
        `Likely causes: slippage exceeded or insufficient liquidity.`
      );
    }
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
  approvalCache.clear();
}
