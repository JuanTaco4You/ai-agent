import axios, { AxiosInstance } from "axios";
import { Connection, PublicKey } from "@solana/web3.js";
import { Logger, createNullLogger } from "@ai-agent/infra";

export type PriceRecord = { usdPrice: number } | null;
export type TokenMeta = { symbol: string | null; name: string | null };

type Cached<T> = { value: T; expiresAt: number };

export type PricingServiceOptions = {
  connection: Connection;
  jupiterBaseUrl?: string;
  priceTtlMs?: number;
  priceNegativeTtlMs?: number;
  logger?: Logger;
  httpClient?: AxiosInstance;
};

const WSOL = "So11111111111111111111111111111111111111112";
const DEFAULT_PRICE_TTL_MS = 15_000;
const DEFAULT_NEGATIVE_TTL_MS = 60_000;

export class PricingService {
  private readonly connection: Connection;
  private readonly jupiterBaseUrl: string;
  private readonly logger: Logger;
  private readonly priceTtlMs: number;
  private readonly priceNegativeTtlMs: number;
  private readonly http: AxiosInstance;

  private readonly priceCache = new Map<string, Cached<PriceRecord>>();
  private readonly metaCache = new Map<string, Cached<TokenMeta | null>>();

  constructor(options: PricingServiceOptions) {
    this.connection = options.connection;
    this.jupiterBaseUrl = options.jupiterBaseUrl || "https://quote-api.jup.ag";
    this.logger = options.logger ?? createNullLogger();
    this.priceTtlMs = Math.max(1_000, options.priceTtlMs ?? DEFAULT_PRICE_TTL_MS);
    this.priceNegativeTtlMs = Math.max(
      5_000,
      Math.min(options.priceNegativeTtlMs ?? DEFAULT_NEGATIVE_TTL_MS, 60_000),
    );
    this.http = options.httpClient ?? axios.create();
  }

  private now(): number {
    return Date.now();
  }

  private setCachedPrice(mint: string, value: PriceRecord, ttlMs: number) {
    this.priceCache.set(mint, {
      value,
      expiresAt: this.now() + ttlMs,
    });
  }

  private getCachedPrice(mint: string): PriceRecord | undefined {
    const cached = this.priceCache.get(mint);
    if (!cached) return undefined;
    if (cached.expiresAt <= this.now()) {
      this.priceCache.delete(mint);
      return undefined;
    }
    return cached.value;
  }

  private setCachedMeta(mint: string, value: TokenMeta | null, ttlMs = 24 * 60 * 60 * 1000) {
    this.metaCache.set(mint, { value, expiresAt: this.now() + ttlMs });
  }

  private getCachedMeta(mint: string): TokenMeta | null | undefined {
    const cached = this.metaCache.get(mint);
    if (!cached) return undefined;
    if (cached.expiresAt <= this.now()) {
      this.metaCache.delete(mint);
      return undefined;
    }
    return cached.value;
  }

  private async getMintDecimalsSafe(mint: string): Promise<number> {
    try {
      const info = await this.connection.getParsedAccountInfo(new PublicKey(mint));
      const decimals = (info?.value as any)?.data?.parsed?.info?.decimals;
      if (Number.isFinite(decimals)) {
        return Number(decimals);
      }
    } catch (err) {
      this.logger.warn("pricing.decimals.error", { mint, error: err });
    }
    return 9;
  }

