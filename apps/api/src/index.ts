import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { marketRoutes } from './routes/market';
import { tradeRoutes } from './routes/trade';
import { agentRoutes } from './routes/agent';
import { startPriceSnapshotCron } from './services/snapshot-cron';
import { startAgentCron } from './services/agent-cron';

const PORT = parseInt(process.env.PORT || '4000', 10);

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

// Health check
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Routes
await app.register(authRoutes);
await app.register(userRoutes);
await app.register(marketRoutes);
await app.register(tradeRoutes);
await app.register(agentRoutes);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`API server running on http://localhost:${PORT}`);
  startPriceSnapshotCron();
  startAgentCron();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
