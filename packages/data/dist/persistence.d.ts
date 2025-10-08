import { Logger } from "@ai-agent/infra";
export declare class SqliteDatabase {
    private readonly db;
    private readonly logger;
    constructor(filePath?: string, logger?: Logger);
    initializeSchema(): Promise<void>;
    run(sql: string, params?: unknown[]): Promise<void>;
    get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
    all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
    close(): Promise<void>;
}
