import { Logger } from "./logger";
export interface Notifier {
    notify(message: string, meta?: Record<string, unknown>): Promise<void>;
}
export declare class ConsoleNotifier implements Notifier {
    private readonly logger;
    constructor(logger?: Logger);
    notify(message: string, meta?: Record<string, unknown>): Promise<void>;
}
export declare class TelegramNotifier implements Notifier {
    private readonly botToken;
    private readonly chatId;
    private readonly logger;
    private readonly apiBase;
    constructor(botToken: string, chatId: string, logger?: Logger);
    notify(message: string, meta?: Record<string, unknown>): Promise<void>;
}
export declare class WebhookNotifier implements Notifier {
    private readonly url;
    private readonly logger;
    constructor(url: string, logger?: Logger);
    notify(message: string, meta?: Record<string, unknown>): Promise<void>;
}
export declare class NotifierManager implements Notifier {
    private readonly notifiers;
    constructor(notifiers?: Notifier[]);
    notify(message: string, meta?: Record<string, unknown>): Promise<void>;
}
