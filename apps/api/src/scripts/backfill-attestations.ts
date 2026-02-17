import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function getArg(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match?.split('=')[1];
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

  const { backfillRunAttestations } = await import('../services/attestation-service.js');

  const agentTypeRaw = (getArg('--agent-type') || 'all').toLowerCase();
  const agentType = agentTypeRaw === 'fx' || agentTypeRaw === 'yield' ? agentTypeRaw : 'all';
  const limit = Number.parseInt(getArg('--limit') || '5000', 10);
  const dryRun = process.argv.includes('--dry-run');

  console.log(
    `[attestation-backfill] Starting (agentType=${agentType}, limit=${limit}, dryRun=${dryRun})`,
  );

  const summary = await backfillRunAttestations({
    agentType,
    limit: Number.isFinite(limit) ? Math.max(limit, 1) : 5000,
    dryRun,
  });

  console.log('[attestation-backfill] Summary:');
  console.log(
    JSON.stringify(
      {
        total: summary.total,
        created: summary.created,
        skipped: summary.skipped,
        errors: summary.errors,
      },
      null,
      2,
    ),
  );

  if (summary.errors > 0) {
    console.log('[attestation-backfill] Errors:');
    for (const item of summary.results.filter((r) => r.error)) {
      console.log(
        `- ${item.agentType}:${item.walletAddress}:${item.runId} -> ${item.error}`,
      );
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[attestation-backfill] Fatal:', error);
  process.exit(1);
});
