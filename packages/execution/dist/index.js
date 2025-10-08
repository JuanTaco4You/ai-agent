"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DryRunExecutor = void 0;
const infra_1 = require("@ai-agent/infra");
/**
 * Placeholder executor that logs intent until real swap providers are wired.
 */
class DryRunExecutor {
    logger;
    constructor(logger = (0, infra_1.createNullLogger)()) {
        this.logger = logger;
    }
    async execute(intent) {
        const meta = { ...intent };
        if ("tokenLamports" in meta && typeof meta.tokenLamports === "bigint") {
            meta.tokenLamports = meta.tokenLamports.toString();
        }
        this.logger.info("execution.dry_run", meta);
        return {
            signature: "dry-run-signature",
            finalAmountLamports: intent.side === "sell" ? intent.tokenLamports ?? undefined : undefined,
        };
    }
}
exports.DryRunExecutor = DryRunExecutor;
__exportStar(require("./jupiter"), exports);
__exportStar(require("./wallet"), exports);
__exportStar(require("./accounts"), exports);
__exportStar(require("./notifyingExecutor"), exports);
//# sourceMappingURL=index.js.map