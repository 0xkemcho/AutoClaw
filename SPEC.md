# AutoClaw - Product Specification

## 1. Overview

**AutoClaw** is an AI-powered FX investment platform built on the Celo blockchain. It provides personalized foreign exchange (FX) token recommendations based on user risk profiles, enables direct swaps via the Mento protocol using USDC/USDT as base currencies, supports recurring investments (SIP), and includes Tether Gold (XAUT) as a commodity hedge. Users interact with the platform through a conversational AI chat interface powered by Vercel AI SDK.

**Key value prop:** Buy any Mento stablecoin (USDm, EURm, BRLm, KESm, etc.) from USDC or USDT in one tap, with AI-personalized allocation recommendations.

---

## 2. Architecture

### 2.1 Monorepo Structure

```
autoclaw/
├── apps/
│   ├── web/                  # Next.js 15 frontend (App Router)
│   └── api/                  # Node.js + TypeScript backend (Fastify)
├── packages/
│   ├── shared/               # Shared types, constants, utils
│   ├── db/                   # Supabase client, queries, migrations
│   └── contracts/            # ABIs, contract addresses, Mento SDK helpers
├── turbo.json
├── package.json
└── tsconfig.base.json
```

**Tooling:** Turborepo for monorepo management, pnpm as package manager.

### 2.2 Tech Stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Animations   | Framer Motion                                                 |
| Backend      | Node.js, TypeScript, Fastify                                  |
| Database     | Supabase (PostgreSQL + Realtime + Edge Functions)             |
| LLM          | Vercel AI SDK + `ai-sdk-provider-claude-code` (primary), OpenAI/Anthropic/Gemini (fallback) |
| AI Agents    | Multi-agent orchestrator pattern (AI SDK workflow)            |
| News Data    | `yahoo-finance2` (Yahoo Finance crawling)                     |
| Blockchain   | Celo (thirdweb + viem), Mento SDK (`@mento-protocol/mento-sdk`) |
| Auth         | thirdweb v5 (wallet + social login + in-app wallets + MiniPay) |
| Cron/Jobs    | Bull MQ + Redis (for SIP scheduling)                          |
| Deployment   | Vercel (frontend), Railway/Render (backend), Supabase (DB)    |

### 2.3 High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                          Frontend                            │
│                Next.js 15 + Tailwind + Framer                │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Auth/    │  │ Home     │  │ Chat      │  │ Portfolio  │  │
│  │ Onboard  │  │ (Tokens) │  │ Interface │  │ Dashboard  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └─────┬──────┘  │
│       │              │              │              │          │
└───────┼──────────────┼──────────────┼──────────────┼─────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                        API Backend                           │
│                Node.js + TypeScript + Fastify                 │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐                │
│  │ Auth     │  │ AI Chat   │  │ Portfolio  │                │
│  │ Service  │  │ Service   │  │ Service    │                │
│  └──────────┘  └───────────┘  └────────────┘                │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐                │
│  │ Mento    │  │ SIP Cron  │  │ Risk       │                │
│  │ Swap     │  │ Service   │  │ Engine     │                │
│  └──────────┘  └───────────┘  └────────────┘                │
│  ┌──────────────────────────┐                                │
│  │ Market Data Service      │  ← token prices, 24h changes  │
│  └──────────────────────────┘                                │
│                                                              │
└──────────────┬────────────┬──────────────────────────────────┘
               │            │
        ┌──────▼──────┐  ┌──▼───────────────┐
        │  Supabase   │  │  Celo Blockchain  │
        │  (Postgres) │  │  (Mento Protocol) │
        └─────────────┘  └──────────────────┘
```

---

## 3. Features

### 3.1 Authentication & Onboarding

**Auth Provider:** thirdweb

- **Wallet connect:** MetaMask, WalletConnect, Coinbase Wallet
- **Social login:** Google, Email, Apple, Passkey (via thirdweb in-app wallets)
- **In-app wallets:** Auto-created for social login users (every user gets a wallet address)
- **Embedded wallet:** MiniPay / Opera Mini support
- On first login, user is routed to the **Conversational Onboarding Flow**

**thirdweb Integration:**

```typescript
// Frontend — providers/thirdweb-provider.tsx
'use client';
import { ThirdwebProvider } from 'thirdweb/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
```

```typescript
// Frontend — ConnectButton usage
import { ConnectButton } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
import { inAppWallet, createWallet } from 'thirdweb/wallets';

const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });

const wallets = [
  inAppWallet({ auth: { options: ['email', 'google', 'apple', 'passkey'] } }),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('walletConnect'),
];

<ConnectButton client={client} wallets={wallets} chain={celo} />
```

```typescript
// Backend — thirdweb auth verification (SIWE)
import { createThirdwebClient } from 'thirdweb';
import { createAuth } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';

const client = createThirdwebClient({ secretKey: process.env.THIRDWEB_SECRET_KEY! });
const thirdwebAuth = createAuth({
  domain: process.env.AUTH_DOMAIN!,
  client,
  adminAccount: privateKeyToAccount({ client, privateKey: process.env.THIRDWEB_ADMIN_PRIVATE_KEY! }),
});

