import { createSupabaseAdmin } from '@autoclaw/db';
import { fetchAllPrices } from './price-service';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RETRIES = 3;

async function snapshotPrices(): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prices = await fetchAllPrices();
      const now = new Date().toISOString();

      const rows = Array.from(prices.entries()).map(([symbol, price]) => ({
        token_symbol: symbol,
        price_usd: price,
        snapshot_at: now,
      }));

      if (rows.length > 0) {
        const { error } = await supabaseAdmin
          .from('token_price_snapshots')
          .insert(rows);

        if (error) {
          throw new Error(`DB insert failed: ${error.message}`);
        }

        console.log(`Saved ${rows.length} price snapshots at ${now}`);
      }
      return; // Success
    } catch (err) {
      lastError = err;
      console.error(`Price snapshot attempt ${attempt}/${MAX_RETRIES} failed:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  console.error('Price snapshot cron: all retries exhausted', lastError);
}

export function startPriceSnapshotCron(): void {
  console.log('Starting price snapshot cron (every 15 min)');
  snapshotPrices();
  setInterval(snapshotPrices, SNAPSHOT_INTERVAL_MS);
}
