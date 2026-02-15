import { type Address, encodeFunctionData, parseEventLogs } from 'viem';
import {
  identityRegistryAbi,
  reputationRegistryAbi,
  IDENTITY_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ADDRESS,
} from '@autoclaw/contracts';
import { celoClient } from '../lib/celo-client';
import {
  createServerWallet,
  sendSponsoredTransaction,
  signTypedData,
  waitForTransactionHash,
} from '../lib/thirdweb-wallet';
import { emitProgress } from './agent-events';

const ZERO_BYTES32 = ('0x' + '0'.repeat(64)) as `0x${string}`;
const CELO_CHAIN_ID = 42220;

let registrarAddressCache: string | null = null;

/**
 * Get the ERC-8004 registrar server wallet address.
 * Creates and caches on first use.
 */
async function getRegistrarAddress(): Promise<string> {
  if (registrarAddressCache) return registrarAddressCache;
  const result = await createServerWallet('erc8004-registrar');
  registrarAddressCache = result.address;
  return registrarAddressCache;
}

/**
 * Register an agent on ERC-8004 fully server-side (gasless via thirdweb).
 * The erc8004-registrar server wallet mints the NFT and links the agent wallet.
 *
 * Steps:
 * 1. register(agentURI) via sendSponsoredTransaction from erc8004-registrar
 * 2. Parse Registered event to get the agentId
 * 3. Get EIP-712 signature from the user's server wallet (thirdweb)
 * 4. setAgentWallet(agentId, serverWallet, deadline, sig) via sendSponsoredTransaction
 */
export async function registerAgentOnChain(params: {
  userWalletAddress: string;
  serverWalletId: string;
  serverWalletAddress: string;
  metadataUrl: string;
}): Promise<{ agentId: bigint; registerTxHash: string; linkTxHash: string }> {
  const { userWalletAddress, serverWalletId, serverWalletAddress, metadataUrl } = params;

  let registrarAddress: string;
  try {
    registrarAddress = await getRegistrarAddress();
  } catch (err) {
    throw new Error(`ERC-8004: Failed to get registrar wallet. Ensure THIRDWEB_SECRET_KEY is set. ${err instanceof Error ? err.message : String(err)}`);
  }

  // Step 1: register(agentURI) — gasless via thirdweb
  emitProgress(userWalletAddress, 'registering_8004', 'Submitting registration transaction...', { agentId: undefined, txHash: undefined });
  console.log(`[8004] Registering agent for ${userWalletAddress} with URI: ${metadataUrl}`);
  const registerData = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: 'register',
    args: [metadataUrl],
  });

  let registerIds: string[];
  try {
    const result = await sendSponsoredTransaction({
      chainId: CELO_CHAIN_ID,
      from: registrarAddress,
      transactions: [{ to: IDENTITY_REGISTRY_ADDRESS, data: registerData }],
    });
    registerIds = result.transactionIds;
  } catch (err) {
    throw new Error(`ERC-8004: Failed to submit register tx. Check thirdweb dashboard (gas sponsorship, Celo chain). ${err instanceof Error ? err.message : String(err)}`);
  }

  let registerHash: `0x${string}`;
  try {
    registerHash = await waitForTransactionHash(registerIds[0]);
  } catch (err) {
    throw new Error(`ERC-8004: Failed to get register tx hash. ${err instanceof Error ? err.message : String(err)}`);
  }
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

  const agentId = (logs[0] as { args: { agentId: bigint } }).args.agentId;
  console.log(`[8004] Agent registered: id=${agentId}, tx=${registerHash}`);

  // Step 3: Get EIP-712 signature from server wallet for setAgentWallet
  emitProgress(userWalletAddress, 'linking_wallet', `Agent #${agentId} registered! Linking server wallet...`, { agentId: Number(agentId), txHash: registerHash });

  let signature: `0x${string}`;
  let deadline: bigint;
  try {
    const linkResult = await prepareAgentWalletLink(
      serverWalletId,
      serverWalletAddress,
      agentId,
      registrarAddress,
    );
    signature = linkResult.signature;
    deadline = linkResult.deadline;
  } catch (err) {
    throw new Error(`ERC-8004: Failed to sign wallet link (prepareAgentWalletLink). ${err instanceof Error ? err.message : String(err)}`);
  }

  // Step 4: setAgentWallet(agentId, serverWallet, deadline, signature) — gasless
  console.log(`[8004] Linking server wallet ${serverWalletAddress} to agent ${agentId}`);
  const setAgentWalletData = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: 'setAgentWallet',
    args: [agentId, serverWalletAddress as Address, deadline, signature],
  });

  let linkIds: string[];
  try {
    const linkResult = await sendSponsoredTransaction({
      chainId: CELO_CHAIN_ID,
      from: registrarAddress,
      transactions: [{ to: IDENTITY_REGISTRY_ADDRESS, data: setAgentWalletData }],
    });
    linkIds = linkResult.transactionIds;
  } catch (err) {
    throw new Error(`ERC-8004: Failed to submit setAgentWallet tx. ${err instanceof Error ? err.message : String(err)}`);
  }

  let linkHash: `0x${string}`;
  try {
    linkHash = await waitForTransactionHash(linkIds[0]);
  } catch (err) {
    throw new Error(`ERC-8004: Failed to get setAgentWallet tx hash. ${err instanceof Error ? err.message : String(err)}`);
  }
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
 * the wallet to an ERC-8004 agent identity. Uses thirdweb signTypedData.
 */
export async function prepareAgentWalletLink(
  _serverWalletId: string,
  serverWalletAddress: string,
  agentId: bigint,
  ownerAddress: string,
): Promise<{ signature: `0x${string}`; deadline: bigint; serverWalletAddress: string }> {
  const block = await celoClient.getBlock();
  const deadline = block.timestamp + 290n;

  const signature = await signTypedData({
    from: serverWalletAddress,
    typedData: {
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
    },
  });

  return { signature, deadline, serverWalletAddress };
}

/**
 * Submit trade feedback to the ERC-8004 ReputationRegistry.
 * Called after each successful trade execution. Gasless via thirdweb.
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
  const { serverWalletAddress, agentId, reasoning, currency, direction, tradeTxHash } = params;

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
      'https://autoclaw.co',
      feedbackURI,
      ZERO_BYTES32,
    ],
  });

  const { transactionIds } = await sendSponsoredTransaction({
    chainId: CELO_CHAIN_ID,
    from: serverWalletAddress,
    transactions: [{ to: REPUTATION_REGISTRY_ADDRESS, data }],
  });

  const hash = await waitForTransactionHash(transactionIds[0]);
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