// Verify JWT on protected routes
const { valid, parsedJWT } = await thirdwebAuth.verifyJWT({ jwt });
const walletAddress = parsedJWT.sub; // user's wallet address
```

**Conversational Onboarding Flow (Autopilot-Inspired):**

Design inspired by Autopilot's onboarding — a super-minimal, one-question-at-a-time experience that feels like a conversation, not a form.

**UX Pattern:**

1. Full-screen white page, vertically centered content
2. One question displayed as large, bold text (24-32px)
3. Answer input appears on the next line directly below the question
4. Keyboard is always open on mobile — user can type immediately
5. On pressing Enter/Return:
   - Current Q&A pair animates upward and fades to muted text
   - Next question slides in from below with a subtle fade
   - Input auto-focuses for the next answer
6. Previous answers remain visible above (scrolled up, dimmed) for context
7. No buttons, no progress bars, no chrome — just question and answer
8. Final screen: animated summary card showing their risk profile result

**Onboarding Questions (in order):**

```
Q1: "What's your name?"
    → Free text input

Q2: "How would you describe your investment experience?"
    → Chip selector: "Beginner" | "Some experience" | "Advanced"

Q3: "What's your investment horizon?"
    → Chip selector: "< 6 months" | "6-24 months" | "2+ years"

Q4: "How would you react if your portfolio dropped 20% in a week?"
    → Chip selector: "Sell everything" | "Hold and wait" | "Buy more"

Q5: "Which currencies interest you most?"
    → Multi-select chips: "USD" | "EUR" | "GBP" | "BRL" | "KES" | "JPY" | "Gold" | "All"

Q6: "How much are you planning to invest?"
    → Chip selector: "< $100" | "$100-$1,000" | "$1,000-$10,000" | "$10,000+"
```

**Animation Spec (Framer Motion):**

```typescript
// Question entering
const questionEnter = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
};

// Answered Q&A scrolling up
const answeredScroll = {
  animate: { y: -80, opacity: 0.3 },
  transition: { duration: 0.35, ease: "easeOut" }
};

// Final profile card reveal
const profileReveal = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring", stiffness: 200, damping: 20 }
};
```

**Output:**

- Produces a **risk profile**: `conservative` | `moderate` | `aggressive`
- Stored in Supabase `user_profiles` table along with raw answers
- Can be retaken from settings (same conversational flow)

### 3.2 Home Page (Token List + 24h P&L)

The home page is the first screen after authentication. It provides a market overview of all supported Mento stablecoins and XAUT, similar to the Autopilot marketplace landing.

**Layout (Autopilot-Inspired):**

- Clean white background, minimal header with logo + user avatar
- Hero section: user's total portfolio value with 24h change (count-up animation)
- Below: scrollable token list as cards

**Token List Cards:**

Each token is displayed as a row/card showing:

```
┌─────────────────────────────────────────────────┐
│  🇺🇸  USDm          $1.00      +0.01%  ↗       │
│      US Dollar       $21.3M supply              │
├─────────────────────────────────────────────────┤
│  🇪🇺  EURm          $1.08      -0.12%  ↘       │
│      Euro            $3.6M supply               │
├─────────────────────────────────────────────────┤
│  🇧🇷  BRLm          $0.17      +0.34%  ↗       │
│      Brazilian Real   ...                       │
├─────────────────────────────────────────────────┤
│  🥇  XAUT           $2,847     +1.2%   ↗       │
│      Tether Gold     ...                        │
└─────────────────────────────────────────────────┘
```

**Card contents:**

- Country flag emoji / gold icon for XAUT
- Token symbol (USDm, EURm, etc.)
- Current price in USD
- 24h price change (% with color: green positive, red negative)
- Mini sparkline chart (7-day, 48px wide)
- Tap to navigate to token detail / swap page

**Data Source:**

- Token prices from Mento SDK `getAmountOut` quotes (1 token → USDC) or oracle
- 24h change calculated from cached price snapshots
- Supply data from on-chain token contracts

**API Endpoint:** `GET /api/market/tokens` — returns all tokens with price, 24h change, 7d sparkline data

### 3.3 AI Chat Interface

**Stack:** Vercel AI SDK with multi-provider support

**Primary Provider:** `ai-sdk-provider-claude-code` — uses Claude Code subscription (Pro/Max), no API key needed.

```typescript
import { claudeCode } from 'ai-sdk-provider-claude-code';
import { streamText } from 'ai';

const result = streamText({
  model: claudeCode('sonnet'),  // uses Claude Code subscription
  system: generatedSystemPrompt,
  messages: conversationHistory,
  tools: agentTools,
});
```

**Fallback Providers (configurable, for when Claude Code CLI is unavailable):**

- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic API (Claude Sonnet, Claude Haiku)
- Google (Gemini 2.0 Flash, Gemini Pro)

**Provider Registry (pluggable architecture):**

```typescript
// Provider registry — add new providers without changing core logic
interface LLMProvider {
  id: string;
  name: string;
  createModel(modelId: string): LanguageModel;
  isAvailable(): Promise<boolean>;
}

const providers: LLMProvider[] = [
  new ClaudeCodeProvider(),   // Primary — uses subscription
  new AnthropicAPIProvider(), // Fallback 1
  new OpenAIProvider(),       // Fallback 2
  new GoogleProvider(),       // Fallback 3
];

