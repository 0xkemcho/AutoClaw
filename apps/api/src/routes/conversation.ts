/**
 * Conversation Intelligence Agent API routes.
 */

import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import {
  createChat,
  getChat,
  getLatestChat,
  getMessages,
  sendMessageStream,
} from '../services/conversation-service.js';
import { CONVERSATION_MODEL_IDS, isConversationModelId } from '../services/model-router.js';

const MAX_MESSAGE_LENGTH = 32_768;

export async function conversationRoutes(app: FastifyInstance) {
  // GET /api/conversation/chats/latest — get user's most recent chat (must be before :chatId)
  app.get(
    '/api/conversation/chats/latest',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const chat = await getLatestChat(walletAddress);
      if (!chat) {
        return reply.status(404).send({ error: 'No chats found' });
      }
      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      };
    }
  );

  // POST /api/conversation/chats — start new chat
  app.post(
    '/api/conversation/chats',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      try {
        const chat = await createChat(walletAddress);
        app.log.info({ walletAddress: walletAddress.slice(0, 10), chatId: chat.id }, 'Conversation chat created');
        return chat;
      } catch (err) {
        app.log.error({ err, walletAddress: walletAddress.slice(0, 10) }, 'Failed to create conversation chat');
        return reply.status(500).send({ error: 'Failed to create chat' });
      }
    }
  );

  // GET /api/conversation/chats/:chatId — get chat (for validation)
  app.get(
    '/api/conversation/chats/:chatId',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const { chatId } = request.params as { chatId: string };

      const chat = await getChat(chatId, walletAddress);
      if (!chat) {
        return reply.status(404).send({ error: 'Chat not found' });
      }
      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      };
    }
  );

  // GET /api/conversation/chats/:chatId/messages — load messages for current session
  app.get(
    '/api/conversation/chats/:chatId/messages',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const { chatId } = request.params as { chatId: string };

      const chat = await getChat(chatId, walletAddress);
      if (!chat) {
        return reply.status(404).send({ error: 'Chat not found' });
      }

      const messages = await getMessages(chatId, walletAddress);
      return {
        chat: {
          id: chat.id,
          title: chat.title,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
        },
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          modelRequested: m.model_requested,
          modelRouted: m.model_routed,
          createdAt: m.created_at,
        })),
      };
    }
  );

  // POST /api/conversation/chats/:chatId/messages — send message, stream response
  app.post(
    '/api/conversation/chats/:chatId/messages',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const { chatId } = request.params as { chatId: string };

      const body = request.body as { content?: string; modelId?: string; messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }> };
      let content = typeof body?.content === 'string' ? body.content.trim() : '';
      const modelId = typeof body?.modelId === 'string' ? body.modelId : 'gemini-3-flash';

      // Fallback: extract from AI SDK messages format if content not provided
      if (!content && Array.isArray(body?.messages) && body.messages.length > 0) {
        for (let i = body.messages.length - 1; i >= 0; i--) {
          const m = body.messages[i];
          if (m.role !== 'user') continue;
          const parts = m.parts ?? [];
          for (const p of parts) {
            if (p.type === 'text' && typeof p.text === 'string') {
              content = p.text.trim();
              break;
            }
          }
          if (content) break;
        }
      }

      app.log.info({ chatId, contentLength: content.length, modelId: modelId.slice(0, 20) }, 'Conversation message received');

      if (!content) {
        return reply.status(400).send({ error: 'content is required' });
      }
      if (content.length > MAX_MESSAGE_LENGTH) {
        return reply.status(400).send({
          error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
        });
      }

      const resolvedModelId = isConversationModelId(modelId) ? modelId : 'gemini-3-flash';

      try {
        const { response } = await sendMessageStream({
          chatId,
          walletAddress,
          content,
          modelId: resolvedModelId,
        });

        reply.raw.statusCode = response.status;
        for (const [k, v] of response.headers) {
          reply.raw.setHeader(k, v);
        }
        return reply.send(response.body);
      } catch (err) {
        if ((err as Error).message === 'Chat not found') {
          return reply.status(404).send({ error: 'Chat not found' });
        }
        app.log.error({ err, chatId, walletAddress: walletAddress.slice(0, 10) }, 'Failed to send conversation message');
        return reply.status(500).send({ error: 'Failed to process message' });
      }
    }
  );

  // GET /api/conversation/models — list available models
  app.get(
    '/api/conversation/models',
    { preHandler: authMiddleware },
    async () => {
      return {
        models: CONVERSATION_MODEL_IDS,
      };
    }
  );
}
