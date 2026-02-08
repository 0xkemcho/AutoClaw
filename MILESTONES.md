# AutoClaw - Development Milestones

Each milestone delivers a working vertical slice — FE + BE ship together. Every deliverable has a verification process to confirm completeness before moving on.

---

## Milestone 1: Project Scaffold & Auth (Week 1)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 1.1 | Turborepo monorepo initialized      | BE + FE  |
| 1.2 | `apps/api` — Fastify server running | BE       |
| 1.3 | `apps/web` — Next.js 15 app running | FE       |
| 1.4 | `packages/shared` — shared types    | BE + FE  |
| 1.5 | `packages/db` — Supabase client + initial schema migration | BE |
| 1.6 | thirdweb auth integration (wallet + social + in-app wallets + MiniPay) | FE + BE |
| 1.7 | Auth middleware on Fastify (thirdweb JWT/SIWE verification) | BE |
| 1.8 | Protected route wrapper on frontend  | FE       |
| 1.9 | Basic CI: lint + type-check on PR    | BE + FE  |

### Verification

- [ ] `pnpm dev` starts both `apps/web` (port 3000) and `apps/api` (port 4000) concurrently
- [ ] `pnpm build` succeeds for all packages with zero type errors
- [ ] Can connect MetaMask wallet on frontend → thirdweb session created
- [ ] Can login with Google/email via thirdweb in-app wallet → session created + wallet address assigned
- [ ] API request to `GET /api/auth/me` with valid thirdweb JWT returns user object
- [ ] API request without token returns 401
- [ ] Supabase tables `user_profiles`, `conversations`, `messages`, `transactions`, `sip_configs`, `portfolio_snapshots` exist with RLS policies
- [ ] MiniPay embedded wallet detection works in test webview
- [ ] CI passes on a test PR

---

## Milestone 2: Onboarding & Design System (Week 2)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 2.1 | Design system tokens (colors, typography, spacing) in Tailwind config | FE |
| 2.2 | Core UI components: pill button, dark card, token row card, chip selector | FE |
| 2.3 | Conversational onboarding flow (6 animated questions) | FE |
| 2.4 | `POST /api/user/risk-profile` — persist answers + compute risk score | BE |
| 2.5 | `GET /api/user/risk-profile` — return profile | BE |
| 2.6 | Onboarding gate: redirect to `/app/onboarding` if `onboarding_completed = false` | FE + BE |
| 2.7 | Risk profile result screen with animated summary card | FE |

### Verification

- [ ] New user logs in → redirected to `/app/onboarding`
- [ ] Onboarding shows Q1 ("What's your name?") with text input, keyboard open on mobile
- [ ] Pressing Enter animates current Q&A upward (opacity → 0.3, y → -80) and next question slides in (y: 30 → 0)
- [ ] Chip selectors (Q2-Q4, Q6) render as tappable chips, selected chip fills with color
- [ ] Multi-select chips work for Q5 (currencies)
- [ ] After Q6, risk profile card animates in (spring scale 0.9 → 1.0)
- [ ] Risk profile (conservative/moderate/aggressive) persisted in `user_profiles` table
- [ ] Returning user skips onboarding, goes straight to `/app/home`
- [ ] Can retake onboarding from settings
- [ ] Mobile: keyboard stays open throughout, no layout shifts
- [ ] All animations run at 60fps on iPhone 13 / Pixel 7 equivalent

---

## Milestone 3: Home Page & Market Data (Week 3)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 3.1 | `GET /api/market/tokens` — returns all 15 Mento stablecoins + XAUT with price, 24h change, 7d sparkline | BE |
| 3.2 | Price fetching service: Mento SDK `getAmountOut` for stablecoin→USDC quotes | BE |
| 3.3 | Price cache layer (Redis or in-memory, 30s TTL) | BE |
| 3.4 | `token_price_snapshots` table + cron to snapshot prices every 15 min | BE |
| 3.5 | Home page UI: portfolio value hero + scrollable token list | FE |
| 3.6 | Token row card: flag, symbol, price, 24h %, mini sparkline (SVG) | FE |
| 3.7 | Token detail page (`/app/home/:token`): price chart, token info, buy button | FE |
| 3.8 | Pull-to-refresh on mobile | FE |
| 3.9 | Landing page (`/`) — Autopilot-inspired marketing page with scroll animations | FE |

### Verification

