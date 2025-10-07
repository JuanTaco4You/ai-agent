import axios from "axios";
import { Logger, createNullLogger } from "./logger";

export interface Notifier {
  notify(message: string, meta?: Record<string, unknown>): Promise<void>;
}

export class ConsoleNotifier implements Notifier {
  constructor(private readonly logger: Logger = createNullLogger()) {}

  async notify(message: string, meta?: Record<string, unknown>): Promise<void> {
    this.logger.info("notify", { message, meta });
  }
}

export class TelegramNotifier implements Notifier {
  private readonly apiBase = "https://api.telegram.org";

  constructor(
    private readonly botToken: string,
    private readonly chatId: string,
    private readonly logger: Logger = createNullLogger(),
  ) {}

  async notify(message: string, meta?: Record<string, unknown>): Promise<void> {
    try {
      await axios.post(
        `${this.apiBase}/bot${this.botToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
          parse_mode: "HTML",
        },
        { timeout: 10_000 },
      );
      this.logger.debug("notify.telegram.sent", meta ? { meta } : undefined);
    } catch (err) {
      this.logger.error("notify.telegram.error", { error: err, meta });
    }
  }
}

export class WebhookNotifier implements Notifier {
  constructor(
    private readonly url: string,
    private readonly logger: Logger = createNullLogger(),
  ) {}

  async notify(message: string, meta?: Record<string, unknown>): Promise<void> {
    try {
      await axios.post(
        this.url,
        {
          message,
          meta,
          timestamp: new Date().toISOString(),
        },
        { timeout: 10_000 },
      );
      this.logger.debug("notify.webhook.sent", meta ? { meta } : undefined);
    } catch (err) {
      this.logger.error("notify.webhook.error", { error: err, meta });
    }
  }
}

export class NotifierManager implements Notifier {
  constructor(private readonly notifiers: Notifier[] = []) {}

  async notify(message: string, meta?: Record<string, unknown>): Promise<void> {
    await Promise.all(
      this.notifiers.map((notifier) => notifier.notify(message, meta)),
    );
  }
}
