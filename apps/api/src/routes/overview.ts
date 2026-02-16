import type { FastifyInstance } from 'fastify';
import {
  getCachedTrendingFx,
  getCachedYieldOpportunities,
} from '../services/overview-cache-service.js';
import { runOverviewFxAnalysis } from '../services/overview-fx-analysis.js';

export async function overviewRoutes(app: FastifyInstance) {
  app.get('/api/overview/trending-fx', async (_request, reply) => {
    try {
      const { tokens, analysis, tokenNews, updatedAt } = await getCachedTrendingFx();
      return { tokens, analysis, tokenNews, updatedAt };
    } catch (err) {
      app.log.error(err, 'Failed to fetch trending FX');
      return reply.status(500).send({ error: 'Failed to fetch trending FX data' });
    }
  });

  app.post('/api/overview/trigger-fx-analysis', async (_request, reply) => {
    try {
      runOverviewFxAnalysis().catch((err) => {
        app.log.error(err, 'Background FX analysis failed');
      });
      return { triggered: true };
    } catch (err) {
      app.log.error(err, 'Failed to trigger FX analysis');
      return reply.status(500).send({ error: 'Failed to trigger analysis' });
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
