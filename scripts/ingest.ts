/**
 * Ingest giriş noktası.
 *
 * Kullanım:
 *   npm run ingest            → tüm kaynakları çeker, data/feed.json yazar
 *   npm run ingest -- --only=tass,meduza
 *   npm run ingest -- --dry   → yazmaz, yalnızca raporlar
 *
 * Bu script GitHub Actions cron ile 5-10 dakikada bir çalışacak şekilde
 * tasarlandı (Vercel Hobby cron'u günde 1 kez ile sınırlı olduğu için).
 */
import type { Article, IngestReport, RawItem, SourceDef, SourceHealth } from '@/types';
import { SOURCES } from '@/lib/sources/registry';
import { fetchRss } from '@/lib/sources/adapters/rss';
import { fetchGoogleNews } from '@/lib/sources/adapters/google-news';
import { fetchHtml } from '@/lib/sources/adapters/html';
import { fetchTelegram } from '@/lib/sources/adapters/telegram';
import {
  buildEvents,
  dedupeArticles,
  isFresh,
  isRelevant,
  normalizeItem,
} from '@/lib/ingest/pipeline';
import { loadLocalEnv } from '@/lib/env';
import { backendLabel, saveFeed } from '@/lib/storage/store';
import { translateFeed } from '@/lib/translate';

const STALE_DAYS = 30;
const CONCURRENCY = 5;

interface FetchResult {
  source: SourceDef;
  items: RawItem[];
  health: SourceHealth;
}

