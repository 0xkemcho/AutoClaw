/**
 * ERC-8004 PoC: Read agent identity data from the IdentityRegistry
 *
 * Usage: npx tsx scripts/erc8004/read-agent.ts
 *
 * Prerequisites:
 *   - Run register-agent.ts first (creates .state.json)
 */
import { identityRegistryAbi } from '../../packages/contracts/src/abis/identity-registry.js';
import { celoClient, loadState, IDENTITY_REGISTRY } from './helpers.js';

async function main() {
  console.log('\n=== ERC-8004: Read Agent Identity ===\n');

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

  // 1. Owner
  const owner = await celoClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'ownerOf',
    args: [agentId],
  });
  console.log(`  Owner: ${owner}`);

  // 2. Token URI (metadata)
  const uri = await celoClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'tokenURI',
    args: [agentId],
  });
  console.log(`  Token URI: ${uri}`);

  // 3. Linked agent wallet
  const wallet = await celoClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'getAgentWallet',
    args: [agentId],
  });
  const isLinked = wallet !== '0x0000000000000000000000000000000000000000';
  console.log(`  Agent wallet: ${isLinked ? wallet : '(not linked)'}`);

  // 4. Total agents owned by this address
  const balance = await celoClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'balanceOf',
    args: [owner],
  });
  console.log(`  Total agents owned: ${balance}`);

  // 5. Registry info
  const name = await celoClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'name',
  });
  const symbol = await celoClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: 'symbol',
  });
  console.log(`  Registry: ${name} (${symbol})`);

  // 6. Try to fetch metadata if URL is accessible
  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    console.log('\n  Fetching metadata from URI...');
    try {
      const res = await fetch(uri);
      if (res.ok) {
        const metadata = await res.json();
        console.log('  Metadata:', JSON.stringify(metadata, null, 4));
      } else {
        console.log(`  Metadata fetch returned ${res.status} (URL may not be live yet)`);
      }
    } catch {
      console.log('  Could not fetch metadata (URL not reachable — this is OK for PoC)');
    }
  }

  console.log(`\n  8004scan: https://www.8004scan.io/agents/${agentId}?chain=42220`);
  console.log(`  Celoscan: https://celoscan.io/token/${IDENTITY_REGISTRY}?a=${agentId}`);
  console.log('');
}

main().catch((err) => {
  console.error('\nFailed to read agent:', err.message || err);
  process.exit(1);
});