- [ ] `/api/market/tokens` returns JSON array of 16 tokens (15 Mento + XAUT), each with: `symbol`, `name`, `price_usd`, `change_24h_pct`, `sparkline_7d` (array of 7 values)
- [ ] Prices are accurate within 1% of on-chain Mento quotes
- [ ] Price cache prevents redundant RPC calls (verify with request counter)
- [ ] `token_price_snapshots` table has entries every 15 min for last 24h
- [ ] Home page loads in < 2s on 4G network (Lighthouse audit)
- [ ] Token list cards render with staggered animation (30ms per card)
- [ ] Portfolio value shows count-up animation from 0 → actual
- [ ] 24h change shows green (positive) or red (negative) with arrow icon
- [ ] Sparklines render as inline SVG, 7-day data, smooth path
- [ ] Tapping a token navigates to `/app/home/:token` with price chart
- [ ] Landing page: hero text fades in, phone mockups in horizontal carousel, stat numbers count-up on scroll
- [ ] Mobile: bottom tab nav visible with Home tab active

---

## Milestone 4: Mento Swap Integration (Week 4)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 4.1 | `packages/contracts` — Mento SDK wrapper: `getQuote()`, `buildAllowanceTx()`, `buildSwapTx()` | BE |
| 4.2 | `POST /api/trade/quote` — get swap quote (USDC/USDT → any Mento token or XAUT) | BE |
| 4.3 | `POST /api/trade/execute` — record executed swap (after on-chain confirmation) | BE |
| 4.4 | `GET /api/trade/history` — user's transaction history | BE |
| 4.5 | Swap page UI (`/app/swap`): base selector (USDC/USDT), target token picker, amount input, quote display, confirm | FE |
| 4.6 | Token selector modal: searchable, shows balances, country flags | FE |
| 4.7 | Swap confirmation flow: quote → approve allowance (if needed) → sign swap → pending → confirmed | FE |
| 4.8 | Transaction toast notifications | FE |
| 4.9 | XAUT swap support (same flow, gold icon styling) | FE + BE |

### Verification

- [ ] `POST /api/trade/quote` with `{ from: "USDC", to: "EURm", amount: "100" }` returns valid quote with `amountOut`, `rate`, `slippage`, `estimatedGas`
- [ ] Quote response time < 500ms (cached Mento quotes)
- [ ] Swap page: selecting USDC and EURm, entering 100, shows live quote
- [ ] Clicking "Swap" triggers wallet popup for allowance approval (if first time)
- [ ] After allowance, second wallet popup for swap transaction
- [ ] Transaction hash appears in toast notification as "pending"
- [ ] After on-chain confirmation (~5s), toast updates to "confirmed" with CeloScan link
- [ ] Transaction recorded in `transactions` table with correct amounts, hash, status
- [ ] `/api/trade/history` returns the new transaction
- [ ] Slippage protection: swap reverts if actual rate deviates > configured max (default 0.5%)
- [ ] XAUT swap works: USDC → XAUT, shows gold accent styling
- [ ] Token selector: typing "eur" filters to EURm, typing "gold" shows XAUT

---

## Milestone 5: AI Chat Interface & Multi-Agent Architecture (Weeks 5-6)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 5.1 | Multi-agent orchestrator service (see SPEC Section 3.7) | BE |
| 5.2 | Claude Code provider integration (`ai-sdk-provider-claude-code`) | BE |
| 5.3 | Provider registry: pluggable provider system (Claude Code now, OpenAI/Anthropic API/Gemini later) | BE |
| 5.4 | System prompt generator: builds personalized prompt from user DB data | BE |
| 5.5 | `POST /api/chat` — streaming chat endpoint with AI SDK | BE |
| 5.6 | AI tool functions: `get_quote`, `suggest_allocation`, `get_portfolio`, `setup_sip`, `get_market_data`, `get_xaut_price`, `explain_token`, `get_news_summary` | BE |
| 5.7 | Orchestrator agent: routes user intent to specialized worker agents | BE |
| 5.8 | Chat UI (`/app/chat`): message list, streaming response, typing indicator | FE |
| 5.9 | Tool result rendering: quote cards, portfolio summaries, allocation charts inline in chat | FE |
| 5.10 | Conversation management: create, list, switch, delete conversations | FE + BE |
| 5.11 | Suggested prompts for new users | FE |

### Verification

