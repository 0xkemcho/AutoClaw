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
}
