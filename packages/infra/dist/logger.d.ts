export type LogLevel = "debug" | "info" | "warn" | "error";
export interface Logger {
    debug(msg: string, meta?: unknown): void;
    info(msg: string, meta?: unknown): void;
    warn(msg: string, meta?: unknown): void;
    error(msg: string, meta?: unknown): void;
}
export declare class FileLogger implements Logger {
    private readonly stream;
    private readonly context;
    private readonly echo;
    constructor(filePath: string, context: string, echoToConsole?: boolean);
    private write;
    debug(msg: string, meta?: unknown): void;
    info(msg: string, meta?: unknown): void;
    warn(msg: string, meta?: unknown): void;
    error(msg: string, meta?: unknown): void;
}
export declare function createFileLogger(filePath: string, context: string, echoToConsole?: boolean): FileLogger;
export declare function childLogger(parent: Logger, childContext: string): Logger;
export declare function createNullLogger(): Logger;
