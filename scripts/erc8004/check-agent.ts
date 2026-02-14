/**
 * ERC-8004 PoC: Check if an agent is registered on the IdentityRegistry
 *
 * Usage:
 *   npx tsx scripts/erc8004/check-agent.ts          # checks agent from .state.json
 *   npx tsx scripts/erc8004/check-agent.ts <agentId> # checks specific agent
 */
import { identityRegistryAbi } from '../../packages/contracts/src/abis/identity-registry.js';
import { celoClient, loadState, IDENTITY_REGISTRY } from './helpers.js';

async function checkAgent(agentId: bigint): Promise<boolean> {
  try {
    const owner = await celoClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: 'ownerOf',
      args: [agentId],
    });

    const uri = await celoClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: 'tokenURI',
      args: [agentId],
    });

    const wallet = await celoClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: 'getAgentWallet',
      args: [agentId],
    });

    const hasWallet = wallet !== '0x0000000000000000000000000000000000000000';

    console.log(`\n  Agent #${agentId}: REGISTERED`);
    console.log(`  Owner:        ${owner}`);
    console.log(`  Token URI:    ${uri}`);
    console.log(`  Agent wallet: ${hasWallet ? wallet : '(not linked)'}`);
    console.log(`  8004scan:     https://www.8004scan.io/agents/${agentId}?chain=42220`);
    return true;
  } catch (err: any) {
    // ERC721NonexistentToken revert — signature 0x7e273289 or text match
    if (err.message?.includes('0x7e273289') || err.message?.includes('ERC721') || err.message?.includes('revert')) {
      console.log(`\n  Agent #${agentId}: NOT REGISTERED`);
      return false;
    }
    throw err;
  }
}

async function main() {
  console.log('\n=== ERC-8004: Check Agent Registration ===');

  const cliArg = process.argv[2];
  let agentId: bigint;

  if (cliArg) {
    agentId = BigInt(cliArg);
  } else {
    const state = loadState();
    if (!state?.agentId) {
      console.error('ERROR: No agentId. Pass as CLI arg or run register-agent.ts first.');
      process.exit(1);
    }
    agentId = BigInt(state.agentId);
  }

  const registered = await checkAgent(agentId);
  console.log('');
  process.exit(registered ? 0 : 1);
}

main().catch((err) => {
  console.error('\nFailed to check agent:', err.message || err);
  process.exit(1);
});
