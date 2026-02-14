/**
 * ERC-8004 PoC: Submit reputation feedback via server wallet
 *
 * Two-wallet pattern: server wallet (TEST_SERVER_KEY) gives feedback.
 * Cannot give feedback to an agent you own (self-feedback blocked).
 *
 * Usage:
 *   npx tsx scripts/erc8004/give-reputation.ts          # agent from .state.json
 *   npx tsx scripts/erc8004/give-reputation.ts <agentId> # specific agent
 */
import { parseEventLogs } from 'viem';
import { reputationRegistryAbi } from '../../packages/contracts/src/abis/reputation-registry.js';
import { identityRegistryAbi } from '../../packages/contracts/src/abis/identity-registry.js';
import {
  celoClient,
  getServerWalletClient,
  printWalletInfo,
  loadState,
  REPUTATION_REGISTRY,
  IDENTITY_REGISTRY,
} from './helpers.js';

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

async function main() {
  console.log('\n=== ERC-8004: Give Reputation Feedback (Server Wallet) ===\n');

  const cliArg = process.argv[2];
  let agentId: bigint;
  if (cliArg) {
    agentId = BigInt(cliArg);
    console.log(`  Target agent ID: ${cliArg} (from CLI arg)`);
  } else {
    const state = loadState();
    if (!state?.agentId) {
      console.error('ERROR: No agentId. Pass as CLI arg or run register-agent.ts first.');
      process.exit(1);
    }
    agentId = BigInt(state.agentId);
    console.log(`  Target agent ID: ${state.agentId} (from .state.json)`);
  }

  // 1. Setup server wallet
  const walletClient = getServerWalletClient();
  const address = walletClient.account.address;
  await printWalletInfo('Server wallet', address);

  // 2. Check for self-feedback
  const agentOwner = await celoClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'ownerOf',
    args: [agentId],
  });
  if (agentOwner.toLowerCase() === address.toLowerCase()) {
    console.error('\n  ERROR: Self-feedback not allowed.');
    console.error('  The server wallet owns this agent — the contract blocks self-rating.');
    console.error('  Set TEST_OWNER_KEY and TEST_SERVER_KEY to different wallets.');
    process.exit(1);
  }

  // 3. Submit feedback
  const feedbackValue = 85n;
  const tag1 = 'fx-trade';
  const tag2 = 'buy';

  console.log(`\n  Submitting feedback:`);
  console.log(`    Value: ${feedbackValue} | Tags: "${tag1}" / "${tag2}"`);
  console.log('  Sending transaction...');

  const hash = await walletClient.writeContract({
    address: REPUTATION_REGISTRY,
    abi: reputationRegistryAbi,
    functionName: 'giveFeedback',
    args: [agentId, feedbackValue, 0, tag1, tag2, 'https://autoclaw.xyz', '', ZERO_BYTES32],
  });

  console.log(`  TX: ${hash}`);
  const receipt = await celoClient.waitForTransactionReceipt({ hash, timeout: 60_000 });

  if (receipt.status === 'reverted') {
    console.error('  ERROR: Transaction reverted!');
    process.exit(1);
  }

  const logs = parseEventLogs({ abi: reputationRegistryAbi, logs: receipt.logs, eventName: 'NewFeedback' });
  if (logs.length > 0) {
    const e = logs[0].args;
    console.log(`\n  Feedback submitted!`);
    console.log(`  Index: ${e.feedbackIndex} | Value: ${e.value} | From: ${e.clientAddress}`);
  }

  console.log(`  Gas: ${receipt.gasUsed} | Block: ${receipt.blockNumber}`);
  console.log(`  Celoscan: https://celoscan.io/tx/${hash}\n`);
}

main().catch((err) => {
  console.error('\nFailed to submit feedback:', err.message || err);
  process.exit(1);
});
