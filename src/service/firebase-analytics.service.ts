export type GA4Event = {
  name: string;
  params?: Record<string, unknown>;
  // ВАЖНО: никаких user_id/client_id здесь!
};

export type SendEventOptions = {
  measurementId?: string;
  apiSecret?: string;

  clientId?: string;     // "1234567890.1234567890" или твой стабильный ID
  userId?: string;       // если есть авторизация

  // если не передашь ga-сессию в событиях, автодосчитаем по таймзоне:
  timeZone?: string;     // "Europe/Amsterdam" по умолчанию
  injectSessionIfMissing?: boolean; // true по умолчанию

  userProps?: Record<string, unknown>;
  nonPersonalizedAds?: boolean;
  timestampMicros?: number;
  debug?: boolean;
  headers?: Record<string, string>;
};

const HALF_HOUR_MS = 30 * 60 * 1000;

function deriveDayAnchoredSession(now = Date.now(), tz = 'Europe/Amsterdam') {
  // без зависимостей: получаем смещение таймзоны тупо из Intl
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  // локальное время в TZ
  const y = get('year'), m = get('month') - 1, d = get('day');
  const hh = get('hour'), mm = get('minute'), ss = get('second');
  const tzNow = Date.UTC(y, m, d, hh, mm, ss); // «мс» в UTC эквиваленте локального TZ времени

  const dayStartTz = Date.UTC(y, m, d, 0, 0, 0);
  const msSince = tzNow - dayStartTz;
  const bucket = Math.floor(msSince / HALF_HOUR_MS);

  // начало окна в локальном TZ, отразим обратно в UTC метку
  const ga_session_id = dayStartTz + bucket * HALF_HOUR_MS;
  const ga_session_number = 1 + bucket;
  return { ga_session_id, ga_session_number };
}

function sanitizeParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

export class GA4Service {
  constructor(
    private readonly defaultMeasurementId: string,
    private readonly defaultApiSecret: string
  ) {
    if (!defaultMeasurementId || !defaultApiSecret) {
      throw new Error('GA4Service: measurementId и apiSecret обязательны.');
    }
  }

  public async sendEvent(
    events: GA4Event[],
    options: SendEventOptions = {}
  ): Promise<{ ok: boolean; status: number; validation?: unknown }> {
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('GA4Service.sendEvent: пустой массив events.');
    }

    const measurementId = options.measurementId ?? this.defaultMeasurementId;
    const apiSecret = options.apiSecret ?? this.defaultApiSecret;
    if (!measurementId || !apiSecret) {
      throw new Error('GA4Service.sendEvent: measurementId/apiSecret не заданы.');
    }

    const debug = !!options.debug;
    const endpoint = debug
      ? 'https://www.google-analytics.com/debug/mp/collect'
      : 'https://www.google-analytics.com/mp/collect';

    // Топ-левел идентификация: нужен хотя бы один
    const clientId = options.clientId ?? (options.userId ? undefined : this.generateClientId());
    const userId = options.userId;
    if (!clientId && !userId) {
      throw new Error('GA4Service.sendEvent: нужен clientId или userId.');
    }

    // Авто-инъекция сеансовых полей, если их забыли
    const injectSessionIfMissing = options.injectSessionIfMissing ?? true;
    const tz = options.timeZone ?? 'Europe/Amsterdam';
    const computedSess = injectSessionIfMissing ? deriveDayAnchoredSession(Date.now(), tz) : null;

    const normalizedEvents = events.map(e => {
      const p = sanitizeParams(e.params) ?? {};
      // mandatory for server events to “count” as engaged
      if (!('engagement_time_msec' in p)) p['engagement_time_msec'] = 1;
      if (!('session_engaged' in p)) p['session_engaged'] = 1;

      // если автор явно не проставил ga_session_*, подставим
      if (injectSessionIfMissing) {
        if (!('ga_session_id' in p) && computedSess) p['ga_session_id'] = computedSess.ga_session_id;
        if (!('ga_session_number' in p) && computedSess) p['ga_session_number'] = computedSess.ga_session_number;
      }

      // страховка: никто не должен подсунуть сюда user_id/client_id
      delete (p as any)['user_id'];
      delete (p as any)['client_id'];

      return { name: e.name, params: p };
    });

    const body: Record<string, unknown> = {
      ...(clientId ? { client_id: clientId } : {}),
      ...(userId ? { user_id: userId } : {}),
      ...(options.nonPersonalizedAds ? { non_personalized_ads: true } : {}),
      ...(options.timestampMicros ? { timestamp_micros: options.timestampMicros } : {}),
      ...(options.userProps ? { user_properties: this.wrapUserProps(options.userProps) } : {}),
      events: normalizedEvents
    };

    const url = `${endpoint}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      body: JSON.stringify(body)
    });

    if (debug) {
      const json = await safeJson(res);
      const msgs = json?.validationMessages ?? json?.validation_messages;
      const hasErrors = Array.isArray(msgs) && msgs.some((m: any) => m.severity === 'ERROR');
      return { ok: res.ok && !hasErrors, status: res.status, validation: json };
    }

    return { ok: res.ok, status: res.status };
  }

  private generateClientId(): string {
    // вид _ga cookie: "GA1.2.1234567890.1234567890" → MP принимает только "1234567890.1234567890"
    const part = () => Math.floor(1e9 + Math.random() * 9e9);
    return `${part()}.${part()}`;
  }

  private wrapUserProps(input: Record<string, unknown>) {
    const out: Record<string, { value: unknown }> = {};
    for (const [k, v] of Object.entries(input)) out[k] = { value: v };
    return out;
  }
}

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
