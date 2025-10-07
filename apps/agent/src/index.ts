import path from "path";
import { Connection } from "@solana/web3.js";
import {
  createFileLogger,
  childLogger,
  loadConfig,
  ConsoleNotifier,
  TelegramNotifier,
  WebhookNotifier,
  NotifierManager,
  Notifier,
} from "@ai-agent/infra";
import { FeatureStore } from "@ai-agent/data";
import {
  DryRunExecutor,
  JupiterSwapExecutor,
  keypairsFromSecrets,
  NotifyingExecutor,
  SwapExecutor,
} from "@ai-agent/execution";
import { RiskEngine } from "@ai-agent/risk";

async function main(): Promise<void> {
  const config = loadConfig();
  const rootLogger = createFileLogger(
    path.join(process.cwd(), "logs", "agent.log"),
    "AGENT",
  );

  rootLogger.info("agent.startup", {
    dryRun: config.dryRun,
    walletsLoaded: config.walletSecrets.length,
  });

  const featureStore = new FeatureStore(childLogger(rootLogger, "Features"));
  const connection = new Connection(config.rpcUrl, {
    commitment: "confirmed",
    wsEndpoint: config.websocketUrl,
  });

  const riskEngine = new RiskEngine(
    {
      maxDailyLossSol: config.maxDailyLossSol,
      maxPositionSol: config.maxPositionSol,
    },
    childLogger(rootLogger, "Risk"),
  );

  rootLogger.info("agent.risk.ready", {
    limits: {
      maxDailyLossSol: config.maxDailyLossSol,
      maxPositionSol: config.maxPositionSol,
    },
  });

  const notifierLogger = childLogger(rootLogger, "Notify");
  const notifiers: Notifier[] = [new ConsoleNotifier(notifierLogger)];
  if (config.telegram) {
    notifiers.push(
      new TelegramNotifier(
        config.telegram.botToken,
        config.telegram.chatId,
        childLogger(notifierLogger, "Telegram"),
      ),
    );
  }
  if (config.webhook) {
    notifiers.push(
      new WebhookNotifier(
        config.webhook.url,
        childLogger(notifierLogger, "Webhook"),
      ),
    );
  }
  const notifierManager = new NotifierManager(notifiers);

  let executor: SwapExecutor;
  if (!config.dryRun && config.walletSecrets.length > 0) {
    const [wallet] = keypairsFromSecrets(config.walletSecrets);
    executor = new JupiterSwapExecutor({
      connection,
      wallet,
      baseUrl: config.jupiterBaseUrl,
      slippageBps: config.defaultSlippageBps,
      priorityFeeLamports: config.priorityFeeLamports,
      logger: childLogger(rootLogger, "Jupiter"),
    });
    rootLogger.info("agent.executor.ready", { mode: "live" });
  } else {
    executor = new DryRunExecutor(childLogger(rootLogger, "DryRun"));
    rootLogger.info("agent.executor.ready", { mode: "dry-run" });
  }

  // Demo: seed a mock feature snapshot for downstream tools.
  const mint = "DemoMint1111111111111111111111111111111111";
  featureStore.upsert({
    timestamp: Date.now(),
    mint,
    priceSol: 0.01,
    liquidityUsd: 1000,
    velocity: 0.5,
  });

  const snapshot = featureStore.get(mint);
  rootLogger.info("agent.snapshot", snapshot);

  const notifyingExecutor = new NotifyingExecutor(executor, notifierManager);
  executor = notifyingExecutor;

  if (config.dryRun || config.walletSecrets.length === 0) {
    if (!riskEngine.canEnterPosition(0.1)) {
      rootLogger.warn("agent.risk.blocked", {
        reason: "Position limit",
        solAmount: 0.1,
      });
      return;
    }
    const result = await executor.execute({
      mint,
      side: "buy",
      solAmount: 0.1,
      slippageBps: config.defaultSlippageBps,
    });
    riskEngine.recordTrade({
      timestamp: Date.now(),
      side: "buy",
      solAmount: 0.1,
    });
    rootLogger.info("agent.execution.result", result);
  } else {
    rootLogger.info("agent.live.mode", {
      message: "Live mode enabled; awaiting strategy directives.",
    });
  }
}

main().catch((err) => {
  console.error("agent fatal error", err);
  process.exitCode = 1;
});
