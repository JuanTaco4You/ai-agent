import { MarketFeatureSnapshot } from "@ai-agent/data";
export type AgentDecisionAction = "buy" | "sell" | "hold";
export type AgentDecision = {
    action: AgentDecisionAction;
    rationale: string;
    confidence: number;
    mint?: string;
    sizeSol?: number;
    slippageBps?: number;
    notes?: string;
};
export type DecisionContext = {
    features: MarketFeatureSnapshot[];
    riskSummary?: {
        maxPositionSol: number;
        remainingExposureSol: number;
    };
};
