import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import {
  getVerificationInfo,
  startVerification,
  checkVerificationStatus,
} from '../services/selfclaw-verification.js';

export async function selfclawRoutes(app: FastifyInstance) {
  app.get('/api/selfclaw/status', { preHandler: authMiddleware }, async (request, reply) => {
    const walletAddress = request.user!.walletAddress;
    const info = await getVerificationInfo(walletAddress);
    return info;
  });

  app.post('/api/selfclaw/start', { preHandler: authMiddleware }, async (request, reply) => {
    const walletAddress = request.user!.walletAddress;
    const body = request.body as { agentName?: string };
    const agentName = typeof body?.agentName === 'string' ? body.agentName.trim() : '';

    if (!agentName) {
      return reply.status(400).send({ error: 'agentName is required' });
    }

    if (agentName.length < 2 || agentName.length > 50) {
      return reply.status(400).send({ error: 'agentName must be 2-50 characters' });
    }

    try {
      const result = await startVerification(walletAddress, agentName);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: msg });
    }
  });

  app.get('/api/selfclaw/poll', { preHandler: authMiddleware }, async (request, reply) => {
    const walletAddress = request.user!.walletAddress;
    try {
      const result = await checkVerificationStatus(walletAddress);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: msg });
    }
  });
}
