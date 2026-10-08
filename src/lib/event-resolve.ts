/**
 * Kalıcı olay bağlantısı çözümlemesi.
 *
 * SORUN (ölçülmüş): olay kimlikleri her ingest'te yeniden üretilebiliyor.
 * figures.ts başlığındaki ölçüm: 3 saatlik pencerede 9 küratörlü kaydın 4'ü
 * koptu. Yani `/event/<slug>` bağlantıları kümeleme değişince 404 verebilir.
 *
 * ÇÖZÜM (yumuşak çözümleme): slug tam eşleşmezse başlık benzerliğiyle en yakın
 * olay bulunur; hâlâ emin olunamıyorsa "yeniden gruplanmış olabilir" sayfası
 * adaylarla birlikte gösterilir — sessiz 404 yerine açıklama.
 *
 * Ayrıntı: docs/arayuz-plani.md §9.3
 */
import type { PlagueEvent } from '@/types';
import { slugToQuery, titleSimilarity } from '@/lib/text-match';
import { sortByRecency } from '@/lib/feed-selectors';

/** Bu skorun üstü "aynı olay" kabul edilir; altındakiler yalnızca öneridir. */
const FUZZY_ACCEPT = 0.45;
/** Öneri listesine girmek için gereken en düşük skor. */
const SUGGEST_MIN = 0.12;

export interface EventResolution {
  event: PlagueEvent | null;
  match: 'exact' | 'fuzzy' | 'none';
  /** `fuzzy`/`none` hâlinde en yakın olaylar (skor sırasıyla, en fazla 3). */
  suggestions: PlagueEvent[];
  /** Slug'dan türetilen arama metni — arama bağlantısında kullanılır. */
  query: string;
}

export function resolveEvent(events: PlagueEvent[], rawSlug: string): EventResolution {
  const slug = decodeURIComponent(rawSlug);

  const exact = events.find((event) => event.slug === slug);
  if (exact) return { event: exact, match: 'exact', suggestions: [], query: slugToQuery(slug) };

  const query = slugToQuery(slug);
  const scored = events
    .map((event) => ({
      event,
      score: Math.max(
        titleSimilarity(query, event.title),
        titleSimilarity(query, event.titleOriginal),
        event.titleTr ? titleSimilarity(query, event.titleTr) : 0,
      ),
    }))
    .filter((row) => row.score >= SUGGEST_MIN)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score >= FUZZY_ACCEPT) {
    return {
      event: scored[0].event,
      match: 'fuzzy',
      suggestions: scored.slice(1, 4).map((row) => row.event),
      query,
    };
  }

  return {
    event: null,
    match: 'none',
    suggestions: sortByRecency(scored.slice(0, 3).map((row) => row.event)),
    query,
  };
}

/** Arama bağlantısı için sorgu dizesi (akış sayfası `q` parametresini kullanır). */
export function searchHref(locale: string, query: string): string {
  return `/${locale}/timeline?q=${encodeURIComponent(query)}`;
}
