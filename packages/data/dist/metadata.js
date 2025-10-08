"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenMetadataService = void 0;
class TokenMetadataService {
    pricing;
    constructor(pricing) {
        this.pricing = pricing;
    }
    async formatTokenLabel(mint) {
        const meta = await this.pricing.getTokenMeta(mint);
        if (!meta) {
            return mint;
        }
        const { symbol, name } = meta;
        if (symbol && name) {
            return `${name} (${symbol})`;
        }
        if (name)
            return name;
        if (symbol)
            return symbol;
        return mint;
    }
}
exports.TokenMetadataService = TokenMetadataService;
//# sourceMappingURL=metadata.js.map