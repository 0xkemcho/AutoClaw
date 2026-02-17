# AutoClaw — Shot List & Timing Guide
**Total runtime:** 2:10 – 2:20
**Format:** Screen Studio recording, 1080p, 16:9

> Use this alongside `script.md`.
> Each section shows: timestamp range, what's on screen, Screen Studio zoom notes, and the narration line that plays over it.

---

## SECTION 1 — THE HOOK
**Timestamp:** 0:00 – 0:12 (12 seconds)
**Narration:**
> *"FX markets move twenty-four hours a day, across every timezone on earth. Most traders are asleep for eight of them. Positions go unmanaged. Signals get missed. Yield sits idle."*

**What to show:**
- Start on the AutoClaw dashboard, blurred or dimmed (use Screen Studio background blur)
- OR: a dark blank screen with a subtle clock/globe animation if you want a cinematic open
- The actual UI doesn't need to be legible here — this is mood-setting
- No zoom events needed

**Screen Studio notes:**
- Record the dashboard in an "idle" state — no agent running, portfolio visible
- Keep cursor off screen

---

## SECTION 2 — THE INTRODUCE
**Timestamp:** 0:12 – 0:20 (8 seconds)
**Narration:**
> *"Meet AutoClaw. An autonomous agent platform on the Celo blockchain — built to work while you don't."*

**What to show:**
- Unblur/focus the dashboard (or cut to landing page autoclaw.co homepage)
- Logo + tagline visible
- Portfolio chart in background showing positive trend

**Screen Studio notes:**
- Slow zoom IN to the AutoClaw logo or the hero headline on the landing page
- Cursor still off screen

---

## SECTION 3 — CONNECT & ACTIVATE
**Timestamp:** 0:20 – 0:45 (25 seconds)
**Narration:**
> *"Getting started takes seconds. Connect your wallet — or sign in with Google, Apple, or X. No KYC, no forms, no friction. You land straight on your overview. Pick an agent, configure your guardrails — maximum trade size, daily limits, the currencies you want — and activate it. That's it. Your agent is live."*

**What to show:**
- 0:20 – 0:27: The thirdweb connect modal — wallet options + social login buttons (Google, Apple, X) clearly visible
- 0:27 – 0:33: Overview page loading immediately after login — portfolio summary, agent cards visible
- 0:33 – 0:40: Click into FX Agent — show the agent settings panel (guardrail fields: max trade size, currency list, daily limit)
- 0:40 – 0:45: Click the "Activate" / toggle to enable the agent — agent status flips to active/running

**Screen Studio notes:**
- Zoom IN tightly on the social login buttons (Google, Apple, X) — this differentiates AutoClaw from wallet-only DeFi apps
- Zoom OUT smoothly as the overview page loads — give a sense of "you're in"
- Zoom IN on the agent card on the overview as the narration says "pick an agent"
- Zoom IN on the guardrail fields as the narration mentions "maximum trade size, daily limits"
- Zoom IN on the activate toggle/button — hold on it for 1–2 seconds after click
- Use cursor click ripple effect on the activate action

---

## SECTION 4 — FX AGENT RUNNING (MONEY SHOT)
**Timestamp:** 0:45 – 1:20 (35 seconds)
**Narration:**
> *"The FX Trading Agent monitors live news and macro signals with AI. It reads the headlines, generates a signal — buy, sell, or hold — checks it against your rules, and executes a stablecoin swap on Mento Protocol. Gasless. Non-custodial. On Celo mainnet. You can watch every step happen in real time."*

**What to show:**
- 0:45 – 0:52: FX Agent page — agent status showing "Running", live run card visible
- 0:52 – 1:00: The WebSocket progress stream ticking: `fetching_news` → `analyzing` → `checking_signals`
- 1:00 – 1:08: `executing_trades` step — show the swap executing (EURm or NGNm)
- 1:08 – 1:14: `complete` step — show the green checkmark / trade confirmation
- 1:14 – 1:20: Agent Timeline — show the logged trade event with txHash

**Screen Studio notes:**
- This is the CENTERPIECE — zoom in close on every step as it changes
- Zoom IN on `fetching_news` label when narration says "monitors live news"
- Zoom IN on `analyzing` step when narration says "generates a signal"
- Zoom IN TIGHT on the executing swap step — show token pair (e.g., USDm → EURm), amount
- Zoom IN on the green `complete` status
- Zoom OUT to show the full timeline after completion
- Keep cursor off screen during the progress stream — it's cleaner without cursor movement

**Production tip:** If you can't record a live agent run, trigger one manually with "Run Now" on the agent settings page and capture it in real time. This is far more compelling than any mockup.

---

## SECTION 5 — YIELD AGENT
**Timestamp:** 1:20 – 1:48 (28 seconds)
**Narration:**
> *"The Yield Agent works in parallel. It scans ICHI vaults, Uniswap, and Merkl for the best on-chain returns — deploys your idle stablecoins, claims rewards, and auto-compounds — continuously. No manual intervention. No missed opportunities."*

**What to show:**
- 1:20 – 1:28: Yield Agent page — show the opportunities list (vault name, TVL, APR columns)
- 1:28 – 1:36: Active yield position — show a vault with current APR and accrued rewards
- 1:36 – 1:42: Rewards section — unclaimed rewards amount, "Auto-compound: ON" toggle visible
- 1:42 – 1:48: Portfolio chart showing upward trend — the result

**Screen Studio notes:**
- Zoom IN on the opportunities list, pan across TVL / APR columns
- Zoom IN on a specific vault showing APR (e.g., "12.4% APR")
- Zoom IN on the auto-compound toggle in the ON state
- Smooth zoom OUT to portfolio overview at the end of this section

---

