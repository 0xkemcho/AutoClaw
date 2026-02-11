# AutoClaw Pivot: Autonomous FX Trading Agent

**Date:** 2026-02-10
**Status:** Brainstorm complete

---

## What We're Building

An autonomous FX trading agent that manages a dedicated wallet and trades across Gold (XAUT) and all 15 Mento stablecoins on Celo. The user is a **passive FX investor** — they set up the agent, configure guardrails, fund the wallet, and let it run.

### Core Loop

```
Cron tick → Fetch news + prices → LLM analyzes signals → Rules engine decides trades → Execute via Turnkey wallet → Log results
```

The **LLM (via Vercel AI SDK)** handles intelligence — reading news, analyzing macro data, generating trading signals. A **deterministic rules engine** handles execution — checking guardrails, position limits, and actually pulling the trigger. This separation keeps real money safe from hallucinations.

---

## Why This Approach

### Architecture: Cron Job Agent (not persistent process)
- Passive investor persona doesn't need real-time reactions
- User-configurable frequency (hourly → daily) via cron scheduling
- Fits existing Fastify backend pattern (like the price snapshot cron)
- Predictable costs, easy to debug, simple to scale

### Wallet: Turnkey (server-side)
- Server-side wallet creation and signing — no user key management
- Agent can execute trades autonomously 24/7
- Integrates with viem via `@turnkey/viem` (`createAccount()` returns a standard viem account)
- Each user gets a Turnkey wallet created at onboarding completion

### Swap Layer: Mento Broker + viem (existing @autoclaw/contracts)
- Already have working viem-based Broker contract calls (quoting, routing, multi-hop swaps)
- Mento Broker provides oracle-anchored FX rates for ALL 15 stablecoins — better than AMM pricing
- viem supports Celo's `feeCurrency` parameter — agent can pay gas in USDm, no CELO token needed
- No Uniswap needed — Broker has liquidity for every Mento stable pair via BiPoolManager

### LLM: Vercel AI SDK (provider-agnostic)
- Start with Claude or GPT-4, swap providers without code changes
- LLM analyzes news and generates signals, does NOT make trade decisions directly
- Tool calling for structured output (sentiment scores, currency signals)

---

## Key Decisions

### 1. Trading Universe
- **Base currency:** USDm (cUSD)
- **Tradeable assets:** All 15 Mento stablecoins + XAUT (Gold)
- Agent holds USDm as default and allocates into other currencies based on signals

### 2. Decision Architecture (two-layer)
- **Layer 1 — LLM Analysis:** Reads news from free APIs (NewsAPI, CoinGecko, ECB/Fed RSS feeds). Produces structured signals: currency sentiment, confidence score, recommended direction
- **Layer 2 — Rules Engine:** Checks signals against user guardrails. Only executes if all rules pass. Deterministic, auditable, no AI in the execution path

