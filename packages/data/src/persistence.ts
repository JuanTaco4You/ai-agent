import sqlite3 from "sqlite3";
import { Logger, createNullLogger } from "@ai-agent/infra";

export class SqliteDatabase {
  private readonly db: sqlite3.Database;
  private readonly logger: Logger;

  constructor(
    filePath = "./trading.db",
    logger: Logger = createNullLogger(),
  ) {
    const sqlite = sqlite3.verbose();
    this.logger = logger;
    this.db = new sqlite.Database(filePath, (err) => {
      if (err) {
        this.logger.error("db.open.error", err);
      } else {
        this.logger.info("db.open", { filePath });
      }
    });
  }

  async initializeSchema(): Promise<void> {
    const statements: string[] = [
      `CREATE TABLE IF NOT EXISTS buys (id INTEGER PRIMARY KEY, contractAddress TEXT, purchasedPrice FLOAT, priceFactor INTEGER, platform TEXT, chain TEXT, date TEXT);`,
      `CREATE TABLE IF NOT EXISTS lastsignal (id INTEGER PRIMARY KEY, signalId INTEGER, date TEXT);`,
      `CREATE TABLE IF NOT EXISTS signal_seen (action TEXT NOT NULL, contractAddress TEXT NOT NULL, count INTEGER NOT NULL, firstAt TEXT NOT NULL, lastAt TEXT NOT NULL, PRIMARY KEY (action, contractAddress));`,
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);`,
      `CREATE TABLE IF NOT EXISTS lookuptables (id INTEGER PRIMARY KEY, lutAddress TEXT);`,
      `CREATE TABLE IF NOT EXISTS strategies (id INTEGER PRIMARY KEY, mint TEXT, mode TEXT, sl_enabled INTEGER, sl_pct REAL, tp_pct REAL, trail_enabled INTEGER, trail_pct REAL, ladder_enabled INTEGER, ladder_json TEXT, ladder_default_json TEXT, moonbag_enabled INTEGER, moonbag_pct REAL, moonbag_scope TEXT, min_hold_tokens INTEGER, min_hold_value_sol REAL, min_hold_value_usd REAL, updated_at TEXT);`,
      `CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY, mint TEXT NOT NULL, wallet TEXT, entry_basis_sol REAL, entry_basis_usd REAL, size_lamports TEXT, decimals INTEGER, high_water_usd REAL, high_water_sol REAL, status TEXT, last_action_at TEXT, updated_at TEXT);`,
      `CREATE TABLE IF NOT EXISTS moonbags (id INTEGER PRIMARY KEY, mint TEXT NOT NULL, wallet TEXT, tokens_lamports TEXT, decimals INTEGER, created_at TEXT, scope_reason TEXT, source_strategy_id INTEGER, active INTEGER DEFAULT 1);`,
      `CREATE TABLE IF NOT EXISTS triggers_log (id INTEGER PRIMARY KEY, mint TEXT, wallet TEXT, trigger_type TEXT, target REAL, percent_sold REAL, txid TEXT, ts TEXT);`,
      `CREATE TABLE IF NOT EXISTS copy_strategies (id INTEGER PRIMARY KEY, leader_wallet TEXT NOT NULL, label TEXT, enabled INTEGER NOT NULL DEFAULT 1, follow_buys INTEGER NOT NULL DEFAULT 1, follow_sells INTEGER NOT NULL DEFAULT 1, buy_amount_sol REAL, buy_multiplier REAL, min_buy_sol REAL, max_buy_sol REAL, last_signature TEXT, last_processed_slot INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_copy_strategies_wallet ON copy_strategies(leader_wallet);`,
      `ALTER TABLE positions ADD COLUMN high_water_sol REAL`,
      `ALTER TABLE strategies ADD COLUMN ladder_default_json TEXT`,
      `ALTER TABLE strategies ADD COLUMN ladder_enabled INTEGER DEFAULT 1`,
      `ALTER TABLE strategies ADD COLUMN min_hold_value_usd REAL`,
      `ALTER TABLE strategies ADD COLUMN sl_enabled INTEGER DEFAULT 1`,
      `ALTER TABLE strategies ADD COLUMN trail_enabled INTEGER DEFAULT 1`
    ];

    for (const statement of statements) {
      await this.run(statement).catch((err) => {
        const known = /duplicate column name|already exists/i.test(
          String(err?.message || ""),
        );
        if (!known) {
          this.logger.warn("db.migration.error", { statement, error: err });
        }
      });
    }
  }

  run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function runCallback(err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row as T | undefined);
      });
    });
  }

  all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve((rows as T[]) || []);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
