import { type Address, type PublicClient, parseUnits, erc20Abi, encodeFunctionData } from 'viem';
import {
  getQuote,
  applySlippage,
  checkAllowance,
  buildApproveTx,
  BROKER_ADDRESS,
  BIPOOL_MANAGER_ADDRESS,
  brokerAbi,
} from '@autoclaw/contracts';
import { USDC_CELO_ADDRESS } from '@autoclaw/shared';
import type { YieldExecutionResult } from '@autoclaw/shared';
import { IchiVaultAdapter } from './vault-adapters/ichi';
import { celoClient } from '../lib/celo-client';
import { getAgentWalletClient } from '../lib/privy-wallet';

const DEFAULT_SLIPPAGE_PCT = 0.5;
const ichiAdapter = new IchiVaultAdapter();

export async function executeYieldDeposit(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  vaultAddress: Address;
  amountUsd: number;
}): Promise<YieldExecutionResult> {
  const { serverWalletId, serverWalletAddress, vaultAddress, amountUsd } = params;

  try {
    const walletClient = await getAgentWalletClient(serverWalletId, serverWalletAddress);
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
      // Swap USDC -> deposit token via Mento
      const usdcAddress = USDC_CELO_ADDRESS as Address;
      const usdcAmount = parseUnits(amountUsd.toString(), 6); // USDC is 6 decimals

      // Check USDC balance
      const usdcBalance = await celoClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddr],
      });
      if (usdcBalance < usdcAmount) {
        return {
          success: false,
          action: 'deposit',
          error: `Insufficient USDC balance: have ${usdcBalance}, need ${usdcAmount}`,
        };
      }

      // Get quote for USDC -> deposit token swap
      const quote = await getQuote({
        tokenIn: usdcAddress,
        tokenOut: depositToken,
        amountIn: usdcAmount,
        tokenInDecimals: 6,
        tokenOutDecimals: depositDecimals,
        celoClient: celoClient as unknown as PublicClient,
      });

      const amountOutMin = applySlippage(quote.amountOut, DEFAULT_SLIPPAGE_PCT);

      // Execute swap hops
      let currentAmountIn = usdcAmount;
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

          // Approve intermediate token
          const intermediateAllowance = await checkAllowance({
            token: hop.tokenIn,
            owner: walletAddr,
            spender: BROKER_ADDRESS,
            celoClient: celoClient as unknown as PublicClient,
          });
          if (intermediateAllowance < currentAmountIn) {
            const approveTx = buildApproveTx({ token: hop.tokenIn, spender: BROKER_ADDRESS });
            const approveHash = await walletClient.sendTransaction({
              to: approveTx.to,
              data: approveTx.data,
              chain: walletClient.chain,
            });
            await celoClient.waitForTransactionReceipt({ hash: approveHash });
          }
        } else {
          // First hop: approve USDC for Broker
          const allowance = await checkAllowance({
            token: usdcAddress,
            owner: walletAddr,
            spender: BROKER_ADDRESS,
            celoClient: celoClient as unknown as PublicClient,
          });
          if (allowance < usdcAmount) {
            const approveTx = buildApproveTx({ token: usdcAddress, spender: BROKER_ADDRESS });
            const approveHash = await walletClient.sendTransaction({
              to: approveTx.to,
              data: approveTx.data,
              chain: walletClient.chain,
            });
            await celoClient.waitForTransactionReceipt({ hash: approveHash });
          }
        }

        const data = encodeFunctionData({
          abi: brokerAbi,
          functionName: 'swapIn',
          args: [BIPOOL_MANAGER_ADDRESS, hop.exchangeId, hop.tokenIn, hop.tokenOut, currentAmountIn, hopMinOut],
        });

        const swapHash = await walletClient.sendTransaction({
          to: BROKER_ADDRESS,
          data,
          chain: walletClient.chain,
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
    const walletClient = await getAgentWalletClient(serverWalletId, serverWalletAddress);
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
