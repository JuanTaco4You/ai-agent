import { PricingService } from "./pricing";
export declare class TokenMetadataService {
    private readonly pricing;
    constructor(pricing: PricingService);
    formatTokenLabel(mint: string): Promise<string>;
}
