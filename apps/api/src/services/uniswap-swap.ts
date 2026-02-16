import type { Address, PublicClient } from 'viem';
import {
  encodeFunctionData,
  decodeAbiParameters,
  type Hex,
} from 'viem';
import {
  quoterV2Abi,
  swapRouter02Abi,
  UNISWAP_QUOTER_V2,
  UNISWAP_SWAP_ROUTER_02,
  checkAllowance,
  buildApproveTx,
} from '@autoclaw/contracts';
import { celoClient } from '../lib/celo-client.js';
import { sendTransactionFromServerWallet } from '../lib/thirdweb-wallet.js';

const FEE_TIERS = [3000, 500, 10000] as const; // 0.3%, 0.05%, 1% - try most common first

export interface UniswapQuoteResult {
  amountOut: bigint;
  fee: number;
}

/**
 * Get a Uniswap V3 quote for tokenIn -> tokenOut.
 * Tries fee tiers 3000, 500, 10000 until a pool with liquidity is found.
 * QuoterV2 reverts with the result on success, so we catch and decode.
 */
export async function getUniswapQuote(params: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  celoClient: PublicClient;
}): Promise<UniswapQuoteResult | null> {
  const { tokenIn, tokenOut, amountIn, celoClient: client } = params;

  for (const fee of FEE_TIERS) {
    try {
      const data = encodeFunctionData({
        abi: quoterV2Abi,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });

      await client.call({
        to: UNISWAP_QUOTER_V2,
        data: data as Hex,
      });
      // QuoterV2 reverts on success, so we never reach here
    } catch (err) {
      // QuoterV2 reverts with (amountOut, sqrtPriceX96After, tickAfter) = 96 bytes on success
      const errObj = err as { data?: Hex; cause?: { data?: Hex }; details?: string };
      const errData =
        errObj?.data ?? errObj?.cause?.data ?? (errObj?.details as Hex | undefined);
      const hexStr = typeof errData === 'string' && errData.startsWith('0x')
        ? errData.slice(2)
        : '';
      if (hexStr.length >= 192) {
        const payload = ('0x' + hexStr.slice(-192)) as Hex;
        try {
          const decoded = decodeAbiParameters(
            [{ type: 'uint256' }, { type: 'uint160' }, { type: 'int24' }],
            payload,
          );
          return { amountOut: decoded[0], fee };
        } catch {
          // not our revert format
        }
      }
      // No pool for this fee tier, try next
      continue;
    }
  }

  return null;
}

export interface UniswapSwapResult {
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
}

/**
 * Execute a Uniswap V3 swap via SwapRouter02.exactInputSingle.
 */
export async function executeUniswapSwap(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  fee: number;
}): Promise<UniswapSwapResult> {
  const {
    serverWalletAddress,
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMin,
    fee,
  } = params;

  const client = celoClient as unknown as PublicClient;

  // Approve router to spend tokenIn
  const allowance = await checkAllowance({
    token: tokenIn,
    owner: serverWalletAddress as Address,
    spender: UNISWAP_SWAP_ROUTER_02,
    celoClient: client,
  });
  if (allowance < amountIn) {
    const approveTx = buildApproveTx({
      token: tokenIn,
      spender: UNISWAP_SWAP_ROUTER_02,
    });
    const approveHash = await sendTransactionFromServerWallet(serverWalletAddress, {
      to: approveTx.to,
      data: approveTx.data,
    });
    await celoClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const swapData = encodeFunctionData({
    abi: swapRouter02Abi,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn,
        tokenOut,
        fee,
        recipient: serverWalletAddress as Address,
        amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  const txHash = await sendTransactionFromServerWallet(serverWalletAddress, {
    to: UNISWAP_SWAP_ROUTER_02,
    data: swapData,
  });

  const receipt = await celoClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === 'reverted') {
    throw new Error('Uniswap swap reverted');
  }

  // Read output balance change - we'd need to track before/after. For now return amountOutMin as estimate.
  const amountOut = amountOutMin;
  return { txHash, amountIn, amountOut };
}
