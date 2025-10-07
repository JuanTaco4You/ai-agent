# Immediate Next Steps

1. **Tooling Setup** – add root lint/test tooling (ESLint, Prettier, Jest or Vitest) and configure shared configs under `packages/infra`.
2. **Execution Porting** – migrate Jupiter/Raydium/pump.fun swap wrappers from legacy bot into `packages/execution`, replacing placeholders with real implementations and tests.
3. **Data Pipeline Skeleton** – implement Solana RPC + market data ingestion in `packages/data`, persisting to the feature store with caching strategy.
4. **Risk Engine Draft** – create new package (e.g., `packages/risk`) to codify bankroll limits, throttles, and validation of agent decisions.
5. **Agent Workflow** – scaffold OpenAI client wrapper, prompt schema, and dry-run loop inside `apps/agent`, integrating with the risk engine once ready.