- [ ] `POST /api/chat` with `{ message: "Hello", conversationId: null }` creates new conversation and streams response
- [ ] Claude Code provider: response streams via `ai-sdk-provider-claude-code` using Claude Code subscription (no API key needed)
- [ ] Provider fallback: if Claude Code fails, falls back to configured API provider
- [ ] System prompt includes user's name, risk profile, current holdings, active SIPs
- [ ] User asks "How much EURm can I get for 500 USDC?" → AI calls `get_quote` tool → renders quote card inline
- [ ] User asks "What should I invest in?" → AI calls `suggest_allocation` → renders pie chart of recommended allocation
- [ ] User asks "Set up a monthly SIP for EURm" → AI calls `setup_sip` → shows SIP config confirmation
- [ ] User asks "What's happening in FX markets?" → AI calls `get_news_summary` → returns Yahoo Finance news digest
- [ ] Orchestrator correctly routes: swap intent → Trading Agent, portfolio question → Portfolio Agent, news → News Agent
- [ ] Streaming: tokens appear one-by-one in chat, typing indicator shows during generation
- [ ] Conversation list shows all user's chats with titles
- [ ] Switching conversations loads full message history
- [ ] Deleting conversation removes from DB and UI
- [ ] Mobile: full-screen chat, floating input bar, keyboard doesn't obscure messages

---

## Milestone 6: Yahoo Finance News Agent (Week 6)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 6.1 | `yahoo-finance2` integration: news crawler service | BE |
| 6.2 | `news_articles` table: store crawled articles (title, summary, source, url, tickers, sentiment, crawled_at) | BE |
| 6.3 | News cron job: crawl Yahoo Finance news every 30 min for relevant FX/currency/gold tickers | BE |
| 6.4 | Sentiment analysis: basic sentiment scoring on headlines (positive/negative/neutral) | BE |
| 6.5 | `GET /api/news` — return recent news, filterable by ticker/currency | BE |
| 6.6 | `GET /api/news/summary` — AI-generated summary of latest market news | BE |
| 6.7 | News Agent: specialized agent that reads from news DB and provides market context | BE |
| 6.8 | News feed section on home page (optional, below token list) | FE |
| 6.9 | News context injected into AI system prompt for informed recommendations | BE |

### Verification

- [ ] `news_articles` table populated with articles from Yahoo Finance within last 30 min
- [ ] Crawl covers tickers: EUR/USD, GBP/USD, BRL/USD, KES/USD, JPY/USD, XAU/USD (gold), and general FX news
- [ ] Each article has: `title`, `summary` (first 200 chars), `source_url`, `tickers[]`, `sentiment` (positive/negative/neutral), `published_at`, `crawled_at`
- [ ] `GET /api/news?ticker=EUR` returns EUR-related articles, sorted by recency
- [ ] `GET /api/news/summary` returns an AI-generated 3-5 sentence market summary
- [ ] News Agent responds to "What's the latest on Euro?" with relevant articles and analysis
- [ ] News context included in system prompt: "Recent market news: [top 3 headlines with sentiment]"
- [ ] AI recommendations reference news when relevant (e.g., "Given recent Euro strengthening reported by Reuters...")
- [ ] Cron doesn't duplicate articles (dedup by source URL)
- [ ] News items on home page show with headline, source, time ago, sentiment badge

---

## Milestone 7: SIP (Systematic Investment Plan) (Weeks 7-8)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 7.1 | SIP smart contract: allowance-based, executes Mento swaps on behalf of user | BE (Solidity) |
| 7.2 | Smart contract deployment to Celo testnet (Alfajores) then mainnet | BE |
| 7.3 | `POST /api/sip` — create SIP config (validates amounts, schedules next execution) | BE |
| 7.4 | `GET /api/sip` — list user's SIPs | BE |
| 7.5 | `PUT /api/sip/:id` — pause/resume/modify | BE |
| 7.6 | `DELETE /api/sip/:id` — cancel SIP, revoke allowance | BE |
| 7.7 | BullMQ cron worker: triggers SIP executions at scheduled times | BE |
| 7.8 | SIP execution: call smart contract, record transaction, update totals | BE |
| 7.9 | SIP page UI (`/app/sip`): list active/paused SIPs, create new, pause/resume/cancel | FE |
| 7.10 | SIP creation flow: select USDC/USDT → target token → amount → frequency → approve allowance → confirm | FE |
| 7.11 | SIP execution notifications (in-app toast) | FE |

