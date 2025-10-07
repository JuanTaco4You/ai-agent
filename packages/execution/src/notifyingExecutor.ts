import { Notifier } from "@ai-agent/infra";
import type { ExecutionResult, SwapExecutor, SwapIntent } from "./index";

function summarizeIntent(intent: SwapIntent): string {
  if (intent.side === "buy") {
    return `BUY ${intent.solAmount} SOL → ${intent.mint}`;
  }
  if (intent.tokenLamports != null) {
    return `SELL ${intent.tokenLamports.toString()} lamports of ${intent.mint}`;
  }
  const pct = intent.percent ?? 100;
  return `SELL ${pct}% of ${intent.mint}`;
}

export class NotifyingExecutor implements SwapExecutor {
  constructor(
    private readonly inner: SwapExecutor,
    private readonly notifier: Notifier,
  ) {}

  async execute(intent: SwapIntent): Promise<ExecutionResult> {
    try {
      const result = await this.inner.execute(intent);
      await this.notifier.notify(
        `✅ ${summarizeIntent(intent)}\nTx: ${result.signature}`,
        {
          intent,
          result,
        },
      );
      return result;
    } catch (err) {
      await this.notifier.notify(`❌ ${summarizeIntent(intent)}`, {
        intent,
        error:
          err instanceof Error
            ? { message: err.message, stack: err.stack }
            : err,
      });
      throw err;
    }
  }
}