// Resolves the first available provider
async function resolveProvider(): Promise<LLMProvider> {
  for (const provider of providers) {
    if (await provider.isAvailable()) return provider;
  }
  throw new Error("No LLM provider available");
}
```

**System Prompt Generation:**

1. User opens a new chat
2. Backend receives `user_address` + `user_id`
3. Backend queries Supabase for:
   - User risk profile
   - Current portfolio holdings
   - Transaction history
   - SIP configurations
   - Preferred currencies
   - Latest Yahoo Finance news summaries (from `news_articles` table)
4. Generates a **personalized system prompt** containing:
   - User's risk category and constraints
   - Current holdings summary
   - Available Mento stablecoins and rates
   - XAUT pricing data
   - Recent market news digest (top 5 headlines with sentiment)
   - Allowed operations (swap, SIP setup, portfolio query)
5. System prompt is injected into every new chat session

**Chat Features:**

- Streaming responses (via AI SDK `streamText`)
- Tool calling (AI can suggest swaps, show portfolio, set up SIP)
- Message history persisted to Supabase
- Conversation threading (multiple chats per user)
- Suggested prompts for new users

**AI Tool Functions (via AI SDK `tools`):**

| Tool                  | Description                                        |
| --------------------- | -------------------------------------------------- |
| `get_quote`           | Get Mento swap quote for a token pair              |
| `suggest_allocation`  | Suggest FX allocation based on risk profile        |
| `get_portfolio`       | Return current portfolio holdings and value        |
| `setup_sip`           | Configure a recurring investment plan              |
| `get_market_data`     | Fetch current exchange rates for supported tokens  |
| `get_xaut_price`      | Fetch current Tether Gold price                    |
| `explain_token`       | Explain what a specific stablecoin/token represents|
| `get_news_summary`    | Get latest FX/gold market news from Yahoo Finance  |
| `get_news_by_ticker`  | Get news for a specific currency/ticker            |

### 3.4 FX Token Trading (Mento Swaps)

**Base Currencies (what users deposit/hold):**

| Token | Description                    |
| ----- | ------------------------------ |
| USDC  | Circle USD (bridged to Celo)   |
| USDT  | Tether USD (bridged to Celo)   |

Users swap FROM USDC/USDT INTO Mento stablecoins. These are the entry points.

**Supported Mento Stablecoins (new naming convention — `[currency]m`):**

| Token | Pegged To              | Old Name |
| ----- | ---------------------- | -------- |
| USDm  | US Dollar              | cUSD     |
| EURm  | Euro                   | cEUR     |
| BRLm  | Brazilian Real         | cREAL    |
| KESm  | Kenyan Shilling        | cKES     |
| PHPm  | Philippine Peso        | PUSO     |
| COPm  | Colombian Peso         | —        |
| XOFm  | West African CFA Franc | eXOF     |
| NGNm  | Nigerian Naira         | —        |
| JPYm  | Japanese Yen           | —        |
| CHFm  | Swiss Franc            | —        |
| ZARm  | South African Rand     | —        |
| GBPm  | British Pound          | —        |
| AUDm  | Australian Dollar      | —        |
| CADm  | Canadian Dollar        | —        |
| GHSm  | Ghanaian Cedi          | —        |

**Additional Asset:**

| Token | Description            |
| ----- | ---------------------- |
| XAUT  | Tether Gold (1 oz)     |

**Mento SDK Integration:**

```typescript
import { Mento } from "@mento-protocol/mento-sdk";

// Initialize with a signer (from user's wallet via wagmi)
const mento = await Mento.create(signer);

// Get quote: how much EURm for 100 USDC?
const amountIn = parseUnits("100", 6); // USDC has 6 decimals
const quoteOut = await mento.getAmountOut(
  USDC_ADDRESS,
  EURm_ADDRESS,
  amountIn
);

// Approve trading allowance
const allowanceTx = await mento.increaseTradingAllowance(
  USDC_ADDRESS,
  amountIn
);
await signer.sendTransaction(allowanceTx);

