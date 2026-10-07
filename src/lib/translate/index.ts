/**
 * Çeviri orkestrasyonu.
 *
 * Akış:
 *   1. Sağlayıcıyı seç (yoksa hepsi `skipped` → site orijinalle çalışır)
 *   2. Önbelleği oku (content_hash → önceki çeviri)
 *   3. Eksik başlık/özetleri öncelik sırasına diz (önce başlıklar)
 *   4. Süre + karakter bütçesi içinde toplu çevir
 *   5. Her çıktıyı doğrulama kapılarından geçir
 *   6. Sonuçları TÜM makale nesnelerine uygula (hash üzerinden)
 *   7. Olay/iddia/çelişki TR alanlarını türet
 *
 * Kümeleme, tekrar giderme ve çelişki tespiti bu adımdan ÖNCE, orijinal
 * metinle yapılır; çeviri bu mantığı hiç etkilemez.
 */
import type { Article, PlagueEvent, TranslationStatus } from '@/types';
import { fold } from '@/lib/sources/text';
import { resolveSourceLang, shouldTranslate } from './detect';
import { validateTranslation } from './validate';
import {
  createTranslator,
  readTranslatorConfig,
  type Translator,
  type TranslatorConfig,
} from './provider';
import { loadTranslationCache } from './cache';

export interface TranslateFeedInput {
  events: PlagueEvent[];
  signals: Article[];
}

export interface TranslateOptions {
  /** Test enjeksiyonu: verilirse env okunmaz. */
  translator?: Translator | null;
  config?: Partial<TranslatorConfig>;
  targetLang?: string;
  /** Süre bütçesi (ms) — cron'un 12 dk sınırının içinde kalmak için. */
  maxMs?: number;
  /** Tur başına toplam karakter sert sınırı (kaza koruması). */
  budgetChars?: number;
  batchSize?: number;
  now?: () => Date;
  log?: (message: string) => void;
}

export interface TranslateReport {
  provider: string | null;
  /** Sağlayıcıya gönderilen metin sayısı. */
  attempted: number;
  /** Çevirisi hazır makale sayısı (önbellek dahil). */
  applied: number;
  failed: number;
  skipped: number;
  chars: number;
  elapsedMs: number;
  note?: string;
}

interface Job {
  hash: string;
  field: 'title' | 'excerpt';
  text: string;
  sourceLang: string;
}

interface Outcome {
  titleTr: string | null;
  excerptTr: string | null;
  provider: string | null;
  translatedAt: string | null;
}

function collectArticles(input: TranslateFeedInput): Article[] {
  return [...input.events.flatMap((e) => e.articles), ...input.signals];
}

