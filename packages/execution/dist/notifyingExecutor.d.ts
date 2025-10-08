import { Notifier } from "@ai-agent/infra";
import type { ExecutionResult, SwapExecutor, SwapIntent } from "./index";
export declare class NotifyingExecutor implements SwapExecutor {
    private readonly inner;
    private readonly notifier;
    constructor(inner: SwapExecutor, notifier: Notifier);
    execute(intent: SwapIntent): Promise<ExecutionResult>;
}
