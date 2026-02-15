# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoClaw is an autonomous FX trading agent framework on the Celo blockchain. It runs scheduled agents that fetch FX news, analyze with Gemini LLM, and execute stablecoin swaps via the Mento protocol. Users authenticate with SIWE (Sign-In With Ethereum), complete a risk questionnaire, and configure agent guardrails. A Next.js frontend provides a dashboard with real-time agent progress streaming via WebSocket.

## Commands

```bash
# Development
pnpm dev                          # Run all apps via turbo (API on :4000, Web on :3000)
pnpm build                        # Build all packages
pnpm type-check                   # Type check all packages
pnpm test                         # Run all tests via turbo
pnpm clean                        # Clean all dist/build output

# API-specific
pnpm --filter @autoclaw/api dev   # Run API server in watch mode
pnpm --filter @autoclaw/api test  # Run API tests
pnpm --filter @autoclaw/api test:watch

# Web-specific
pnpm --filter @autoclaw/web dev   # Run Next.js dev server

# Run a single test file
cd apps/api && pnpm vitest run src/services/rules-engine.test.ts
```

## Monorepo Structure

pnpm workspaces + Turborepo. Node 20 (`.nvmrc`). pnpm 9.15.0.

- **`apps/api`** — Fastify v5 backend server (API, crons, WebSocket)
- **`apps/web`** — Next.js 15 frontend (App Router, React 19, Tailwind v4, shadcn/ui)
- **`packages/shared`** — Shared TypeScript types: agent configs, risk profiles, token addresses, guardrail defaults, progress event types
- **`packages/db`** — Supabase client factory (`createSupabaseClient`, `createSupabaseAdmin`) and generated DB types
- **`packages/contracts`** — Celo contract ABIs (Broker, BiPoolManager, ERC20), address constants, quote/swap builders, multi-hop routing
- **`packages/typescript-config`** — Shared tsconfig bases (`base.json`, `fastify.json`, `nextjs.json`)
- **`supabase/migrations`** — PostgreSQL migrations (Supabase)
- **`docs/`** — Audit reports, implementation plans, brainstorms

## Architecture

### Agent Execution Loop (`apps/api/src/services/agent-cron.ts`)

The core loop ticks every 60s, queries `agent_configs` for agents where `next_run_at <= NOW()`, then for each:

1. Fetch current positions and portfolio value (`position-tracker.ts`)
2. Fetch FX news via Parallel AI (`news-fetcher.ts`, cached 1hr per currency set)
3. Generate signals with Gemini 2.5 Flash (`llm-analyzer.ts`) — buy/sell/hold with confidence 0-100
4. For signals with confidence >= 60: validate against guardrails (`rules-engine.ts`), then execute swap (`trade-executor.ts`)
5. Log all events to `agent_timeline`

Each step emits progress events via the agent event system for real-time frontend streaming.

### Real-Time Progress (`apps/api/src/services/agent-events.ts` → `apps/api/src/routes/ws.ts`)

Node.js EventEmitter singleton broadcasts agent progress per user (`progress:{walletAddress}`). The WebSocket route at `/api/ws` authenticates via JWT within 10s, then subscribes to the user's progress events. Progress steps: `fetching_news` → `analyzing` → `checking_signals` → `executing_trades` → `complete`/`error`. Frontend `useAgentProgress()` hook consumes these events for live dashboard updates.

### Trade Execution (`apps/api/src/services/trade-executor.ts`)

Maps currency → on-chain token address → gets quote from Mento Broker → checks/sets ERC20 approval → executes swap via thirdweb server wallet (gasless EIP-7702). All trades route through USDm as the hub token. Default slippage: 0.5%.

### Contract Layer (`packages/contracts`)

- `getRoutes(celoClient)` — Discovers Mento exchange pools, caches 5 min
- `findRoute(tokenIn, tokenOut)` — Multi-hop routing via USDm hub
- `getQuote(...)` / `buildSwapInTx(...)` — Quote and execute swaps through Broker
- `checkAllowance(...)` / `buildApproveTx(...)` — ERC20 approval management
- Key contracts: Broker (`0x777A...`), BiPoolManager (`0x22d9...`)

### Guardrails (`apps/api/src/services/rules-engine.ts`)

