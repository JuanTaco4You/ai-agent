# Solana AI Trading Agent

This repo will house an autonomous trading stack built for Solana with an OpenAI-powered decision layer and hardened risk controls.

## Project Layout
- `apps/agent`: primary runtime (CLI/service) that hosts the intelligence loop and orchestrates trades.
- `packages/execution`: swap providers, transaction builders, fee strategies.
- `packages/data`: ingestion pipelines, feature store, persistence adapters.
- `packages/infra`: logging, configuration, notification, shared utilities.
- `docs/`: architecture, migration notes, future specs.
- `config/`: environment templates, prompt definitions, and workflow configs.

## Initial Priorities
1. Port execution wrappers from legacy bot into `packages/execution`.
2. Stand up data ingestion scaffolding with Solana RPC + market feeds.
3. Design agent workflow (prompt templates, tool interfaces, risk checks).
4. Build monitoring dashboard and alerting hooks.

## Getting Started
Bootstrap scripts, package manifests, and environment templates will be added as components are ported. Until then, see `docs/architecture.md` for the system blueprint.

## Current Status
- Run `npm run typecheck` (or `npm run lint`) to compile every workspace; outputs land in each package's `dist/` folder.
- `apps/agent` is wired for dry-run mode with a demo feature snapshot; live ingestion, decisioning, and execution providers remain scaffolding.
