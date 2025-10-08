"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    RPC_URL: zod_1.z.string().trim().min(1, "RPC_URL is required"),
    WEBSOCKET_URL: zod_1.z.string().trim().optional(),
    JUPITER_BASE_URL: zod_1.z.string().trim().optional(),
    SLIPPAGE_BPS: zod_1.z.string().trim().optional(),
    PRIORITY_FEE_LAMPORTS: zod_1.z.string().trim().optional(),
    SOLANA_WALLETS: zod_1.z.string().optional(),
    SOL_PRIVATE_KEY: zod_1.z.string().optional(),
    WALLET_PRIVATE_KEY: zod_1.z.string().optional(),
    DRY_RUN: zod_1.z.string().optional(),
    MAX_DAILY_LOSS_SOL: zod_1.z.string().optional(),
    MAX_POSITION_SOL: zod_1.z.string().optional(),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().optional(),
    TELEGRAM_CHAT_ID: zod_1.z.string().optional(),
    WEBHOOK_NOTIFY_URL: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_MODEL_DECISION: zod_1.z.string().optional(),
    OPENAI_MODEL_GUARD: zod_1.z.string().optional(),
    OPENAI_MODEL_FAST: zod_1.z.string().optional(),
    OPENAI_BASE_URL: zod_1.z.string().optional(),
    OPENAI_TEMPERATURE: zod_1.z.string().optional(),
    OPENAI_MAX_TOKENS: zod_1.z.string().optional(),
});
function normalizeWalletSecrets(values) {
    return values
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
function parseBool(value) {
    if (!value)
        return false;
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
}
function loadConfig(env = process.env) {
    const parsed = envSchema.parse(env);
    const walletSecrets = (() => {
        const list = parsed.SOLANA_WALLETS
            ? parsed.SOLANA_WALLETS.split(",")
            : [];
        const normalized = normalizeWalletSecrets(list);
        if (normalized.length > 0)
            return normalized;
        const fallback = normalizeWalletSecrets([parsed.SOL_PRIVATE_KEY, parsed.WALLET_PRIVATE_KEY].filter(Boolean));
        return fallback;
    })();
    const slippageRaw = parsed.SLIPPAGE_BPS?.trim();
    const slippage = Number(slippageRaw);
    const defaultSlippageBps = Number.isFinite(slippage) && slippage > 0
        ? Math.floor(slippage)
        : 1500;
    const priorityRaw = parsed.PRIORITY_FEE_LAMPORTS?.trim()?.toLowerCase();
    let priorityFeeLamports = "auto";
    if (priorityRaw && priorityRaw !== "auto") {
        const n = Number(priorityRaw);
        if (Number.isFinite(n) && n >= 0) {
            priorityFeeLamports = Math.floor(n);
        }
    }
    const dryRun = parseBool(parsed.DRY_RUN);
    const maxDailyLoss = Number(parsed.MAX_DAILY_LOSS_SOL);
    const maxPosition = Number(parsed.MAX_POSITION_SOL);
    const telegramToken = parsed.TELEGRAM_BOT_TOKEN?.trim();
    const telegramChat = parsed.TELEGRAM_CHAT_ID?.trim();
    const webhookUrl = parsed.WEBHOOK_NOTIFY_URL?.trim();
    const openaiApiKey = parsed.OPENAI_API_KEY?.trim();
    const openaiDecisionModel = parsed.OPENAI_MODEL_DECISION?.trim() ||
        parsed.OPENAI_MODEL_GUARD?.trim() ||
        "gpt-4.1";
    const openaiFastModel = parsed.OPENAI_MODEL_FAST?.trim() || undefined;
    const openaiBaseUrl = parsed.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
    const openaiTemperatureRaw = parsed.OPENAI_TEMPERATURE?.trim();
    const openaiTemperature = Number(openaiTemperatureRaw);
    const openaiMaxTokensRaw = parsed.OPENAI_MAX_TOKENS?.trim();
    const openaiMaxTokens = Number(openaiMaxTokensRaw);
    return {
        rpcUrl: parsed.RPC_URL.trim(),
        websocketUrl: parsed.WEBSOCKET_URL?.trim() || undefined,
        jupiterBaseUrl: parsed.JUPITER_BASE_URL?.trim() || "https://quote-api.jup.ag",
        defaultSlippageBps,
        priorityFeeLamports,
        walletSecrets,
        dryRun,
        maxDailyLossSol: Number.isFinite(maxDailyLoss) && maxDailyLoss > 0 ? maxDailyLoss : 5,
        maxPositionSol: Number.isFinite(maxPosition) && maxPosition > 0 ? maxPosition : 0.5,
        telegram: telegramToken && telegramChat
            ? {
                botToken: telegramToken,
                chatId: telegramChat,
            }
            : undefined,
        webhook: webhookUrl
            ? {
                url: webhookUrl,
            }
            : undefined,
        openai: openaiApiKey
            ? {
                apiKey: openaiApiKey,
                decisionModel: openaiDecisionModel,
                fastModel: openaiFastModel,
                baseUrl: openaiBaseUrl,
                temperature: Number.isFinite(openaiTemperature) && openaiTemperature >= 0
                    ? openaiTemperature
                    : 0.2,
                maxTokens: Number.isFinite(openaiMaxTokens) && openaiMaxTokens > 0
                    ? Math.floor(openaiMaxTokens)
                    : undefined,
            }
            : undefined,
    };
}
//# sourceMappingURL=config.js.map