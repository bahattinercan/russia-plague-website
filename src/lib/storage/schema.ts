import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Neon / Postgres şeması.
 *
 * DDL iki yerde duruyor:
 *  - Drizzle tablo tanımları  → tip güvenli sorgular
 *  - SCHEMA_SQL               → idempotent bootstrap (CREATE TABLE IF NOT EXISTS)
 *
 * Neden drizzle-kit migration değil? Cron her çalıştırdığında migration
 * koşmak gereksiz; IF NOT EXISTS DDL tek seferde, güvenli ve okunabilir.
 * Yeni kolon eklerken İKİSİNİ birden güncellemek zorunlu (bkz. Pitfall).
 */

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'string' });

export const articlesTable = pgTable('articles', {
  id: text('id').primaryKey(),
  sourceSlug: text('source_slug').notNull(),
  sourceName: text('source_name').notNull(),
  tier: integer('tier').notNull(),
  independenceGroup: text('independence_group').notNull(),
  trustBase: integer('trust_base').notNull(),
  url: text('url').notNull(),
  canonicalUrl: text('canonical_url').notNull(),
  title: text('title').notNull(),
  titleOriginal: text('title_original').notNull(),
  lang: text('lang'),
  publishedAt: timestamptz('published_at'),
  fetchedAt: timestamptz('fetched_at').notNull(),
  excerpt: text('excerpt').notNull().default(''),
  contentHash: text('content_hash').notNull(),
  archiveUrl: text('archive_url'),
  viaAggregator: text('via_aggregator'),
  originalPublisher: text('original_publisher'),
  sourceStale: boolean('source_stale').notNull().default(false),
  firstSeenAt: timestamptz('first_seen_at').notNull().defaultNow(),
  lastSeenAt: timestamptz('last_seen_at').notNull().defaultNow(),
});

export const eventsTable = pgTable('events', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  titleOriginal: text('title_original').notNull(),
  summary: text('summary').notNull().default(''),
  firstSeenAt: timestamptz('first_seen_at').notNull(),
  lastUpdateAt: timestamptz('last_update_at').notNull(),
  label: text('label').notNull(),
  independentGroupCount: integer('independent_group_count').notNull().default(0),
  groups: jsonb('groups').notNull().default([]),
  contradiction: jsonb('contradiction').notNull().default({
    hasContradiction: false,
    sides: [],
  }),
  firstIngestedAt: timestamptz('first_ingested_at').notNull().defaultNow(),
  lastIngestedAt: timestamptz('last_ingested_at').notNull().defaultNow(),
});

export const claimsTable = pgTable('event_claims', {
  eventId: text('event_id').notNull(),
  sourceSlug: text('source_slug').notNull(),
  sourceName: text('source_name').notNull(),
  tier: integer('tier').notNull(),
  independenceGroup: text('independence_group').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  publishedAt: timestamptz('published_at'),
});

export const eventArticlesTable = pgTable('event_articles', {
  eventId: text('event_id').notNull(),
  articleId: text('article_id').notNull(),
});

export const sourceHealthTable = pgTable('source_health', {
  sourceSlug: text('source_slug').notNull(),
  checkedAt: timestamptz('checked_at').notNull(),
  ok: boolean('ok').notNull(),
  httpStatus: integer('http_status'),
  latencyMs: integer('latency_ms').notNull(),
  itemsFound: integer('items_found').notNull(),
  newestItemAt: timestamptz('newest_item_at'),
  stale: boolean('stale').notNull(),
  error: text('error'),
});