### Verification

- [ ] Smart contract on Alfajores: can `execute(user, sourceToken, targetToken, amount)` when allowance exists
- [ ] Smart contract: reverts if allowance insufficient or expired
- [ ] `POST /api/sip` with `{ source: "USDC", target: "EURm", amount: "50", frequency: "weekly", dayOfWeek: 1 }` creates SIP
- [ ] `sip_configs` table has new row with `next_execution` set to next Monday
- [ ] BullMQ processes SIP job at scheduled time → calls smart contract → transaction confirmed on-chain
- [ ] `transactions` table has entry with `type: "sip"` and correct `sip_id`
- [ ] `sip_configs.total_invested` and `total_executions` incremented after execution
- [ ] `sip_configs.next_execution` updated to next scheduled time
- [ ] SIP page shows all user SIPs with status badge (active/paused)
- [ ] Pause button → sets `is_active = false`, cron skips this SIP
- [ ] Resume button → sets `is_active = true`, recalculates `next_execution`
- [ ] Cancel → revokes on-chain allowance, deletes SIP config
- [ ] Failed SIP execution (e.g., insufficient balance) → marked as failed, user notified, SIP not paused (retries next cycle)
- [ ] Mobile: SIP cards show next execution countdown, total invested, frequency badge

---

## Milestone 8: Portfolio Dashboard (Week 8-9)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 8.1 | `GET /api/portfolio` — current holdings from on-chain balances (viem multicall) | BE |
| 8.2 | `GET /api/portfolio/history` — portfolio value over time from snapshots | BE |
| 8.3 | `GET /api/portfolio/analytics` — P&L, allocation breakdown, avg buy price | BE |
| 8.4 | Portfolio snapshot cron: daily snapshot of all user portfolios | BE |
| 8.5 | Portfolio page UI: total value (count-up), allocation pie chart, P&L line chart | FE |
| 8.6 | Holdings table: per-token breakdown with amount, value, 24h change, avg buy price, unrealized P&L | FE |
| 8.7 | Transaction history: filterable list (swap/SIP), tx hash linked to CeloScan | FE |
| 8.8 | Time range selector for charts: 1W, 1M, 3M, 6M, 1Y, ALL | FE |

### Verification

- [ ] `GET /api/portfolio` returns on-chain balances for all Mento tokens + XAUT + USDC/USDT, with USD values
- [ ] Balances match actual on-chain state (verify with CeloScan for 3 random tokens)
- [ ] `GET /api/portfolio/history?range=1M` returns daily data points for last 30 days
- [ ] `GET /api/portfolio/analytics` returns: `totalValue`, `totalPnl`, `totalPnlPct`, `allocation[]`, `holdings[]` with `avgBuyPrice`, `unrealizedPnl`
- [ ] Portfolio page: total value animates from 0 on load (count-up, 600ms)
- [ ] Pie chart shows allocation with token colors and labels
- [ ] P&L chart: draw-in animation (600ms), tooltip on hover shows exact value + date
- [ ] Time range selector changes chart data with crossfade animation
- [ ] Holdings table: sortable by value, 24h change, P&L
- [ ] Transaction history: shows all swaps and SIP executions
- [ ] Each transaction row: date, type badge (swap/SIP), from → to tokens, amounts, tx hash link
- [ ] Filtering: can filter by type (swap/SIP) and by token
- [ ] Mobile: charts are touch-friendly (drag to scrub), table scrolls horizontally

---

## Milestone 9: Polish, Animations & Mobile (Weeks 10-11)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 9.1 | Full Framer Motion animation pass across all pages | FE |
| 9.2 | Page transitions (fade + slide up) | FE |
| 9.3 | Skeleton loaders for all async content | FE |
| 9.4 | Error states and empty states for all pages | FE |
| 9.5 | Mobile optimization: bottom nav, touch targets, viewport handling | FE |
| 9.6 | MiniPay embedded webview testing and fixes | FE |
| 9.7 | Performance audit: Lighthouse > 90 on all pages | FE |
| 9.8 | API rate limiting per user | BE |
| 9.9 | Error handling: graceful degradation for Mento RPC failures, LLM timeouts | BE |
| 9.10 | Input validation (zod) on all API endpoints | BE |

### Verification

