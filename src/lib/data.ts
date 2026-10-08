import { loadLocalEnv } from '@/lib/env';
import { loadFeed, type FeedBackend } from '@/lib/storage/store';
import type { FeedFile } from '@/lib/storage/json';
import type { PlagueEvent } from '@/types';
// Benzerlik ölçüsü paylaşılan modülde: `/event/<slug>` çözümlemesi de aynı
// ölçüyü kullanır (tek kopya, tek davranış).
import { titleSimilarity } from '@/lib/text-match';

// Saf biçimleyiciler ayrı modülde: client component'lar pg'yi import etmez.
export { formatDate, formatRelative } from '@/lib/format';
export { healthSummary } from '@/lib/health';

/** Veri yoksa gösterilecek iskelet — sayfa asla çökmez, "neden boş" açıklanır. */
export const EMPTY_FEED: FeedFile = {
  generatedAt: new Date(0).toISOString(),
  report: {
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(0).toISOString(),
    durationMs: 0,
    sources: [],
    articlesFetched: 0,
    articlesNew: 0,
    articlesRelevant: 0,
    events: 0,
    labelCounts: {
      official: 0,
      corroborated: 0,
      single: 0,
      unverified: 0,
      contradicted: 0,
    },
    deadManSwitch: { ingestHealthy: false, message: 'Henüz ingest çalıştırılmadı' },
  },
  events: [],
  signals: [],
};

export interface FeedSnapshot {
  feed: FeedFile;
  backend: FeedBackend;
}

/**
 * Kısa önbellek: Neon'a her istekte gitmek yerine 60 sn'lik snapshot kullanılır.
 * Sıra: Postgres → data/feed.json → boş iskele. Site hiçbir koşulda çökmez.
 */
const CACHE_TTL_MS = 60_000;
let cache: { snapshot: FeedSnapshot; at: number } | null = null;

export async function getFeedSnapshot(): Promise<FeedSnapshot> {
  loadLocalEnv();
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.snapshot;

  const { feed, backend } = await loadFeed();
  const snapshot: FeedSnapshot = { feed: feed ?? EMPTY_FEED, backend };
  cache = { snapshot, at: Date.now() };
  return snapshot;
}

export async function getFeed(): Promise<FeedFile> {
  return (await getFeedSnapshot()).feed;
}

/** Etiket önceliği: çelişki ve çoklu kaynak en üstte. */
const LABEL_RANK: Record<string, number> = {
  contradicted: 0,
  corroborated: 1,
  official: 2,
  single: 3,
  unverified: 4,
};

export function rankEvents(events: PlagueEvent[]): PlagueEvent[] {
  return [...events].sort((a, b) => {
    const rank = (LABEL_RANK[a.label] ?? 9) - (LABEL_RANK[b.label] ?? 9);
    if (rank !== 0) return rank;
    return new Date(b.lastUpdateAt).getTime() - new Date(a.lastUpdateAt).getTime();
  });
}

/**
 * "Şu an ne biliyoruz?" listesi için çeşitlendirilmiş seçim.
 * Kümeleme bazen aynı olayı iki ayrı kümeye ayırabiliyor (farklı diller,
 * farklı başlık kalıpları); bu fonksiyon aynı olayın iki kez görünmesini engeller.
 */
export function topEvents(events: PlagueEvent[], n: number): PlagueEvent[] {  const picked: PlagueEvent[] = [];
  for (const event of rankEvents(events)) {
    if (picked.some((p) => titleSimilarity(p.title, event.title) >= 0.5)) continue;
    picked.push(event);
    if (picked.length >= n) break;
  }
  return picked;
}

