## Migration Candidates from Legacy Bot

| Module | Path | Value | Work Needed |
|--------|------|-------|-------------|
| Swap Router | `src/swap/router.ts`, `src/swap/providers.ts` | Mature routing logic for Jupiter/Raydium/pump.fun including retry + notification patterns. | Extract into `packages/execution` with pure functions; remove Telegram notifier coupling, add typed interfaces. |
| Provider Integrations | `src/Jupiter/jupiter.ts`, `src/Pumpfun/pumpfun.ts`, `src/Raydium/*` | Direct Solana swap pipelines and priority fee controls. | Wrap into service classes; ensure dependency inversion for configurable RPC and signer. |
| Helper Utilities | `src/util/helper.ts` | Pricing functions, metadata fetch, randomness, Moralis integration. | Split into `pricing`, `metadata`, `wallet` modules; make HTTP clients injectable; replace Moralis if not needed. |
| Logger | `src/util/logger.ts` | Structured logging abstraction used across services. | Port as-is; align with new `pino`/`winston` choice; add context binding for microservices. |
| Database Layer | `src/util/db.ts` | SQLite schema for buys, strategies, positions, copy trading. | Convert to Prisma/Drizzle migrations; modularize to `data/` package; prune Telegram-specific tables. |
| Signal Classification | `src/util/signalState.ts` | Initial/update tracking for signals. | Adapt for agent decisions vs. external signals; integrate with feature store to track novelty. |
| Position Monitor | `src/monitor/engine.ts` | Trailing stops, moonbag logic, notifications. | Refactor into risk module service; decouple from Telegram notifier; rewire to agent governance. |
| Copy Trading Engine | `src/copy/engine.ts` | Wallet log subscription + follow trading. | Transform into optional strategy plugin; convert callbacks to EventEmitter pattern. |
| Notifier | `src/util/notifier.ts` | Telegram messaging utility. | Reuse messaging adapter for dashboards; extend to Slack/Webhooks. |
| Config Helpers | `src/config.ts` | Environment parsing, wallet loading, slippage settings. | Rebuild with `zod` schema; migrate relevant constants; remove legacy toggles. |

### Legacy Components to Sunset
- Telegram UI router (`src/router/**`), manual signal scraping, startTrade loops tied to human channels.
- `telegram-scraper` dependency chain and manual buy lists.
- Copy-trading DB tables unless agent needs them.

### Immediate Extraction Priorities
1. Swap provider SDK wrappers.
2. Logger + notifier infrastructure.
3. Pricing utilities (DexScreener/Jupiter).
4. Risk/position algorithms for trailing stops (to harden risk engine).

