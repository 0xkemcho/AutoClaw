import type { FastifyInstance } from 'fastify';
import { thirdwebAuth } from '../lib/thirdweb.js';
import { agentEvents, type ProgressEvent } from '../services/agent-events.js';

export async function wsRoutes(app: FastifyInstance) {
  app.get('/api/ws', { websocket: true }, (socket) => {
    let walletAddress: string | null = null;
    let listener: ((event: ProgressEvent) => void) | null = null;
    let closed = false;

    // 10s auth timeout — disconnect if no valid auth message received
    const authTimeout = setTimeout(() => {
      if (!walletAddress) {
        socket.send(JSON.stringify({ type: 'error', message: 'Auth timeout' }));
        socket.close();
      }
    }, 10_000);

    socket.on('message', async (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(String(raw));

        // Handle auth message
        if (msg.type === 'auth' && typeof msg.token === 'string') {
          const result = await thirdwebAuth.verifyJWT({ jwt: msg.token });
          if (!result.valid) {
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            socket.close();
            return;
          }

          // If the socket closed while we were verifying the JWT, don't
          // register a listener that can never be cleaned up.
          if (closed) return;

          walletAddress = result.parsedJWT.sub;
          clearTimeout(authTimeout);

          // Subscribe to progress events for this wallet
          listener = (event: ProgressEvent) => {
            try {
              if (socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'progress', ...event }));
              }
            } catch (err) {
              console.error(`[ws] Failed to forward event to ${walletAddress}:`, err);
            }
          };
          agentEvents.on(`progress:${walletAddress}`, listener);

          socket.send(JSON.stringify({ type: 'auth_ok' }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.on('close', () => {
      closed = true;
      clearTimeout(authTimeout);
      if (walletAddress && listener) {
        agentEvents.off(`progress:${walletAddress}`, listener);
      }
    });
  });
}
