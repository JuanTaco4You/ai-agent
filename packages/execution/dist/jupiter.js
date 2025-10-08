"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JupiterSwapExecutor = void 0;
const axios_1 = __importDefault(require("axios"));
const web3_js_1 = require("@solana/web3.js");
const infra_1 = require("@ai-agent/infra");
const accounts_1 = require("./accounts");
const WSOL = "So11111111111111111111111111111111111111112";
class JupiterSwapExecutor {
    connection;
    wallet;
    logger;
    http;
    baseUrl;
    slippageBps;
    priorityFeeLamports;
    constructor(options) {
        this.connection = options.connection;
        this.wallet = options.wallet;
        this.logger = (0, infra_1.childLogger)(options.logger ?? (0, infra_1.createNullLogger)(), "Jupiter");
        this.http = options.httpClient ?? axios_1.default.create();
        this.baseUrl = options.baseUrl || "https://quote-api.jup.ag";
        this.slippageBps = options.slippageBps ?? 1500;
        this.priorityFeeLamports = options.priorityFeeLamports ?? "auto";
    }
    async execute(intent) {
        if (intent.side === "buy") {
            return this.executeBuy(intent);
        }
        return this.executeSell(intent);
    }
    async executeBuy(intent) {
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
    async executeSell(intent) {
        const inputMint = intent.mint;
        const outputMint = WSOL;
        let amountInLamports = intent.tokenLamports;
        if (amountInLamports == null) {
            const percent = Math.max(0, Math.min(100, Math.floor(intent.percent ?? 100)));
            const accountPubkey = await (0, accounts_1.findFirstTokenAccount)(this.connection, this.wallet.publicKey, new web3_js_1.PublicKey(inputMint));
            if (!accountPubkey) {
                throw new Error(`No token account for mint ${inputMint}`);
            }
            const snapshot = await (0, accounts_1.getTokenAccountSnapshot)(this.connection, accountPubkey);
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
    async getBestRoute(params) {
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
    async executeSwap(route) {
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
        const tx = web3_js_1.VersionedTransaction.deserialize(Buffer.from(swapTxB64, "base64"));
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
exports.JupiterSwapExecutor = JupiterSwapExecutor;
//# sourceMappingURL=jupiter.js.map