import type { FastifyRequest, FastifyReply } from 'fastify';
import { thirdwebAuth } from '../lib/thirdweb.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      walletAddress: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization token' });
  }

  const jwt = authHeader.slice(7);

  try {
    const result = await thirdwebAuth.verifyJWT({ jwt });
    if (!result.valid) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    request.user = {
      walletAddress: result.parsedJWT.sub,
    };
  } catch {
    return reply.status(401).send({ error: 'Token verification failed' });
  }
}
