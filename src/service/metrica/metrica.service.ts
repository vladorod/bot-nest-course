import * as crypto from "crypto";
import fetch from "node-fetch";


export type MetrikaEvent = {
  name: string;                           // имя события (ea)
  params?: Record<string, any>;           // произвольные параметры (params)
  clientId: string;                       // cid — твой стабильный ID пользователя (хеш из telegramId)
  pageUrl?: string;                       // dl — логическая "страница" бота
  referer?: string;                       // dr — логический реферер
  userAgent?: string;                     // заголовок User-Agent (не обязателен)
  ip?: string;                            // X-Forwarded-For, если хочешь пробросить IP
  eventId?: string;                       // твой UUID для дедупликации на своей стороне (в MP прямой идемпотентности нет)
  timestampMicros?: number;               // микросекунды, если хочешь проставить свой ts
};

export class YandexMetrika {
  constructor(private counterId: string, private mpToken: string) {
    if (!counterId) throw new Error("METRIKA_COUNTER_ID is required");
    if (!mpToken) throw new Error("METRIKA_MP_TOKEN is required");
  }

  // стабильный cid из telegramId (или просто используй сам telegramId как строку)
  static clientIdFromTelegramId(telegramId: string, secret: string) {
    if (!secret) throw new Error("METRIKA_SECRET is required for hashing");
    return crypto
      .createHmac("sha256", secret)
      .update(String(telegramId))
      .digest("hex")
      .slice(0, 32);
  }

  private toUnixSeconds(micros?: number) {
    if (micros && Number.isFinite(micros)) return Math.floor(micros / 1_000_000);
    return Math.floor(Date.now() / 1000);
  }

  public numericCidFromTelegramId(telegramId: string, secret = ""): string {
    const hex = crypto
      .createHmac("sha256", secret || "default_salt")
      .update(String(telegramId))
      .digest("hex");
    // переводим hex -> BigInt и берём по модулю 10^19
    const numeric = hex.replace(/\D/g, "") + "0000000000000000000"; // паддинг
    return numeric.slice(0, 19); // гарантируем ровно 19 цифр
  }

  /**
   * Отправить событие (reachGoal/JS-цель)
   * В МП это t=event + ea
   */
  async send(e: MetrikaEvent) {
    const body = new URLSearchParams({
      // обязательные поля
      tid: String(this.counterId),                  // ID счётчика
      cid: this.numericCidFromTelegramId(e.clientId, 'secret'),                              // client id
      ms: this.mpToken,                             // токен Measurement Protocol
      t: "event",                                   // тип хитa
      ea: e.name,                                   // имя события
      et: String(this.toUnixSeconds(e.timestampMicros)), // unix timestamp (секунды)

      // опциональные
      dl: e.pageUrl || "bot://telegram/@your_bot",  // страница (лучше указывать)
      dr: e.referer || "",                          // реферер
    });

    if (e.params && Object.keys(e.params).length > 0) {
      body.set("params", JSON.stringify(e.params)); // произвольные параметры визита
    }

    const res = await fetch("https://mc.yandex.ru/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(e.userAgent ? { "User-Agent": e.userAgent } : {}),
        ...(e.ip ? { "X-Forwarded-For": e.ip } : {}),
      },
      body,
    });


    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Metrika MP error ${res.status}: ${text}`);
    }
  }

  /**
   * Хит «просмотр страницы», если вдруг хочется
   */
  async pageview(opts: {
    clientId: string;
    pageUrl: string;
    title?: string;
    referer?: string;
    userAgent?: string;
    ip?: string;
    timestampMicros?: number;
    params?: Record<string, any>;
  }) {
    const body = new URLSearchParams({
      tid: String(this.counterId),
      cid: opts.clientId,
      ms: this.mpToken,
      t: "pageview",
      dl: opts.pageUrl,
      et: String(this.toUnixSeconds(opts.timestampMicros)),
    });

    if (opts.title) body.set("dt", opts.title);
    if (opts.referer) body.set("dr", opts.referer);
    if (opts.params && Object.keys(opts.params).length > 0) {
      body.set("params", JSON.stringify(opts.params));
    }

    const res = await fetch("https://mc.yandex.ru/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(opts.userAgent ? { "User-Agent": opts.userAgent } : {}),
        ...(opts.ip ? { "X-Forwarded-For": opts.ip } : {}),
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Metrika MP pageview error ${res.status}: ${text}`);
    }
  }
}
