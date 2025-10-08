import { Logger } from "@ai-agent/infra";
import { OpenAIClient } from "./openaiClient";
import { AgentDecision, DecisionContext } from "./types";
type DecisionAgentOptions = {
    client: OpenAIClient;
    model: string;
    temperature?: number;
    maxTokens?: number;
    logger?: Logger;
    systemPrompt?: string;
};
export declare class DecisionAgent {
    private readonly client;
    private readonly model;
    private readonly temperature?;
    private readonly maxTokens?;
    private readonly logger;
    private readonly systemPrompt;
    constructor(options: DecisionAgentOptions);
    decide(context: DecisionContext): Promise<AgentDecision>;
    private buildUserPrompt;
    private summarizeFeature;
    private normalizeDecision;
    private normalizeAction;
    private numberFromUnknown;
}
export {};
