

export type GA4Event = {
  name: string;
  params?: Record<string, unknown>;
  user_id?: string;
  client_id?: string;
};

export type SendEventOptions = {
  measurementId?: string;           // если хочешь переопределить дефолт
  page_location?: string;
  apiSecret?: string;               // если хочешь переопределить дефолт
  clientId?: string;                // формата "1234567890.1234567890"
  userId?: string;                  // если есть авторизованный юзер
  userProps?: Record<string, unknown>; // { plan: 'pro', theme: 'dark' } → завернём в {value: ...}
  nonPersonalizedAds?: boolean;     // non_personalized_ads
  timestampMicros?: number;         // общий таймстамп для всех событий
  debug?: boolean;                  // прогон через /debug/mp/collect
  headers?: Record<string, string>; // дополнительные HTTP-заголовки (User-Agent и т.п.)
};

export class GA4Service {
  constructor(
    private readonly defaultMeasurementId: string,
    private readonly defaultApiSecret: string
  ) {
    if (!defaultMeasurementId || !defaultApiSecret) {
      throw new Error('GA4Service: measurementId и apiSecret обязательны.');
    }
  }

  /**
   * Отправка событий в GA4 через Measurement Protocol
   * - Если не передан clientId и userId, сгенерирует корректный clientId.
   * - Поддерживает debug-режим: валидирует события через /debug/mp/collect.
   * - userProps примитивы автоматически оборачивает в { value }.
   */
  public async sendEvent(
    events: GA4Event[],
    options: SendEventOptions = {}
  ): Promise<{
    ok: boolean;
    status: number;
    validation?: unknown;
  }> {
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('GA4Service.sendEvent: пустой массив events.');
    }

    const measurementId = options.measurementId ?? this.defaultMeasurementId;
    const apiSecret = options.apiSecret ?? this.defaultApiSecret;

    if (!measurementId || !apiSecret) {
      throw new Error('GA4Service.sendEvent: measurementId/apiSecret не заданы.');
    }

    const debug = Boolean(options.debug);
    const endpoint = debug
      ? 'https://www.google-analytics.com/debug/mp/collect'
      : 'https://www.google-analytics.com/mp/collect';

    // Требование GA4: нужен либо client_id, либо user_id
    const clientId = options.clientId ?? (options.userId ? undefined : this.generateClientId());
    const userId = options.userId;

    if (!clientId && !userId) {
      throw new Error('GA4Service.sendEvent: нужен clientId или userId.');
    }

    const body: Record<string, unknown> = {
      // один из этих двух обязателен
      ...(clientId ? { client_id: clientId } : {}),
      ...(userId ? { user_id: userId } : {}),

      // опциональные поля
      ...(options.nonPersonalizedAds ? { non_personalized_ads: true } : {}),
      ...(options.timestampMicros ? { timestamp_micros: options.timestampMicros } : {}),

      // user properties → { key: { value } }
      ...(options.userProps ? { user_properties: this.wrapUserProps(options.userProps) } : {}),

      // сами события
      events: events.map(e => ({
        name: e.name,
        ...(e.params ? { params: e.params } : {})
      }))
    };

    const url = `${endpoint}?measurement_id=${encodeURIComponent(
      measurementId
    )}&api_secret=${encodeURIComponent(apiSecret)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {})
      },
      body: JSON.stringify(body)
    });

    // В debug-режиме GA вернет validationMessages
    if (debug) {
      const json = await safeJson(res);
      const validation = json;
      const messages = validation?.validationMessages ?? validation?.validation_messages;
      const hasErrors = Array.isArray(messages) && messages.some((m: any) => m.severity === 'ERROR');

      return {
        ok: res.ok && !hasErrors,
        status: res.status,
        validation
      };
    }

    return { ok: res.ok, status: res.status };
  }

  /** client_id вида "<int>.<int>", как у браузерного клиента */
  private generateClientId(): string {
    const part = () => Math.floor(1e9 + Math.random() * 9e9); // 10-значное число
    return `${part()}.${part()}`;
  }

  /** Превращает { plan: 'pro' } → { plan: { value: 'pro' } } */
  private wrapUserProps(input: Record<string, unknown>) {
    const out: Record<string, { value: unknown }> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = { value: v };
    }
    return out;
  }
}

// вспомогательный парсер
async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}