/**
 * ERC-8004 PoC: Register agent + link server wallet
 *
 * Two-wallet pattern:
 *   Owner wallet (TEST_OWNER_KEY) → mints NFT, owns identity
 *   Server wallet (TEST_SERVER_KEY) → linked as agent wallet, gives feedback
 *
 * Usage: npx tsx scripts/erc8004/register-agent.ts
 */
import { parseEventLogs } from 'viem';
import { identityRegistryAbi } from '../../packages/contracts/src/abis/identity-registry.js';
import {
  celoClient,
  getOwnerWalletClient,
  getServerWalletClient,
  printWalletInfo,
  saveState,
  IDENTITY_REGISTRY,
} from './helpers.js';

const METADATA_URL = 'https://autoclaw.xyz/api/agent/test/8004-metadata';

async function main() {
  console.log('\n=== ERC-8004: Register Agent (Two-Wallet) ===\n');

  const ownerWallet = getOwnerWalletClient();
  const serverWallet = getServerWalletClient();
  const ownerAddr = ownerWallet.account.address;
  const serverAddr = serverWallet.account.address;

  await printWalletInfo('Owner', ownerAddr);
  await printWalletInfo('Server', serverAddr);

  if (ownerAddr.toLowerCase() === serverAddr.toLowerCase()) {
    console.warn('\n  WARNING: Owner and server wallets are the same address.');
    console.warn('  Self-feedback will be blocked. Set TEST_OWNER_KEY and TEST_SERVER_KEY to different keys.');
  }

  // 1. Register agent (owner mints NFT)
  console.log(`\n  Registering agent with URI: ${METADATA_URL}`);
  console.log('  Sending register tx from owner wallet...');

  const regHash = await ownerWallet.writeContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'register',
    args: [METADATA_URL],
  });

  console.log(`  TX: ${regHash}`);
  console.log('  Waiting for confirmation...');

  const regReceipt = await celoClient.waitForTransactionReceipt({ hash: regHash, timeout: 60_000 });
  if (regReceipt.status === 'reverted') {
    console.error('  ERROR: Register transaction reverted!');
    process.exit(1);
  }

  const logs = parseEventLogs({ abi: identityRegistryAbi, logs: regReceipt.logs, eventName: 'Registered' });
  if (logs.length === 0) {
    console.error('  ERROR: No Registered event found');
    process.exit(1);
  }

  const agentId = logs[0].args.agentId;
  console.log(`  Agent ID: ${agentId} (block ${regReceipt.blockNumber})`);

  // 2. Link server wallet (setAgentWallet) — requires EIP-712 signature from server wallet
  if (ownerAddr.toLowerCase() !== serverAddr.toLowerCase()) {
    console.log(`\n  Linking server wallet ${serverAddr} to agent #${agentId}...`);

    // deadline: current block timestamp + 5 minutes (max allowed by contract)
    const block = await celoClient.getBlock();
    const deadline = block.timestamp + 290n; // ~5 min minus buffer

    // EIP-712 typed data signature from server wallet
    const signature = await serverWallet.signTypedData({
      domain: {
        name: 'ERC8004IdentityRegistry',
        version: '1',
        chainId: 42220,
        verifyingContract: IDENTITY_REGISTRY,
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
        newWallet: serverAddr,
        owner: ownerAddr,
        deadline,
      },
    });

    const linkHash = await ownerWallet.writeContract({
      address: IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: 'setAgentWallet',
      args: [agentId, serverAddr, deadline, signature],
    });

    console.log(`  TX: ${linkHash}`);
    const linkReceipt = await celoClient.waitForTransactionReceipt({ hash: linkHash, timeout: 60_000 });
    if (linkReceipt.status === 'reverted') {
      console.error('  ERROR: setAgentWallet reverted!');
      process.exit(1);
    }
    console.log(`  Server wallet linked (block ${linkReceipt.blockNumber})`);
  }

  // 3. Save state
  saveState({
    agentId: agentId.toString(),
    txHash: regHash,
    ownerAddress: ownerAddr,
    serverAddress: serverAddr,
    registeredAt: new Date().toISOString(),
  });

  console.log('\n  === Registration Complete ===');
  console.log(`  Agent ID: ${agentId}`);
  console.log(`  Owner: ${ownerAddr}`);
  console.log(`  Server wallet: ${serverAddr}`);
  console.log(`  8004scan: https://www.8004scan.io/agents/${agentId}?chain=42220`);
  console.log(`  Celoscan: https://celoscan.io/tx/${regHash}`);
  console.log('');
}

main().catch((err) => {
  console.error('\nFailed to register agent:', err.message || err);
  process.exit(1);
});
