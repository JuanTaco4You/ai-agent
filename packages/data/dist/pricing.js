"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const axios_1 = __importDefault(require("axios"));
const web3_js_1 = require("@solana/web3.js");
const infra_1 = require("@ai-agent/infra");
const WSOL = "So11111111111111111111111111111111111111112";
const DEFAULT_PRICE_TTL_MS = 15_000;
const DEFAULT_NEGATIVE_TTL_MS = 60_000;
class PricingService {
    connection;
    jupiterBaseUrl;
    logger;
    priceTtlMs;
    priceNegativeTtlMs;
    http;
    priceCache = new Map();
    metaCache = new Map();
    constructor(options) {
        this.connection = options.connection;
        this.jupiterBaseUrl = options.jupiterBaseUrl || "https://quote-api.jup.ag";
        this.logger = options.logger ?? (0, infra_1.createNullLogger)();
        this.priceTtlMs = Math.max(1_000, options.priceTtlMs ?? DEFAULT_PRICE_TTL_MS);
        this.priceNegativeTtlMs = Math.max(5_000, Math.min(options.priceNegativeTtlMs ?? DEFAULT_NEGATIVE_TTL_MS, 60_000));
        this.http = options.httpClient ?? axios_1.default.create();
    }
    now() {
        return Date.now();
    }
    setCachedPrice(mint, value, ttlMs) {
        this.priceCache.set(mint, {
            value,
            expiresAt: this.now() + ttlMs,
        });
    }
    getCachedPrice(mint) {
        const cached = this.priceCache.get(mint);
        if (!cached)
            return undefined;
        if (cached.expiresAt <= this.now()) {
            this.priceCache.delete(mint);
            return undefined;
        }
        return cached.value;
    }
    setCachedMeta(mint, value, ttlMs = 24 * 60 * 60 * 1000) {
        this.metaCache.set(mint, { value, expiresAt: this.now() + ttlMs });
    }
    getCachedMeta(mint) {
        const cached = this.metaCache.get(mint);
        if (!cached)
            return undefined;
        if (cached.expiresAt <= this.now()) {
            this.metaCache.delete(mint);
            return undefined;
        }
        return cached.value;
    }
    async getMintDecimalsSafe(mint) {
        try {
            const info = await this.connection.getParsedAccountInfo(new web3_js_1.PublicKey(mint));
            const decimals = info?.value?.data?.parsed?.info?.decimals;
            if (Number.isFinite(decimals)) {
                return Number(decimals);
            }
        }
        catch (err) {
            this.logger.warn("pricing.decimals.error", { mint, error: err });
        }
        return 9;
    }
    async getTokenPriceDexscreener(mint) {
        const cached = this.getCachedPrice(`ds:${mint}`);
        if (cached !== undefined) {
            return cached;
        }
        try {
            const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
            const { data } = await this.http.get(url, { timeout: 10_000 });
            const pairs = data?.pairs || [];
            if (!pairs || pairs.length === 0) {
                this.setCachedPrice(`ds:${mint}`, null, this.priceNegativeTtlMs);
                return null;
            }
            const solPairs = pairs.filter((p) => String(p.chainId).toLowerCase() === "solana");
            const best = (solPairs.length ? solPairs : pairs).sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
            const priceUsd = Number(best?.priceUsd || best?.price?.usd || best?.price_usd);
            const record = Number.isFinite(priceUsd) && priceUsd > 0 ? { usdPrice: priceUsd } : null;
            this.setCachedPrice(`ds:${mint}`, record, record ? this.priceTtlMs : this.priceNegativeTtlMs);
            return record;
        }
        catch (err) {
            this.logger.warn("pricing.dexscreener.error", { mint, error: err });
            this.setCachedPrice(`ds:${mint}`, null, this.priceNegativeTtlMs);
            return null;
        }
    }
    async getTokenPriceJupiterUsd(mint) {
        const cacheKey = `jup:${mint}`;
        const cached = this.getCachedPrice(cacheKey);
        if (cached !== undefined) {
            return cached;
        }
        try {
            const decimals = await this.getMintDecimalsSafe(mint);
            const amountIn = BigInt(10) ** BigInt(decimals); // 1 token in base units
            const quoteUrl = new URL("/v6/quote", this.jupiterBaseUrl);
            quoteUrl.searchParams.set("inputMint", mint);
            quoteUrl.searchParams.set("outputMint", WSOL);
            quoteUrl.searchParams.set("amount", amountIn.toString());
            quoteUrl.searchParams.set("slippageBps", "50");
            quoteUrl.searchParams.set("swapMode", "ExactIn");
            quoteUrl.searchParams.set("onlyDirectRoutes", "false");
            quoteUrl.searchParams.set("asLegacyTransaction", "false");
            const response = await this.http
                .get(quoteUrl.toString(), { timeout: 10_000 })
                .then((r) => r.data);
            const route = response?.routes?.[0];
            const outLamports = BigInt(route?.outAmount || "0");
            if (outLamports <= 0n) {
                this.setCachedPrice(cacheKey, null, this.priceNegativeTtlMs);
                return null;
            }
            const solPriceUsd = await this.getSolUsd();
            if (!Number.isFinite(solPriceUsd) || !solPriceUsd) {
                this.setCachedPrice(cacheKey, null, this.priceNegativeTtlMs);
                return null;
            }
            const priceInSol = Number(outLamports) / 1e9;
            const usdPrice = priceInSol * solPriceUsd;
            if (usdPrice <= 0) {
                this.setCachedPrice(cacheKey, null, this.priceNegativeTtlMs);
                return null;
            }
            const record = { usdPrice };
            this.setCachedPrice(cacheKey, record, this.priceTtlMs);
            return record;
        }
        catch (err) {
            this.logger.warn("pricing.jupiter.error", { mint, error: err });
            this.setCachedPrice(cacheKey, null, this.priceNegativeTtlMs);
            return null;
        }
    }
    async getTokenMeta(mint) {
        const cached = this.getCachedMeta(mint);
        if (cached !== undefined) {
            return cached;
        }
        try {
            const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
            const { data } = await this.http.get(url, { timeout: 10_000 });
            const pairs = data?.pairs || [];
            if (!pairs || pairs.length === 0) {
                this.setCachedMeta(mint, null);
                return null;
            }
            const solPairs = pairs.filter((p) => String(p.chainId).toLowerCase() === "solana");
            const best = (solPairs.length ? solPairs : pairs).sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
            const baseAddr = String(best?.baseToken?.address || "").toLowerCase();
            const quoteAddr = String(best?.quoteToken?.address || "").toLowerCase();
            const normalizedMint = mint.toLowerCase();
            const meta = { symbol: null, name: null };
            if (baseAddr === normalizedMint) {
                meta.symbol = String(best?.baseToken?.symbol || "") || null;
                meta.name = String(best?.baseToken?.name || "") || null;
            }
            else if (quoteAddr === normalizedMint) {
                meta.symbol = String(best?.quoteToken?.symbol || "") || null;
                meta.name = String(best?.quoteToken?.name || "") || null;
            }
            this.setCachedMeta(mint, meta);
            return meta;
        }
        catch (err) {
            this.logger.warn("pricing.meta.error", { mint, error: err });
            this.setCachedMeta(mint, null);
            return null;
        }
    }
    async getTokenPriceInSol(mint) {
        // Try Jupiter first for SOL-denominated price
        const decimals = await this.getMintDecimalsSafe(mint);
        try {
            const amountIn = BigInt(10) ** BigInt(decimals);
            const quoteUrl = new URL("/v6/quote", this.jupiterBaseUrl);
            quoteUrl.searchParams.set("inputMint", mint);
            quoteUrl.searchParams.set("outputMint", WSOL);
            quoteUrl.searchParams.set("amount", amountIn.toString());
            quoteUrl.searchParams.set("slippageBps", "50");
            quoteUrl.searchParams.set("swapMode", "ExactIn");
            quoteUrl.searchParams.set("onlyDirectRoutes", "false");
            quoteUrl.searchParams.set("asLegacyTransaction", "false");
            const response = await this.http
                .get(quoteUrl.toString(), { timeout: 10_000 })
                .then((r) => r.data);
            const route = response?.routes?.[0];
            const outLamports = BigInt(route?.outAmount || "0");
            if (outLamports > 0n) {
                return Number(outLamports) / 1e9;
            }
        }
        catch (err) {
            this.logger.warn("pricing.jupiter.sol.error", { mint, error: err });
        }
        // Fallback to DexScreener USD price divided by SOL/USD
        try {
            const usdRec = await this.getTokenPriceDexscreener(mint);
            const solUsd = await this.getSolUsd();
            const usd = usdRec?.usdPrice;
            if (Number.isFinite(usd) &&
                Number.isFinite(solUsd) &&
                usd > 0 &&
                solUsd > 0) {
                return usd / solUsd;
            }
        }
        catch (err) {
            this.logger.warn("pricing.sol.fallback.error", { mint, error: err });
        }
        return null;
    }
    async getSolUsd() {
        const cached = this.getCachedPrice("ds:WSOL");
        if (cached !== undefined && cached) {
            return cached.usdPrice;
        }
        const ds = await this.getTokenPriceDexscreener(WSOL);
        if (ds && Number.isFinite(ds.usdPrice) && ds.usdPrice > 0) {
            this.setCachedPrice("ds:WSOL", ds, this.priceTtlMs);
            return ds.usdPrice;
        }
        return null;
    }
}
exports.PricingService = PricingService;
//# sourceMappingURL=pricing.js.map