### 3. User Guardrails (full suite)
- Max trade size (absolute $ amount)
- Max allocation per currency (% of portfolio)
- Stop-loss thresholds
- Allowed/blocked currencies
- Daily trade limit (max number of trades)
- Trading frequency (conservative=daily, moderate=4h, aggressive=hourly)
- Custom system prompt additions (user can instruct the LLM's analysis style)

### 4. Wallet & Funding
- Turnkey server-side wallet created at onboarding completion
- User funds by sending USDm, USDC, or USDT to the displayed agent wallet address
- Agent auto-converts USDC/USDT to USDm as base currency
- feeCurrency: USDm — no need for CELO token in the wallet

### 5. Onboarding Flow (updated)
- Keep existing risk questionnaire (name, experience, horizon, volatility, currencies, amount)
- After completion: create Turnkey wallet for user, store wallet address in DB
- Risk profile maps to default guardrail presets (conservative/moderate/aggressive)
- Redirect to home/dashboard showing the new agent wallet

### 6. Data Sources
- **Parallel AI Search API** — primary intelligence layer. Returns web search results with URLs, titles, publish dates, and excerpts. Agent uses this to find FX news, central bank announcements, macro analysis. Citations from results are displayed in the trade reasoning timeline.
- CoinGecko — crypto/gold price data
- Existing on-chain price data (price snapshot cron already running)

---

## UI Design

### Design Principles
- **Clean fintech** aesthetic — minimal, polished, whitespace. Think Revolut/Robinhood.
- **Responsive** — true desktop + mobile layouts, not just scaled
- **Dark theme** — already implemented in codebase

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page (keep existing, update copy for agent narrative) |
| `/onboarding` | Risk questionnaire → Turnkey wallet creation (keep + extend) |
| `/home` | Dashboard — the main screen after login |
| `/settings` | Guardrails configuration |
| `/history` | Full trade history with deep detail |

### Navigation

**Desktop:** Left sidebar (narrow, icon + label)
- Dashboard (home icon)
- Settings (sliders icon)
- History (clock icon)
- Portfolio summary at top of sidebar (total value, P&L)
- Agent pause/resume toggle at bottom of sidebar

**Mobile:** Bottom tab bar (3 tabs: Dashboard, Settings, History)
- Collapsible portfolio summary card at top of Dashboard
- Agent toggle accessible from Dashboard header

### Dashboard (`/home`) — Desktop Layout

```
┌──────────────┬─────────────────────────────────────────┐
│   SIDEBAR    │              MAIN AREA                   │
│              │                                         │
│  Portfolio   │   Agent Status Bar                      │
│  $12,450.32  │   ● Running · Next run in 2h · 14 trades│
│  +3.2% 7d   │   [Pause]                               │
│              │                                         │
│  ──────────  │   ┌─────────────────────────────────┐   │
│  📊 Dashboard│   │ Timeline Feed                    │   │
│  ⚙ Settings │   │                                   │   │
│  🕐 History │   │ 10:32 AM · TRADE                  │   │
│              │   │ Bought EURm ($240)                │   │
│  ──────────  │   │ ECB hawkish pivot signals EUR     │   │
│              │   │ strength. Confidence: 82%         │   │
│  Agent       │   │ 📎 reuters.com · 📎 ecb.europa.eu│   │
│  [● Active]  │   │                                   │   │
│              │   │ 9:15 AM · ANALYSIS                │   │
│              │   │ Scanned 12 sources, no action.    │   │
│              │   │ USD stable, no signals above      │   │
│              │   │ threshold.                        │   │
│              │   │                                   │   │
│              │   │ 8:00 AM · FUNDING                 │   │
│              │   │ Received 500 USDC → converted     │   │
│              │   │ to 499.85 USDm                    │   │
│              │   │                                   │   │
│              │   │ Yesterday · GUARDRAIL             │   │
│              │   │ Blocked BRL trade — max            │   │
│              │   │ allocation (25%) reached           │   │
│              │   └─────────────────────────────────┘   │
└──────────────┴─────────────────────────────────────────┘
```

### Dashboard — Mobile Layout

```
┌─────────────────────────────┐
│  AutoClaw          ● Active │
├─────────────────────────────┤
│  ▼ Portfolio    $12,450.32  │  ← collapsible
│    +3.2% (7d)               │
├─────────────────────────────┤
│  Next run in 2h · 14 trades │
├─────────────────────────────┤
│                             │
│  10:32 AM · TRADE           │
│  Bought EURm ($240)         │
│  ECB hawkish pivot...       │
│  📎 reuters.com             │
│                             │
│  9:15 AM · ANALYSIS         │
│  Scanned 12 sources,        │
│  no action needed.           │
│                             │
│  (scrolls...)               │
│                             │
├─────────────────────────────┤
│  🏠 Home  ⚙ Settings  🕐   │
└─────────────────────────────┘
```

### Timeline Feed Entry Types

| Type | Icon | Content |
|------|------|---------|
| **TRADE** | ↗ (green) or ↘ (red) | Currency, amount, direction, reasoning summary, confidence %, citations from Parallel AI (url + title) |
| **ANALYSIS** | 🔍 | Sources scanned count, conclusion (action/no-action), brief reasoning |
| **FUNDING** | 💰 | Token received, auto-conversion details |
| **GUARDRAIL** | 🛡 | Which rule triggered, what was blocked, current limit values |
| **SYSTEM** | ⚙ | Agent started/paused/resumed, settings changed, errors |

Each entry is expandable — tap/click to see full LLM reasoning chain and all Parallel AI citations with excerpts.

### Settings Page (`/settings`)

Form-based layout with sections:

1. **Trading Frequency** — dropdown: Conservative (daily), Moderate (every 4h), Aggressive (hourly)
2. **Risk Limits**
   - Max trade size — slider ($10 → $10,000)
   - Max allocation per currency — slider (5% → 100%)
   - Stop-loss threshold — slider (1% → 50%)
   - Daily trade limit — number input
3. **Currency Preferences**
   - Allowed currencies — checkbox grid of all 15 Mento stables + XAUT
   - Blocked currencies — toggle to block specific ones
4. **Agent Instructions** — textarea for custom system prompt additions
   - Placeholder: "e.g. Be conservative with emerging market currencies. Prioritize EUR and GBP."
5. **Wallet**
   - Agent wallet address (copy button)
   - Accepted tokens: USDm, USDC, USDT
   - Withdraw button → sends funds back to connected wallet

### History Page (`/history`)

Full trade log with filters:
- Filter by: type (trade/analysis/all), currency, date range
- Each entry shows full detail by default (not collapsed like dashboard)
- Export as CSV option
- Pagination

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Dashboard │ │ Settings │ │ History  │ │ Onboarding│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────┴────────────────────────────────┐
│  Backend (Fastify)                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Auth Routes   │  │ User Routes  │  │ Agent Routes  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Agent Cron Service                                  │ │
│  │ ┌─────────────┐ ┌──────────┐ ┌──────────────────┐  │ │
│  │ │ Data Fetch   │ │ LLM      │ │ Rules Engine     │  │ │
│  │ │ (news+prices)│ │ Analysis │ │ (guardrails+exec)│  │ │
│  │ └─────────────┘ └──────────┘ └──────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Turnkey      │  │ Mento Broker │  │ Vercel AI SDK │  │
│  │ (wallet+sign)│  │ (swap via    │  │ (LLM calls)   │  │
│  │              │  │  viem)       │  │               │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │  Supabase           │
              │  (users, trades,    │
              │   conversations,    │
              │   portfolio, news)  │
              └─────────────────────┘
```

---

## Open Questions

1. **XAUT address:** Current codebase has `0x000...000` placeholder for Gold. Need real Tether Gold address on Celo — is it available on Mento Broker or only Uniswap?
2. **Turnkey pricing:** Server-side wallet creation at scale — need to check Turnkey's pricing model for production
3. **Multi-user cron scaling:** With many users on different frequencies, do we run one master cron that iterates users, or spawn per-user jobs?
4. **Parallel AI pricing:** Need to check API costs at the volume we'd need (multiple searches per agent run, per user)

---

## Future Scope (explicitly NOT building now)

- **ERC-8004 / x402** — Payment protocol integration (user mentioned for future)
- **Fiat on-ramp** — MoonPay/Transak integration for direct card funding
- **Social trading** — Copy other agents' strategies
- **SIP (Systematic Investment Plans)** — DB schema exists, not in scope
- **Chat interface** — DB schema for conversations exists, not in scope for MVP