## SECTION 6 — AGENT CHAT (INTELLIGENCE)
**Timestamp:** 1:48 – 2:05 (17 seconds)
**Narration:**
> *"And when you want to understand what's happening — just ask. AutoClaw's intelligence agent has access to live prices, FX news, social sentiment from X, and Celo governance data. Ask it why your agent sold EURm. Ask it where yield on Celo is right now. It knows."*

**What to show:**
- 1:48 – 1:54: Agent Chat page loading — show the chat interface
- 1:54 – 2:00: Type (or show pre-typed) a question: *"Why did my agent sell EURm this morning?"*
- 2:00 – 2:05: Show the AI response populating — a few lines of markdown with cited sources

**Screen Studio notes:**
- Zoom IN on the chat input as the question appears
- Zoom IN on the response as it streams in
- Keep it brief — this section is a tease, not a deep dive
- Show the tool icons (news, prices, sentiment) if visible in the UI

---

## SECTION 7 — PROOF / CREDIBILITY
**Timestamp:** 2:05 – 2:22 (17 seconds)
**Narration:**
> *"Every trade logged on-chain. Every decision auditable. Every AutoClaw agent is registered on-chain via ERC-8004 — a verifiable identity, a transparent track record. Not a black box. And with SelfClaw integration, your agent is cryptographically verified as human-backed — passport-level proof, zero-knowledge, published on-chain. In the emerging agent economy, that matters. Your agents run whether you're watching or not."*

**What to show:**
- 2:05 – 2:08: Timeline page — list of logged trade events with txHashes visible
- 2:08 – 2:13: Agent identity section showing ERC-8004 registration (agent ID, badge, or 8004scan.io link)
- 2:13 – 2:19: SelfClaw verification section — show the selfclaw.ai verification badge, ZK proof status, or the "Human-Backed" indicator in the AutoClaw UI
- 2:19 – 2:22: Zoom OUT to the full dashboard — portfolio chart, balances — the "whole picture" close

**Screen Studio notes:**
- Zoom IN on a txHash in the timeline — real on-chain activity, not a mock
- Zoom IN on the ERC-8004 agent ID badge — hold for 2 seconds, the word on screen reinforces the voiceover
- Zoom IN on the SelfClaw verification indicator — this is new and differentiating, give it 4–5 seconds of screen time
- If the SelfClaw UI shows a green "Verified" or passport-icon badge, zoom in tight on that — it's visually legible and makes the concept instant
- Slow zoom OUT to dashboard to close — calm, confident, no cursor movement on the final frame

**What "SelfClaw integration" looks like on screen (record this):**
Show whichever of these is implemented in the AutoClaw UI:
- A "Human Verified · SelfClaw" badge on the agent profile/settings page
- A link or button to selfclaw.ai from the agent identity section
- A ZK verification status indicator (e.g., "Passport verified · ZK proof on-chain")

---

## SECTION 8 — CTA
**Timestamp:** 2:22 – 2:30 (8 seconds)
**Narration:**
> *"AutoClaw is live on Celo mainnet. Connect your wallet and deploy your first agent at autoclaw.co."*

**What to show:**
- Navigate to autoclaw.co landing page
- The URL bar showing `autoclaw.co` is visible
- OR: A clean outro card — dark background, AutoClaw logo, `autoclaw.co` text

**Screen Studio notes:**
- Zoom IN on the "Ape In" CTA button on the landing page
- End on a static frame — let the URL sit on screen for 2 seconds after narration ends
- This is the last thing viewers see — keep it clean and legible

---

## QUICK REFERENCE TIMELINE

```
0:00 – 0:12   HOOK           Markets never sleep (12s)
0:12 – 0:20   INTRODUCE      Meet AutoClaw (8s)
0:20 – 0:45   SETUP          Connect → overview → activate agent (25s)
0:45 – 1:20   FX AGENT       Live run card — money shot (35s)
1:20 – 1:48   YIELD AGENT    Vaults, APR, auto-compound (28s)
1:48 – 2:05   AGENT CHAT     Ask the intelligence layer (17s)
2:05 – 2:22   PROOF          Timeline + ERC-8004 + SelfClaw verified (17s)
2:22 – 2:30   CTA            autoclaw.co (8s)
─────────────────────────────────────────────────────
TOTAL                                           2:30
```

---

## RECORDING ORDER RECOMMENDATION

Record these UI states in one sitting before you write the final script:

1. **thirdweb connect modal** — wallet + social login options visible
2. **Onboarding risk questionnaire** — show profile selection
3. **Agent guardrails / settings** — max trade size, currencies, daily limit
4. **FX Agent — live run** — trigger "Run Now" and capture the full WebSocket progress stream
5. **Agent Timeline** — after the run, show the logged events
6. **Yield Agent** — opportunities list + active position + rewards
7. **Agent Chat** — type a question, show the response streaming
8. **Dashboard overview** — portfolio chart, balances
9. **Landing page** — end on autoclaw.co with the CTA button

Then assemble in Screen Studio, lay the ElevenLabs voiceover on top, and adjust zoom timing to match the narration.

---

## POST-PRODUCTION CHECKLIST

- [ ] ElevenLabs voiceover exported as WAV
- [ ] Screen recording exported from Screen Studio (1080p MP4)
- [ ] Audio + video synced in VN Editor or DaVinci Resolve
- [ ] Background music added at -18 to -20dB below voice (Epidemic Sound: "ambient tech")
- [ ] Captions added and synced (VN Editor auto-caption or DaVinci Resolve)
- [ ] Final export: 1080p MP4, H.264
- [ ] Square crop (1:1) version for X/Twitter feed
- [ ] Upload natively to X — do NOT share a YouTube link as the first tweet
