"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotifyingExecutor = void 0;
function summarizeIntent(intent) {
    if (intent.side === "buy") {
        return `BUY ${intent.solAmount} SOL → ${intent.mint}`;
    }
    if (intent.tokenLamports != null) {
        return `SELL ${intent.tokenLamports.toString()} lamports of ${intent.mint}`;
    }
    const pct = intent.percent ?? 100;
    return `SELL ${pct}% of ${intent.mint}`;
}
class NotifyingExecutor {
    inner;
    notifier;
    constructor(inner, notifier) {
        this.inner = inner;
        this.notifier = notifier;
    }
    async execute(intent) {
        try {
            const result = await this.inner.execute(intent);
            await this.notifier.notify(`✅ ${summarizeIntent(intent)}\nTx: ${result.signature}`, {
                intent,
                result,
            });
            return result;
        }
        catch (err) {
            await this.notifier.notify(`❌ ${summarizeIntent(intent)}`, {
                intent,
                error: err instanceof Error
                    ? { message: err.message, stack: err.stack }
                    : err,
            });
            throw err;
        }
    }
}
exports.NotifyingExecutor = NotifyingExecutor;
//# sourceMappingURL=notifyingExecutor.js.map