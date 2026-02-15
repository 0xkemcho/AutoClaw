/**
 * Script 01: Create thirdweb server wallet
 *
 * Creates a server wallet via thirdweb API and saves the address to state.json.
 * Run: pnpm tsx scripts/thirdweb-poc/01-create-wallet.ts
 */
import { writeFileSync } from 'fs';
import { createServerWallet } from './lib/thirdweb-api';
import { STATE_FILE } from './config';

const IDENTIFIER = 'poc-agent-1';

async function main() {
  console.log('\n--- Thirdweb PoC: Create Server Wallet ---\n');
  console.log(`Creating server wallet with identifier: ${IDENTIFIER}`);

  const result = await createServerWallet(IDENTIFIER);

  const state = { serverWalletAddress: result.address };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');

  console.log(`\nServer wallet created successfully!`);
  console.log(`Address: ${result.address}`);
  console.log(`\nState saved to ${STATE_FILE}`);
  console.log(`\nNext: Fund this wallet with 5+ USDC on Celo, then run 02-fund-wallet.ts\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
