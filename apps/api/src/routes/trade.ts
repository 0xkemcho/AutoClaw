import type { FastifyInstance } from 'fastify';
import { parseUnits, formatUnits, type Address, type PublicClient } from 'viem';
import { authMiddleware } from '../middleware/auth';
import { celoClient } from '../lib/celo-client';
import { createSupabaseAdmin, type Database } from '@autoclaw/db';
import {
  getQuote,
  checkAllowance,
  buildApproveTx,
  buildSwapInTxs,
  applySlippage,
  getErc20Balance,
  BROKER_ADDRESS,
  erc20Abi,
} from '@autoclaw/contracts';
import {
  BASE_TOKENS,
  MENTO_TOKENS,
  COMMODITY_TOKENS,
  getTokenDecimals,
  getTokenAddress,
  TOKEN_METADATA,
  type SupportedToken,
} from '@autoclaw/shared';
import { executeSwap, sendTokens } from '../services/trade-executor';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALL_SWAP_TOKENS = new Set<string>([...BASE_TOKENS, ...MENTO_TOKENS, ...COMMODITY_TOKENS]);
const SEND_TOKENS = new Set<string>([
  ...ALL_SWAP_TOKENS,
  'WETH',
  'WBTC',
  'CELO',
  'stCELO',
]);
const VALID_FROM_TOKENS = new Set<string>(BASE_TOKENS);
const VALID_TO_TOKENS = new Set<string>([...MENTO_TOKENS, ...COMMODITY_TOKENS]);

function isValidFromToken(token: string): boolean {
  return VALID_FROM_TOKENS.has(token);
}

function isValidToToken(token: string): boolean {
  return VALID_TO_TOKENS.has(token);
}

function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