export const ingestReportsTable = pgTable('ingest_reports', {
  id: serial('id').primaryKey(),
  startedAt: timestamptz('started_at').notNull(),
  finishedAt: timestamptz('finished_at').notNull(),
  durationMs: integer('duration_ms').notNull(),
  sources: jsonb('sources').notNull().default([]),
  articlesFetched: integer('articles_fetched').notNull(),
  articlesNew: integer('articles_new').notNull(),
  articlesRelevant: integer('articles_relevant').notNull(),
  events: integer('events').notNull(),
  labelCounts: jsonb('label_counts').notNull().default({}),
  ingestHealthy: boolean('ingest_healthy').notNull(),
  deadManMessage: text('dead_man_message').notNull(),
});

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS articles (
  id                 text PRIMARY KEY,
  source_slug        text NOT NULL,
  source_name        text NOT NULL,
  tier               integer NOT NULL,
  independence_group text NOT NULL,
  trust_base         integer NOT NULL,
  url                text NOT NULL,
  canonical_url      text NOT NULL,
  title              text NOT NULL,
  title_original     text NOT NULL,
  lang               text,
  published_at       timestamptz,
  fetched_at         timestamptz NOT NULL,
  excerpt            text NOT NULL DEFAULT '',
  content_hash       text NOT NULL,
  archive_url        text,
  via_aggregator     text,
  original_publisher text,
  source_stale       boolean NOT NULL DEFAULT false,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS articles_canonical_url_key ON articles (canonical_url);
CREATE INDEX IF NOT EXISTS articles_published_idx ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS articles_content_hash_idx ON articles (content_hash);
CREATE INDEX IF NOT EXISTS articles_source_idx ON articles (source_slug);

CREATE TABLE IF NOT EXISTS events (
  id                    text PRIMARY KEY,
  slug                  text NOT NULL,
  title                 text NOT NULL,
  title_original        text NOT NULL,
  summary               text NOT NULL DEFAULT '',
  first_seen_at         timestamptz NOT NULL,
  last_update_at        timestamptz NOT NULL,
  label                 text NOT NULL,
  independent_group_count integer NOT NULL DEFAULT 0,
  groups                jsonb NOT NULL DEFAULT '[]',
  contradiction         jsonb NOT NULL DEFAULT '{"hasContradiction":false,"sides":[]}',
  first_ingested_at     timestamptz NOT NULL DEFAULT now(),
  last_ingested_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_last_update_idx ON events (last_update_at DESC);
CREATE INDEX IF NOT EXISTS events_label_idx ON events (label);

CREATE TABLE IF NOT EXISTS event_claims (
  event_id           text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_slug        text NOT NULL,
  source_name        text NOT NULL,
  tier               integer NOT NULL,
  independence_group text NOT NULL,
  title              text NOT NULL,
  url                text NOT NULL,
  published_at       timestamptz,
  PRIMARY KEY (event_id, url)
);
CREATE INDEX IF NOT EXISTS event_claims_event_idx ON event_claims (event_id);

CREATE TABLE IF NOT EXISTS event_articles (
  event_id   text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  article_id text NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, article_id)
);

CREATE TABLE IF NOT EXISTS source_health (
  source_slug    text NOT NULL,
  checked_at     timestamptz NOT NULL,
  ok             boolean NOT NULL,
  http_status    integer,
  latency_ms     integer NOT NULL,
  items_found    integer NOT NULL,
  newest_item_at timestamptz,
  stale          boolean NOT NULL,
  error          text,
  PRIMARY KEY (source_slug, checked_at)
);
CREATE INDEX IF NOT EXISTS source_health_checked_idx ON source_health (checked_at DESC);

CREATE TABLE IF NOT EXISTS ingest_reports (
  id               serial PRIMARY KEY,
  started_at       timestamptz NOT NULL,
  finished_at      timestamptz NOT NULL,
  duration_ms      integer NOT NULL,
  sources          jsonb NOT NULL DEFAULT '[]',
  articles_fetched integer NOT NULL,
  articles_new     integer NOT NULL,
  articles_relevant integer NOT NULL,
  events           integer NOT NULL,
  label_counts     jsonb NOT NULL DEFAULT '{}',
  ingest_healthy   boolean NOT NULL,
  dead_man_message text NOT NULL
);
CREATE INDEX IF NOT EXISTS ingest_reports_finished_idx ON ingest_reports (finished_at DESC);
`;

/** Kaynak sağlık günlüğünü bu yaşın üzerinde tutmayız (Neon free: satır limiti). */
export const HEALTH_RETENTION_DAYS = 90;
export const ARTICLE_RETENTION_DAYS = 180;
