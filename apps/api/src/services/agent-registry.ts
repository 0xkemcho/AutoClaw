import { type Address, encodeFunctionData } from 'viem';
import {
  identityRegistryAbi,
  reputationRegistryAbi,
  IDENTITY_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ADDRESS,
  USDM_ADDRESS,
} from '@autoclaw/contracts';
import { celoClient } from '../lib/celo-client';
import { getAgentWalletClient } from '../lib/privy-wallet';

const ZERO_BYTES32 = ('0x' + '0'.repeat(64)) as `0x${string}`;

/**
 * Sign EIP-712 typed data with the server wallet to authorize linking
 * the wallet to an ERC-8004 agent identity. The frontend will submit
 * the signature to the on-chain IdentityRegistry.setAgentWallet().
 */
export async function prepareAgentWalletLink(
  serverWalletId: string,
  serverWalletAddress: string,
  agentId: bigint,
  ownerAddress: string,
): Promise<{ signature: `0x${string}`; deadline: bigint; serverWalletAddress: string }> {
  const walletClient = await getAgentWalletClient(serverWalletId, serverWalletAddress);

  // Get current block timestamp and set a 290-second deadline
  const block = await celoClient.getBlock();
  const deadline = block.timestamp + 290n;

  const signature = await walletClient.signTypedData({
    domain: {
      name: 'ERC8004IdentityRegistry',
      version: '1',
      chainId: 42220,
      verifyingContract: IDENTITY_REGISTRY_ADDRESS,
    },
    types: {
      AgentWalletSet: [
        { name: 'agentId', type: 'uint256' },
        { name: 'newWallet', type: 'address' },
        { name: 'owner', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'AgentWalletSet',
    message: {
      agentId,
      newWallet: serverWalletAddress as Address,
      owner: ownerAddress as Address,
      deadline,
    },
  });

  return { signature, deadline, serverWalletAddress };
}

/**
 * Submit trade feedback to the ERC-8004 ReputationRegistry.
 * Called after each successful trade execution to build on-chain reputation.
 */
export async function submitTradeFeedback(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  agentId: bigint;
  confidence: number;
  currency: string;
  direction: string;
  tradeTxHash: string;
}): Promise<string> {
  const { serverWalletId, serverWalletAddress, agentId, confidence, currency, direction, tradeTxHash } = params;

  const walletClient = await getAgentWalletClient(serverWalletId, serverWalletAddress);

  console.log(`[8004] Submitting reputation feedback: agent=${agentId}, confidence=${confidence}, ${currency} ${direction}`);

  const data = encodeFunctionData({
    abi: reputationRegistryAbi,
    functionName: 'giveFeedback',
    args: [
      agentId,
      BigInt(confidence),
      0,
      currency,
      direction,
      'https://autoclaw.xyz',
      tradeTxHash,
      ZERO_BYTES32,
    ],
  });

  const hash = await walletClient.sendTransaction({
    to: REPUTATION_REGISTRY_ADDRESS,
    data,
    chain: walletClient.chain,
    feeCurrency: USDM_ADDRESS,
  });

  const receipt = await celoClient.waitForTransactionReceipt({ hash });
  if (receipt.status === 'reverted') {
    throw new Error(`Reputation feedback reverted (tx: ${hash})`);
  }

  console.log(`[8004] Reputation feedback submitted: tx=${hash}`);
  return hash;
}

/**
 * Read the on-chain reputation summary for an agent.
 */
export async function getAgentReputation(agentId: bigint): Promise<{
  feedbackCount: number;
  summaryValue: number;
  summaryDecimals: number;
}> {
  // First get the list of clients who have given feedback
  const clients = await celoClient.readContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: reputationRegistryAbi,
    functionName: 'getClients',
    args: [agentId],
  });

  if (!clients || clients.length === 0) {
    return { feedbackCount: 0, summaryValue: 0, summaryDecimals: 0 };
  }

  // Get the aggregated summary across all clients
  const [count, value, decimals] = await celoClient.readContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: reputationRegistryAbi,
    functionName: 'getSummary',
    args: [agentId, clients as Address[], '', ''],
  });

  return {
    feedbackCount: Number(count),
    summaryValue: Number(value),
    summaryDecimals: Number(decimals),
  };
}

/**
 * Read on-chain identity information for an agent.
 */
export async function getAgentOnChainInfo(agentId: bigint): Promise<{
  owner: string;
  metadataUri: string;
  agentWallet: string;
}> {
  const [owner, metadataUri, agentWallet] = await Promise.all([
    celoClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityRegistryAbi,
      functionName: 'ownerOf',
      args: [agentId],
    }),
    celoClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityRegistryAbi,
      functionName: 'tokenURI',
      args: [agentId],
    }),
    celoClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityRegistryAbi,
      functionName: 'getAgentWallet',
      args: [agentId],
    }),
  ]);

  return {
    owner: owner as string,
    metadataUri: metadataUri as string,
    agentWallet: agentWallet as string,
  };
}
