import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { marketRoutes } from './routes/market';
import { tradeRoutes } from './routes/trade';
import { agentRoutes } from './routes/agent';
import { wsRoutes } from './routes/ws';
import { yieldAgentRoutes } from './routes/yield-agent';
import { startPriceSnapshotCron } from './services/snapshot-cron';
import { startAgentCron } from './services/agent-cron';

const PORT = parseInt(process.env.PORT || '4000', 10);

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'warn',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined,
  },
});

await app.register(cors, {
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim()),
  credentials: true,
});

await app.register(websocket);

// Simple in-memory rate limiting for sensitive endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMITS: Record<string, number> = {
  '/api/auth/login': 10,
  '/api/auth/payload': 20,
  '/api/agent/run-now': 5,
  '/api/trade/execute': 10,
  '/api/yield-agent/run-now': 5,
};

app.addHook('onRequest', async (request, reply) => {
  const limit = RATE_LIMITS[request.url.split('?')[0]];
  if (!limit) return;

  const ip = request.ip;
  const key = `${ip}:${request.url.split('?')[0]}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  entry.count++;
  if (entry.count > limit) {
    return reply.status(429).send({ error: 'Too many requests' });
  }
});

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

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
await app.register(wsRoutes);
await app.register(yieldAgentRoutes);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`API server running on http://localhost:${PORT}`);
  startPriceSnapshotCron();
  startAgentCron();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
