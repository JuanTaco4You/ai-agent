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
exports.FeatureStore = void 0;
const infra_1 = require("@ai-agent/infra");
/**
 * Placeholder in-memory feature store.
 * Replace with persistent cache when wiring live data ingestion.
 */
class FeatureStore {
    logger;
    snapshots = new Map();
    constructor(logger = (0, infra_1.createNullLogger)()) {
        this.logger = logger;
    }
    upsert(snapshot) {
        this.snapshots.set(snapshot.mint, snapshot);
        this.logger.debug("feature_store.upsert", { mint: snapshot.mint });
    }
    get(mint) {
        return this.snapshots.get(mint);
    }
    /**
     * Exposes a shallow copy of all stored snapshots for downstream analysis.
     */
    all() {
        return Array.from(this.snapshots.values());
    }
}
exports.FeatureStore = FeatureStore;
__exportStar(require("./pricing"), exports);
__exportStar(require("./metadata"), exports);
__exportStar(require("./persistence"), exports);
//# sourceMappingURL=index.js.map