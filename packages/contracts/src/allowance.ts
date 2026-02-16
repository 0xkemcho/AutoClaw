import {
  decodeFunctionResult,
  encodeFunctionData,
  type Address,
  type PublicClient,
} from 'viem';
import { erc20Abi } from './abis/erc20.js';
import { MAX_UINT256 } from './addresses.js';

/**
 * Minimal client interface for eth_call. Avoids viem's strict ReadContractParameters
 * which can require authorizationList (EIP-7702) in some chain/build configurations.
 */
type EthCallClient = {
  call: (params: { to: Address; data: `0x${string}` }) => Promise<{ data: `0x${string}` | undefined }>;
};

/**
 * Get ERC-20 balance using encodeFunctionData + call + decodeFunctionResult.
 * Bypasses readContract to avoid type conflicts (authorizationList, cacheTime) in
 * Vercel/strict builds when using Celo client with viem.
 */
export async function getErc20Balance(params: {
  token: Address;
  account: Address;
  client: EthCallClient;
}): Promise<bigint> {
  const { token, account, client } = params;
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  });
  const result = await client.call({ to: token, data });
  return decodeFunctionResult({
    abi: erc20Abi,
    functionName: 'balanceOf',
    data: result.data ?? ('0x' as `0x${string}`),
  });
}

/**
 * Check the current ERC-20 allowance for a spender.
 */
export async function checkAllowance(params: {
  token: Address;
  owner: Address;
  spender: Address;
  celoClient: PublicClient;
}): Promise<bigint> {
  const { token, owner, spender, celoClient } = params;

  return celoClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
  });
}

/**
 * Build an unsigned ERC-20 approve transaction.
 * Defaults to infinite approval (max uint256) for better UX.
 */
export function buildApproveTx(params: {
  token: Address;
  spender: Address;
  amount?: bigint;
}): { to: Address; data: `0x${string}` } {
  const { token, spender, amount } = params;

  return {
    to: token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount ?? MAX_UINT256],
    }),
  };
}
