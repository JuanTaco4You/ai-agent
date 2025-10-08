export type AgentConfig = {
    rpcUrl: string;
    websocketUrl?: string;
    jupiterBaseUrl: string;
    defaultSlippageBps: number;
    priorityFeeLamports: number | "auto";
    walletSecrets: string[];
    dryRun: boolean;
    maxDailyLossSol: number;
    maxPositionSol: number;
    telegram?: {
        botToken: string;
        chatId: string;
    };
    webhook?: {
        url: string;
    };
    openai?: {
        apiKey: string;
        decisionModel: string;
        fastModel?: string;
        baseUrl: string;
        temperature: number;
        maxTokens?: number;
    };
};
export declare function loadConfig(env?: NodeJS.ProcessEnv): AgentConfig;
