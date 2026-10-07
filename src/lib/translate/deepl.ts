/**
 * DeepL adaptörü (v2/translate).
 *
 * - Ücretsiz plan anahtarları `:fx` ile biter → api-free.deepl.com
 * - Kaynak dil AÇIK verilir: DeepL sözlük (glossary) ile kaynak dil
 *   otomatik tespiti birlikte kullanılamıyor.
 * - 50 metin/istek sınırı; kaynak diller karışık olabileceği için grup grup.
 * - 456 (kota) ve 400 tekrar denenmez; 429/5xx üstel geri çekilmeli.
 */
import { fetchWithRetry, type TranslationItem, type Translator, type TranslatorConfig } from './provider';

const MAX_TEXTS = 50;

interface DeepLResponse {
  translations?: { detected_source_language?: string; text?: string }[];
}

export class DeepLTranslator implements Translator {
  readonly name = 'deepl';
  private readonly key: string;
  private readonly url: string;
  private readonly glossaryId?: string;

  constructor(cfg: TranslatorConfig) {
    this.key = cfg.deeplKey ?? '';
    this.url = cfg.deeplApiUrl ?? (this.key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com');
    this.glossaryId = cfg.deeplGlossaryId;
  }

  async translate(items: TranslationItem[], targetLang: string): Promise<(string | null)[]> {
    const out: (string | null)[] = new Array(items.length).fill(null);
    if (items.length === 0) return out;

    // Kaynak dile göre grupla (tek istek tek source_lang kabul eder).
    const byLang = new Map<string, number[]>();
    items.forEach((item, i) => {
      const list = byLang.get(item.sourceLang) ?? [];
      list.push(i);
      byLang.set(item.sourceLang, list);
    });

    for (const [sourceLang, indices] of byLang) {
      for (let start = 0; start < indices.length; start += MAX_TEXTS) {
        const slice = indices.slice(start, start + MAX_TEXTS);
        const results = await this.request(
          slice.map((i) => items[i].text),
          sourceLang,
          targetLang,
        );
        slice.forEach((itemIndex, j) => {
          out[itemIndex] = results[j] ?? null;
        });
      }
    }

    return out;
  }

  private async request(texts: string[], sourceLang: string, targetLang: string): Promise<(string | null)[]> {
    const body = new URLSearchParams();
    for (const text of texts) body.append('text', text);
    body.append('source_lang', sourceLang.toUpperCase());
    body.append('target_lang', targetLang.toUpperCase());
    body.append('tag_handling', 'text');
    if (this.glossaryId) body.append('glossary_id', this.glossaryId);

    const res = await fetchWithRetry(
      `${this.url}/v2/translate`,
      {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
      { label: 'deepl', timeoutMs: 20_000 },
    );

    if (!res.ok) throw new Error(`deepl HTTP ${res.status}`);
    const data = (await res.json()) as DeepLResponse;
    return (data.translations ?? []).map((t) => t.text ?? null);
  }
}
