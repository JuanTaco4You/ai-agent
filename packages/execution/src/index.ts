import { Logger, createNullLogger } from "@ai-agent/infra";

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
export class DryRunExecutor implements SwapExecutor {
  constructor(private readonly logger: Logger = createNullLogger()) {}

  async execute(intent: SwapIntent): Promise<ExecutionResult> {
    const meta: Record<string, unknown> = { ...intent } as any;
    if ("tokenLamports" in meta && typeof meta.tokenLamports === "bigint") {
      meta.tokenLamports = meta.tokenLamports.toString();
    }
    this.logger.info("execution.dry_run", meta);
    return {
      signature: "dry-run-signature",
      finalAmountLamports:
        intent.side === "sell" ? intent.tokenLamports ?? undefined : undefined,
    };
  }
}

export * from "./jupiter";
export * from "./wallet";
export * from "./accounts";
export * from "./notifyingExecutor";
