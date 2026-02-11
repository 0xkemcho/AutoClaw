---
title: Gemini CLI Community Provider
description: Reference for using Gemini CLI community provider with AI SDK, leveraging Google AI Pro subscription via OAuth.
---

# Gemini CLI Community Provider

Use Gemini models through the `ai-sdk-provider-gemini-cli` community provider. This is the preferred way to use Gemini in this project because it supports OAuth authentication with a Google AI Pro subscription (no API key needed, higher quotas).

## Installation

```bash
# AI SDK v6 (default)
pnpm add ai-sdk-provider-gemini-cli ai

# AI SDK v5
pnpm add ai-sdk-provider-gemini-cli@ai-sdk-v5 ai@^5.0.0
```

**Prerequisite**: Gemini CLI must be globally installed and authenticated:

```bash
npm install -g @google/gemini-cli
gemini  # Run once to complete OAuth flow
```

## Provider Setup

### OAuth (Recommended — uses Google AI Pro subscription)

```ts
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';

const gemini = createGeminiProvider({ authType: 'oauth-personal' });
```

This uses your existing Google AI Pro subscription. No API key needed. Quotas are tied to your subscription tier.

### API Key (Alternative)

```ts
const gemini = createGeminiProvider({
  authType: 'api-key',
  apiKey: process.env.GEMINI_API_KEY,
});
```

### Vertex AI

```ts
const gemini = createGeminiProvider({
  authType: 'vertex-ai',
  vertexAI: { projectId: 'my-project', location: 'us-central1' },
});
```

## Models

| Model | Description |
|---|---|
| `gemini-3-pro-preview` | Latest with enhanced reasoning |
| `gemini-3-flash-preview` | Fast Gemini 3 variant |
| `gemini-2.5-pro` | Production-ready, 64K output tokens |
| `gemini-2.5-flash` | Efficient, 64K output tokens |

All models support: image input (base64 only, not URLs), object generation, tool usage, tool streaming.

## Usage

```ts
import { generateText, streamText } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';

const gemini = createGeminiProvider({ authType: 'oauth-personal' });

// Basic generation
const { text } = await generateText({
  model: gemini('gemini-2.5-pro'),
  prompt: 'Explain Celo stablecoins',
});

// With config
const model = gemini('gemini-2.5-pro', {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  thinkingConfig: { thinkingLevel: 'medium' },
});

// Streaming
const result = streamText({
  model: gemini('gemini-2.5-flash'),
  prompt: 'Summarize FX news',
});
```

## Quota & Pricing (Google AI Pro)

With a Google AI Pro subscription (`oauth-personal` auth):

- **Google Account (Gemini Code Assist)**: 1,000 req/day, 60 req/min
- **Code Assist Standard**: 1,500 req/day, 120 req/min
- **Code Assist Enterprise**: 2,000 req/day, 120 req/min

Without paid subscription (API key, unpaid): 250 req/day, 10 req/min, Flash model only.

Monitor usage via `/stats` command in Gemini CLI.

## Important Notes

- Requires Node.js 20+
- Image input must be base64-encoded (URLs not supported)
- OAuth requires the global Gemini CLI to be installed and authenticated
- For this project, prefer `oauth-personal` auth to leverage Google AI Pro subscription
