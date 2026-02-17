import { writeFile } from 'node:fs/promises';
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeFunctionData } from 'viem';
import { createSupabaseAdmin } from '@autoclaw/db';
import {
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@autoclaw/contracts';
import { celoClient } from '../lib/celo-client.js';
import {
  createServerWallet,
  sendSponsoredTransaction,
  waitForTransactionHash,
} from '../lib/thirdweb-wallet.js';

type AgentType = 'fx' | 'yield';

function getArg(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match?.split('=')[1];
}

function canonicalMetadataUrl(apiBaseUrl: string, walletAddress: string, agentType: AgentType): string {
  if (agentType === 'yield') {
    return `${apiBaseUrl}/api/yield-agent/${walletAddress}/8004-metadata`;
  }
  return `${apiBaseUrl}/api/agent/${walletAddress}/8004-metadata`;
}

async function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps/api/.env'),
    resolve(scriptDir, '../../.env'),
  ];
  for (const envPath of envPaths) {
    loadEnv({ path: envPath, override: false });
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const dryRun = process.argv.includes('--dry-run');
  const onlyMismatch = process.argv.includes('--only-mismatch');
  const agentTypeArg = (getArg('--agent-type') || 'all').toLowerCase();
  const limit = Number.parseInt(getArg('--limit') || '500', 10);
  const jsonOut = getArg('--json-out');
  const apiBaseUrl = (getArg('--api-base-url') || process.env.PUBLIC_API_BASE_URL || 'https://api.autoclaw.co').replace(/\/+$/, '');
  const agentTypes: AgentType[] =
    agentTypeArg === 'fx' || agentTypeArg === 'yield'
      ? [agentTypeArg]
      : ['fx', 'yield'];

  const { data, error } = await supabaseAdmin
    .from('agent_configs')
    .select('wallet_address,agent_type,agent_8004_id')
    .in('agent_type', agentTypes)
    .not('agent_8004_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(Number.isFinite(limit) ? Math.max(1, limit) : 500);

  if (error) {
    throw new Error(`Failed to load agent configs: ${error.message}`);
  }

  let registrarAddress: string | null = null;
  const results: Array<Record<string, unknown>> = [];

  for (const row of (data ?? []) as Array<{ wallet_address: string; agent_type: AgentType; agent_8004_id: number }>) {
    const walletAddress = row.wallet_address;
    const agentType = row.agent_type;
    const agentId = BigInt(row.agent_8004_id);
    const expectedUri = canonicalMetadataUrl(apiBaseUrl, walletAddress, agentType);

    let currentUri = '';
    try {
      currentUri = await celoClient.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryAbi,
        functionName: 'tokenURI',
        args: [agentId],
      });
    } catch (readError) {
      results.push({
        walletAddress,
        agentType,
        agentId: row.agent_8004_id,
        expectedUri,
        status: 'read_failed',
        error: readError instanceof Error ? readError.message : String(readError),
      });
      continue;
    }

    const mismatch = currentUri !== expectedUri;
    if (onlyMismatch && !mismatch) {
      continue;
    }

    if (!mismatch) {
      results.push({
        walletAddress,
        agentType,
        agentId: row.agent_8004_id,
        expectedUri,
        currentUri,
        status: 'ok',
      });
      continue;
    }

    if (dryRun) {
      results.push({
        walletAddress,
        agentType,
        agentId: row.agent_8004_id,
        expectedUri,
        currentUri,
        status: 'mismatch',
      });
      continue;
    }

    try {
      if (!registrarAddress) {
        const registrar = await createServerWallet('erc8004-registrar');
        registrarAddress = registrar.address;
      }
      const data = encodeFunctionData({
        abi: identityRegistryAbi,
        functionName: 'setAgentURI',
        args: [agentId, expectedUri],
      });
      const { transactionIds } = await sendSponsoredTransaction({
        chainId: 42220,
        from: registrarAddress,
        transactions: [{ to: IDENTITY_REGISTRY_ADDRESS, data }],
      });
      const txHash = await waitForTransactionHash(transactionIds[0]);
      const receipt = await celoClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === 'reverted') {
        results.push({
          walletAddress,
          agentType,
          agentId: row.agent_8004_id,
          expectedUri,
          currentUri,
          status: 'update_reverted',
          txHash,
        });
        continue;
      }

      results.push({
        walletAddress,
        agentType,
        agentId: row.agent_8004_id,
        expectedUri,
        currentUri,
        status: 'updated',
        txHash,
      });
    } catch (updateError) {
      results.push({
        walletAddress,
        agentType,
        agentId: row.agent_8004_id,
        expectedUri,
        currentUri,
        status: 'update_failed',
        error: updateError instanceof Error ? updateError.message : String(updateError),
      });
    }
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    mismatch: results.filter((r) => r.status === 'mismatch').length,
    updated: results.filter((r) => r.status === 'updated').length,
    failures: results.filter((r) =>
      r.status === 'read_failed' ||
      r.status === 'update_failed' ||
      r.status === 'update_reverted',
    ).length,
  };

  console.log('[8004-uri-migrate] Summary');
  console.log(JSON.stringify(summary, null, 2));
  console.log('[8004-uri-migrate] Results');
  for (const result of results) {
    console.log(JSON.stringify(result));
  }

  if (jsonOut) {
    await writeFile(
      jsonOut,
      JSON.stringify(
        {
          summary,
          results,
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log(`[8004-uri-migrate] Wrote ${jsonOut}`);
  }

  if (summary.failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[8004-uri-migrate] Fatal:', error);
  process.exit(1);
});