Checks in order: allowed/blocked currencies → daily trade limit → max trade size USD → max allocation % (buys only). Defaults defined per risk profile in `packages/shared/src/types/agent.ts`.

### Authentication

SIWE via thirdweb: `POST /api/auth/payload` → client signs → `POST /api/auth/login` → JWT issued. Auth middleware (`apps/api/src/middleware/auth.ts`) extracts `walletAddress` from JWT `sub` claim. All agent/user routes are protected. Frontend stores JWT in localStorage and syncs across tabs via BroadcastChannel.

### Server Wallet Management

Thirdweb API creates and manages server-side wallets for each user. Wallet creation happens during onboarding. Transactions are gasless via EIP-7702 (thirdweb sponsors gas). Identifiers: `agent-fx-{walletAddress}`, `agent-yield-{walletAddress}`, `erc8004-registrar`.

### API Routes

All routes prefixed with `/api`. Groups: `auth`, `user` (risk profile/onboarding), `agent` (config/toggle/run-now/timeline/positions/portfolio/settings), `market` (token prices), `trade` (stub), `ws` (WebSocket progress stream).

### Database

Supabase (PostgreSQL) with RLS enabled on all tables. Primary identity key is `wallet_address`. Key tables: `user_profiles`, `agent_configs`, `agent_timeline` (has `run_id` for grouping events by run), `agent_positions`, `token_price_snapshots`, `portfolio_snapshots`, `news_articles`.

### Cron Jobs

Two crons start on server boot: `startPriceSnapshotCron()` (hourly token price snapshots) and `startAgentCron()` (60s tick for agent execution).

## Frontend (`apps/web`)

Next.js 15 with App Router, React 19, TypeScript strict mode.

**Stack**: Tailwind CSS v4, shadcn/ui (New York style), TanStack Query v5, Motion v12, Recharts v2, thirdweb v5 SDK, Sonner toasts. Dark-only theme with amber/gold accent. Fonts: Barlow (sans), JetBrains Mono (mono).

**Route structure**:
- `/` — Landing page (wallet connect)
- `/(auth)/onboarding` — Risk questionnaire + fund wallet
- `/(app)/dashboard` — Agent status, portfolio charts, holdings, activity feed, live run card
- `/(app)/timeline` — Filtered event history
- `/(app)/settings` — Agent config, currency management
- `/(app)/swap` — Manual swap interface

**Key patterns**:
- Route groups: `(auth)` redirects away if authenticated, `(app)` requires auth + onboarding via `AuthGuard`
- API client (`lib/api-client.ts`): fetch wrapper with JWT injection, auto-clears token on 401
- Custom hooks: `use-agent`, `use-agent-progress`, `use-timeline`, `use-portfolio`, `use-portfolio-history`, `use-market`, `use-user`
- Page components split: `page.tsx` (server) delegates to `_components/` (client)

## Code Conventions

- ESM modules (`"type": "module"` in apps/api)
- Prettier: semicolons, single quotes, 2-space tabs, trailing commas
- Tests: Vitest with globals enabled, colocated `*.test.ts` files next to source
- Routes are Fastify plugins (async functions accepting `FastifyInstance`)
- Services receive dependencies as function params (explicit, no DI framework)
- Supabase clients are singletons; thirdweb server wallets created via REST API
- In-memory caching in services (news cache, approval cache) — not shared across instances
- Frontend components use shadcn/ui primitives; new components go in `src/components/ui/`

## Environment Variables

**API** (`apps/api/.env.example`): Required: `THIRDWEB_SECRET_KEY`, `THIRDWEB_ADMIN_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PARALLEL_API_KEY`, `DUNE_SIM_API_KEY`. Defaults: `PORT=4000`, `CELO_RPC_URL=https://forno.celo.org`, `CORS_ORIGIN=http://localhost:3000`.

**Web** (`apps/web/.env.local`): `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`), `NEXT_PUBLIC_CELO_EXPLORER_URL`.

## Token Universe

Mento stablecoins: USDm, EURm, BRLm, KESm, PHPm, COPm, XOFm, NGNm, JPYm, CHFm, ZARm, GBPm, AUDm, CADm, GHSm. Base tokens: USDC, USDT. Commodity: XAUT. Addresses in `packages/shared/src/types/tokens.ts` and `packages/contracts/src/addresses.ts`.
