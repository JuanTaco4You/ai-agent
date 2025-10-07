import { PricingService } from "./pricing";

export class TokenMetadataService {
  constructor(private readonly pricing: PricingService) {}

  async formatTokenLabel(mint: string): Promise<string> {
    const meta = await this.pricing.getTokenMeta(mint);
    if (!meta) {
      return mint;
    }
    const { symbol, name } = meta;
    if (symbol && name) {
      return `${name} (${symbol})`;
    }
    if (name) return name;
    if (symbol) return symbol;
    return mint;
  }
}