// Execute swap with 1% slippage tolerance
const minOut = quoteOut.mul(99).div(100);
const swapTx = await mento.swapIn(
  USDC_ADDRESS,
  EURm_ADDRESS,
  amountIn,
  minOut
);
await signer.sendTransaction(swapTx);
```

**Swap Flow (Non-Custodial):**

1. User selects base currency (USDC or USDT) and target token (e.g., EURm)
2. Backend calls `mento.getAmountOut()` for a real-time quote
3. Frontend displays quote with:
   - Input/output amounts
   - Exchange rate
   - Slippage estimate (configurable, default 0.5%)
   - Network fee estimate
4. User confirms → frontend calls `mento.increaseTradingAllowance()` (if needed)
5. User signs the swap transaction via their wallet
6. Transaction is submitted to Celo network
7. Backend listens for confirmation and updates portfolio in Supabase

**Personalized Recommendations:**

Based on risk profile:

- **Conservative:** Higher allocation to USDm/EURm/CHFm, XAUT as hedge, stick to major currencies
- **Moderate:** Balanced mix across stablecoins, moderate XAUT, some regional diversification (GBPm, JPYm, AUDm)
- **Aggressive:** Broader exposure including KESm, NGNm, PHPm, XOFm; higher allocation shifts; active rebalancing suggestions

### 3.5 Tether Gold (XAUT)

- XAUT is officially available on Celo
- Treated as a commodity hedge / store-of-value option
- Buy with USDC/USDT via Mento SDK or DEX aggregator
- AI recommends XAUT allocation based on risk profile:
  - Conservative: 10-20% portfolio
  - Moderate: 5-15% portfolio
  - Aggressive: 0-10% portfolio
- Display current gold price (oz) alongside XAUT price
- Show XAUT performance chart (1W, 1M, 3M, 6M, 1Y)

### 3.6 SIP (Systematic Investment Plan)

**Frequency Options:**

- Daily
- Weekly (configurable day of week)
- Monthly (configurable day of month)

**SIP Configuration:**

```typescript
interface SIPConfig {
  id: string;
  userId: string;
  sourceToken: string;       // e.g., "USDC" or "USDT"
  targetToken: string;       // e.g., "EURm", "KESm", "XAUT"
  amount: string;            // Amount in source token per interval
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;        // 0-6 for weekly
  dayOfMonth?: number;       // 1-28 for monthly
  isActive: boolean;
  nextExecution: Date;
  createdAt: Date;
}
```

**Execution Model (Non-Custodial with Allowance):**

1. User sets up SIP via chat or SIP UI
2. User approves a token allowance to the AutoClaw SIP smart contract
3. Backend cron job (BullMQ + Redis) triggers at scheduled time
4. Smart contract executes the swap on behalf of the user using the approved allowance
5. User can revoke allowance or pause/cancel SIP at any time
6. Notifications sent after each SIP execution (in-app + optional push)

**SIP Dashboard:**

- List of active/paused SIPs
- Next execution date/time
- Total invested per SIP
- Performance since inception
- Quick pause/resume/cancel actions

### 3.7 Portfolio Dashboard

**Components:**

- **Total Portfolio Value:** Aggregated USD value of all holdings
- **Allocation Pie Chart:** Visual breakdown by token
- **P&L Chart:** Line chart showing portfolio value over time (1W, 1M, 3M, 6M, 1Y, ALL)
- **Holdings Table:** Per-token breakdown with:
  - Token name and icon
  - Amount held
  - Current value (USD)
  - 24h change (%)
  - Average buy price
  - Unrealized P&L
- **Transaction History:** Filterable list of all swaps, SIP executions
  - Date, type (swap/SIP), tokens, amounts, tx hash (linked to CeloScan)

**Data Source:** On-chain balances (via viem) + Supabase transaction records

### 3.8 Multi-Agent Architecture

AutoClaw uses an **orchestrator-worker** multi-agent pattern powered by Vercel AI SDK. The orchestrator routes user intent to specialized worker agents, each optimized for a specific domain.

**Architecture:**

```
                         User Message
                              │
                              ▼
                    ┌───────────────────┐
                    │   Orchestrator    │
                    │   Agent           │
                    │ (intent routing)  │
                    └──────┬────────────┘
                           │
              ┌────────────┼────────────┬──────────────┐
              ▼            ▼            ▼              ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Trading  │ │ Portfolio│ │ News     │ │ General  │
        │ Agent    │ │ Agent    │ │ Agent    │ │ Agent    │
        └──────────┘ └──────────┘ └──────────┘ └──────────┘
              │            │            │              │
              ▼            ▼            ▼              ▼
        Mento SDK    On-chain +    Yahoo Finance   Education,
        Quotes &     Supabase      News DB         Explanations
        Swaps        Portfolio                      Risk Guidance
```

**Orchestrator Agent:**

- Receives every user message
- Classifies intent: `trading` | `portfolio` | `news` | `general`
- Delegates to the appropriate worker agent
- Merges worker responses into a coherent reply
- Maintains conversation context across agent switches

**Worker Agents:**

| Agent           | Responsibilities                                             | Tools                                              |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Trading Agent   | Swap quotes, execution, allocation suggestions, SIP setup    | `get_quote`, `suggest_allocation`, `setup_sip`     |
| Portfolio Agent | Holdings, P&L, transaction history, performance analysis     | `get_portfolio`, `get_market_data`                  |
| News Agent      | Market news, sentiment analysis, currency-specific updates   | `get_news_summary`, `get_news_by_ticker`           |
| General Agent   | Token explanations, risk education, onboarding help          | `explain_token`, `get_xaut_price`                  |

**Implementation (AI SDK Orchestrator Pattern):**

```typescript
import { streamText, tool } from 'ai';
import { claudeCode } from 'ai-sdk-provider-claude-code';
import { z } from 'zod';

// Orchestrator delegates to specialized workers
const orchestratorTools = {
  routeToTrading: tool({
    description: 'Route to Trading Agent for swap quotes, buy/sell, allocation suggestions, SIP setup',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const result = await streamText({
        model: resolveModel(),
        system: tradingAgentPrompt,
        prompt: query,
        tools: tradingTools,
      });
      return result.text;
    },
  }),
  routeToPortfolio: tool({
    description: 'Route to Portfolio Agent for holdings, P&L, transaction history',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const result = await streamText({
        model: resolveModel(),
        system: portfolioAgentPrompt,
        prompt: query,
        tools: portfolioTools,
      });
      return result.text;
    },
  }),
  routeToNews: tool({
    description: 'Route to News Agent for market news, sentiment, currency updates',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const result = await streamText({
        model: resolveModel(),
        system: newsAgentPrompt,
        prompt: query,
        tools: newsTools,
      });
      return result.text;
    },
  }),
};

// Main chat handler
async function handleChat(messages, systemPrompt) {
  return streamText({
    model: claudeCode('sonnet'),
    system: systemPrompt, // includes user context + orchestrator instructions
    messages,
    tools: { ...orchestratorTools, ...generalTools },
    maxSteps: 5, // allow multi-step agent reasoning
  });
}
```

**Provider Abstraction (future-proof):**

```typescript
// resolveModel() returns the best available model
function resolveModel(): LanguageModel {
  // Priority: Claude Code (subscription) → Anthropic API → OpenAI → Gemini
  if (isClaudeCodeAvailable()) return claudeCode('sonnet');
  if (process.env.ANTHROPIC_API_KEY) return anthropic('claude-sonnet-4-5-20250929');
  if (process.env.OPENAI_API_KEY) return openai('gpt-4o');
  return google('gemini-2.0-flash');
}
```

### 3.9 Yahoo Finance News Agent

A background crawling agent that fetches FX and gold market news from Yahoo Finance, stores it in the database, and makes it available to other agents for informed recommendations.

**Data Source:** `yahoo-finance2` npm package (unofficial Yahoo Finance API for Node.js)

```typescript
import yahooFinance from 'yahoo-finance2';

