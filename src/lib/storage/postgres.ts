import { Pool, PoolClient } from 'pg';
// drizzle 0.45: pg sürücüsü `drizzle-orm/node-postgres` altında.
import { drizzle } from 'drizzle-orm/node-postgres';
import { count } from 'drizzle-orm';
import {
  ARTICLE_RETENTION_DAYS,
  HEALTH_RETENTION_DAYS,
  SCHEMA_SQL,
  articlesTable,
  claimsTable,
  eventsTable,
  ingestReportsTable,
  sourceHealthTable,
} from './schema';
import type { FeedFile } from './json';
import type { Article, EventClaim, IngestReport, PlagueEvent, SourceHealth } from '@/types';

/**
 * Neon / Postgres deposu.
 *
 * Fail-safe kuralı: DATABASE_URL yoksa ya da bağlantı kurulamazsa çağıran
 * taraf (store.ts) JSON deposuna düşer. Bu modül hata fırlatır; seçim
 * store.ts'te yapılır.
 */

function poolConfig() {
  return {
    connectionString: process.env.DATABASE_URL!,
    max: 5,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    // Neon free tier: boşta kalan bağlantıları hızlı kapat.
    idleTimeoutMillis: 30_000,
  };
}

let pool: Pool | null = null;
let schemaReady = false;

export function getPool(): Pool {
  if (!pool) pool = new Pool(poolConfig());
  return pool;
}

export function getDb() {
  return drizzle(getPool());
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await getPool().query(SCHEMA_SQL);
  schemaReady = true;
}

