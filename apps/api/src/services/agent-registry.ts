import { type Address, encodeFunctionData, createWalletClient, http, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import {
  identityRegistryAbi,
  reputationRegistryAbi,
  IDENTITY_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ADDRESS,
  USDM_ADDRESS,
} from '@autoclaw/contracts';
import { celoClient } from '../lib/celo-client';
import { getAgentWalletClient } from '../lib/privy-wallet';
import { emitProgress } from './agent-events';

const ZERO_BYTES32 = ('0x' + '0'.repeat(64)) as `0x${string}`;

/**
 * Get a viem WalletClient backed by the thirdweb admin private key.
 * Used for sponsored transactions where the platform pays gas fees.
 */
function getAdminWalletClient() {
  const adminKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY;
  if (!adminKey) throw new Error('THIRDWEB_ADMIN_PRIVATE_KEY is required');

  const account = privateKeyToAccount(adminKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: celo,
    transport: http(process.env.CELO_RPC_URL || 'https://forno.celo.org'),
  });
}

/**
 * Register an agent on ERC-8004 fully server-side (sponsored).
 * The admin wallet pays gas for both register() and setAgentWallet().
 *
 * Steps:
 * 1. Call register(agentURI) from the admin wallet
 * 2. Parse Registered event to get the agentId
 * 3. Get EIP-712 signature from the server (Privy) wallet
 * 4. Call setAgentWallet(agentId, serverWallet, deadline, sig) from admin wallet
 *
 * Returns the agentId and tx hashes.
 */
export async function registerAgentOnChain(params: {
  userWalletAddress: string;
  serverWalletId: string;
  serverWalletAddress: string;
  metadataUrl: string;
}): Promise<{ agentId: bigint; registerTxHash: string; linkTxHash: string }> {
  const { userWalletAddress, serverWalletId, serverWalletAddress, metadataUrl } = params;
  const adminClient = getAdminWalletClient();

  // Step 1: register(agentURI) — admin wallet is the tx sender (and NFT owner)
  emitProgress(userWalletAddress, 'registering_8004', 'Submitting registration transaction...', { agentId: undefined, txHash: undefined });
  console.log(`[8004] Registering agent for ${userWalletAddress} with URI: ${metadataUrl}`);
  const registerData = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: 'register',
    args: [metadataUrl],
  });

  const registerHash = await adminClient.sendTransaction({
    to: IDENTITY_REGISTRY_ADDRESS,
    data: registerData,
  });

  emitProgress(userWalletAddress, 'registering_8004', 'Waiting for registration confirmation...', { txHash: registerHash });

  const registerReceipt = await celoClient.waitForTransactionReceipt({ hash: registerHash });
  if (registerReceipt.status === 'reverted') {
    emitProgress(userWalletAddress, 'error', `Registration transaction reverted (tx: ${registerHash})`);
    throw new Error(`register() reverted (tx: ${registerHash})`);
  }

  // Step 2: Parse Registered event to get agentId
  const logs = parseEventLogs({
    abi: identityRegistryAbi,
    logs: registerReceipt.logs,
    eventName: 'Registered',
  });

  if (logs.length === 0) {
    emitProgress(userWalletAddress, 'error', 'No registration event found');
    throw new Error(`No Registered event found in tx ${registerHash}`);
  }

  const agentId = (logs[0] as any).args.agentId as bigint;
  console.log(`[8004] Agent registered: id=${agentId}, tx=${registerHash}`);

  // Step 3: Get EIP-712 signature from server wallet for setAgentWallet
  emitProgress(userWalletAddress, 'linking_wallet', `Agent #${agentId} registered! Linking server wallet...`, { agentId: Number(agentId), txHash: registerHash });

  const ownerAddress = adminClient.account.address;
  const { signature, deadline } = await prepareAgentWalletLink(
    serverWalletId,
    serverWalletAddress,
    agentId,
    ownerAddress,
  );

  // Step 4: setAgentWallet(agentId, serverWallet, deadline, signature)
  console.log(`[8004] Linking server wallet ${serverWalletAddress} to agent ${agentId}`);
  const linkData = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: 'setAgentWallet',
    args: [agentId, serverWalletAddress as Address, deadline, signature],
  });

  const linkHash = await adminClient.sendTransaction({
    to: IDENTITY_REGISTRY_ADDRESS,
    data: linkData,
  });

  emitProgress(userWalletAddress, 'linking_wallet', 'Waiting for wallet link confirmation...', { agentId: Number(agentId), txHash: linkHash });

  const linkReceipt = await celoClient.waitForTransactionReceipt({ hash: linkHash });
  if (linkReceipt.status === 'reverted') {
    emitProgress(userWalletAddress, 'error', `Wallet linking reverted (tx: ${linkHash})`);
    throw new Error(`setAgentWallet() reverted (tx: ${linkHash})`);
  }

  emitProgress(userWalletAddress, 'complete', `Agent #${agentId} registered and wallet linked!`, { agentId: Number(agentId), txHash: linkHash });
  console.log(`[8004] Server wallet linked: tx=${linkHash}`);
  return { agentId, registerTxHash: registerHash, linkTxHash: linkHash };
}

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
  reasoning: string;
  currency: string;
  direction: string;
  tradeTxHash: string;
}): Promise<string> {
  const { serverWalletId, serverWalletAddress, agentId, reasoning, currency, direction, tradeTxHash } = params;

  const walletClient = await getAgentWalletClient(serverWalletId, serverWalletAddress);

  const feedbackURI = `reasoning: ${reasoning} | tx: ${tradeTxHash}`;
  console.log(`[8004] Submitting reputation feedback: agent=${agentId}, score=100, ${currency} ${direction}`);

  const data = encodeFunctionData({
    abi: reputationRegistryAbi,
    functionName: 'giveFeedback',
    args: [
      agentId,
      BigInt(100),
      0,
      currency,
      direction,
      'https://autoclaw.xyz',
      feedbackURI,
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
