import { Logger, createNullLogger } from "@ai-agent/infra";
import { MarketFeatureSnapshot } from "@ai-agent/data";

import { OpenAIClient, JsonSchemaDefinition } from "./openaiClient";
import { AgentDecision, DecisionContext } from "./types";

type DecisionAgentOptions = {
  client: OpenAIClient;
  model: string;
  temperature?: number;
  maxTokens?: number;
  logger?: Logger;
  systemPrompt?: string;
};

type RawDecision = {
  action?: string;
  mint?: string;
  size_sol?: number | string;
  slippage_bps?: number | string;
  rationale?: string;
  confidence?: number | string;
  notes?: string;
};

const DEFAULT_SYSTEM_PROMPT = [
  "You are an autonomous Solana trading strategist.",
  "Review the provided market features and recommend a single action.",
  "Prefer holding when data is insufficient or risk is unclear.",
  "If you buy or sell, choose a mint that appears in the market data and size in SOL.",
  "Return your answer as structured JSON that matches the provided schema.",
].join(" ");

const DECISION_SCHEMA: JsonSchemaDefinition = {
  name: "trading_agent_decision",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      action: {
        type: "string",
        description: "Trading directive to execute.",
        enum: ["buy", "sell", "hold"],
      },
      mint: {
        type: "string",
        description: "Token mint to trade. Required for buy or sell.",
      },
      size_sol: {
        type: "number",
        description: "Positive SOL size to allocate to the trade.",
        minimum: 0,
      },
      slippage_bps: {
        type: "number",
        description: "Desired slippage tolerance in basis points.",
        minimum: 0,
      },
      confidence: {
        type: "number",
        description: "Confidence score between 0 and 1.",
        minimum: 0,
        maximum: 1,
      },
      rationale: {
        type: "string",
        description: "Short explanation for the decision.",
      },
      notes: {
        type: "string",
        description: "Optional additional observations.",
      },
    },
    required: ["action", "rationale", "confidence"],
  },
};

export class DecisionAgent {
  private readonly client: OpenAIClient;
  private readonly model: string;
  private readonly temperature?: number;
  private readonly maxTokens?: number;
  private readonly logger: Logger;
  private readonly systemPrompt: string;

  constructor(options: DecisionAgentOptions) {
    this.client = options.client;
    this.model = options.model;
    this.temperature = options.temperature;
    this.maxTokens = options.maxTokens;
    this.logger = options.logger ?? createNullLogger();
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  async decide(context: DecisionContext): Promise<AgentDecision> {
    if (!context.features.length) {
      return {
        action: "hold",
        rationale: "No market features provided.",
        confidence: 0,
      };
    }

    const userPrompt = this.buildUserPrompt(context);

    try {
      const raw = await this.client.createStructuredResponse<RawDecision>({
        model: this.model,
        systemPrompt: this.systemPrompt,
        userPrompt,
        schema: DECISION_SCHEMA,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      });
      const decision = this.normalizeDecision(raw, context);
      this.logger.info("decision.agent.output", decision);
      return decision;
    } catch (err) {
      this.logger.error("decision.agent.error", { error: err });
      return {
        action: "hold",
        rationale: "Failed to obtain decision from OpenAI.",
        confidence: 0,
      };
    }
  }

  private buildUserPrompt(context: DecisionContext): string {
    const markets = context.features.map((feature) =>
      this.summarizeFeature(feature),
    );
    const envelope = {
      markets,
      risk: context.riskSummary ?? null,
      guidance: {
        capitalDiscipline:
          "Align size with remaining exposure and avoid over-concentration.",
        executionRules:
          "Only trade provided mints. Default to hold if unclear.",
      },
    };
    return [
      "Evaluate the following Solana market snapshot and respond with the best action.",
      "```json",
      JSON.stringify(envelope, null, 2),
      "```",
    ].join("\n");
  }

  private summarizeFeature(feature: MarketFeatureSnapshot) {
    return {
      mint: feature.mint,
      priceSol: feature.priceSol ?? null,
      liquidityUsd: feature.liquidityUsd ?? null,
      velocity: feature.velocity ?? null,
      timestamp: feature.timestamp,
    };
  }

  private normalizeDecision(
    raw: RawDecision,
    context: DecisionContext,
  ): AgentDecision {
    const normalizedAction = this.normalizeAction(raw.action);
    const fallbackMint = context.features[0]?.mint;
    const mint =
      raw.mint && typeof raw.mint === "string" ? raw.mint.trim() : fallbackMint;

    const sizeValue = this.numberFromUnknown(raw.size_sol);
    const slippageValue = this.numberFromUnknown(raw.slippage_bps);
    const confidenceValue = this.numberFromUnknown(raw.confidence);

    const clampedConfidence =
      confidenceValue != null
        ? Math.min(1, Math.max(0, confidenceValue))
        : 0;

    const rationale =
      raw.rationale && typeof raw.rationale === "string"
        ? raw.rationale.trim()
        : "No rationale supplied.";

    const decision: AgentDecision = {
      action: normalizedAction,
      rationale,
      confidence: clampedConfidence,
      notes:
        raw.notes && typeof raw.notes === "string"
          ? raw.notes.trim()
          : undefined,
    };

    if (normalizedAction !== "hold") {
      if (!mint) {
        decision.action = "hold";
        decision.mint = undefined;
      } else {
        decision.mint = mint;
        if (sizeValue != null && sizeValue > 0) {
          decision.sizeSol = sizeValue;
        }
        if (slippageValue != null && slippageValue >= 0) {
          decision.slippageBps = Math.floor(slippageValue);
        }
      }
    }

    return decision;
  }

  private normalizeAction(action?: string): AgentDecision["action"] {
    const normalized = (action || "").toLowerCase();
    if (normalized === "buy" || normalized === "sell") {
      return normalized;
    }
    return "hold";
  }

  private numberFromUnknown(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
