/**
 * OpenAI-uyumlu LLM adaptörü (sohbet tamamlama).
 *
 * LLM en doğal çeviriyi verir ama halüsinasyon riski taşır. Bu yüzden:
 *   - temperature 0
 *   - katı sistem prompt'u + terim sözlüğü (glossary.ts)
 *   - çıktı SADECE JSON
 *   - her çıktı validate.ts kapılarından geçmeden kullanılmaz
 *
 * `OPENAI_BASE_URL` ile uyumlu herhangi bir sunucu (Azure, yerel) kullanılabilir.
 */
import { glossaryInstructions } from './glossary';
import { fetchWithRetry, type TranslationItem, type Translator, type TranslatorConfig } from './provider';

const BATCH_SIZE = 20;

const SYSTEM_PROMPT = [
  'Sen bir haber başlığı çevirmenisin. İngilizce veya Rusça başlıkları Türkçeye çevirirsin.',
  '',
  'MUTLAK KURALLAR:',
  '1. Yalnızca çevir. Bilgi ekleme, çıkarma, yorumlama, özetleme YAPMA.',
  '2. Belirsizliği koru: "suspected" → "şüpheli", "possibly" → "muhtemelen",',
  '   "reportedly" → "bildirildiğine göre". Bu ifadeleri asla kesinliğe çevirme.',
  '3. "doğrulandı", "teyit edildi", "kesinleşti" gibi ifadeler ASLA kullanma.',
  '4. Özel adları, kurum kısaltmalarını ve sayıları aynen koru.',
  '5. Başlık stili: kısa, doğal Türkçe; sondaki noktayı koruma.',
  '',
  'Çıktı SADECE şu JSON olsun: {"translations": ["...", "..."]}',
  'Dizideki öğe sayısı girdiyle birebir aynı olmalı, sıra korunmalı.',
].join('\n');

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

export class OpenAITranslator implements Translator {
  readonly name = 'openai';
  private readonly key: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(cfg: TranslatorConfig) {
    this.key = cfg.openaiKey ?? '';
    this.baseUrl = (cfg.openaiBaseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.model = cfg.openaiModel ?? 'gpt-4.1-mini';
  }

  async translate(items: TranslationItem[], targetLang: string): Promise<(string | null)[]> {
    const out: (string | null)[] = new Array(items.length).fill(null);

    for (let start = 0; start < items.length; start += BATCH_SIZE) {
      const slice = items.slice(start, start + BATCH_SIZE);
      const results = await this.request(slice, targetLang);
      slice.forEach((_, i) => {
        out[start + i] = results[i] ?? null;
      });
    }

    return out;
  }

  private async request(items: TranslationItem[], targetLang: string): Promise<(string | null)[]> {
    const payload = items.map((item, index) => ({
      index,
      sourceLang: item.sourceLang,
      text: item.text,
    }));

    const glossary = glossaryInstructions(items.map((i) => i.text).join('\n'));

    const userPrompt = [
      `Hedef dil: ${targetLang}`,
      glossary ? `ZORUNLU TERİMLER:\n${glossary}` : '',
      `Çevrilecek başlıklar (JSON):\n${JSON.stringify(payload)}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const res = await fetchWithRetry(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      },
      { label: 'openai', timeoutMs: 30_000 },
    );

    if (!res.ok) throw new Error(`openai HTTP ${res.status}`);
    const data = (await res.json()) as ChatResponse;
    const content = data.choices?.[0]?.message?.content ?? '';
    return parseTranslations(content, items.length);
  }
}

/** Kod bloğu/JSON süslerini tolere eden çıktı ayrıştırıcı. */
export function parseTranslations(content: string, expected: number): (string | null)[] {
  const out: (string | null)[] = new Array(expected).fill(null);
  const jsonText = extractJson(content);
  if (!jsonText) return out;

  try {
    const parsed = JSON.parse(jsonText) as { translations?: unknown };
    const list = parsed.translations;
    if (!Array.isArray(list)) return out;
    list.forEach((value, i) => {
      if (i < expected && typeof value === 'string' && value.trim()) out[i] = value.trim();
    });
  } catch {
    return out;
  }
  return out;
}

function extractJson(content: string): string | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : content).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}
