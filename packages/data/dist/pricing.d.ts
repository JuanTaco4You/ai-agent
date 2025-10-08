import { AxiosInstance } from "axios";
import { Connection } from "@solana/web3.js";
import { Logger } from "@ai-agent/infra";
export type PriceRecord = {
    usdPrice: number;
} | null;
export type TokenMeta = {
    symbol: string | null;
    name: string | null;
};
export type PricingServiceOptions = {
    connection: Connection;
    jupiterBaseUrl?: string;
    priceTtlMs?: number;
    priceNegativeTtlMs?: number;
    logger?: Logger;
    httpClient?: AxiosInstance;
};
export declare class PricingService {
    private readonly connection;
    private readonly jupiterBaseUrl;
    private readonly logger;
    private readonly priceTtlMs;
    private readonly priceNegativeTtlMs;
    private readonly http;
    private readonly priceCache;
    private readonly metaCache;
    constructor(options: PricingServiceOptions);
    private now;
    private setCachedPrice;
    private getCachedPrice;
    private setCachedMeta;
    private getCachedMeta;
    private getMintDecimalsSafe;
    getTokenPriceDexscreener(mint: string): Promise<PriceRecord>;
    private getTokenPriceJupiterUsd;
    getTokenMeta(mint: string): Promise<TokenMeta | null>;
    getTokenPriceInSol(mint: string): Promise<number | null>;
    getSolUsd(): Promise<number | null>;
}
