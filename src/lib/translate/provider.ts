/**
 * Çeviri sağlayıcı arayüzü ve fabrikası.
 *
 * Sağlayıcıdan bağımsız: env üzerinden DeepL / OpenAI-uyumlu LLM / anahtarsız
 * Google seçilir. Anahtar yoksa `null` döner ve çeviri tamamen atlanır —
 * site orijinal başlıklarla çalışmaya devam eder (fail-open).
 */
import { DeepLTranslator } from './deepl';
import { GoogleTranslator } from './google';
import { OpenAITranslator } from './openai';

export interface TranslationItem {
  text: string;
  /** DeepL açık dil kodu ister; Google `auto` de kabul eder. */
  sourceLang: string;
}

export interface Translator {
  readonly name: string;
  /** Girdi sırasıyla aynı uzunlukta çıktı; başarısız öğe `null`. */
  translate(items: TranslationItem[], targetLang: string): Promise<(string | null)[]>;
}

export type ProviderName = 'auto' | 'deepl' | 'openai' | 'google' | 'off';

export interface TranslatorConfig {
  provider: ProviderName;
  deeplKey?: string;
  deeplApiUrl?: string;
  deeplGlossaryId?: string;
  openaiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  concurrency: number;
}

/**
 * `auto` sırası: DeepL → OpenAI → Google (anahtarsız).
 *
 * Anahtarsız Google uç noktası resmî değildir; üretimde `DEEPL_API_KEY`
 * eklenmesi önerilir. Tamamen kapatmak için `TRANSLATE_PROVIDER=off`.
 */
export function createTranslator(cfg: TranslatorConfig): Translator | null {
  if (cfg.provider === 'off') return null;

  const deepl = cfg.deeplKey ? new DeepLTranslator(cfg) : null;
  const openai = cfg.openaiKey ? new OpenAITranslator(cfg) : null;
  const google = new GoogleTranslator(cfg);

  switch (cfg.provider) {
    case 'deepl':
      return deepl;
    case 'openai':
      return openai;
    case 'google':
      return google;
    case 'auto':
    default:
      return deepl ?? openai ?? google;
  }
}

export function readTranslatorConfig(env: NodeJS.ProcessEnv = process.env): TranslatorConfig {
  const provider = (env.TRANSLATE_PROVIDER ?? 'auto').toLowerCase() as ProviderName;
  return {
    provider: (['auto', 'deepl', 'openai', 'google', 'off'] as const).includes(provider)
      ? provider
      : 'auto',
    deeplKey: env.DEEPL_API_KEY ?? env.TRANSLATE_API_KEY,
    deeplApiUrl: env.DEEPL_API_URL,
    deeplGlossaryId: env.DEEPL_GLOSSARY_ID,
    openaiKey: env.OPENAI_API_KEY,
    openaiBaseUrl: env.OPENAI_BASE_URL,
    openaiModel: env.OPENAI_MODEL,
    concurrency: Number(env.TRANSLATE_CONCURRENCY ?? '3') || 3,
  };
}

/** 429/5xx'te üstel geri çekilmeli tekrar deneme. 456/400 tekrar DENENMEZ. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; label: string; timeoutMs?: number } = { label: 'http' },
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) return res;

      // 456 = kota bitti, 400 = istek bozuk → tekrar denemek anlamsız.
      if (res.status === 456 || res.status === 400) return res;
      if (res.status !== 429 && res.status < 500) return res;

      lastError = new Error(`${opts.label} HTTP ${res.status}`);
    } catch (e) {
      clearTimeout(timer);
      lastError = e;
    }
    if (attempt < retries) await sleep(400 * 2 ** attempt);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Basit eşzamanlılık sınırlayıcı (ingest.ts'teki mapLimit ile aynı desen). */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}
