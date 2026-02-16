import type { FastifyInstance } from 'fastify';
import {
  getCachedTrendingFx,
  getCachedYieldOpportunities,
} from '../services/overview-cache-service.js';

export async function overviewRoutes(app: FastifyInstance) {
  app.get('/api/overview/trending-fx', async (_request, reply) => {
    try {
      const { tokens, updatedAt } = await getCachedTrendingFx();
      return { tokens, updatedAt };
    } catch (err) {
      app.log.error(err, 'Failed to fetch trending FX');
      return reply.status(500).send({ error: 'Failed to fetch trending FX data' });
    }
  });

  app.get('/api/overview/yield-opportunities', async (_request, reply) => {
    try {
      const { opportunities, updatedAt } = await getCachedYieldOpportunities();
      return { opportunities, updatedAt };
    } catch (err) {
      app.log.error(err, 'Failed to fetch yield opportunities');
      return reply.status(500).send({ error: 'Failed to fetch yield opportunities' });
    }
  });
}
