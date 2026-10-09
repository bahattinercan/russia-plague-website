/**
 * Sayısal durum — KÜRATÖRLÜ rakamlar, gerçek feed kaydına bağlı.
 *
 * NEDEN ÇIKARIM DEĞİL (ölçüldü, 7 Eki 2026 · 60 olay):
 *   "A 28-year-old plague researcher died"      → naif çıkarım deaths=28 (28 = YAŞ)
 *   "denies plague death but quarantines 200"   → naif çıkarım deaths=200 (200 = KARANTİNA)
 *   rakam içeren olay oranı: %8'in altında
 * Yanlış sayı göstermek, bu projenin "sistem doğrulandı demez" ilkesinden daha ağır bir
 * ihlaldir: doğrudan yanlış bilgi yaymak olur.
 *
 * Bu yüzden rakamlar `data/figures.json` içinde KÜRATÖRLÜ durur ve her kayıt bir feed
 * kaydına ÇÖZÜLMEK zorundadır. Çözülemeyen kayıt gösterilmez (ve `npm run figures-check`
 * başarısız olur), böylece var olmayan bir kaynağa atıf yapılamaz.
 *
 * ── BAĞ ANAHTARI: `phrase` + `sourceName` (08 Eki 2026 değişikliği) ──────────────
 *
 * Önceden bağ `eventId` + `sourceName` ile kuruluyordu. Ölçüm bunun kırılgan olduğunu
 * gösterdi: ingest ~10 dakikada bir olayları yeniden üretiyor, olay kimlikleri düşüyor
 * ya da yeniden oluşuyor. 3 saatlik pencerede 9 kaydın 4'ü koptu (2'si elle yeniden
 * bağlandı, 2'si kaldırıldı) — yani küratörlü dosya sürekli bakım istiyordu.
 *
 * Artık bağ, kaydın `phrase` alanıyla kurulur: `phrase` zaten kaynağın KENDİ cümlesi
 * olmak zorunda olduğu için doğal bir anahtardır ve kendi kendini doğrular —
 * cümle korpusta varsa rakam gösterilir, yoksa gösterilmez. `sourceName` eşleşmesi
 * zorunlu olduğundan cümle başka bir yayıncının ağzından eşleşemez.
 *
 * `eventId` artık ZORUNLU DEĞİL: yalnızca ipucu. Aynı cümle birden çok olayda geçiyorsa
 * doğru olayı seçmek için kullanılır; bayatlamışsa sessizce yok sayılır (kırılmaz).
 *
 * Kural: sistem rakamları TOPLAMAZ, BİRLEŞTİRMEZ, TEYİT ETMEZ. Aynı ölçüt için farklı
 * kaynaklar farklı sayı ya da farklı ifade veriyorsa İKİSİ DE gösterilir (PLAN.md §9.5).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PlagueEvent } from '@/types';
import { safeExternalUrl } from '@/lib/sources/text';
import { stripEmDashes } from '@/lib/text-normalize';

export type FigureMetric = 'cases' | 'deaths' | 'restricted';

/** Belirsizliği korur: "200" ile "neredeyse 200" aynı şey değildir. */
export type FigureQualifier = 'exact' | 'about' | 'nearly' | 'at-least' | 'more-than';

export interface FigureDef {
  id: string;
  metric: FigureMetric;
  value: number;
  qualifier: FigureQualifier;
  /** Yalnızca `restricted` için: kaynağın kendi ölçü ifadesi. */
  measureTr?: string;
  measureEn?: string;
  sourceName: string;
  /**
   * OPSİYONEL ipucu. Bağın kendisi değil (bkz. dosya başı): olay kimlikleri her
   * ingest'te yeniden üretilebildiği için kararlı değil. Yalnızca aynı cümle birden
   * çok olayda geçtiğinde hangisinin seçileceğini belirtir.
   */
  eventId?: string;
  /** Kaynağın kendi cümlesi — hem atıf hem ARAMA ANAHTARI. */
  phrase: string;
}

interface FiguresFile {
  generatedAt: string;
  figures: FigureDef[];
}

export interface ResolvedFigure extends FigureDef {
  url: string | null;
  tier: number | null;
  sourceSlug: string | null;
  /** Feed'deki yayın zamanı — "as_of" buradan gelir, bayatlayamaz. */
  asOf: string | null;
  eventTitle: string;
  eventSlug: string;
  independentGroupCount: number;
}

export interface FigureGroup {
  metric: FigureMetric;
  figures: ResolvedFigure[];
  /** Kaynakların bildirdiği FARKLI değerler (çelişki göstergesi). */
  distinctValues: number[];
  /** Kaynakların kullandığı FARKLI ölçü ifadeleri. */
  measures: string[];
  /** Bu ölçütü bildiren bağımsız kaynak gruplarının birleşimi. */
  independentGroups: number;
  disagreement: boolean;
}

export interface FiguresSnapshot {
  groups: FigureGroup[];
  /** Çözülemeyen kayıtlar — gösterilmez, yalnızca uyarı için. */
  unresolved: FigureDef[];
  generatedAt: string | null;
}

const FIGURES_PATH = path.join(process.cwd(), 'data', 'figures.json');

let cache: FiguresFile | null = null;

export async function loadFigureDefs(): Promise<FiguresFile> {
  if (cache) return cache;
  try {
    const raw = await readFile(FIGURES_PATH, 'utf8');
    const parsed = JSON.parse(raw) as FiguresFile;
    cache = { generatedAt: parsed.generatedAt, figures: parsed.figures ?? [] };
  } catch {
    cache = { generatedAt: '', figures: [] };
  }
  return cache;
}

