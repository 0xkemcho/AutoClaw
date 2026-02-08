import { encodeFunctionData, type Address, type PublicClient } from 'viem';
import { erc20Abi } from './abis/erc20';
import { MAX_UINT256 } from './addresses';

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
