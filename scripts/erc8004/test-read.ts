import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

const client = createPublicClient({ chain: celo, transport: http('https://forno.celo.org') });

const abi = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'getVersion', type: 'function', stateMutability: 'pure', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const;

const IDENTITY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;
const REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

async function main() {
  console.log('Testing ERC-8004 contracts on Celo mainnet...\n');

  const [name, symbol, version] = await Promise.all([
    client.readContract({ address: IDENTITY, abi, functionName: 'name' }),
    client.readContract({ address: IDENTITY, abi, functionName: 'symbol' }),
    client.readContract({ address: IDENTITY, abi, functionName: 'getVersion' }),
  ]);
  console.log('IdentityRegistry:');
  console.log(`  Name: ${name}`);
  console.log(`  Symbol: ${symbol}`);
  console.log(`  Version: ${version}`);

  const repVersion = await client.readContract({ address: REPUTATION, abi, functionName: 'getVersion' });
  console.log('\nReputationRegistry:');
  console.log(`  Version: ${repVersion}`);

  console.log('\nContracts are live and responding!');
}

main().catch(console.error);