// Fetch news for FX and gold tickers
const news = await yahooFinance.search('EURUSD=X', { newsCount: 10 });
const goldNews = await yahooFinance.search('GC=F', { newsCount: 10 });
```

**Crawl Targets (tickers):**

| Ticker     | Description         |
| ---------- | ------------------- |
| EURUSD=X   | Euro / USD          |
| GBPUSD=X   | British Pound / USD |
| BRLUSD=X   | Brazilian Real / USD|
| JPYUSD=X   | Japanese Yen / USD  |
| KESUSD=X   | Kenyan Shilling / USD|
| ZARUSD=X   | South African Rand / USD |
| NGNUSD=X   | Nigerian Naira / USD|
| GC=F       | Gold Futures        |
| DX-Y.NYB   | US Dollar Index     |

Plus general search terms: "emerging market currencies", "forex news", "gold price"

**Cron Schedule:** Every 30 minutes via BullMQ repeatable job

**Pipeline:**

1. Cron triggers → fetch news for each ticker via `yahoo-finance2`
2. Deduplicate by `source_url` (skip if already in DB)
3. Extract: title, summary (first 200 chars of content), source URL, published date
4. Run basic sentiment analysis on headline:
   - Keyword-based for speed: positive words (rally, surge, gain, bullish) vs negative (crash, drop, fall, bearish)
   - Score: `positive` | `negative` | `neutral`
5. Tag with relevant Mento tokens (EURUSD → EURm, GC=F → XAUT, etc.)
6. Insert into `news_articles` table
7. Prune articles older than 7 days

**Database Table:**

```sql
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT UNIQUE NOT NULL,        -- dedup key
  source_name TEXT,                        -- "Reuters", "Bloomberg", etc.
  tickers TEXT[],                          -- ["EURUSD=X"]
  related_tokens TEXT[],                   -- ["EURm", "USDm"]
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_tokens ON news_articles USING GIN (related_tokens);
CREATE INDEX idx_news_published ON news_articles (published_at DESC);
```

**API Endpoints:**

| Method | Endpoint              | Description                                   |
| ------ | --------------------- | --------------------------------------------- |
| GET    | `/api/news`           | Recent news, filterable by `?token=EURm`      |
| GET    | `/api/news/summary`   | AI-generated 3-5 sentence market digest       |

**Integration with AI Agents:**

- News Agent reads from `news_articles` table to answer market questions
- System prompt includes top 5 recent headlines with sentiment for context
- Trading Agent can reference news when making allocation recommendations
- Example: "Euro is strengthening (based on 3 positive articles today) — might be a good time to increase EURm allocation"

---

## 4. Database Schema (Supabase / PostgreSQL)

```sql
-- User profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  auth_method TEXT,                     -- 'wallet', 'email', 'google', 'apple', 'passkey'
  risk_profile TEXT CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
  risk_answers JSONB,                    -- Raw questionnaire responses
  preferred_currencies TEXT[],
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  title TEXT,
  system_prompt TEXT,                     -- Generated system prompt for this chat
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  tool_calls JSONB,                       -- AI SDK tool call data
  tool_results JSONB,                     -- Tool execution results
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction records
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  type TEXT CHECK (type IN ('swap', 'sip')),
  source_token TEXT NOT NULL,
  target_token TEXT NOT NULL,
  source_amount NUMERIC NOT NULL,
  target_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC,
  tx_hash TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')),
  sip_id UUID REFERENCES sip_configs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIP configurations
CREATE TABLE sip_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  source_token TEXT NOT NULL,
  target_token TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INT,
  day_of_month INT,
  is_active BOOLEAN DEFAULT TRUE,
  allowance_tx_hash TEXT,
  next_execution TIMESTAMPTZ,
  total_invested NUMERIC DEFAULT 0,
  total_executions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio snapshots (for P&L charts)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  total_value_usd NUMERIC,
  holdings JSONB,                         -- { "USDm": "100", "EURm": "50", "XAUT": "0.5", ... }
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token price snapshots (for 24h change, sparklines)
CREATE TABLE token_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_symbol TEXT NOT NULL,              -- "USDm", "EURm", "XAUT", etc.
  price_usd NUMERIC NOT NULL,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_snapshots_token ON token_price_snapshots (token_symbol, snapshot_at DESC);

