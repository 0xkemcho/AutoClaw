/**
 * ERC-8004 PoC: Read reputation data from the ReputationRegistry
 *
 * Usage:
 *   npx tsx scripts/erc8004/read-reputation.ts          # reads agent from .state.json
 *   npx tsx scripts/erc8004/read-reputation.ts <agentId> # reads specific agent
 *
 * Prerequisites:
 *   - Optionally run give-reputation.ts first (to have feedback to read)
 */
import { reputationRegistryAbi } from '../../packages/contracts/src/abis/reputation-registry.js';
import { celoClient, loadState, REPUTATION_REGISTRY } from './helpers.js';

async function main() {
  console.log('\n=== ERC-8004: Read Reputation ===\n');

  const cliArg = process.argv[2];
  let agentId: bigint;
  if (cliArg) {
    agentId = BigInt(cliArg);
    console.log(`  Agent ID: ${cliArg} (from CLI arg)`);
  } else {
    const state = loadState();
    if (!state?.agentId) {
      console.error('ERROR: No agentId. Pass as CLI arg or run register-agent.ts first.');
      process.exit(1);
    }
    agentId = BigInt(state.agentId);
    console.log(`  Agent ID: ${state.agentId} (from .state.json)`);
  }

  // 1. Get all clients who gave feedback
  const clients = await celoClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: reputationRegistryAbi,
    functionName: 'getClients',
    args: [agentId],
  });

  console.log(`  Unique feedback clients: ${clients.length}`);

  if (clients.length === 0) {
    console.log('\n  No feedback yet. Run give-reputation.ts first.');
    console.log('');
    return;
  }

  // 2. Get summary (all clients, no tag filter)
  const [count, summaryValue, summaryDecimals] = await celoClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: reputationRegistryAbi,
    functionName: 'getSummary',
    args: [agentId, [...clients], '', ''],
  });

  console.log(`\n  --- Summary ---`);
  console.log(`  Total feedback count: ${count}`);
  console.log(`  Summary value: ${summaryValue} (decimals: ${summaryDecimals})`);

  // 3. Get summary filtered by tag
  const [tagCount, tagValue, tagDecimals] = await celoClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: reputationRegistryAbi,
    functionName: 'getSummary',
    args: [agentId, [...clients], 'fx-trade', ''],
  });

  if (tagCount > 0n) {
    console.log(`\n  --- Summary (tag: "fx-trade") ---`);
    console.log(`  Count: ${tagCount}`);
    console.log(`  Value: ${tagValue} (decimals: ${tagDecimals})`);
  }

  // 4. Read all individual feedback entries
  const [
    feedbackClients,
    feedbackIndexes,
    values,
    valueDecimals,
    tag1s,
    tag2s,
    revokedStatuses,
  ] = await celoClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: reputationRegistryAbi,
    functionName: 'readAllFeedback',
    args: [agentId, [...clients], '', '', false],
  });

  if (feedbackClients.length > 0) {
    console.log(`\n  --- Individual Feedback Entries ---`);
    for (let i = 0; i < feedbackClients.length; i++) {
      console.log(`\n  [${i + 1}]`);
      console.log(`    Client: ${feedbackClients[i]}`);
      console.log(`    Index: ${feedbackIndexes[i]}`);
      console.log(`    Value: ${values[i]} (decimals: ${valueDecimals[i]})`);
      console.log(`    Tag1: "${tag1s[i]}" | Tag2: "${tag2s[i]}"`);
      console.log(`    Revoked: ${revokedStatuses[i]}`);
    }
  }

  // 5. Per-client last index
  console.log(`\n  --- Per-Client Last Index ---`);
  for (const client of clients) {
    const lastIndex = await celoClient.readContract({
      address: REPUTATION_REGISTRY,
      abi: reputationRegistryAbi,
      functionName: 'getLastIndex',
      args: [agentId, client],
    });
    console.log(`    ${client}: last index = ${lastIndex}`);
  }

  console.log('');
}

main().catch((err) => {
  console.error('\nFailed to read reputation:', err.message || err);
  process.exit(1);
});
