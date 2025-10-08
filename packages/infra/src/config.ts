import { z } from "zod";

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

const envSchema = z.object({
  RPC_URL: z.string().trim().min(1, "RPC_URL is required"),
  WEBSOCKET_URL: z.string().trim().optional(),
  JUPITER_BASE_URL: z.string().trim().optional(),
  SLIPPAGE_BPS: z.string().trim().optional(),
  PRIORITY_FEE_LAMPORTS: z.string().trim().optional(),
  SOLANA_WALLETS: z.string().optional(),
  SOL_PRIVATE_KEY: z.string().optional(),
  WALLET_PRIVATE_KEY: z.string().optional(),
  DRY_RUN: z.string().optional(),
  MAX_DAILY_LOSS_SOL: z.string().optional(),
  MAX_POSITION_SOL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  WEBHOOK_NOTIFY_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_DECISION: z.string().optional(),
  OPENAI_MODEL_GUARD: z.string().optional(),
  OPENAI_MODEL_FAST: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_TEMPERATURE: z.string().optional(),
  OPENAI_MAX_TOKENS: z.string().optional(),
});

function normalizeWalletSecrets(values: string[]): string[] {
  return values
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const parsed = envSchema.parse(env);

  const walletSecrets = (() => {
    const list = parsed.SOLANA_WALLETS
      ? parsed.SOLANA_WALLETS.split(",")
      : [];
    const normalized = normalizeWalletSecrets(list);
    if (normalized.length > 0) return normalized;
    const fallback = normalizeWalletSecrets(
      [parsed.SOL_PRIVATE_KEY, parsed.WALLET_PRIVATE_KEY].filter(
        Boolean,
      ) as string[],
    );
    return fallback;
  })();

  const slippageRaw = parsed.SLIPPAGE_BPS?.trim();
  const slippage = Number(slippageRaw);
  const defaultSlippageBps = Number.isFinite(slippage) && slippage > 0
    ? Math.floor(slippage)
    : 1500;

  const priorityRaw = parsed.PRIORITY_FEE_LAMPORTS?.trim()?.toLowerCase();
  let priorityFeeLamports: number | "auto" = "auto";
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
  const openaiDecisionModel =
    parsed.OPENAI_MODEL_DECISION?.trim() ||
    parsed.OPENAI_MODEL_GUARD?.trim() ||
    "gpt-4.1";
  const openaiFastModel = parsed.OPENAI_MODEL_FAST?.trim() || undefined;
  const openaiBaseUrl =
    parsed.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
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
    maxDailyLossSol:
      Number.isFinite(maxDailyLoss) && maxDailyLoss > 0 ? maxDailyLoss : 5,
    maxPositionSol:
      Number.isFinite(maxPosition) && maxPosition > 0 ? maxPosition : 0.5,
    telegram:
      telegramToken && telegramChat
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
          temperature:
            Number.isFinite(openaiTemperature) && openaiTemperature >= 0
              ? openaiTemperature
              : 0.2,
          maxTokens:
            Number.isFinite(openaiMaxTokens) && openaiMaxTokens > 0
              ? Math.floor(openaiMaxTokens)
              : undefined,
        }
      : undefined,
  };
}
