"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotifierManager = exports.WebhookNotifier = exports.TelegramNotifier = exports.ConsoleNotifier = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
class ConsoleNotifier {
    logger;
    constructor(logger = (0, logger_1.createNullLogger)()) {
        this.logger = logger;
    }
    async notify(message, meta) {
        this.logger.info("notify", { message, meta });
    }
}
exports.ConsoleNotifier = ConsoleNotifier;
class TelegramNotifier {
    botToken;
    chatId;
    logger;
    apiBase = "https://api.telegram.org";
    constructor(botToken, chatId, logger = (0, logger_1.createNullLogger)()) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.logger = logger;
    }
    async notify(message, meta) {
        try {
            await axios_1.default.post(`${this.apiBase}/bot${this.botToken}/sendMessage`, {
                chat_id: this.chatId,
                text: message,
                parse_mode: "HTML",
            }, { timeout: 10_000 });
            this.logger.debug("notify.telegram.sent", meta ? { meta } : undefined);
        }
        catch (err) {
            this.logger.error("notify.telegram.error", { error: err, meta });
        }
    }
}
exports.TelegramNotifier = TelegramNotifier;
class WebhookNotifier {
    url;
    logger;
    constructor(url, logger = (0, logger_1.createNullLogger)()) {
        this.url = url;
        this.logger = logger;
    }
    async notify(message, meta) {
        try {
            await axios_1.default.post(this.url, {
                message,
                meta,
                timestamp: new Date().toISOString(),
            }, { timeout: 10_000 });
            this.logger.debug("notify.webhook.sent", meta ? { meta } : undefined);
        }
        catch (err) {
            this.logger.error("notify.webhook.error", { error: err, meta });
        }
    }
}
exports.WebhookNotifier = WebhookNotifier;
class NotifierManager {
    notifiers;
    constructor(notifiers = []) {
        this.notifiers = notifiers;
    }
    async notify(message, meta) {
        await Promise.all(this.notifiers.map((notifier) => notifier.notify(message, meta)));
    }
}
exports.NotifierManager = NotifierManager;
//# sourceMappingURL=notifier.js.map