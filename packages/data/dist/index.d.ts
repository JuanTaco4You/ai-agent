import { Logger } from "@ai-agent/infra";
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
export declare class FeatureStore {
    private readonly logger;
    private readonly snapshots;
    constructor(logger?: Logger);
    upsert(snapshot: MarketFeatureSnapshot): void;
    get(mint: string): MarketFeatureSnapshot | undefined;
    /**
     * Exposes a shallow copy of all stored snapshots for downstream analysis.
     */
    all(): MarketFeatureSnapshot[];
}
export * from "./pricing";
export * from "./metadata";
export * from "./persistence";
