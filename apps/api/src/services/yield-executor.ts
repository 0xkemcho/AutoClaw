import { type Address, type PublicClient, parseUnits, formatUnits, erc20Abi, encodeFunctionData } from 'viem';
import {
  getQuote,
  findRoute,
  applySlippage,
  checkAllowance,
  buildApproveTx,
  BROKER_ADDRESS,
  BIPOOL_MANAGER_ADDRESS,
  USDM_ADDRESS,
  brokerAbi,
} from '@autoclaw/contracts';
import { USDC_CELO_ADDRESS, USDT_CELO_ADDRESS } from '@autoclaw/shared';
import type { YieldExecutionResult } from '@autoclaw/shared';
import { IchiVaultAdapter } from './vault-adapters/ichi';
import { celoClient } from '../lib/celo-client';
import {
  createServerWalletClient,
  sendTransactionFromServerWallet,
} from '../lib/thirdweb-wallet';

const DEFAULT_SLIPPAGE_PCT = 0.5;
const ichiAdapter = new IchiVaultAdapter();

// Base stable tokens the wallet might hold, in priority order (mirrors trade-executor)
const BASE_STABLE_TOKENS: Array<{ symbol: string; address: Address; decimals: number }> = [
  { symbol: 'USDC', address: USDC_CELO_ADDRESS as Address, decimals: 6 },
  { symbol: 'USDT', address: USDT_CELO_ADDRESS as Address, decimals: 6 },
  { symbol: 'USDm', address: USDM_ADDRESS, decimals: 18 },
];

