import type { FastifyInstance } from 'fastify';
import { getMarketTokens } from '../services/market-data-service.js';

export async function marketRoutes(app: FastifyInstance) {
  app.get('/api/market/tokens', async () => {
    const tokens = await getMarketTokens();
    return {
      tokens,
      updatedAt: new Date().toISOString(),
    };
  });

  app.get('/api/market/celo-price', async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd',
      );
      const data = (await res.json()) as { celo?: { usd?: number } };
      const price = data.celo?.usd;
      return {
        priceUsd: price ?? 0,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      app.log.warn(err, 'Failed to fetch CELO price');
      return { priceUsd: 0, updatedAt: new Date().toISOString() };
    }
  });
}
