import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Article, IngestReport, PlagueEvent } from '@/types';

/**
 * MVP deposu: JSON dosyası.
 *
 * Neden: Neon/Postgres hesabı ve connection string'i proje sahibinden
 * gelene kadar geliştirmeyi bloklamamak için. Depo arayüzü aynı kalacağı
 * için F1 sonunda `postgres.ts` eklenip yalnızca seçim değişecek.
 *
 * ÖNEMLİ: Her 10 dakikada JSON'u git'e commit etmek commit spam'i yaratır.
 * Bu yüzden bu depo yalnızca LOKAL geliştirme ve test içindir; üretimde
 * Postgres'e geçilmelidir (bkz. PLAN.md §6).
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const FEED_PATH = path.join(DATA_DIR, 'feed.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

export interface FeedFile {
  generatedAt: string;
  report: IngestReport;
  events: PlagueEvent[];
  /** T5 sosyal sinyaller — ana akıştan ayrı tutulur. */
  signals: Article[];
}

export async function writeFeed(feed: FeedFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FEED_PATH, JSON.stringify(feed, null, 2), 'utf8');
  await writeHealthLog(feed);
}

export async function readFeed(): Promise<FeedFile | null> {
  try {
    return JSON.parse(await readFile(FEED_PATH, 'utf8')) as FeedFile;
  } catch {
    return null;
  }
}

/**
 * Sağlık günlüğü: kaynak bazlı geçmiş. Bayat feed'lerin ne zaman
 * bozulduğunu görebilmek için (dead man's switch + kaynak paneli).
 */
async function writeHealthLog(feed: FeedFile): Promise<void> {
  await mkdir(HISTORY_DIR, { recursive: true });
  const day = feed.generatedAt.slice(0, 10);
  const file = path.join(HISTORY_DIR, `health-${day}.jsonl`);
  const line = feed.report.sources
    .map((s) =>
      JSON.stringify({
        t: feed.generatedAt,
        slug: s.sourceSlug,
        ok: s.ok,
        status: s.httpStatus,
        ms: s.latencyMs,
        items: s.itemsFound,
        newest: s.newestItemAt,
        stale: s.stale,
        error: s.error,
      }),
    )
    .join('\n');
  await writeFile(file, `${line}\n`, { encoding: 'utf8', flag: 'a' });
}