export async function tradeRoutes(app: FastifyInstance) {
  // POST /api/trade/quote
  app.post(
    '/api/trade/quote',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        from?: string;
        to?: string;
        amount?: string;
        slippage?: number;
      };

      // Validate inputs
      const { from, to, amount, slippage = 0.5 } = body;

      if (!from || !ALL_SWAP_TOKENS.has(from)) {
        return reply.status(400).send({
          error: `Invalid 'from' token. Must be one of: ${[...ALL_SWAP_TOKENS].join(', ')}`,
        });
      }

      if (!to || !ALL_SWAP_TOKENS.has(to)) {
        return reply.status(400).send({
          error: `Invalid 'to' token. Must be one of: ${[...ALL_SWAP_TOKENS].join(', ')}`,
        });
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return reply
          .status(400)
          .send({ error: "'amount' must be a positive number" });
      }

      if (slippage < 0.01 || slippage > 50) {
        return reply
          .status(400)
          .send({ error: "'slippage' must be between 0.01 and 50" });
      }

      const fromAddress = getTokenAddress(from) as Address | undefined;
      const toAddress = getTokenAddress(to) as Address | undefined;

      if (!fromAddress || !toAddress) {
        return reply.status(400).send({ error: 'Token address not found' });
      }

      try {
        const fromDecimals = getTokenDecimals(from);
        const toDecimals = getTokenDecimals(to);
        const amountIn = parseUnits(amount, fromDecimals);

        // Get quote from Mento Broker
        const quote = await getQuote({
          tokenIn: fromAddress,
          tokenOut: toAddress,
          amountIn,
          tokenInDecimals: fromDecimals,
          tokenOutDecimals: toDecimals,
          celoClient: celoClient as unknown as PublicClient,
        });

        const amountOutMin = applySlippage(quote.amountOut, slippage);

        // Check existing allowance
        const currentAllowance = await checkAllowance({
          token: fromAddress,
          owner: walletAddress as Address,
          spender: BROKER_ADDRESS,
          celoClient: celoClient as unknown as PublicClient,
        });

        const needsApproval = currentAllowance < amountIn;

        // Build swap tx(s) — may be multi-hop (e.g. USDC → USDm → EURm)
        const swapTxs = buildSwapInTxs({
          route: quote.route,
          amountIn,
          amountOutMin,
        });

        // Build approve tx if needed
        const approveTx = needsApproval
          ? buildApproveTx({
              token: fromAddress,
              spender: BROKER_ADDRESS,
            })
          : null;

        return {
          estimatedAmountOut: formatUnits(quote.amountOut, toDecimals),
          estimatedAmountOutRaw: quote.amountOut.toString(),
          minimumAmountOut: formatUnits(amountOutMin, toDecimals),
          minimumAmountOutRaw: amountOutMin.toString(),
          exchangeRate: quote.rate.toFixed(6),
          priceImpact: 0,
          estimatedGasCelo: '0.001',
          exchangeProvider: quote.exchangeProvider,
          exchangeId: quote.exchangeId,
          approveTx,
          swapTxs,
          fromToken: from,
          toToken: to,
          amountIn: amount,
        };
      } catch (err) {
        console.error('Quote error:', err);
        const message =
          err instanceof Error ? err.message : 'Failed to get quote';
        return reply.status(500).send({ error: message });
      }
    },
  );

  // POST /api/trade/execute — record a completed swap
  app.post(
    '/api/trade/execute',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        txHash?: string;
        from?: string;
        to?: string;
        amountIn?: string;
        amountOut?: string;
        exchangeRate?: string;
      };

      const { txHash, from, to, amountIn, amountOut, exchangeRate } = body;

      if (!txHash || !isValidTxHash(txHash)) {
        return reply.status(400).send({ error: 'Invalid transaction hash' });
      }

      if (!from || !to || !amountIn || !amountOut) {
        return reply
          .status(400)
          .send({ error: 'Missing required fields: from, to, amountIn, amountOut' });
      }

      try {
        // Look up user
        const { data: user, error: userError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', walletAddress)
          .single();

        if (userError || !user) {
          return reply.status(404).send({ error: 'User profile not found' });
        }

        // Insert transaction record
        const { data, error } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'swap' as const,
            source_token: from,
            target_token: to,
            source_amount: parseFloat(amountIn),
            target_amount: parseFloat(amountOut),
            exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null,
            tx_hash: txHash,
            status: 'confirmed' as const,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Failed to record transaction:', error);
          return reply
            .status(500)
            .send({ error: 'Failed to record transaction' });
        }

        return { id: data.id, status: 'confirmed' };
      } catch (err) {
        console.error('Execute error:', err);
        return reply
          .status(500)
          .send({ error: 'Failed to record transaction' });
      }
    },
  );

  // GET /api/trade/history
  app.get(
    '/api/trade/history',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const query = request.query as {
        page?: string;
        limit?: string;
        token?: string;
        status?: string;
      };

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
      const offset = (page - 1) * limit;

      try {
        // Look up user
        const { data: user, error: userError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', walletAddress)
          .single();

        if (userError || !user) {
          return reply.status(404).send({ error: 'User profile not found' });
        }

        // Build query
        let dbQuery = supabaseAdmin
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('type', 'swap')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (query.token) {
          // Validate token against known symbols to prevent injection
          const validTokens: Set<string> = new Set([...BASE_TOKENS, ...MENTO_TOKENS, ...COMMODITY_TOKENS]);
          if (!validTokens.has(query.token as string)) {
            return reply.status(400).send({ error: `Invalid token filter: ${query.token}` });
          }
          dbQuery = dbQuery.or(
            `source_token.eq.${query.token},target_token.eq.${query.token}`,
          );
        }

        if (query.status != null && query.status !== '') {
          const status = query.status as string;
          dbQuery = dbQuery.eq('status', status);
        }

        const { data, error, count } = await dbQuery;

        if (error) {
          console.error('Failed to fetch trade history:', error);
          return reply
            .status(500)
            .send({ error: 'Failed to fetch trade history' });
        }

        const total = count ?? 0;

        type TransactionRow = Database['public']['Tables']['transactions']['Row'];
        return {
          transactions: ((data ?? []) as TransactionRow[]).map((tx) => ({
            id: tx.id,
            type: tx.type,
            sourceToken: tx.source_token,
            targetToken: tx.target_token,
            sourceAmount: String(tx.source_amount),
            targetAmount: String(tx.target_amount),
            exchangeRate: tx.exchange_rate ? String(tx.exchange_rate) : null,
            txHash: tx.tx_hash,
            status: tx.status,
            createdAt: tx.created_at,
          })),
          pagination: {
            page,
            limit,
            total,
            hasMore: offset + limit < total,
          },
        };
      } catch (err) {
        console.error('History error:', err);
        return reply
          .status(500)
          .send({ error: 'Failed to fetch trade history' });
      }
    },
  );

  // POST /api/trade/swap — execute a swap via the agent's server wallet
  app.post(
    '/api/trade/swap',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        from?: string;
        to?: string;
        amount?: string;
        slippage?: number;
        agent_type?: 'fx' | 'yield';
      };

      const { from, to, amount, slippage = 0.5, agent_type: requestedAgentType = 'fx' } = body;

      if (!from || !ALL_SWAP_TOKENS.has(from)) {
        return reply.status(400).send({
          error: `Invalid 'from' token. Must be one of: ${[...ALL_SWAP_TOKENS].join(', ')}`,
        });
      }
      if (!to || !ALL_SWAP_TOKENS.has(to)) {
        return reply.status(400).send({
          error: `Invalid 'to' token. Must be one of: ${[...ALL_SWAP_TOKENS].join(', ')}`,
        });
      }
      if (from === to) {
        return reply.status(400).send({ error: 'Cannot swap a token to itself' });
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return reply.status(400).send({ error: "'amount' must be a positive number" });
      }

      const agentType = requestedAgentType === 'yield' ? 'yield' : 'fx';

      try {
        const { data: agent, error: agentError } = await supabaseAdmin
          .from('agent_configs')
          .select('server_wallet_id, server_wallet_address')
          .eq('wallet_address', walletAddress)
          .eq('agent_type', agentType)
          .maybeSingle();

        if (agentError || !agent?.server_wallet_id || !agent?.server_wallet_address) {
          return reply.status(400).send({
            error: `${agentType === 'yield' ? 'Yield' : 'FX'} agent wallet not configured. Complete onboarding first.`,
          });
        }

        const result = await executeSwap({
          serverWalletId: agent.server_wallet_id,
          serverWalletAddress: agent.server_wallet_address,
          from,
          to,
          amount,
          slippagePct: slippage,
        });

        const direction = VALID_FROM_TOKENS.has(from) || from === 'USDm' ? 'buy' : 'sell';
        const currency = direction === 'buy' ? to : from;
        const timelineTable = agentType === 'yield' ? 'yield_agent_timeline' : 'fx_agent_timeline';
        await supabaseAdmin.from(timelineTable).insert({
          wallet_address: walletAddress,
          event_type: 'trade',
          summary: `Manual swap: ${amount} ${from} → ${to}`,
          detail: {
            source: 'manual_swap',
            from,
            to,
            amountIn: result.amountIn.toString(),
            amountOut: result.amountOut.toString(),
            rate: result.rate,
          },
          currency,
          amount_usd: parseFloat(amount),
          direction,
          tx_hash: result.txHash,
        });

        return {
          txHash: result.txHash,
          amountIn: result.amountIn.toString(),
          amountOut: result.amountOut.toString(),
          exchangeRate: result.rate.toFixed(6),
        };
      } catch (err) {
        console.error('Swap error:', err);
        const message = err instanceof Error ? err.message : 'Swap failed';
        return reply.status(500).send({ error: message });
      }
    },
  );

  // GET /api/trade/balance — real-time on-chain balance for send flow (avoids stale Dune data)
  app.get(
    '/api/trade/balance',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const query = request.query as { token?: string; agent_type?: string };
      const token = query.token;
      const agentType = query.agent_type === 'yield' ? 'yield' : 'fx';

      if (!token || !SEND_TOKENS.has(token)) {
        return reply.status(400).send({
          error: `Invalid token. Must be one of: ${[...SEND_TOKENS].join(', ')}`,
        });
      }

      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agent_configs')
        .select('server_wallet_address')
        .eq('wallet_address', walletAddress)
        .eq('agent_type', agentType)
        .maybeSingle();

      if (agentError || !agent?.server_wallet_address) {
        return reply.status(404).send({
          error: `${agentType === 'yield' ? 'Yield' : 'FX'} agent wallet not configured.`,
        });
      }

      const tokenAddress = getTokenAddress(token);
      if (!tokenAddress) {
        return reply.status(400).send({ error: `Unknown token: ${token}` });
      }

      const decimals = getTokenDecimals(token);
      const balance = await getErc20Balance({
        token: tokenAddress as Address,
        account: agent.server_wallet_address as Address,
        client: celoClient,
      });

      const balanceHuman = Number(formatUnits(balance, decimals));
      return { balance: balanceHuman };
    },
  );

  // POST /api/trade/send — send tokens from agent wallet to recipient
  app.post(
    '/api/trade/send',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        token?: string;
        amount?: number;
        recipient?: string;
        agent_type?: 'fx' | 'yield';
      };

      const { token, amount, recipient, agent_type: requestedAgentType = 'fx' } = body;

      if (!token || !SEND_TOKENS.has(token)) {
        return reply.status(400).send({
          error: `Invalid token. Must be one of: ${[...SEND_TOKENS].join(', ')}`,
        });
      }
      if (amount == null || isNaN(amount) || amount <= 0) {
        return reply.status(400).send({ error: "'amount' must be a positive number" });
      }
      if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        return reply.status(400).send({ error: 'Invalid recipient address' });
      }

      const agentType = requestedAgentType === 'yield' ? 'yield' : 'fx';

      try {
        const { data: agent, error: agentError } = await supabaseAdmin
          .from('agent_configs')
          .select('server_wallet_id, server_wallet_address')
          .eq('wallet_address', walletAddress)
          .eq('agent_type', agentType)
          .maybeSingle();

        if (agentError || !agent?.server_wallet_id || !agent?.server_wallet_address) {
          return reply.status(400).send({
            error: `${agentType === 'yield' ? 'Yield' : 'FX'} agent wallet not configured. Complete onboarding first.`,
          });
        }

        const result = await sendTokens({
          serverWalletId: agent.server_wallet_id,
          serverWalletAddress: agent.server_wallet_address,
          token,
          amount: String(amount),
          recipient,
        });

        return { txHash: result.txHash };
      } catch (err) {
        console.error('Send error:', err);
        const message = err instanceof Error ? err.message : 'Send failed';
        return reply.status(500).send({ error: message });
      }
    },
  );
}