-- Yahoo Finance news articles (see Section 3.9 for full schema)
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT UNIQUE NOT NULL,
  source_name TEXT,
  tickers TEXT[],
  related_tokens TEXT[],
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_tokens ON news_articles USING GIN (related_tokens);
CREATE INDEX idx_news_published ON news_articles (published_at DESC);
```

---

## 5. API Endpoints

### 5.1 Auth

| Method | Endpoint              | Description                  |
| ------ | --------------------- | ---------------------------- |
| POST   | `/api/auth/payload`   | Generate SIWE login payload    |
| POST   | `/api/auth/login`     | Verify signature, issue JWT    |
| POST   | `/api/auth/logout`    | Clear session                  |
| GET    | `/api/auth/me`        | Get current user profile     |

### 5.2 User

| Method | Endpoint                     | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| POST   | `/api/user/risk-profile`     | Submit risk questionnaire answers    |
| GET    | `/api/user/risk-profile`     | Get current risk profile             |
| PUT    | `/api/user/preferences`      | Update currency preferences          |

### 5.3 Chat

| Method | Endpoint                          | Description                         |
| ------ | --------------------------------- | ----------------------------------- |
| POST   | `/api/chat`                       | Send message (AI SDK streaming)     |
| GET    | `/api/chat/conversations`         | List user's conversations           |
| GET    | `/api/chat/conversations/:id`     | Get conversation with messages      |
| DELETE | `/api/chat/conversations/:id`     | Delete a conversation               |

### 5.4 Trading

| Method | Endpoint                  | Description                        |
| ------ | ------------------------- | ---------------------------------- |
| POST   | `/api/trade/quote`        | Get Mento swap quote               |
| POST   | `/api/trade/execute`      | Record executed swap               |
| GET    | `/api/trade/history`      | Get transaction history            |

### 5.5 SIP

| Method | Endpoint              | Description                        |
| ------ | --------------------- | ---------------------------------- |
| POST   | `/api/sip`            | Create new SIP configuration       |
| GET    | `/api/sip`            | List user's SIPs                   |
| PUT    | `/api/sip/:id`        | Update SIP (pause/resume/modify)   |
| DELETE | `/api/sip/:id`        | Cancel and remove SIP              |

### 5.6 Portfolio

| Method | Endpoint                    | Description                       |
| ------ | --------------------------- | --------------------------------- |
| GET    | `/api/portfolio`            | Get current holdings + values     |
| GET    | `/api/portfolio/history`    | Get portfolio value over time     |
| GET    | `/api/portfolio/analytics`  | Get P&L, allocation breakdown     |

### 5.7 Market Data

| Method | Endpoint                | Description                                              |
| ------ | ----------------------- | -------------------------------------------------------- |
| GET    | `/api/market/tokens`    | All tokens with price, 24h change, 7d sparkline data     |
| GET    | `/api/market/rates`     | Current exchange rates (all token pairs vs USDC)         |
| GET    | `/api/market/xaut`      | XAUT/gold price data                                     |

### 5.8 News

| Method | Endpoint                | Description                                              |
| ------ | ----------------------- | -------------------------------------------------------- |
| GET    | `/api/news`             | Recent news articles, filterable by `?token=EURm`        |
| GET    | `/api/news/summary`     | AI-generated market news digest (3-5 sentences)          |

---

## 6. Frontend Pages & Routes

```
/                           → Landing page (marketing)
/app                        → Main app layout (authenticated)
/app/onboarding             → Conversational risk questionnaire (first-time users)
/app/home                   → Home page — token list with 24h P&L (default view)
/app/home/:token            → Token detail page (price chart, buy/sell, info)
/app/chat                   → AI chat interface
/app/chat/:conversationId   → Specific conversation
/app/swap                   → Manual swap interface (USDC/USDT → any Mento token)
/app/sip                    → SIP management dashboard
/app/portfolio              → Portfolio dashboard + analytics
/app/settings               → User settings, retake risk quiz, preferences
```

---

## 7. UI/UX Design System

### 7.1 Design Inspiration

Inspired by Autopilot (joinautopilot.com / marketplace.joinautopilot.com):

- **Clean, light theme** with pure white backgrounds — massive whitespace
- **Premium typography** — large bold headlines (40-60px), tight letter-spacing (-0.5px)
- **Ultra-minimal aesthetic** — no visual clutter, no decorative elements, content speaks
- **Black primary CTA buttons** with white text (pill-shaped, like Autopilot's "Get Autopilot" / "Explore Portfolios" buttons)
- **Card-based layouts** — phone mockup style cards for showcasing features, subtle rounded corners (16-20px radius)
- **Staggered scroll animations** — content fades/slides in as you scroll, each section reveals independently
- **Dark card accent sections** — key data cards use dark (#1A1A1A) backgrounds with white text (like Autopilot's portfolio value cards and performance sections)
- **Horizontal scrolling carousels** — for token cards on home, phone mockups on landing
- **Stat highlights** — large bold numbers with descriptive text below, centered, generous vertical spacing (like Autopilot's "$1 billion invested" sections)

### 7.2 Color Palette

```
Background:      #FFFFFF (primary), #F5F5F5 (secondary sections), #FAFAFA (cards)
Text:            #0A0A0A (primary), #656565 (secondary), #9B9B9B (muted/dimmed)
CTA Primary:     #0A0A0A (black pill buttons — Autopilot style)
CTA Hover:       #333333
CTA Text:        #FFFFFF
Dark Cards:      #1A1A1A (dark feature cards, portfolio value cards)
Dark Card Text:  #FFFFFF
Accent:          #4F46E5 (indigo-600, links and interactive highlights)
Success/Gain:    #10B981 (emerald-500, positive P&L)
Error/Loss:      #EF4444 (red-500, negative P&L)
Warning:         #F59E0B (amber-500)
Gold (XAUT):     #D4A017 (gold accent for Tether Gold sections)
Border:          #E5E7EB (gray-200, very subtle)
```

### 7.3 Typography

- **Primary font:** Inter (clean, modern, excellent for financial data)
- **Monospace (numbers/data):** JetBrains Mono
- **Headings:** Inter, 600-700 weight, -0.5px letter-spacing
- **Body:** Inter, 400 weight, 16px base

### 7.4 Animation Guidelines (Framer Motion)

All animations should be **subtle, purposeful, and performant.** Inspired by Autopilot's scroll-triggered reveals and smooth transitions.

**Global Animations:**

| Element              | Animation                                          | Duration |
| -------------------- | -------------------------------------------------- | -------- |
| Page transitions     | Fade + slide up (y: 10 → 0, opacity: 0 → 1)       | 300ms    |
| Cards (on mount)     | Staggered fade-in (stagger: 50ms per child)        | 200ms    |
| Chat messages        | Slide in from bottom + fade                         | 200ms    |
| Buttons (hover)      | Scale 1.02 + shadow elevation                       | 150ms    |
| Modal/sheets         | Backdrop fade + content slide up                     | 250ms    |
| Number changes       | Count-up animation (e.g., portfolio value)           | 400ms    |
| Tab switches         | Underline slide + content crossfade                  | 200ms    |
| Skeleton loaders     | Pulse shimmer                                        | 1500ms   |
| Toast notifications  | Slide in from top-right + auto-dismiss               | 300ms    |
| Charts               | Draw-in animation (path reveal)                      | 600ms    |
| Token icons          | Subtle bounce on swap confirm                        | 300ms    |

**Onboarding-Specific Animations:**

| Element                  | Animation                                           | Duration |
| ------------------------ | --------------------------------------------------- | -------- |
| Question appear          | Slide up from y:30, fade in                          | 400ms    |
| Answered Q&A scroll up   | Translate y:-80, fade to 30% opacity                 | 350ms    |
| Input field focus        | Subtle bottom-border glow                            | 200ms    |
| Chip selectors appear    | Staggered scale-in (stagger: 40ms)                   | 250ms    |
| Chip select feedback     | Scale 0.95 → 1.0, background fill                    | 150ms    |
| Final profile card       | Spring scale 0.9 → 1.0 + fade                        | 500ms    |

**Home Page Animations:**

| Element                  | Animation                                           | Duration |
| ------------------------ | --------------------------------------------------- | -------- |
| Portfolio value          | Count-up from 0 to actual value                      | 600ms    |
| Token list cards         | Staggered slide-in from right (stagger: 30ms)        | 250ms    |
| 24h change badge         | Fade in after card mount (delay: 200ms)               | 200ms    |
| Sparkline draw           | SVG path draw-in                                      | 400ms    |
| Pull-to-refresh          | Elastic overscroll + spinner                          | 300ms    |

**Landing Page Animations (Autopilot-style):**

| Element                  | Animation                                           | Duration |
| ------------------------ | --------------------------------------------------- | -------- |
| Hero text                | Fade in + slight scale (1.05 → 1.0)                  | 500ms    |
| Phone mockup carousel    | Horizontal scroll with parallax depth                 | —        |
| Stat numbers             | Count-up on scroll-into-view                          | 800ms    |
| Section reveals          | Scroll-triggered fade + slide up (per section)        | 400ms    |

**Framer Motion Config:**

```typescript
export const transitions = {
  spring: { type: "spring", stiffness: 300, damping: 30 },
  ease: { type: "tween", ease: [0.25, 0.1, 0.25, 1], duration: 0.3 },
  stagger: { staggerChildren: 0.05 },
  onboarding: { type: "tween", ease: [0.25, 0.1, 0.25, 1], duration: 0.4 },
};
```

### 7.5 Responsive Breakpoints

```
Mobile:    < 640px   (single column, bottom nav, full-width chat)
Tablet:    640-1024px (sidebar collapses, 2-column grid)
Desktop:   > 1024px  (sidebar nav, 3-column grid, side-by-side panels)
```

### 7.6 Mobile-Specific UX

- Bottom tab navigation: **Home** | **Chat** | **Swap** | **Portfolio** (4 tabs)
- Home is the default landing tab after auth
- Full-screen chat with floating input bar
- Swipe gestures for conversation switching
- Pull-to-refresh on home page token list and portfolio
- Haptic feedback on swap confirmation (where supported)
- Optimized for MiniPay embedded webview
- Onboarding: full-screen, keyboard always visible, no navigation chrome

### 7.7 Key UI Components

- **Token row card** — Flag icon, token symbol, price, 24h change %, mini sparkline (home page)
- **Chat bubble** — Rounded, with typing indicator animation, markdown support
- **Swap card** — Base currency selector (USDC/USDT), target token picker, amount input, rate display, confirm button
- **SIP card** — Frequency badge, next execution countdown, progress bar
- **Portfolio card** — Token icon, amount, value, sparkline mini-chart
- **Risk badge** — Color-coded (green/yellow/red) profile indicator
- **Token selector** — Searchable dropdown with token icons, balances, and country flags
- **Onboarding question** — Large bold text, inline input/chip selector, scroll-up animation
- **Dark feature card** — Dark background card for key metrics (portfolio value, stat highlights), white text
- **Pill button** — Black rounded button with white text, Autopilot-style CTA

---

## 8. AI System Prompt Template

```
You are AutoClaw, an AI-powered FX investment assistant on the Celo blockchain.