  async getTokenPriceDexscreener(mint: string): Promise<PriceRecord> {
    const cached = this.getCachedPrice(`ds:${mint}`);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
      const { data } = await this.http.get(url, { timeout: 10_000 });
      const pairs: any[] = data?.pairs || [];
      if (!pairs || pairs.length === 0) {
        this.setCachedPrice(`ds:${mint}`, null, this.priceNegativeTtlMs);
        return null;
      }
      const solPairs = pairs.filter(
        (p) => String(p.chainId).toLowerCase() === "solana",
      );
      const best = (solPairs.length ? solPairs : pairs).sort(
        (a, b) =>
          Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0),
      )[0];
      const priceUsd = Number(
        best?.priceUsd || best?.price?.usd || best?.price_usd,
      );
      const record = Number.isFinite(priceUsd) && priceUsd > 0 ? { usdPrice: priceUsd } : null;
      this.setCachedPrice(`ds:${mint}`, record, record ? this.priceTtlMs : this.priceNegativeTtlMs);
      return record;
    } catch (err) {
      this.logger.warn("pricing.dexscreener.error", { mint, error: err });
      this.setCachedPrice(`ds:${mint}`, null, this.priceNegativeTtlMs);
      return null;
    }
  }

  private async getTokenPriceJupiterUsd(mint: string): Promise<PriceRecord> {
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
      if (!Number.isFinite(solPriceUsd as number) || !solPriceUsd) {
        this.setCachedPrice(cacheKey, null, this.priceNegativeTtlMs);
        return null;
      }
      const priceInSol = Number(outLamports) / 1e9;
      const usdPrice = priceInSol * (solPriceUsd as number);
      if (usdPrice <= 0) {
        this.setCachedPrice(cacheKey, null, this.priceNegativeTtlMs);
        return null;
      }
      const record: PriceRecord = { usdPrice };
      this.setCachedPrice(cacheKey, record, this.priceTtlMs);
      return record;
    } catch (err) {
      this.logger.warn("pricing.jupiter.error", { mint, error: err });
      this.setCachedPrice(cacheKey, null, this.priceNegativeTtlMs);
      return null;
    }
  }

  async getTokenMeta(mint: string): Promise<TokenMeta | null> {
    const cached = this.getCachedMeta(mint);
    if (cached !== undefined) {
      return cached;
    }
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
      const { data } = await this.http.get(url, { timeout: 10_000 });
      const pairs: any[] = data?.pairs || [];
      if (!pairs || pairs.length === 0) {
        this.setCachedMeta(mint, null);
        return null;
      }
      const solPairs = pairs.filter(
        (p) => String(p.chainId).toLowerCase() === "solana",
      );
      const best = (solPairs.length ? solPairs : pairs).sort(
        (a, b) =>
          Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0),
      )[0];
      const baseAddr = String(best?.baseToken?.address || "").toLowerCase();
      const quoteAddr = String(best?.quoteToken?.address || "").toLowerCase();
      const normalizedMint = mint.toLowerCase();
      const meta: TokenMeta = { symbol: null, name: null };
      if (baseAddr === normalizedMint) {
        meta.symbol = String(best?.baseToken?.symbol || "") || null;
        meta.name = String(best?.baseToken?.name || "") || null;
      } else if (quoteAddr === normalizedMint) {
        meta.symbol = String(best?.quoteToken?.symbol || "") || null;
        meta.name = String(best?.quoteToken?.name || "") || null;
      }
      this.setCachedMeta(mint, meta);
      return meta;
    } catch (err) {
      this.logger.warn("pricing.meta.error", { mint, error: err });
      this.setCachedMeta(mint, null);
      return null;
    }
  }

  async getTokenPriceInSol(mint: string): Promise<number | null> {
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
    } catch (err) {
      this.logger.warn("pricing.jupiter.sol.error", { mint, error: err });
    }

    // Fallback to DexScreener USD price divided by SOL/USD
    try {
      const usdRec = await this.getTokenPriceDexscreener(mint);
      const solUsd = await this.getSolUsd();
      const usd = usdRec?.usdPrice;
      if (
        Number.isFinite(usd as number) &&
        Number.isFinite(solUsd as number) &&
        (usd as number) > 0 &&
        (solUsd as number) > 0
      ) {
        return (usd as number) / (solUsd as number);
      }
    } catch (err) {
      this.logger.warn("pricing.sol.fallback.error", { mint, error: err });
    }

    return null;
  }

  async getSolUsd(): Promise<number | null> {
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
