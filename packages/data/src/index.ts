import { Logger, createNullLogger } from "@ai-agent/infra";

export type MarketFeatureSnapshot = {
  timestamp: number;
  mint: string;
  priceSol?: number;
  liquidityUsd?: number;
  velocity?: number;
};

/**
 * Placeholder in-memory feature store.
 * Replace with persistent cache when wiring live data ingestion.
 */
export class FeatureStore {
  private readonly logger: Logger;
  private readonly snapshots = new Map<string, MarketFeatureSnapshot>();

  constructor(logger: Logger = createNullLogger()) {
    this.logger = logger;
  }

  upsert(snapshot: MarketFeatureSnapshot): void {
    this.snapshots.set(snapshot.mint, snapshot);
    this.logger.debug("feature_store.upsert", { mint: snapshot.mint });
  }

  get(mint: string): MarketFeatureSnapshot | undefined {
    return this.snapshots.get(mint);
  }
}

export * from "./pricing";
export * from "./metadata";
export * from "./persistence";