- [ ] All page transitions use consistent fade + slide animation (300ms)
- [ ] All lists use staggered mount animations
- [ ] All number changes use count-up animation
- [ ] Skeleton loaders appear within 100ms of navigation (no blank screens)
- [ ] Error states: "Something went wrong" with retry button on API failures
- [ ] Empty states: illustrated + CTA (e.g., "No SIPs yet — create your first")
- [ ] Mobile Lighthouse: Performance > 90, Accessibility > 95
- [ ] Desktop Lighthouse: Performance > 95
- [ ] MiniPay: auth flow works, swaps work, no viewport overflow issues
- [ ] API: 429 returned after 60 requests/min per user
- [ ] API: zod validation errors return 400 with descriptive messages
- [ ] Mento RPC timeout: user sees "Price unavailable, try again" (not crash)
- [ ] LLM timeout: chat shows "I'm having trouble right now" with retry

---

## Milestone 10: Testing, Monitoring & Launch (Week 12)

### Deliverables

| #   | Deliverable                          | Owner    |
| --- | ------------------------------------ | -------- |
| 10.1 | E2E tests: onboarding flow, swap flow, SIP creation, chat flow | FE (Playwright) |
| 10.2 | API integration tests: all endpoints with test DB | BE (Vitest) |
| 10.3 | Smart contract tests (Hardhat/Foundry) | BE |
| 10.4 | Sentry error monitoring (FE + BE) | FE + BE |
| 10.5 | Analytics: PostHog or Mixpanel for key user flows | FE |
| 10.6 | Deployment: Vercel (web), Railway (api), Supabase (db) | BE + FE |
| 10.7 | Environment configs: staging + production | BE + FE |
| 10.8 | Domain setup + SSL | BE + FE |
| 10.9 | Final QA pass on Celo mainnet | BE + FE |

### Verification

- [ ] E2E: `pnpm test:e2e` passes — onboarding creates user, swap completes, SIP schedules, chat responds
- [ ] API tests: `pnpm test:api` passes — all 18 endpoints covered
- [ ] Smart contract tests: 100% coverage on core functions (`execute`, `revokeAllowance`)
- [ ] Sentry: test error captured and appears in dashboard within 30s
- [ ] Analytics: "onboarding_completed", "swap_executed", "sip_created", "chat_sent" events tracked
- [ ] Staging deployment: full app works on staging.autoclaw.xyz (or similar)
- [ ] Production deployment: app live on autoclaw.xyz
- [ ] Mainnet swap: successfully swap 1 USDC → USDm on Celo mainnet
- [ ] Mainnet SIP: schedule and execute one SIP cycle on mainnet
- [ ] SSL: all endpoints served over HTTPS
- [ ] No console errors in production build

---

## Summary Timeline

```
Week 1  ████████  M1: Project Scaffold & Auth
Week 2  ████████  M2: Onboarding & Design System
Week 3  ████████  M3: Home Page & Market Data
Week 4  ████████  M4: Mento Swap Integration
Week 5  ████████  M5: AI Chat & Multi-Agent (part 1)
Week 6  ████████  M5 + M6: AI Chat complete + Yahoo Finance News Agent
Week 7  ████████  M7: SIP (part 1)
Week 8  ████████  M7 + M8: SIP complete + Portfolio Dashboard (part 1)
Week 9  ████████  M8: Portfolio Dashboard complete
Week 10 ████████  M9: Polish & Mobile (part 1)
Week 11 ████████  M9: Polish & Mobile complete
Week 12 ████████  M10: Testing, Monitoring & Launch
```

---

## API Keys / Services Required

| Service                      | Key Needed                    | When Needed |
| ---------------------------- | ----------------------------- | ----------- |
| Supabase                     | URL + Anon Key + Service Key  | M1          |
| thirdweb                     | Client ID + Secret Key + Admin Private Key | M1 |
| Claude Code CLI              | `claude login` (subscription) | M5          |
| OpenAI (fallback provider)   | API Key                       | M5          |
| Anthropic (fallback provider)| API Key                       | M5          |
| Redis (BullMQ)               | Connection URL                | M3 (cache), M7 (SIP) |
| Celo RPC                     | RPC URL (public or Infura)    | M3          |
| Sentry                       | DSN                           | M10         |
| PostHog / Mixpanel           | Project Key                   | M10         |
| Domain / DNS                 | Domain name                   | M10         |

---

*Document version: 2.0 — February 8, 2026*

IMPORTANT: I want you to always usue few parallel agents to implement tasks. 