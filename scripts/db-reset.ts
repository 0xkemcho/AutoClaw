#!/usr/bin/env npx tsx
/**
 * Reset agent-related tables for Privy→Thirdweb migration.
 * Requires DATABASE_URL (Supabase direct Postgres connection string).
 *
 * Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 */
import pg from 'pg';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
config({ path: resolve(ROOT, 'apps/api/.env') });
config({ path: resolve(ROOT, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)');
  process.exit(1);
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('Truncating agent_timeline...');
    await client.query('TRUNCATE agent_timeline CASCADE');
    console.log('Truncating agent_positions...');
    await client.query('TRUNCATE agent_positions CASCADE');
    console.log('Truncating agent_configs...');
    await client.query('TRUNCATE agent_configs CASCADE');
    console.log('Done. agent_timeline, agent_positions, and agent_configs have been reset.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
