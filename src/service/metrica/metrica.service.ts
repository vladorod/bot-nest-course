import crypto from 'crypto';
import fetch from 'node-fetch';


export type MetrikaEvent = {
  name: string;                           // имя события
  params?: Record<string, any>;           // произвольные параметры
  clientId?: string;                      // хеш юзера (из telegramId)
  pageUrl?: string;                       // логическая "страница" бота
  referer?: string;                       // логический реферер
  userAgent?: string;                     // UA для красоты (например "TelegramBot")
  ip?: string;                            // X-Forwarded-For (если нужно)
  eventId?: string;                       // идемпотентность (свой UUID)
  timestampMicros?: number;               // кастомный ts, если надо
};

export class YandexMetrika {
  constructor(private counterId: string) {
    if (!counterId) throw new Error('METRIKA_COUNTER_ID is required');
  }

  static clientIdFromTelegramId(telegramId: string, secret: string) {
    if (!secret) throw new Error('METRIKA_SECRET is required for hashing');
    return crypto
      .createHmac('sha256', secret)
      .update(String(telegramId))
      .digest('hex')
      .slice(0, 32);
  }

  async send(e: MetrikaEvent) {
    // server-mode: wmode=2
    // event — имя цели. site-info — JSON с параметрами.
    const biParts = [
      `ti:${e.timestampMicros ? Math.floor(e.timestampMicros / 1000) : Date.now()}`,
      'pv:1',     // pageview count
      'ar:1',     // async
    ];
    if (e.clientId) biParts.push(`cid:${e.clientId}`);
    if (e.eventId) biParts.push(`ei:${e.eventId}`);

    const body = new URLSearchParams({
      'wmode': '2',
      'page-url': e.pageUrl || 'https://t.me/your_bot',
      'page-ref': e.referer || '',
      'browser-info': biParts.join(':'),
      'event': e.name,
      'site-info': JSON.stringify(e.params || {}),
    });

    const res = await fetch(`https://mc.yandex.ru/watch/${this.counterId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(e.userAgent ? { 'User-Agent': e.userAgent } : {}),
        ...(e.ip ? { 'X-Forwarded-For': e.ip } : {}),
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Metrika error ${res.status}: ${text}`);
    }
  }
}
