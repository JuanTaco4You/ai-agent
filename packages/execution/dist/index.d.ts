import { Logger } from "@ai-agent/infra";
export type BuySwapIntent = {
    mint: string;
    side: "buy";
    solAmount: number;
    slippageBps?: number;
};
export type SellSwapIntent = {
    mint: string;
    side: "sell";
    percent?: number;
    tokenLamports?: bigint;
    slippageBps?: number;
};
export type SwapIntent = BuySwapIntent | SellSwapIntent;
export type ExecutionResult = {
    signature: string;
    finalAmountLamports?: bigint;
};
export interface SwapExecutor {
    execute(intent: SwapIntent): Promise<ExecutionResult>;
}
/**
 * Placeholder executor that logs intent until real swap providers are wired.
 */
export declare class DryRunExecutor implements SwapExecutor {
    private readonly logger;
    constructor(logger?: Logger);
    execute(intent: SwapIntent): Promise<ExecutionResult>;
}
export * from "./jupiter";
export * from "./wallet";
export * from "./accounts";
export * from "./notifyingExecutor";
