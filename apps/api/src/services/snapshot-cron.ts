import { createSupabaseAdmin } from '@autoclaw/db';
import { fetchAllPrices } from './price-service';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function snapshotPrices(): Promise<void> {
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
        console.error('Failed to insert price snapshots:', error);
      } else {
        console.log(
          `Saved ${rows.length} price snapshots at ${now}`,
        );
      }
    }
  } catch (err) {
    console.error('Price snapshot cron error:', err);
  }
}

export function startPriceSnapshotCron(): void {
  console.log('Starting price snapshot cron (every 15 min)');
  // Run immediately on startup
  snapshotPrices();
  // Then every 15 minutes
  setInterval(snapshotPrices, SNAPSHOT_INTERVAL_MS);
}
