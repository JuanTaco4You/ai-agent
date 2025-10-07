# Delivery Roadmap

## Phase 0 – Foundations
- Finalize data provider access (RPC, Helius, DexScreener, Kolscan, OpenAI).
- Port reusable execution/pricing code from legacy repo into isolated packages with unit tests.
- Stand up linting, formatting, and CI scaffolding.

## Phase 1 – Intelligence Sandbox
- Implement data ingestion services streaming live market + order flow metrics into feature cache.
- Define agent prompt schemas and tool contract for querying features.
- Run OpenAI agent in analysis-only mode; log decisions without execution.

## Phase 2 – Risk & Execution
- Build deterministic risk engine (position sizing, drawdown guard, blacklists).
- Connect agent intents to risk engine; emit swap tasks to execution router.
- Enable shadow trading: compare agent decisions vs. historical fills.

## Phase 3 – Live Trading
- Gate deployment behind manual approval workflow (Telegram dashboard).
- Activate live execution with multi-wallet support and transaction telemetry.
- Add adaptive monitoring (PnL reports, stop-loss adjustments, anomaly detection).

## Phase 4 – Optimization
- Introduce reinforcement feedback loop (decision scoring, prompt refinement).
- Expand strategy plugins (copy trading, arbitrage modules).
- Harden production observability (Grafana dashboards, incident automation).