/** Boşluk/ölçek farklarını yok say (feed'de çift boşluk, NBSP vb. olabiliyor).
 * Em dash de burada temizlenir: görünüm katmanı (data.ts) feed metinlerinden
 * em dash'i kaldırdığı için cümlenin İKİ tarafı da aynı kuraldan geçmeli. */
function normalize(value: string): string {
  return stripEmDashes(value).replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
}

/**
 * Cümleyi kelime sınırlarında arar. Sınır şart: kısa bir cümle ("1 dead") uzun bir
 * metnin ortasında ("21 dead") eşleşip yanlış rakamı göstermemeli.
 */
function containsPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'u').test(haystack);
}

/** Bir kaydın eşleşebileceği metin alanları. `title` daima ORİJİNALdir. */
function candidateTexts(record: {
  title?: string;
  titleOriginal?: string;
  titleTr?: string | null;
  excerpt?: string;
}): string[] {
  return [record.title, record.titleOriginal, record.titleTr ?? undefined, record.excerpt].filter(
    (text): text is string => typeof text === 'string' && text.trim().length > 0,
  );
}

interface Candidate {
  event: PlagueEvent;
  kind: 'claim' | 'article';
  sourceName: string;
  tier: number;
  sourceSlug: string;
  url: string;
  publishedAt: string | null;
}

function collectCandidates(figure: FigureDef, events: PlagueEvent[]): Candidate[] {
  const phrase = normalize(figure.phrase);
  const hits: Candidate[] = [];

  for (const event of events) {
    for (const claim of event.claims) {
      if (claim.sourceName !== figure.sourceName) continue;
      if (!candidateTexts(claim).some((text) => containsPhrase(normalize(text), phrase))) continue;
      hits.push({
        event,
        kind: 'claim',
        sourceName: claim.sourceName,
        tier: claim.tier,
        sourceSlug: claim.sourceSlug,
        url: claim.url,
        publishedAt: claim.publishedAt,
      });
    }

    for (const article of event.articles) {
      if (article.sourceName !== figure.sourceName) continue;
      if (!candidateTexts(article).some((text) => containsPhrase(normalize(text), phrase))) continue;
      hits.push({
        event,
        kind: 'article',
        sourceName: article.sourceName,
        tier: article.tier,
        sourceSlug: article.sourceSlug,
        url: article.url,
        publishedAt: article.publishedAt,
      });
    }
  }

  return hits;
}

/**
 * Eşleşme birden çok ise seçim SIRASI (deterministik):
 *   1) `eventId` ipucuna uyan olay (varsa ve hâlâ feed'deyse),
 *   2) iddia katmanı (kürasyonlu, tier'lı) makaleye yeğlenir,
 *   3) en yeni yayın zamanı.
 */
function pickCandidate(hits: Candidate[], hint?: string): Candidate {
  const hinted = hint ? hits.filter((hit) => hit.event.id === hint) : [];
  const pool = hinted.length > 0 ? hinted : hits;

  const claims = pool.filter((hit) => hit.kind === 'claim');
  const finalPool = claims.length > 0 ? claims : pool;

  return [...finalPool].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))[0];
}

/**
 * Bir kaydı feed'deki gerçek iddia/makaleye çözer. Bulamazsa null.
 * Dönen `eventId` artık ipucu değil, ÇÖZÜLEN olayın kimliğidir.
 */
function resolveOne(figure: FigureDef, events: PlagueEvent[]): ResolvedFigure | null {
  const hits = collectCandidates(figure, events);
  if (hits.length === 0) return null;

  const pick = pickCandidate(hits, figure.eventId);

  return {
    ...figure,
    eventId: pick.event.id,
    url: safeExternalUrl(pick.url),
    tier: pick.tier,
    sourceSlug: pick.sourceSlug,
    asOf: pick.publishedAt,
    eventTitle: pick.event.title,
    eventSlug: pick.event.slug,
    independentGroupCount: pick.event.independentGroupCount,
  };
}

const METRIC_ORDER: FigureMetric[] = ['cases', 'deaths', 'restricted'];

export async function buildFigures(events: PlagueEvent[]): Promise<FiguresSnapshot> {
  const defs = await loadFigureDefs();
  const resolved: ResolvedFigure[] = [];
  const unresolved: FigureDef[] = [];

  for (const figure of defs.figures) {
    const hit = resolveOne(figure, events);
    if (hit) resolved.push(hit);
    else unresolved.push(figure);
  }

  const groups: FigureGroup[] = METRIC_ORDER.map((metric) => {
    const figures = resolved
      .filter((f) => f.metric === metric)
      .sort((a, b) => (a.asOf ?? '').localeCompare(b.asOf ?? ''));

    // Bağımsız grup sayısı: bu ölçütü bildiren olayların gruplarını birleştir.
    const groupSets = figures.map((f) => {
      const event = events.find((e) => e.id === f.eventId);
      return event?.groups ?? [];
    });
    const independentGroups = new Set(groupSets.flat()).size;

    const distinctValues = [...new Set(figures.map((f) => f.value))].sort((a, b) => a - b);
    const measures = [
      ...new Set(figures.map((f) => f.measureTr ?? '').filter(Boolean)),
    ].sort();

    return {
      metric,
      figures,
      distinctValues,
      measures,
      independentGroups,
      disagreement: distinctValues.length > 1 || measures.length > 1,
    };
  });

  return { groups, unresolved, generatedAt: defs.generatedAt || null };
}
