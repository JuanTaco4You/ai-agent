import { AxiosInstance } from "axios";
import { Connection, Keypair } from "@solana/web3.js";
import { Logger } from "@ai-agent/infra";
import type { ExecutionResult, SwapExecutor, SwapIntent } from "./index";
export type JupiterSwapExecutorOptions = {
    connection: Connection;
    wallet: Keypair;
    baseUrl?: string;
    slippageBps?: number;
    priorityFeeLamports?: number | "auto";
    logger?: Logger;
    httpClient?: AxiosInstance;
};
export declare class JupiterSwapExecutor implements SwapExecutor {
    private readonly connection;
    private readonly wallet;
    private readonly logger;
    private readonly http;
    private readonly baseUrl;
    private readonly slippageBps;
    private readonly priorityFeeLamports;
    constructor(options: JupiterSwapExecutorOptions);
    execute(intent: SwapIntent): Promise<ExecutionResult>;
    private executeBuy;
    private executeSell;
    private getBestRoute;
    private executeSwap;
}