## User Context
- Wallet: {{wallet_address}}
- Risk Profile: {{risk_profile}} ({{risk_description}})
- Preferred Currencies: {{preferred_currencies}}
- Member Since: {{created_at}}

## Current Portfolio
{{#each holdings}}
- {{token}}: {{amount}} (≈ ${{usd_value}})
{{/each}}
Total Portfolio Value: ${{total_value}}

## Active SIPs
{{#each sips}}
- {{source_token}} → {{target_token}}: {{amount}} {{source_token}} / {{frequency}}
{{/each}}

## Available Tokens
Base currencies: USDC, USDT
Mento stablecoins: USDm, EURm, BRLm, KESm, PHPm, COPm, XOFm, NGNm, JPYm, CHFm, ZARm, GBPm, AUDm, CADm, GHSm
Commodity: XAUT (Tether Gold, 1 oz gold)

## Recent Market News
{{#each recent_news}}
- [{{sentiment}}] {{title}} ({{source_name}}, {{time_ago}})
{{/each}}

## Your Role
You are the Orchestrator Agent. You coordinate specialized worker agents:
- **Trading Agent** — for swap quotes, buy/sell execution, allocation suggestions, SIP setup
- **Portfolio Agent** — for holdings, P&L, transaction history
- **News Agent** — for market news, sentiment, currency-specific updates
- **General Agent** — for token explanations, risk education, general help

Route user intent to the appropriate agent using the routing tools.

## Your Behavior
- Provide personalized FX investment suggestions based on the user's {{risk_profile}} risk profile
- For conservative users: prioritize stability (USDm, EURm, CHFm, XAUT)
- For moderate users: suggest balanced diversification (add GBPm, JPYm, AUDm)
- For aggressive users: allow broader exposure (KESm, NGNm, PHPm, XOFm) and active rebalancing
- Reference recent market news when making recommendations
- Always explain the reasoning behind recommendations
- When suggesting swaps, use the get_quote tool to show real-time rates
- Never provide financial advice — frame as suggestions and educational info
- Be concise, friendly, and professional
- Use dollar values alongside token amounts for clarity
```

---

## 9. Security Considerations

- **Non-custodial:** Backend never holds private keys or funds
- **Token allowances:** SIP smart contract uses minimal, scoped allowances
- **Rate limiting:** API endpoints rate-limited per user
- **Input validation:** All user inputs validated (zod schemas)
- **CORS:** Strict origin whitelisting
- **Auth:** thirdweb JWT verification (SIWE) on all authenticated endpoints
- **RLS:** Supabase Row Level Security on all tables
- **Tx simulation:** Simulate swaps before user signs (dry-run)
- **Slippage protection:** Configurable max slippage per swap (default 0.5%)

---

## 10. Development Phases

### Phase 1 — Foundation (Weeks 1-3)

- [ ] Monorepo setup (Turborepo, pnpm, TypeScript configs)
- [ ] Supabase project + schema + RLS policies
- [ ] thirdweb auth integration (wallet + social + in-app wallets + MiniPay)
- [ ] Conversational onboarding flow (Autopilot-inspired, animated Q&A)
- [ ] Home page — token list with 24h P&L, sparklines
- [ ] Landing page (Autopilot-inspired, scroll animations, phone mockups)
- [ ] Design system + component library (shadcn/ui + custom dark cards, pill buttons)

### Phase 2 — Core Features (Weeks 4-6)

- [ ] Mento SDK integration (swap quotes, allowance, execution)
- [ ] Swap UI — USDC/USDT → any Mento stablecoin (USDm, EURm, etc.)
- [ ] XAUT buy/sell support
- [ ] AI chat interface with `ai-sdk-provider-claude-code` (primary) + fallback providers
- [ ] Multi-agent orchestrator architecture (orchestrator → trading/portfolio/news/general agents)
- [ ] System prompt generation from user data + news context
- [ ] AI tool functions (get_quote, suggest_allocation, get_news_summary, etc.)
- [ ] Yahoo Finance news crawling agent (30-min cron, sentiment analysis)
- [ ] Token detail pages (price charts, buy/sell, info)

### Phase 3 — SIP & Portfolio (Weeks 7-9)

- [ ] SIP smart contract (allowance-based execution)
- [ ] SIP cron service (BullMQ + Redis)
- [ ] SIP management UI
- [ ] Portfolio dashboard (holdings, P&L, allocation charts)
- [ ] Transaction history
- [ ] Portfolio snapshot cron (daily snapshots)

### Phase 4 — Polish & Launch (Weeks 10-12)

- [ ] Framer Motion animations across all pages
- [ ] Mobile optimization and testing
- [ ] MiniPay embedded wallet testing
- [ ] Performance optimization (caching, lazy loading)
- [ ] Error handling and edge cases
- [ ] Monitoring and logging (Sentry, analytics)
- [ ] E2E tests (Playwright) + API integration tests (Vitest)
- [ ] Deployment + documentation

> **Detailed milestone breakdown with deliverables and verification:** See [MILESTONES.md](./MILESTONES.md)

---

## 11. Environment Variables

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# thirdweb
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
THIRDWEB_SECRET_KEY=
THIRDWEB_ADMIN_PRIVATE_KEY=
AUTH_DOMAIN=

# LLM Providers
# Primary: Claude Code (no API key needed — uses `claude login` subscription)
# Fallback providers:
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Celo / Blockchain
CELO_RPC_URL=https://forno.celo.org
SIP_CONTRACT_ADDRESS=

# Redis (for BullMQ)
REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=
API_URL=
NODE_ENV=
```

---

## 12. Key Dependencies

### Backend (`apps/api`)

```json
{
  "dependencies": {
    "fastify": "^5.x",
    "@fastify/cors": "^10.x",
    "ai": "^6.x",
    "ai-sdk-provider-claude-code": "^3.x",
    "@ai-sdk/openai": "^1.x",
    "@ai-sdk/anthropic": "^1.x",
    "@ai-sdk/google": "^1.x",
    "yahoo-finance2": "^2.x",
    "@supabase/supabase-js": "^2.x",
    "@mento-protocol/mento-sdk": "latest",
    "viem": "^2.x",
    "bullmq": "^5.x",
    "ioredis": "^5.x",
    "zod": "^3.x",
    "thirdweb": "^5.x",
    "@fastify/helmet": "^12.x"
  }
}
```

### Frontend (`apps/web`)

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/typography": "latest",
    "framer-motion": "^11.x",
    "ai": "^6.x",
    "thirdweb": "^5.x",
    "@tanstack/react-query": "^5.x",
    "recharts": "^2.x",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  }
}
```

---

*Document version: 4.0 — February 8, 2026*
