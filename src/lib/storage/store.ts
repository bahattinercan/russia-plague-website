import { hasDatabase, maskedDbUrl } from '../env';
import { readFeed, writeFeed, type FeedFile } from './json';
import { loadFeedFromPostgres, saveFeedToPostgres } from './postgres';

/**
 * Depo seçimi (fail-safe):
 *   DATABASE_URL tanımlıysa  → Neon/Postgres
 *   yoksa ya da bağlantı koparsa → data/feed.json
 *
 * JSON her zaman yazılır: lokal debug, CI artifact ve Vercel'de DB
 * erişilemezse statik yedek. Böylece site hiçbir koşulda boş kalmaz.
 */

export type FeedBackend = 'postgres' | 'json';

function message(e: unknown): string {
  if (e instanceof Error) {
    const code = (e as { code?: string }).code;
    return [e.message, e.name, code].filter(Boolean).join(' · ') || String(e);
  }
  return String(e);
}

export async function saveFeed(feed: FeedFile): Promise<FeedBackend> {
  await writeFeed(feed);

  if (!hasDatabase()) return 'json';

  try {
    await saveFeedToPostgres(feed);
    return 'postgres';
  } catch (e) {
    console.warn(
      `⚠ Postgres'e yazılamadı (${maskedDbUrl()}) — JSON'a düşüldü: ${message(e)}`,
    );
    return 'json';
  }
}

export async function loadFeed(): Promise<{ feed: FeedFile | null; backend: FeedBackend }> {
  if (hasDatabase()) {
    try {
      const feed = await loadFeedFromPostgres();
      if (feed) return { feed, backend: 'postgres' };
      console.warn('⚠ Postgres boş; JSON deposuna düşülüyor.');
    } catch (e) {
      console.warn(`⚠ Postgres okunamadı — JSON'a düşülüyor: ${message(e)}`);
    }
  }

  const feed = await readFeed();
  return { feed, backend: 'json' };
}

export function backendLabel(): string {
  return hasDatabase() ? 'Neon Postgres' : 'JSON (data/feed.json)';
}
