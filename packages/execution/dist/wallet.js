"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keypairFromSecret = keypairFromSecret;
exports.keypairsFromSecrets = keypairsFromSecrets;
const bs58_1 = __importDefault(require("bs58"));
const web3_js_1 = require("@solana/web3.js");
function keypairFromSecret(secret) {
    const trimmed = secret.trim();
    if (!trimmed) {
        throw new Error("Empty wallet secret provided");
    }
    try {
        const decoded = bs58_1.default.decode(trimmed);
        return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(decoded));
    }
    catch (err) {
        throw new Error(`Failed to decode wallet secret: ${err.message}`);
    }
}
function keypairsFromSecrets(secrets) {
    return secrets.map((secret) => keypairFromSecret(secret));
}
//# sourceMappingURL=wallet.js.map