export async function executeYieldDeposit(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  vaultAddress: Address;
  amountUsd: number;
}): Promise<YieldExecutionResult> {
  const { serverWalletId, serverWalletAddress, vaultAddress, amountUsd } = params;

  try {
    const walletClient = createServerWalletClient(serverWalletAddress);
    const walletAddr = serverWalletAddress as Address;

    // 1. Get vault info to determine deposit token
    const vaultInfo = await ichiAdapter.getVaultInfo(vaultAddress, celoClient as unknown as PublicClient);
    const { token: depositToken, decimals: depositDecimals } = ichiAdapter.getDepositToken(vaultInfo);

    // 2. Check if we need to swap USDC -> deposit token
    const depositAmount = parseUnits(amountUsd.toString(), depositDecimals);
    const depositTokenBalance = await celoClient.readContract({
      address: depositToken,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddr],
    });

    if (depositTokenBalance < depositAmount) {
      // Swap base stable (USDC, USDT, USDm) -> deposit token via Mento
      let sourceToken: (typeof BASE_STABLE_TOKENS)[number] | null = null;
      const balanceInfo: Array<{ symbol: string; formatted: string }> = [];
      for (const base of BASE_STABLE_TOKENS) {
        const bal = await celoClient.readContract({
          address: base.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [walletAddr],
        });
        const needed = parseUnits(amountUsd.toString(), base.decimals);
        balanceInfo.push({ symbol: base.symbol, formatted: formatUnits(bal, base.decimals) });
        if (bal >= needed) {
          sourceToken = base;
          break;
        }
      }

      if (!sourceToken) {
        const walletStr = balanceInfo.map((b) => `${b.symbol}: $${b.formatted}`).join(', ');
        return {
          success: false,
          action: 'deposit',
          error: `Insufficient balance: need $${amountUsd.toFixed(2)}. Wallet: ${walletStr}`,
        };
      }

      const amountIn = parseUnits(amountUsd.toString(), sourceToken.decimals);

      const route = await findRoute(
        sourceToken.address,
        depositToken,
        celoClient as unknown as PublicClient,
      );
      if (!route || route.length === 0) {
        return {
          success: false,
          action: 'deposit',
          vaultAddress,
          error: `No swap route from ${sourceToken.symbol} to this vault's deposit token. This vault may require a token not available via Mento (e.g. USDF). Try a vault that accepts USDC or USDT directly.`,
        };
      }

      const quote = await getQuote({
        tokenIn: sourceToken.address,
        tokenOut: depositToken,
        amountIn,
        tokenInDecimals: sourceToken.decimals,
        tokenOutDecimals: depositDecimals,
        celoClient: celoClient as unknown as PublicClient,
      });

      const amountOutMin = applySlippage(quote.amountOut, DEFAULT_SLIPPAGE_PCT);

      let currentAmountIn = amountIn;
      for (let i = 0; i < quote.route.length; i++) {
        const hop = quote.route[i];
        const isLastHop = i === quote.route.length - 1;
        const hopMinOut = isLastHop ? amountOutMin : 1n;

        if (i > 0) {
          currentAmountIn = await celoClient.readContract({
            address: hop.tokenIn,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddr],
          });

          const intermediateAllowance = await checkAllowance({
            token: hop.tokenIn,
            owner: walletAddr,
            spender: BROKER_ADDRESS,
            celoClient: celoClient as unknown as PublicClient,
          });
          if (intermediateAllowance < currentAmountIn) {
            const approveTx = buildApproveTx({ token: hop.tokenIn, spender: BROKER_ADDRESS });
            const approveHash = await sendTransactionFromServerWallet(serverWalletAddress, {
              to: approveTx.to,
              data: approveTx.data,
            });
            await celoClient.waitForTransactionReceipt({ hash: approveHash });
          }
        } else {
          const allowance = await checkAllowance({
            token: sourceToken.address,
            owner: walletAddr,
            spender: BROKER_ADDRESS,
            celoClient: celoClient as unknown as PublicClient,
          });
          if (allowance < amountIn) {
            const approveTx = buildApproveTx({ token: sourceToken.address, spender: BROKER_ADDRESS });
            const approveHash = await sendTransactionFromServerWallet(serverWalletAddress, {
              to: approveTx.to,
              data: approveTx.data,
            });
            await celoClient.waitForTransactionReceipt({ hash: approveHash });
          }
        }

        const data = encodeFunctionData({
          abi: brokerAbi,
          functionName: 'swapIn',
          args: [BIPOOL_MANAGER_ADDRESS, hop.exchangeId, hop.tokenIn, hop.tokenOut, currentAmountIn, hopMinOut],
        });

        const swapHash = await sendTransactionFromServerWallet(serverWalletAddress, {
          to: BROKER_ADDRESS,
          data,
        });
        const swapReceipt = await celoClient.waitForTransactionReceipt({ hash: swapHash });
        if (swapReceipt.status === 'reverted') {
          return { success: false, action: 'deposit', error: 'Swap reverted during deposit preparation' };
        }
      }
    }

    // 3. Read actual deposit token balance after swap
    const actualBalance = await celoClient.readContract({
      address: depositToken,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddr],
    });

    // 4. Deposit into vault
    const result = await ichiAdapter.deposit({
      vaultAddress,
      amount: actualBalance > depositAmount ? depositAmount : actualBalance,
      depositor: walletAddr,
      walletClient,
      publicClient: celoClient as unknown as PublicClient,
    });

    return {
      success: result.success,
      txHash: result.txHash,
      action: 'deposit',
      vaultAddress,
      amountUsd,
    };
  } catch (err) {
    return {
      success: false,
      action: 'deposit',
      vaultAddress,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function executeYieldWithdraw(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  vaultAddress: Address;
  sharesPct?: number; // 0-100, defaults to 100 (withdraw all)
}): Promise<YieldExecutionResult> {
  const { serverWalletId, serverWalletAddress, vaultAddress, sharesPct = 100 } = params;

  try {
    const walletClient = createServerWalletClient(serverWalletAddress);
    const walletAddr = serverWalletAddress as Address;

    // Get current shares
    const position = await ichiAdapter.getPosition(
      vaultAddress,
      walletAddr,
      celoClient as unknown as PublicClient,
    );

    if (position.lpShares === 0n) {
      return { success: false, action: 'withdraw', error: 'No shares to withdraw' };
    }

    const sharesToWithdraw = sharesPct >= 100
      ? position.lpShares
      : (position.lpShares * BigInt(Math.round(sharesPct))) / 100n;

    const result = await ichiAdapter.withdraw({
      vaultAddress,
      shares: sharesToWithdraw,
      recipient: walletAddr,
      walletClient,
      publicClient: celoClient as unknown as PublicClient,
    });

    return {
      success: result.success,
      txHash: result.txHash,
      action: 'withdraw',
      vaultAddress,
    };
  } catch (err) {
    return {
      success: false,
      action: 'withdraw',
      vaultAddress,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