/** Bağlantı + şema testi. `npm run db:check` bunu kullanır. */
export async function pingDatabase(): Promise<{ ok: boolean; detail: string }> {
  try {
    const client = await getPool().connect();
    try {
      await client.query('SELECT 1 AS ok');
      await ensureSchema();
      const db = getDb();
      const [articles, events, health, reports] = await Promise.all([
        db.select({ n: count() }).from(articlesTable),
        db.select({ n: count() }).from(eventsTable),
        db.select({ n: count() }).from(sourceHealthTable),
        db.select({ n: count() }).from(ingestReportsTable),
      ]);
      return {
        ok: true,
        detail: `articles=${articles[0]?.n} events=${events[0]?.n} health=${health[0]?.n} reports=${reports[0]?.n}`,
      };
    } finally {
      client.release();
    }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function chunked<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Çok satırlı INSERT ... ON CONFLICT.
 * Parametre sayısı Neon için güvenli sınırlarda tutulur (200 satır/chunk).
 */
async function upsert(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictColumns: string[],
  updateColumns: string[],
): Promise<number> {
  if (rows.length === 0) return 0;
  let affected = 0;

  for (const chunk of chunked(rows, 200)) {
    const width = columns.length;
    const tuples = chunk.map(
      (row, r) => `(${row.map((_, c) => `$${r * width + c + 1}`).join(', ')})`,
    );
    const setClause = updateColumns.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${tuples.join(', ')}
      ON CONFLICT (${conflictColumns.join(', ')})
      ${setClause ? `DO UPDATE SET ${setClause}` : 'DO NOTHING'}
    `;
    const res = await client.query(sql, chunk.flat());
    affected += res.rowCount ?? 0;
  }
  return affected;
}

const ARTICLE_COLUMNS = [
  'id',
  'source_slug',
  'source_name',
  'tier',
  'independence_group',
  'trust_base',
  'url',
  'canonical_url',
  'title',
  'title_original',
  'lang',
  'published_at',
  'fetched_at',
  'excerpt',
  'content_hash',
  'archive_url',
  'via_aggregator',
  'original_publisher',
  'source_stale',
  'title_tr',
  'excerpt_tr',
  'translated_at',
  'translation_provider',
  'translation_status',
];

const ARTICLE_UPDATE_COLUMNS = [
  'source_name',
  'tier',
  'independence_group',
  'trust_base',
  'url',
  'title',
  'title_original',
  'lang',
  'published_at',
  'fetched_at',
  'excerpt',
  'content_hash',
  'archive_url',
  'via_aggregator',
  'original_publisher',
  'source_stale',
  'title_tr',
  'excerpt_tr',
  'translated_at',
  'translation_provider',
  'translation_status',
  'last_seen_at',
];

const EVENT_COLUMNS = [
  'id',
  'slug',
  'title',
  'title_original',
  'summary',
  'first_seen_at',
  'last_update_at',
  'label',
  'independent_group_count',
  'groups',
  'contradiction',
  'title_tr',
  'summary_tr',
  'translated_at',
  'translation_provider',
  'translation_status',
];

const EVENT_UPDATE_COLUMNS = [
  'slug',
  'title',
  'title_original',
  'summary',
  'first_seen_at',
  'last_update_at',
  'label',
  'independent_group_count',
  'groups',
  'contradiction',
  'title_tr',
  'summary_tr',
  'translated_at',
  'translation_provider',
  'translation_status',
  'last_ingested_at',
];

const CLAIM_COLUMNS = [
  'event_id',
  'source_slug',
  'source_name',
  'tier',
  'independence_group',
  'title',
  'title_tr',
  'url',
  'published_at',
];

export interface SaveResult {
  articles: number;
  events: number;
  claims: number;
  health: number;
}

/**
 * Feed'i Postgres'e yazar. Tek transaction: yarı yazılmış durum olmaz.
 * `last_ingested_at` / `last_seen_at` now() ile doldurulur (EXCLUDED'e
 * almak için sahte değer koyuyoruz; DB tarafında now() kullanılıyor).
 */
export async function saveFeedToPostgres(feed: FeedFile): Promise<SaveResult> {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const allArticles = [
      ...feed.events.flatMap((e) => e.articles),
      ...feed.signals,
    ];

    const articleRows = allArticles.map((a) => [
      a.id,
      a.sourceSlug,
      a.sourceName,
      a.tier,
      a.independenceGroup,
      a.trustBase,
      a.url,
      a.canonicalUrl,
      a.title,
      a.titleOriginal,
      a.lang ?? null,
      a.publishedAt,
      a.fetchedAt,
      a.excerpt,
      a.contentHash,
      a.archiveUrl,
      a.viaAggregator,
      a.originalPublisher,
      a.sourceStale,
      a.titleTr,
      a.excerptTr,
      a.translatedAt,
      a.translationProvider,
      a.translationStatus,
    ]);

    const articles = await upsert(
      client,
      'articles',
      [...ARTICLE_COLUMNS, 'last_seen_at'],
      articleRows.map((r) => [...r, new Date().toISOString()]),
      ['id'],
      ARTICLE_UPDATE_COLUMNS,
    );

    const eventRows = feed.events.map((e) => [
      e.id,
      e.slug,
      e.title,
      e.titleOriginal,
      e.summary,
      e.firstSeenAt,
      e.lastUpdateAt,
      e.label,
      e.independentGroupCount,
      JSON.stringify(e.groups),
      JSON.stringify(e.contradiction),
      e.titleTr,
      e.summaryTr,
      e.translatedAt,
      e.translationProvider,
      e.translationStatus,
    ]);

    const events = await upsert(
      client,
      'events',
      [...EVENT_COLUMNS, 'last_ingested_at'],
      eventRows.map((r) => [...r, new Date().toISOString()]),
      ['id'],
      EVENT_UPDATE_COLUMNS,
    );

    // Claim'ler event bazında yeniden yazılır: kümeleme zamanla değişebilir
    // (aynı olay yeni bir kümeye taşınabilir). Eski bağlantıları temizlemek
    // çelişki panelinin yanlış kalmasını engeller.
    const eventIds = feed.events.map((e) => e.id);
    if (eventIds.length > 0) {
      await client.query('DELETE FROM event_claims WHERE event_id = ANY($1::text[])', [eventIds]);
      await client.query(
        'DELETE FROM event_articles WHERE event_id = ANY($1::text[])',
        [eventIds],
      );
    }

    const claimRows = feed.events.flatMap((e) =>
      e.claims.map((c: EventClaim) => [
        e.id,
        c.sourceSlug,
        c.sourceName,
        c.tier,
        c.independenceGroup,
        c.title,
        c.titleTr,
        c.url,
        c.publishedAt,
      ]),
    );
    const claims = await upsert(
      client,
      'event_claims',
      CLAIM_COLUMNS,
      claimRows,
      ['event_id', 'url'],
      ['source_name', 'tier', 'independence_group', 'title', 'title_tr', 'published_at'],
    );

    const linkRows = feed.events.flatMap((e) => e.articles.map((a) => [e.id, a.id]));
    await upsert(client, 'event_articles', ['event_id', 'article_id'], linkRows, ['event_id', 'article_id'], []);

    const healthRows = feed.report.sources.map((s: SourceHealth) => [
      s.sourceSlug,
      s.checkedAt,
      s.ok,
      s.httpStatus,
      s.latencyMs,
      s.itemsFound,
      s.newestItemAt,
      s.stale,
      s.error,
    ]);
    const health = await upsert(
      client,
      'source_health',
      ['source_slug', 'checked_at', 'ok', 'http_status', 'latency_ms', 'items_found', 'newest_item_at', 'stale', 'error'],
      healthRows,
      ['source_slug', 'checked_at'],
      ['ok', 'http_status', 'latency_ms', 'items_found', 'newest_item_at', 'stale', 'error'],
    );

    const r = feed.report;
    await client.query(
      `INSERT INTO ingest_reports
        (started_at, finished_at, duration_ms, sources, articles_fetched, articles_new,
         articles_relevant, events, label_counts, ingest_healthy, dead_man_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        r.startedAt,
        r.finishedAt,
        r.durationMs,
        JSON.stringify(r.sources),
        r.articlesFetched,
        r.articlesNew,
        r.articlesRelevant,
        r.events,
        JSON.stringify(r.labelCounts),
        r.deadManSwitch.ingestHealthy,
        r.deadManSwitch.message,
      ],
    );

    // Retention: Neon free tier'da satır sayısı sınırlı.
    await client.query(
      'DELETE FROM source_health WHERE checked_at < now() - $1::interval',
      [`${HEALTH_RETENTION_DAYS} days`],
    );
    await client.query(
      'DELETE FROM articles WHERE first_seen_at < now() - $1::interval AND last_seen_at < now() - $1::interval',
      [`${ARTICLE_RETENTION_DAYS} days`],
    );

    await client.query('COMMIT');
    return { articles, events, claims, health };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Sitede gösterilecek feed'i Postgres'ten kurar.
 * JSON deposundaki FeedFile şekliyle birebir aynı döner — UI fark etmez.
 */
export async function loadFeedFromPostgres(limitEvents = 200): Promise<FeedFile | null> {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    const reportRes = await client.query(
      'SELECT * FROM ingest_reports ORDER BY finished_at DESC LIMIT 1',
    );
    if (reportRes.rowCount === 0) return null;
    const reportRow = reportRes.rows[0];

    const eventsRes = await client.query(
      'SELECT * FROM events ORDER BY last_update_at DESC LIMIT $1',
      [limitEvents],
    );
    const eventIds = eventsRes.rows.map((e) => e.id);

    const claimsRes = eventIds.length
      ? await client.query(
          'SELECT * FROM event_claims WHERE event_id = ANY($1::text[]) ORDER BY published_at DESC',
          [eventIds],
        )
      : { rows: [] };

    const articlesRes = eventIds.length
      ? await client.query(
          `SELECT a.*, ea.event_id
           FROM articles a
           JOIN event_articles ea ON ea.article_id = a.id
           WHERE ea.event_id = ANY($1::text[])
           ORDER BY a.published_at DESC NULLS LAST`,
          [eventIds],
        )
      : { rows: [] };

    const signalsRes = await client.query(
      'SELECT * FROM articles WHERE tier = 5 ORDER BY fetched_at DESC LIMIT 100',
    );

    const claimsByEvent = new Map<string, EventClaim[]>();
    for (const c of claimsRes.rows) {
      claimsByEvent.set(c.event_id, [
        ...(claimsByEvent.get(c.event_id) ?? []),
        {
          sourceSlug: c.source_slug,
          sourceName: c.source_name,
          tier: c.tier,
          independenceGroup: c.independence_group,
          title: c.title,
          titleTr: c.title_tr ?? null,
          url: c.url,
          publishedAt: iso(c.published_at),
        },
      ]);
    }

    const articlesByEvent = new Map<string, Article[]>();
    const toArticle = (a: any): Article => ({
      id: a.id,
      sourceSlug: a.source_slug,
      sourceName: a.source_name,
      tier: a.tier,
      independenceGroup: a.independence_group,
      trustBase: Number(a.trust_base),
      url: a.url,
      canonicalUrl: a.canonical_url,
      title: a.title,
      titleOriginal: a.title_original,
      lang: a.lang ?? '',
      publishedAt: iso(a.published_at),
      fetchedAt: iso(a.fetched_at) ?? '',
      excerpt: a.excerpt ?? '',
      contentHash: a.content_hash,
      archiveUrl: a.archive_url,
      viaAggregator: a.via_aggregator,
      originalPublisher: a.original_publisher,
      sourceStale: a.source_stale,
      titleTr: a.title_tr ?? null,
      excerptTr: a.excerpt_tr ?? null,
      translatedAt: iso(a.translated_at),
      translationProvider: a.translation_provider ?? null,
      translationStatus: a.translation_status ?? 'skipped',
    });

    for (const a of articlesRes.rows) {
      const row = toArticle(a);
      const eventId = a.event_id;
      articlesByEvent.set(eventId, [...(articlesByEvent.get(eventId) ?? []), row]);
    }

    const events: PlagueEvent[] = eventsRes.rows.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      titleOriginal: e.title_original,
      summary: e.summary,
      firstSeenAt: iso(e.first_seen_at) ?? '',
      lastUpdateAt: iso(e.last_update_at) ?? '',
      label: e.label,
      independentGroupCount: e.independent_group_count,
      groups: Array.isArray(e.groups) ? e.groups : [],
      claims: claimsByEvent.get(e.id) ?? [],
      articles: articlesByEvent.get(e.id) ?? [],
      contradiction: e.contradiction ?? { hasContradiction: false, sides: [] },
      titleTr: e.title_tr ?? null,
      summaryTr: e.summary_tr ?? null,
      translatedAt: iso(e.translated_at),
      translationProvider: e.translation_provider ?? null,
      translationStatus: e.translation_status ?? 'skipped',
    }));

    const report: IngestReport = {
      startedAt: iso(reportRow.started_at) ?? '',
      finishedAt: iso(reportRow.finished_at) ?? '',
      durationMs: reportRow.duration_ms,
      sources: Array.isArray(reportRow.sources) ? reportRow.sources : [],
      articlesFetched: reportRow.articles_fetched,
      articlesNew: reportRow.articles_new,
      articlesRelevant: reportRow.articles_relevant,
      events: reportRow.events,
      labelCounts: reportRow.label_counts,
      deadManSwitch: {
        ingestHealthy: reportRow.ingest_healthy,
        message: reportRow.dead_man_message,
      },
    };

    return {
      generatedAt: report.finishedAt,
      report,
      events,
      signals: signalsRes.rows.map(toArticle),
    };
  } finally {
    client.release();
  }
}

/** Son başarılı ingest'in zamanı — dead man's switch için site tarafında kullanılır. */
export async function lastIngestAt(): Promise<string | null> {
  const res = await getPool().query(
    'SELECT finished_at FROM ingest_reports ORDER BY finished_at DESC LIMIT 1',
  );
  return res.rowCount ? iso(res.rows[0].finished_at) : null;
}

/** Kapanış: Next.js/Vercel süreci sonlanırken bağlantıyı temiz kapat. */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = false;
  }
}

export const schemaTables = {
  articlesTable,
  eventsTable,
  claimsTable,
  sourceHealthTable,
  ingestReportsTable,
};
