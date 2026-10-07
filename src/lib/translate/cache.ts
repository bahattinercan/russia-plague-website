/**
 * Kalıcı çeviri önbelleği.
 *
 * Ayrı bir tablo yerine mevcut `articles` kayıtları kullanılır: her makale
 * `content_hash` taşır; aynı içerik bir sonraki turda yeniden görülürse
 * `title_tr`/`excerpt_tr` değerleri buradan geri okunur. Böylece hem para
 * hem süre harcanmaz (10 dakikalık cron'da kritik).
 *
 * JSON modunda (DATABASE_URL yok) aynı bilgi önceki `data/feed.json`'dan
 * okunur. Okunamazsa çeviri yine denenir; sadece maliyet artar.
 */
import { loadFeed } from '@/lib/storage/store';
import type { Article } from '@/types';

export interface CachedTranslation {
  titleTr: string | null;
  excerptTr: string | null;
  translatedAt: string | null;
  provider: string | null;
}

export async function loadTranslationCache(): Promise<Map<string, CachedTranslation>> {
  const map = new Map<string, CachedTranslation>();

  try {
    const { feed } = await loadFeed();
    if (!feed) return map;

    const articles: Article[] = [...feed.events.flatMap((e) => e.articles), ...feed.signals];
    for (const a of articles) {
      if (!a.contentHash) continue;
      if (!a.titleTr && !a.excerptTr) continue;
      map.set(a.contentHash, {
        titleTr: a.titleTr ?? null,
        excerptTr: a.excerptTr ?? null,
        translatedAt: a.translatedAt ?? null,
        provider: a.translationProvider ?? 'cache',
      });
    }
  } catch {
    // Önbellek okunamadı → boş harita ile devam (fail-open).
  }

  return map;
}