async function fetchSource(source: SourceDef): Promise<FetchResult> {
  const started = Date.now();
  let items: RawItem[] = [];
  let error: string | null = null;

  try {
    const adapter = source.adapter;
    switch (adapter.kind) {
      case 'rss':
        items = await fetchRss(source, adapter.url);
        break;
      case 'google-news':
        items = await fetchGoogleNews(source, adapter);
        break;
      case 'html':
        items = await fetchHtml(source, adapter);
        break;
      case 'telegram':
        items = await fetchTelegram(source, adapter.channel);
        break;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const latencyMs = Date.now() - started;
  const dates = items
    .map((i) => i.publishedAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const newestItemAt = dates.length > 0 ? dates[dates.length - 1] : null;

  const stale =
    newestItemAt !== null &&
    Date.now() - new Date(newestItemAt).getTime() > STALE_DAYS * 86_400_000;

  const statusMatch = error?.match(/HTTP (\d{3})/);

  return {
    source,
    items,
    health: {
      sourceSlug: source.slug,
      checkedAt: new Date().toISOString(),
      ok: error === null && items.length > 0,
      httpStatus: statusMatch ? Number(statusMatch[1]) : null,
      latencyMs,
      itemsFound: items.length,
      newestItemAt,
      stale,
      error,
    },
  };
}

/** Basit eşzamanlılık sınırlayıcı — kaynaklara aynı anda yüklenmemek için. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function parseArgs(argv: string[]): {
  only: Set<string> | null;
  dry: boolean;
  translate: boolean;
  noTranslate: boolean;
} {
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const only = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()))
    : null;
  return {
    only,
    dry: argv.includes('--dry'),
    translate: argv.includes('--translate'),
    noTranslate: argv.includes('--no-translate'),
  };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function printReport(report: IngestReport): void {
  console.log('\n── KAYNAK SAĞLIĞI ────────────────────────────────────────────────────────────');
  console.log(
    `${pad('KAYNAK', 22)}${pad('T', 3)}${pad('DURUM', 8)}${pad('ÖĞE', 6)}${pad('MS', 7)}EN YENİ`,
  );
  for (const h of report.sources.sort((a, b) => a.sourceSlug.localeCompare(b.sourceSlug))) {
    const durum = h.stale ? 'BAYAT' : h.ok ? 'ok' : 'HATA';
    const newest = h.newestItemAt ? h.newestItemAt.slice(0, 16).replace('T', ' ') : '—';
    console.log(
      `${pad(h.sourceSlug, 22)}${pad('', 3)}${pad(durum, 8)}${pad(String(h.itemsFound), 6)}${pad(
        String(h.latencyMs),
        7,
      )}${newest}${h.error ? `  ⚠ ${h.error.slice(0, 40)}` : ''}`,
    );
  }

  console.log('\n── ÖZET ──────────────────────────────────────────────────────────────────────');
  console.log(`Çekilen ham öğe       : ${report.articlesFetched}`);
  console.log(`İlgili bulunan        : ${report.articlesRelevant}`);
  console.log(`Tekrar giderme sonrası: ${report.articlesNew}`);
  console.log(`Olay (event)          : ${report.events}`);
  const stale = report.sources.filter((s) => s.stale);
  if (stale.length > 0) {
    console.log(`BAYAT kaynaklar       : ${stale.map((s) => s.sourceSlug).join(', ')}`);
  }
  console.log('Etiket dağılımı       :', report.labelCounts);
  console.log(`Dead man's switch     : ${report.deadManSwitch.message}`);
  console.log(`Süre                  : ${report.durationMs} ms\n`);
}

async function main(): Promise<void> {
  loadLocalEnv();
  const { only, dry, translate: forceTranslate, noTranslate } = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const targets = only ? SOURCES.filter((s) => only.has(s.slug)) : SOURCES;
  if (targets.length === 0) {
    console.error('Hedef kaynak bulunamadı. --only=<slug> değerini kontrol edin.');
    process.exit(1);
  }

  console.log(`▶ ${targets.length} kaynak taranıyor (eşzamanlılık: ${CONCURRENCY})…`);
  const results = await mapLimit(targets, CONCURRENCY, fetchSource);

  const healths = results.map((r) => r.health);
  const staleSlugs = new Set(healths.filter((h) => h.stale).map((h) => h.sourceSlug));

  const rawItems = results.flatMap((r) => r.items);
  // GÜVENLİK: normalizeItem, http/https dışı şema taşıyan bağlantılar için
  // null döner (javascript:, data: vb.) — bu öğeler burada elenir.
  const normalized: Article[] = rawItems
    .map((i) => normalizeItem(i, staleSlugs.has(i.sourceSlug)))
    .filter((a): a is Article => a !== null);

  // Tarihsiz içerik yalnızca kimliği doğrulanmış kaynaklardan kabul edilir.
  // ÖLÇÜM: WHO IRIS gibi tarihsiz T5 depoları akışa sızıyordu (1971 tarihli
  // içerik "güncel" sayılıyordu).
  const fresh = normalized.filter(
    (a) => isFresh(a.publishedAt) && (a.publishedAt !== null || a.tier <= 4),
  );
  const relevant = fresh.filter((a) => isRelevant(a.title, a.excerpt));
  const deduped = dedupeArticles(relevant);

  // T5 sosyal sinyaller ana akıştan AYRI tutulur (PLAN.md §5.3).
  const signals = deduped.filter((a) => a.tier === 5);
  const mainstream = deduped.filter((a) => a.tier !== 5);
  const events = buildEvents(mainstream);

  // ── ÇEVİRİ ─────────────────────────────────────────────────────────────
  // Kümeleme/etiketleme BİTTİKTEN SONRA, yayından hemen önce. Hedef dil TR;
  // sağlayıcı yoksa veya --no-translate verilmişse sessizce atlanır
  // (fail-open: site orijinal başlıklarla çalışmaya devam eder).
  const translateNow = !noTranslate && (forceTranslate || !dry);
  if (translateNow) {
    const tr = await translateFeed(
      { events, signals },
      {
        maxMs: Number(process.env.TRANSLATE_MAX_MS ?? '') || undefined,
        budgetChars: Number(process.env.TRANSLATE_BUDGET_CHARS ?? '') || undefined,
        log: (m) => console.log(m),
      },
    );
    console.log(
      `Çeviri (${tr.provider ?? 'yok'}): ${tr.applied} uygulandı, ${tr.failed} reddedildi, ` +
        `${tr.attempted} denendi, ${tr.chars} karakter, ${tr.elapsedMs} ms` +
        (tr.note ? ` — ${tr.note}` : ''),
    );
  }

  const labelCounts = events.reduce(
    (acc, e) => {
      acc[e.label] = (acc[e.label] ?? 0) + 1;
      return acc;
    },
    { official: 0, corroborated: 0, single: 0, unverified: 0, contradicted: 0 } as Record<
      string,
      number
    >,
  );

  const healthyCount = healths.filter((h) => h.ok).length;
  const ingestHealthy = healthyCount >= Math.ceil(targets.length * 0.5) && events.length > 0;

  const report: IngestReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    sources: healths,
    articlesFetched: rawItems.length,
    articlesNew: deduped.length,
    articlesRelevant: relevant.length,
    events: events.length,
    labelCounts: labelCounts as IngestReport['labelCounts'],
    deadManSwitch: {
      ingestHealthy,
      message: ingestHealthy
        ? `${healthyCount}/${targets.length} kaynak sağlıklı, ${events.length} olay işlendi`
        : `DİKKAT: ${healthyCount}/${targets.length} kaynak sağlıklı, ${events.length} olay — ingest sağlıksız`,
    },
  };

  printReport(report);

  if (!dry) {
    const backend = await saveFeed({
      generatedAt: report.finishedAt,
      report,
      events,
      signals,
    });
    console.log(`✔ Feed yazıldı → ${backendLabel()} (${backend})`);
  } else {
    console.log('(dry run — dosya yazılmadı)');
  }

  // Cron tarafında hata kodu, dead man's switch alarmı için kullanılır.
  if (!ingestHealthy) process.exitCode = 2;
}

main().catch((err) => {
  console.error('✖ Ingest başarısız:', err);
  process.exit(1);
});
