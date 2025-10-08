import { Logger } from "@ai-agent/infra";
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
export declare class OpenAIClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly logger;
    private readonly organization?;
    private readonly project?;
    private readonly fetchFn;
    constructor(options: OpenAIClientOptions);
    createStructuredResponse<T>(params: StructuredResponseParams): Promise<T>;
}