function time(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function translateFeed(
  input: TranslateFeedInput,
  options: TranslateOptions = {},
): Promise<TranslateReport> {
  const started = Date.now();
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const targetLang = (options.targetLang ?? 'tr').toLowerCase();
  const maxMs = options.maxMs ?? 90_000;
  const budgetChars = options.budgetChars ?? 60_000;
  const batchSize = options.batchSize ?? 50;

  const translator =
    options.translator !== undefined
      ? options.translator
      : createTranslator({ ...readTranslatorConfig(), ...options.config });

  const allArticles = collectArticles(input);
  const report: TranslateReport = {
    provider: translator?.name ?? null,
    attempted: 0,
    applied: 0,
    failed: 0,
    skipped: 0,
    chars: 0,
    elapsedMs: 0,
  };

  if (targetLang !== 'tr') {
    report.note = `hedef dil desteklenmiyor: ${targetLang}`;
    report.elapsedMs = Date.now() - started;
    return report;
  }

  if (!translator) {
    report.note = 'ceviri saglayicisi yok (TRANSLATE_PROVIDER=off veya anahtar tanimsiz)';
    report.elapsedMs = Date.now() - started;
    return report;
  }

  if (allArticles.length === 0) {
    report.elapsedMs = Date.now() - started;
    return report;
  }

  // content_hash başına tek iş birimi; en uzun orijinali temsilci seç.
  const unique = new Map<string, Article>();
  for (const a of allArticles) {
    if (!a?.contentHash) continue;
    const existing = unique.get(a.contentHash);
    if (!existing || (a.title?.length ?? 0) > (existing.title?.length ?? 0)) {
      unique.set(a.contentHash, a);
    }
  }

  const cache = await loadTranslationCache();
  const outcomes = new Map<string, Outcome>();
  const attempted = new Set<string>();

  for (const [hash, article] of unique) {
    const cached = cache.get(hash);
    if (cached) {
      outcomes.set(hash, {
        titleTr: cached.titleTr,
        excerptTr: cached.excerptTr,
        provider: cached.provider ?? 'cache',
        translatedAt: cached.translatedAt,
      });
      continue;
    }

    if (!shouldTranslate(article.lang, article.title)) {
      outcomes.set(hash, { titleTr: null, excerptTr: null, provider: null, translatedAt: null });
      continue;
    }

    outcomes.set(hash, { titleTr: null, excerptTr: null, provider: null, translatedAt: null });
  }

  // İş listesi: önce başlıklar, sonra özetler (bütçe dolarsa özetler kalır).
  const titleJobs: Job[] = [];
  const excerptJobs: Job[] = [];

  for (const [hash, article] of unique) {
    if (cache.has(hash)) continue;
    if (!shouldTranslate(article.lang, article.title)) continue;

    const sourceLang = resolveSourceLang(article.lang, article.title);
    if (article.title.trim()) {
      titleJobs.push({ hash, field: 'title', text: article.title, sourceLang });
    }

    const excerpt = (article.excerpt ?? '').trim();
    // Google News özeti "başlık + yayıncı" biçiminde; çevirmek israf.
    if (excerpt && !fold(excerpt).startsWith(fold(article.title))) {
      excerptJobs.push({
        hash,
        field: 'excerpt',
        text: excerpt,
        sourceLang: resolveSourceLang(article.lang, excerpt),
      });
    }
  }

  const queue: Job[] = [...titleJobs, ...excerptJobs];
  let spent = 0;

  while (queue.length > 0) {
    if (Date.now() - started > maxMs) {
      log(`⚠ çeviri süre bütçesi doldu (${maxMs} ms) — kalanlar sonraki tura`);
      break;
    }

    const batch: Job[] = [];
    while (queue.length > 0 && batch.length < batchSize) {
      const job = queue[0];
      if (spent + job.text.length > budgetChars) break;
      spent += job.text.length;
      batch.push(queue.shift()!);
    }
    if (batch.length === 0) {
      log(`⚠ çeviri karakter bütçesi doldu (${budgetChars})`);
      break;
    }

    report.chars += batch.reduce((n, j) => n + j.text.length, 0);
    report.attempted += batch.length;

    let results: (string | null)[];
    try {
      results = await translator.translate(
        batch.map((j) => ({ text: j.text, sourceLang: j.sourceLang })),
        targetLang,
      );
    } catch (e) {
      log(`⚠ çeviri isteği başarısız: ${message(e)}`);
      results = batch.map(() => null);
    }

    batch.forEach((job, i) => {
      attempted.add(job.hash);
      const output = results[i];
      if (!output) return;

      const check = validateTranslation(job.text, output, job.sourceLang);
      if (!check.ok) {
        log(`⚠ çeviri reddedildi (${check.reason}): ${job.text.slice(0, 70)}`);
        return;
      }

      const outcome = outcomes.get(job.hash);
      if (!outcome) return;
      if (job.field === 'title') outcome.titleTr = output;
      else outcome.excerptTr = output;
      outcome.provider = translator.name;
      outcome.translatedAt = now().toISOString();
    });
  }

  // Sonuçları TÜM makale nesnelerine uygula (kopya referans sorununa karşı hash).
  for (const article of allArticles) {
    const outcome = outcomes.get(article.contentHash);
    if (!outcome) continue;

    const hasTranslation = Boolean(outcome.titleTr || outcome.excerptTr);
    const status: TranslationStatus = hasTranslation
      ? 'ok'
      : attempted.has(article.contentHash)
        ? 'failed'
        : 'skipped';

    article.titleTr = outcome.titleTr;
    article.excerptTr = outcome.excerptTr;
    article.translationStatus = status;
    article.translationProvider = hasTranslation ? (outcome.provider ?? translator.name) : null;
    article.translatedAt = hasTranslation ? outcome.translatedAt : null;
  }

  // Olay / iddia / çelişki türetimi
  for (const event of input.events) {
    const sorted = [...event.articles].sort(
      (x, y) => time(x.publishedAt ?? x.fetchedAt) - time(y.publishedAt ?? y.fetchedAt),
    );
    const oldest = sorted[0];
    const best = [...event.articles].sort((x, y) => x.tier - y.tier)[0];

    event.titleTr = oldest?.titleTr ?? null;
    event.summaryTr = best?.excerptTr ?? null;
    event.translationStatus = oldest?.translationStatus ?? 'skipped';
    event.translationProvider = oldest?.translationProvider ?? null;
    event.translatedAt = oldest?.translatedAt ?? null;

    for (const claim of event.claims) {
      const article =
        event.articles.find((a) => a.url === claim.url) ??
        event.articles.find((a) => a.sourceSlug === claim.sourceSlug && a.title === claim.title);
      claim.titleTr = article?.titleTr ?? null;
    }

    if (event.contradiction.hasContradiction) {
      for (const side of event.contradiction.sides) {
        const article = event.articles.find(
          (a) => a.sourceSlug === side.sourceSlug && a.title === side.statement,
        );
        side.statementTr = article?.titleTr ?? null;
      }
    }
  }

  let applied = 0;
  let failedHashes = 0;
  for (const [hash, outcome] of outcomes) {
    if (outcome.titleTr || outcome.excerptTr) {
      applied++;
    } else if (attempted.has(hash)) {
      failedHashes++;
    }
  }
  report.applied = applied;
  report.failed = failedHashes;
  report.skipped = outcomes.size - applied - failedHashes;

  report.elapsedMs = Date.now() - started;
  return report;
}
