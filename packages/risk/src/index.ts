import { Logger, createNullLogger } from "@ai-agent/infra";

export type RiskLimits = {
  maxDailyLossSol: number;
  maxPositionSol: number;
};

export type TradeRecord = {
  timestamp: number;
  side: "buy" | "sell";
  solAmount: number;
  realizedPnlSol?: number;
};

export class RiskEngine {
  private readonly logger: Logger;
  private readonly trades: TradeRecord[] = [];
  private unrealizedExposureSol = 0;

  constructor(private readonly limits: RiskLimits, logger: Logger = createNullLogger()) {
    this.logger = logger;
  }

  canEnterPosition(solAmount: number): boolean {
    const nextExposure = this.unrealizedExposureSol + solAmount;
    if (nextExposure > this.limits.maxPositionSol) {
      this.logger.warn("risk.position.limit", { solAmount, nextExposure });
      return false;
    }
    if (this.computeDailyLoss() >= this.limits.maxDailyLossSol) {
      this.logger.warn("risk.daily.loss.limit", { solAmount });
      return false;
    }
    return true;
  }

  recordTrade(record: TradeRecord): void {
    this.trades.push(record);
    if (record.side === "buy") {
      this.unrealizedExposureSol += record.solAmount;
    } else {
      this.unrealizedExposureSol = Math.max(
        0,
        this.unrealizedExposureSol - record.solAmount,
      );
    }
    if (record.realizedPnlSol) {
      this.logger.info("risk.pnl", { realized: record.realizedPnlSol });
    }
    this.trimOldTrades();
  }

  private computeDailyLoss(): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let loss = 0;
    for (const trade of this.trades) {
      if (trade.timestamp < cutoff) continue;
      if (trade.realizedPnlSol && trade.realizedPnlSol < 0) {
        loss += Math.abs(trade.realizedPnlSol);
      }
    }
    return loss;
  }

  private trimOldTrades(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    while (this.trades.length && this.trades[0].timestamp < cutoff) {
      this.trades.shift();
    }
  }
}
