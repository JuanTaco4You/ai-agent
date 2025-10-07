import fs from "fs";
import path from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, meta?: unknown): void;
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

function ensureDir(dir: string) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_) {
    // ignore
  }
}

function errorToPOJO(err: any) {
  if (!err) return err;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...err,
  };
}

function stringifyMeta(meta: unknown): string {
  try {
    if (meta instanceof Error) {
      return JSON.stringify(errorToPOJO(meta));
    }
    const replacer = (_key: string, value: unknown) =>
      value instanceof Error ? errorToPOJO(value) : value;
    return JSON.stringify(meta as any, replacer);
  } catch {
    try {
      return String(meta);
    } catch {
      return "[Unserializable meta]";
    }
  }
}

function formatLine(
  level: LogLevel,
  context: string,
  msg: string,
  meta?: unknown,
): string {
  const time = new Date().toISOString();
  const base = `[${time}] [${level.toUpperCase()}] [${context}] ${msg}`;
  if (meta === undefined) return `${base}\n`;
  return `${base} ${stringifyMeta(meta)}\n`;
}

export class FileLogger implements Logger {
  private readonly stream: fs.WriteStream;
  private readonly context: string;
  private readonly echo: boolean;

  constructor(filePath: string, context: string, echoToConsole = true) {
    ensureDir(path.dirname(filePath));
    this.stream = fs.createWriteStream(filePath, { flags: "a" });
    this.context = context;
    this.echo = echoToConsole;
  }

  private write(level: LogLevel, msg: string, meta?: unknown) {
    const line = formatLine(level, this.context, msg, meta);
    try {
      this.stream.write(line);
    } catch (_) {
      // swallow write errors; log stream may be closed during shutdown
    }
    if (this.echo) {
      const trimmed = line.trimEnd();
      if (level === "error" || level === "warn") {
        console.error(trimmed);
      } else {
        console.log(trimmed);
      }
    }
  }

  debug(msg: string, meta?: unknown): void {
    this.write("debug", msg, meta);
  }

  info(msg: string, meta?: unknown): void {
    this.write("info", msg, meta);
  }

  warn(msg: string, meta?: unknown): void {
    this.write("warn", msg, meta);
  }

  error(msg: string, meta?: unknown): void {
    this.write("error", msg, meta);
  }
}

export function createFileLogger(
  filePath: string,
  context: string,
  echoToConsole = true,
): FileLogger {
  return new FileLogger(filePath, context, echoToConsole);
}

export function childLogger(parent: Logger, childContext: string): Logger {
  return {
    debug: (msg: string, meta?: unknown) =>
      parent.debug(`${childContext}: ${msg}`, meta),
    info: (msg: string, meta?: unknown) =>
      parent.info(`${childContext}: ${msg}`, meta),
    warn: (msg: string, meta?: unknown) =>
      parent.warn(`${childContext}: ${msg}`, meta),
    error: (msg: string, meta?: unknown) =>
      parent.error(`${childContext}: ${msg}`, meta),
  };
}

export function createNullLogger(): Logger {
  return {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
}
