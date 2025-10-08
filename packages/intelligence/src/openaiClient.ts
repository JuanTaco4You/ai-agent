import { Logger, createNullLogger } from "@ai-agent/infra";

export type JsonSchemaDefinition = {
  name: string;
  schema: Record<string, unknown>;
};

export type StructuredResponseParams = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: JsonSchemaDefinition;
  temperature?: number;
  maxTokens?: number;
};

export type OpenAIClientOptions = {
  apiKey: string;
  baseUrl?: string;
  logger?: Logger;
  organization?: string;
  project?: string;
};

export class OpenAIClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly organization?: string;
  private readonly project?: string;
  private readonly fetchFn: (input: string, init?: Record<string, unknown>) => Promise<any>;

  constructor(options: OpenAIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    this.logger = options.logger ?? createNullLogger();
    this.organization = options.organization;
    this.project = options.project;

    const globalFetch = (globalThis as any).fetch;
    if (typeof globalFetch !== "function") {
      throw new Error("Global fetch API is not available in this runtime.");
    }
    this.fetchFn = globalFetch.bind(globalThis);
  }

  async createStructuredResponse<T>(params: StructuredResponseParams): Promise<T> {
    const url = `${this.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.organization) {
      headers["OpenAI-Organization"] = this.organization;
    }
    if (this.project) {
      headers["OpenAI-Project"] = this.project;
    }

    const body: Record<string, unknown> = {
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: params.schema.name,
          schema: params.schema.schema,
        },
      },
    };

    if (params.temperature !== undefined) {
      body.temperature = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      body.max_tokens = params.maxTokens;
    }

    const response = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      this.logger.error("openai.error", {
        status: response.status,
        body: errorBody,
      });
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const choice = payload?.choices?.[0]?.message?.content;
    if (typeof choice !== "string") {
      this.logger.warn("openai.malformed_response", { payload });
      throw new Error("OpenAI response missing content.");
    }

    try {
      return JSON.parse(choice) as T;
    } catch (err) {
      this.logger.error("openai.parse_error", { error: err, content: choice });
      throw new Error("Failed to parse OpenAI JSON response.");
    }
  }
}
