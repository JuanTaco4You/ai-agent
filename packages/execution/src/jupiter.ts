import axios, { AxiosInstance } from "axios";
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { Logger, createNullLogger, childLogger } from "@ai-agent/infra";

import type { ExecutionResult, SwapExecutor, SwapIntent } from "./index";
import {
  findFirstTokenAccount,
  getTokenAccountSnapshot,
} from "./accounts";

const WSOL = "So11111111111111111111111111111111111111112";

export type JupiterSwapExecutorOptions = {
  connection: Connection;
  wallet: Keypair;
  baseUrl?: string;
  slippageBps?: number;
  priorityFeeLamports?: number | "auto";
  logger?: Logger;
  httpClient?: AxiosInstance;
};

export class JupiterSwapExecutor implements SwapExecutor {
  private readonly connection: Connection;
  private readonly wallet: Keypair;
  private readonly logger: Logger;
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;
  private readonly slippageBps: number;
  private readonly priorityFeeLamports: number | "auto";

  constructor(options: JupiterSwapExecutorOptions) {
    this.connection = options.connection;
    this.wallet = options.wallet;
    this.logger = childLogger(options.logger ?? createNullLogger(), "Jupiter");
    this.http = options.httpClient ?? axios.create();
    this.baseUrl = options.baseUrl || "https://quote-api.jup.ag";
    this.slippageBps = options.slippageBps ?? 1500;
    this.priorityFeeLamports = options.priorityFeeLamports ?? "auto";
  }

  async execute(intent: SwapIntent): Promise<ExecutionResult> {
    if (intent.side === "buy") {
      return this.executeBuy(intent);
    }
    return this.executeSell(intent);
  }

  private async executeBuy(intent: SwapIntent & { side: "buy" }): Promise<ExecutionResult> {
    const amountSol = Number(intent.solAmount);
    if (!Number.isFinite(amountSol) || amountSol <= 0) {
      throw new Error(`Invalid SOL amount: ${intent.solAmount}`);
    }
    const amountInLamports = BigInt(Math.floor(amountSol * 1e9));
    const inputMint = WSOL;
    const outputMint = intent.mint;

    const { route, finalAmountLamports } = await this.getBestRoute({
      inputMint,
      outputMint,
      amountIn: amountInLamports,
      slippageBps: intent.slippageBps ?? this.slippageBps,
    });

    const signature = await this.executeSwap(route);
    return {
      signature,
      finalAmountLamports,
    };
  }

  private async executeSell(intent: SwapIntent & { side: "sell" }): Promise<ExecutionResult> {
    const inputMint = intent.mint;
    const outputMint = WSOL;
    let amountInLamports: bigint | undefined = intent.tokenLamports;

    if (amountInLamports == null) {
      const percent = Math.max(0, Math.min(100, Math.floor(intent.percent ?? 100)));
      const accountPubkey = await findFirstTokenAccount(
        this.connection,
        this.wallet.publicKey,
        new PublicKey(inputMint),
      );
      if (!accountPubkey) {
        throw new Error(`No token account for mint ${inputMint}`);
      }
      const snapshot = await getTokenAccountSnapshot(this.connection, accountPubkey);
      const balanceLamports = snapshot.lamports;
      amountInLamports = (balanceLamports * BigInt(percent)) / 100n;
      if (amountInLamports <= 0n) {
        throw new Error(`Token account has no balance for mint ${inputMint}`);
      }
    }

    const { route, finalAmountLamports } = await this.getBestRoute({
      inputMint,
      outputMint,
      amountIn: amountInLamports,
      slippageBps: intent.slippageBps ?? this.slippageBps,
    });

    const signature = await this.executeSwap(route);
    return {
      signature,
      finalAmountLamports,
    };
  }

  private async getBestRoute(params: {
    inputMint: string;
    outputMint: string;
    amountIn: bigint;
    slippageBps: number;
  }): Promise<{ route: any; finalAmountLamports?: bigint }> {
    const quoteUrl = new URL("/v6/quote", this.baseUrl);
    quoteUrl.searchParams.set("inputMint", params.inputMint);
    quoteUrl.searchParams.set("outputMint", params.outputMint);
    quoteUrl.searchParams.set("amount", params.amountIn.toString());
    quoteUrl.searchParams.set("slippageBps", String(params.slippageBps));
    quoteUrl.searchParams.set("swapMode", "ExactIn");
    quoteUrl.searchParams.set("onlyDirectRoutes", "false");
    quoteUrl.searchParams.set("asLegacyTransaction", "false");

    this.logger.info("quote.request", {
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amountIn: params.amountIn.toString(),
    });

    const quote = await this.http
      .get(quoteUrl.toString(), { timeout: 20_000 })
      .then((r) => r.data);

    const route = quote?.routes?.[0];
    if (!route) {
      throw new Error("No route available from Jupiter");
    }

    const outAmount = BigInt(route?.outAmount || "0");
    return {
      route,
      finalAmountLamports: outAmount > 0n ? outAmount : undefined,
    };
  }

  private async executeSwap(route: any): Promise<string> {
    const swapUrl = new URL("/v6/swap", this.baseUrl);
    const body = {
      quoteResponse: route,
      userPublicKey: this.wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: this.priorityFeeLamports,
    };

    const response = await this.http
      .post(swapUrl.toString(), body, { timeout: 20_000 })
      .then((r) => r.data);

    const swapTxB64 = response?.swapTransaction;
    if (!swapTxB64) {
      throw new Error("Jupiter swap response missing transaction");
    }

    const tx = VersionedTransaction.deserialize(Buffer.from(swapTxB64, "base64"));
    tx.sign([this.wallet]);

    const signature = await this.connection.sendRawTransaction(tx.serialize());
    const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    this.logger.info("swap.confirmed", { signature });
    return signature;
  }
}
