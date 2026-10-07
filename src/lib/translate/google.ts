/**
 * Anahtarsız Google Translate adaptörü.
 *
 * NEDEN VAR: proje "hesap açmadan çalışsın" ilkesiyle kuruldu (Neon free,
 * Vercel hobby, public repo). Bu uç nokta anahtarsız çalıştığı için çeviri
 * kutudan çıktığı gibi devreye girer. ÜRETİM İÇİN ÖNERİLMEZ:
 * resmî/dokümante bir API değildir ve IP bazlı hız sınırına takılabilir.
 * Bu yüzden kalıcı önbellek zorunlu (her metin bir kez çevrilir) ve hata
 * durumunda fail-open davranılır.
 *
 * `TRANSLATE_PROVIDER=deepl` + `DEEPL_API_KEY` ile bu katman tamamen devre
 * dışı kalır.
 */
import { fetchWithRetry, mapLimit, type TranslationItem, type Translator, type TranslatorConfig } from './provider';

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

export class GoogleTranslator implements Translator {
  readonly name = 'google';
  private readonly concurrency: number;

  constructor(cfg: TranslatorConfig) {
    this.concurrency = cfg.concurrency;
  }

  async translate(items: TranslationItem[], targetLang: string): Promise<(string | null)[]> {
    return mapLimit(items, this.concurrency, async (item) => {
      try {
        return await this.request(item.text, item.sourceLang, targetLang);
      } catch {
        return null;
      }
    });
  }

  private async request(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLang || 'auto',
      tl: targetLang,
      dt: 't',
      q: text,
    });

    const res = await fetchWithRetry(
      `${ENDPOINT}?${params.toString()}`,
      { method: 'GET', headers: { Accept: 'application/json' } },
      { label: 'google-translate', retries: 2, timeoutMs: 12_000 },
    );
    if (!res.ok) throw new Error(`google HTTP ${res.status}`);

    const data = (await res.json()) as unknown;
    return parseGoogleResponse(data);
  }
}

/** Google yanıtı: [[[çeviri, orijinal, ...], ...], ...] */
export function parseGoogleResponse(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const segments = data[0] as unknown[];
  const parts: string[] = [];
  for (const segment of segments) {
    if (Array.isArray(segment) && typeof segment[0] === 'string') parts.push(segment[0]);
  }
  const text = parts.join('').trim();
  return text.length > 0 ? text : null;
}
