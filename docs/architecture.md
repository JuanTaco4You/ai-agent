# Solana AI Trading Agent – Architecture Blueprint

## 1. Objectives
- Build an autonomous, leaderboard-grade Solana trading agent with explainable decisioning.
- Separate intelligence (LLM-driven reasoning) from deterministic execution/risk controls.
- Maintain auditability and reproducibility for every trade.

## 2. High-Level System
```
┌──────────────────┐
│  Data Ingestion   │  Streams: market data, on-chain flow, leaderboards, news
└────────┬─────────┘
         │ normalized feature bus
┌────────▼────────┐
│ Intelligence Hub│  OpenAI agents, tool-calling, hypothesis memory
└────────┬────────┘
         │ validated intents
┌────────▼──────────┐
│  Risk Engine &    │  bankroll, throttles, guardrails, compliance
│  Execution Router │
└────────┬──────────┘
         │ swap jobs
┌────────▼──────────┐
│ Solana Execution  │  Jupiter, Raydium, pump.fun pipelines
└────────┬──────────┘
         │ fills / PnL
┌────────▼────────┐
│ Monitoring &    │  telemetry, alerts, dashboards
│ Governance      │
└─────────────────┘
```

## 3. Core Services
1. **Data Ingestion**
   - Real-time price/liquidity snapshots (Jupiter REST, DexScreener, Helius websockets).
   - Transaction flow from curated wallets/Kolscan leaders (log subscriptions).
   - Sentiment + numeric signals (Telegram, Twitter, news feeds).
   - Persist to time-series store (SQLite → Postgres upgrade path) with caching.

2. **Feature Fabric**
   - Normalizes incoming data to agent-friendly JSON (velocity, liquidity score, wallet alpha, narrative tags).
   - Maintains latest state vectors in Redis-like cache (start with in-memory + SQLite).

3. **Intelligence Hub**
   - Primary OpenAI agent (e.g., `gpt-4.1`) with tool-calling to query feature fabric, run scenario simulators, and draft trade theses.
   - Secondary fast model (`o4-mini`) for continuous polling, scoring, and follow-ups.
   - Prompt templates maintain structured output schema (`AgentDecision` with action/confidence/rationale).
   - Memory store (vector DB optional) for historical rationales and performance feedback.

4. **Risk Engine**
   - Strict TypeScript module validating all agent intents.
   - Enforces bankroll allocation, max concurrent positions, drawdown limits, slippage ceilings, cooldowns.
   - Runs deterministic sanity checks (volatility, liquidity, blacklists) before authorizing execution.

5. **Execution Router**
   - Reuses modular swap providers (Jupiter, Raydium, pump.fun) from legacy repo—ported as isolated packages.
   - Generates and signs transactions via Keypair or custodian wallet integration.
   - Handles retries, priority fees, mempool health checks.

6. **Monitoring & Governance**
   - Position watcher with adaptive stop-loss/ladder logic.
   - Telegram + web dashboard for status, agent rationale, manual overrides.
   - Alerting for anomalies (API degradation, risk rule hits, PnL swings).

## 4. Pipelines
- **Live Trading Loop**: data snapshot → feature vector → agent call → risk validation → execution → post-trade feedback stored for learning.
- **Replay/Backtest**: recorded data feed zipped through agent to evaluate hypothetical PnL; used pre-deployment.
- **Shadow Mode**: agent produces decisions logged but not executed until confidence > threshold.

## 5. Tech Stack
- **Runtime**: Node.js 20+, TypeScript, pnpm.
- **APIs**: OpenAI, Helius, DexScreener, Kolscan, any custom RPC.
- **Storage**: SQLite for initial persistence; upgrade path to Postgres/Timescale.
- **Infra**: Docker compose for local dev, optional n8n integration for non-latency-critical automations.

## 6. Security & Compliance
- Secrets via `.env` + Vault option.
- Strict separation between LLM output and signing keys—AI never sees raw secrets.
- Audit log per decision (prompt, model, parameters, final trade).

## 7. Phased Delivery
1. Bootstrap skeleton + swap/risk modules.
2. Integrate data ingestion + telemetry.
3. Wire initial OpenAI agent (analysis-only).
4. Enable shadow trading with full logging.
5. Graduate to live capital with multi-stage approvals.

