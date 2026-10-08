import type {
  Article,
  EventClaim,
  EventLabel,
  PlagueEvent,
  RawItem,
  SourceDef,
  SourceIdentity,
  SourceLang,
} from '@/types';
import { getSource, resolvePublisherIdentity } from '@/lib/sources/registry';
import { computeEventLabel } from '@/lib/trust';
import {
  archiveUrlFor,
  canonicalizeUrl,
  fold,
  safeExternalUrl,
  shortHash,
  slugify,
} from '@/lib/sources/text';

// ───────────────────────────── İlgililik filtresi ─────────────────────────────

/** Hastalık terimleri (fold edilmiş biçimde yazılır). */
const DISEASE_TERMS = [
  // TR
  'veba', 'hiyarcikli', 'pnomoni', 'salgin',
  // EN
  'plague', 'bubonic', 'pneumonic', 'yersinia', 'black death', 'anti-plague',
  // RU
  'чума', 'бубонн', 'легочн', 'вспышк',
  // DE/FR
  'pest', 'peste',
];

/** Bağlam terimleri: hastalık + bağlam birlikte aranır. */
const CONTEXT_TERMS = [
  // Coğrafya
  'rusya', 'rus ', 'sibirya', 'irkutsk', 'mogolistan', 'kazakistan',
  'russia', 'russian', 'siberia', 'siberian', 'irkutsk', 'mongolia', 'kazakhstan',
  'росси', 'сибир', 'иркутск', 'монгол', 'казахстан',
  // Salgın bağlamı
  'outbreak', 'salgin', 'case', 'vaka', 'death', 'olum', 'quarantine', 'karantina',
  'hospital', 'hastane', 'infection', 'enfeksiyon', 'laboratory', 'laboratuvar',
  'вспышка', 'случа', 'смерт', 'карантин', 'больниц', 'инфекц', 'лаборатор',
];

/**
 * Tarih/arkeoloji gürültüsü. Ölçüldü: "The earliest known plague outbreak
 * happened in what is now Russia 5,500 years ago" haberleri akışa giriyordu.
 * Bu tür içerik ancak GÜNCEL salgın işareti varsa tutulur.
 */
const NOISE_PATTERNS = [
  'years ago', 'ancient', 'archaeolog', 'skeleton', 'prehistoric',
  'bronze age', 'neolithic', 'medieval london', 'plague of justinian',
  'dna from', 'fossil', 'yil once', 'antik',
];

const CURRENT_MARKERS = [
  '2026', 'case', 'quarantine', 'outbreak', 'died', 'death', 'infected',
  'patient', 'hospital', 'laboratory', 'lab worker', 'cdc', 'who ', 'monitoring',
  'vaka', 'karantina', 'olum', 'hastane', 'laboratuvar',
  'случа', 'карантин', 'больниц', 'лаборатор',
];

/**
 * Bir metnin bu izleme konusuyla ilgili olup olmadığı.
 * Kural: hastalık terimi VE bağlam terimi birlikte bulunmalı; ayrıca
 * tarih/arkeoloji içeriği güncel salgın işareti taşımıyorsa elenir.
 */
export function isRelevant(...parts: (string | null | undefined)[]): boolean {
  const text = fold(parts.filter(Boolean).join(' '));
  const hasDisease = DISEASE_TERMS.some((t) => text.includes(t));
  if (!hasDisease) return false;
  if (!CONTEXT_TERMS.some((t) => text.includes(t))) return false;

  const looksHistorical = NOISE_PATTERNS.some((t) => text.includes(t));
  if (looksHistorical && !CURRENT_MARKERS.some((t) => text.includes(t))) return false;

  return true;
}

// ───────────────────────────── Normalizasyon ─────────────────────────────

const FRESH_DAYS = 45;

export function isFresh(publishedAt: string | null, now = new Date()): boolean {
  if (!publishedAt) return true; // tarihsiz içerik atılmaz, etiketlenir
  const age = now.getTime() - new Date(publishedAt).getTime();
  return age <= FRESH_DAYS * 86_400_000;
}

/**
 * Toplayıcıdan gelen öğeyi gerçek kaynağa bağlar.
 * Google News üzerinden gelen bir Reuters haberi `reuters` tier'ını alır —
 * "Google News" diye bir güven seviyesi yoktur.
 */
/**
 * Toplayıcıdan gelen öğeyi gerçek kaynak kimliğine bağlar.
 *
 * Google News üzerinden gelen bir Reuters/NBC/CNN haberi kendi tier'ını
 * alır — "Google News" diye bir güven seviyesi yoktur. Yayıncı tanınmıyorsa
 * T5 kalır ve "kayıt dışı yayıncı" olarak etiketlenir.
 */
export function resolveSource(item: RawItem): SourceIdentity {
  const declared = getSource(item.sourceSlug);
  if (!item.originalPublisher) return declared;

  const identity = resolvePublisherIdentity(item.originalPublisher);
  if (identity) return identity;

  return {
    slug: `unknown-${slugify(item.originalPublisher).slice(0, 30) || 'publisher'}`,
    name: `${item.originalPublisher} (kayıt dışı yayıncı)`,
    tier: 5,
    group: 'unrecognized-publisher',
    trustBase: 30,
    lang: 'unknown',
  };
}

/**
 * Ham öğeyi Article'a çevirir.
 *
 * GÜVENLİK: yalnızca http/https bağlantılar kabul edilir. Geçersiz şema
 * taşıyan öğe için `null` döner ve çağıran taraf onu eler.
 */
export function normalizeItem(item: RawItem, sourceStale = false): Article | null {
  const url = safeExternalUrl(item.url);
  if (!url) return null;

  const source = resolveSource(item);
  const canonicalUrl = canonicalizeUrl(url);

  return {
    id: shortHash(`${source.slug}|${canonicalUrl}`),
    sourceSlug: source.slug,
    sourceName: source.name,
    tier: source.tier,
    independenceGroup: source.group,
    trustBase: source.trustBase,
    url,
    canonicalUrl,
    title: item.title,
    titleOriginal: item.title,
    lang: item.lang ?? (source.lang === 'multi' || !source.lang ? 'unknown' : source.lang),
    publishedAt: item.publishedAt,
    fetchedAt: new Date().toISOString(),
    excerpt: item.excerpt ?? '',
    contentHash: shortHash(fold(`${item.title}|${item.excerpt ?? ''}`)),
    archiveUrl: archiveUrlFor(canonicalUrl),
    viaAggregator: item.viaAggregator ?? null,
    originalPublisher: item.originalPublisher ?? null,
    sourceStale,
    titleTr: null,
    excerptTr: null,
    translatedAt: null,
    translationProvider: null,
    translationStatus: 'skipped',
  };
}

// ───────────────────────────── Tekrar giderme ─────────────────────────────

/**
 * Tekrar giderme YALNIZCA aynı kaynak içinde yapılır.
 * Farklı kaynakların aynı haberi yayınlaması tekrar değil, KANIT'tır;
 * onlar `clusterArticles` ile tek olay altında toplanır.
 */
export function dedupeArticles(articles: Article[]): Article[] {
  const byKey = new Map<string, Article>();

  for (const a of articles) {
    const key = `${a.sourceSlug}|${a.canonicalUrl}`;
    const existing = byKey.get(key);
    if (!existing || (a.publishedAt ?? '') > (existing.publishedAt ?? '')) {
      byKey.set(key, a);
    }
  }

  // Aynı kaynakta başlık neredeyse aynıysa (kopya yayın) tek tut.
  const bySource = new Map<string, Article[]>();
  for (const a of byKey.values()) {
    const list = bySource.get(a.sourceSlug) ?? [];
    list.push(a);
    bySource.set(a.sourceSlug, list);
  }

  const out: Article[] = [];
  for (const list of bySource.values()) {
    const kept: Article[] = [];
    for (const a of list) {
      const dup = kept.find((k) => jaccard(tokens(k.title), tokens(a.title)) >= 0.85);
      if (!dup) kept.push(a);
    }
    out.push(...kept);
  }
  return out;
}

// ───────────────────────────── Olay kümeleme ─────────────────────────────

/** Salgın haberleri haftalarca sürer; pencere geniş tutulur. */
const CLUSTER_WINDOW_MS = 7 * 24 * 3_600_000;
/**
 * ÖLÇÜM: Eşik 0.4 çok yüksekti — aynı olay (Irkutsk laborant ölümü) 13 ayrı
 * olaya bölünüyordu ve `corroborated` etiketi neredeyse hiç tetiklenmiyordu.
 * 0.28 + özet metni ile kümeleme anlamlı hale geldi.
 */
const JACCARD_THRESHOLD = 0.28;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'has', 'was',
  'were', 'are', 'its', 'says', 'said', 'after', 'over', 'into', 'about',
  'amid', 'will', 'been', 'more', 'than', 'news', 'report', 'reports',
  'ile', 'için', 'olan', 'olarak', 'bir', 'bu', 'ama', 'daha', 'sonra',
  'и', 'что', 'как', 'для', 'его', 'она', 'это',
]);

function tokens(input: string): Set<string> {
  return new Set(
    fold(input)
      .replace(/[^a-z0-9а-яё\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}

/**
 * Kümeleme benzerliği: BAŞLIK ağırlıklı (0.7) + başlık+özet (0.3).
 *
 * ÖLÇÜM (120 makale, 08 Eki 2026, canlı feed):
 *   A) yalnızca başlık+özet Jaccard, temsilci karşılaştırması → 84 olay,
 *      4 parçalanma çifti (aynı haber ayrı olay)
 *   B) 0.7·başlık + 0.3·özet, temsilci → 77 olay, PARÇALANMA 0,
 *      çok üyeli küme 16 → 18
 *   C) B + tüm üyelerle karşılaştırma → 64 olay, çok üyeli 7 (AŞIRI
 *      birleştirme: farklı olaylar tek kümeye giriyor) → reddedildi
 *   D) IDF ağırlıklı benzerlik → 104 olay, parçalanma 5 → reddedildi;
 *      bu korpusta "plague/russia" gibi ORTAK token'lar aynı olayın işareti,
 *      nadir token'lar ise yayıncıya özgü (ayırıcı değil).
 *
 * Neden gerekli oldu: kaynaklar gerçek RSS özetlerine geçince özet token'ları
 * çoğaldı ve Jaccard düştü; aynı haber farklı olaylara bölünüyordu.
 */
const TITLE_WEIGHT = 0.7;
const EXCERPT_WEIGHT = 1 - TITLE_WEIGHT;

function clusterSimilarity(a: Article, b: Article): number {
  return (
    TITLE_WEIGHT * jaccard(tokens(a.title), tokens(b.title)) +
    EXCERPT_WEIGHT *
      jaccard(tokens(`${a.title} ${a.excerpt}`), tokens(`${b.title} ${b.excerpt}`))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function withinWindow(a: Article, b: Article): boolean {
  if (!a.publishedAt || !b.publishedAt) return true;
  return (
    Math.abs(new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()) <=
    CLUSTER_WINDOW_MS
  );
}

export function clusterArticles(articles: Article[]): Article[][] {
  const sorted = [...articles].sort(
    (x, y) => new Date(y.publishedAt ?? 0).getTime() - new Date(x.publishedAt ?? 0).getTime(),
  );
  const clusters: Article[][] = [];

  for (const a of sorted) {
    const target = clusters.find((c) => {
      const rep = c[0];
      return withinWindow(a, rep) && clusterSimilarity(a, rep) >= JACCARD_THRESHOLD;
    });
    if (target) target.push(a);
    else clusters.push([a]);
  }

  return clusters;
}

// ───────────────────────────── Çelişki tespiti ─────────────────────────────

const NEGATION_PATTERNS = [
  'no evidence of plague', 'no sign of plague', 'no plague', 'not plague',
  'not a plague', 'rules out plague', 'ruled out plague', 'denies plague',
  'veba tespit edilmedi', 'veba yok', 'veba degil', 'veba olmadigi',
  'чума не выявлена', 'чума не обнаружена', 'не чума', 'чумы нет',
];

/**
 * Spesifik pozitif iddia kalıpları.
 *
 * ÖLÇÜM: 'plague' tek başına çok genişti — "Trump says US will help Russia
 * after Siberia plague institute death" haberi çelişkinin pozitif tarafı
 * sanılıyordu. Kalıplar daraltıldı; artık yalnızca gerçek bir veba iddiası
 * taşıyan başlıklar pozitif sayılır.
 */
const POSITIVE_PATTERNS = [
  'suspected plague', 'possible plague', 'probable plague',
  'pneumonic plague', 'bubonic plague',
  'plague case', 'plague cases', 'plague death', 'plague deaths',
  'died of plague', 'die of plague', 'plague infection',
  'infected with plague', 'plague outbreak', 'plague scare',
  'plague quarantine', 'plague fears',
  'veba suphesi', 'veba salgini', 'veba vakasi', 'vebadan',
  'подозрение на чуму', 'случай чумы', 'вспышка чумы',
];

function titleHasNegation(a: Article): boolean {
  const text = fold(a.title);
  return NEGATION_PATTERNS.some((p) => text.includes(p));
}

/**
 * Muhafazakâr çelişki tespiti.
 *
 * İKİ ÖLÇÜMLE DÜZELTİLDİ:
 *  1. Yalnızca BAŞLIK kullanılır. Özet metni makalenin kendi iddiası değildir;
 *     alıntılanan karşıt görüşü içerdiği için yanlış pozitif üretiyordu
 *     ("Trump says US will help…" haberi çelişkili sanılıyordu).
 *  2. Çelişki ancak FARKLI bağımsızlık grupları arasında anlamlıdır. Aynı
 *     kaynağın iki haberi birbiriyle çelişemez.
 */
export function detectContradiction(articles: Article[]): {
  hasContradiction: boolean;
  sides: { group: string; statement: string; statementTr: string | null; sourceSlug: string }[];
} {
  const negative = articles.filter(titleHasNegation);
  const positive = articles.filter((a) => {
    if (titleHasNegation(a)) return false;
    const text = fold(a.title);
    return POSITIVE_PATTERNS.some((p) => text.includes(p));
  });

  const crossGroup =
    negative.length > 0 &&
    positive.length > 0 &&
    negative.some((n) =>
      positive.some((p) => p.independenceGroup !== n.independenceGroup),
    );

  if (!crossGroup) {
    return { hasContradiction: false, sides: [] };
  }

  const best = (list: Article[]) => [...list].sort((x, y) => x.tier - y.tier)[0];
  const pick = (a: Article) => ({
    group: a.independenceGroup,
    statement: a.title,
    statementTr: a.titleTr,
    sourceSlug: a.sourceSlug,
  });

  return {
    hasContradiction: true,
    sides: [pick(best(negative)), pick(best(positive))],
  };
}

// ───────────────────────────── Olay oluşturma ─────────────────────────────

function toClaim(a: Article): EventClaim {
  return {
    sourceSlug: a.sourceSlug,
    sourceName: a.sourceName,
    tier: a.tier,
    independenceGroup: a.independenceGroup,
    title: a.title,
    titleTr: a.titleTr,
    url: a.url,
    publishedAt: a.publishedAt,
  };
}

export function buildEvent(cluster: Article[]): PlagueEvent {
  const sorted = [...cluster].sort(
    (x, y) => new Date(x.publishedAt ?? 0).getTime() - new Date(y.publishedAt ?? 0).getTime(),
  );

  // Kaynak kimlikleri makalelerden türetilir — `getSource` kullanılmaz,
  // çünkü "kayıt dışı yayıncı" slug'ları registry'de bulunmaz.
  const identities: SourceIdentity[] = [];
  const seenSlugs = new Set<string>();
  for (const a of sorted) {
    if (seenSlugs.has(a.sourceSlug)) continue;
    seenSlugs.add(a.sourceSlug);
    identities.push({
      slug: a.sourceSlug,
      name: a.sourceName,
      tier: a.tier,
      group: a.independenceGroup,
      trustBase: a.trustBase,
      lang: a.lang as SourceLang,
    });
  }

  const groups = [...new Set(identities.map((s) => s.group))];

  const contradiction = detectContradiction(sorted);
  const label: EventLabel = computeEventLabel({
    groups,
    sources: identities,
    hasContradiction: contradiction.hasContradiction,
  });

  // Özet: en yüksek tier'lı (en güvenilir) kaynağın alıntısı.
  const best = [...sorted].sort((x, y) => x.tier - y.tier)[0];
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const id = shortHash(sorted.map((a) => a.canonicalUrl).join('|'));

  return {
    id,
    slug: `${slugify(oldest.title)}-${id}`,
    title: oldest.title,
    titleOriginal: oldest.titleOriginal,
    summary: best.excerpt || oldest.excerpt,
    firstSeenAt: oldest.publishedAt ?? oldest.fetchedAt,
    lastUpdateAt: newest.publishedAt ?? newest.fetchedAt,
    label,
    independentGroupCount: groups.length,
    groups,
    claims: sorted.map(toClaim),
    articles: sorted,
    contradiction,
    titleTr: oldest.titleTr,
    summaryTr: null,
    translatedAt: null,
    translationProvider: null,
    translationStatus: 'skipped',
  };
}

export function buildEvents(articles: Article[]): PlagueEvent[] {
  return clusterArticles(articles)
    .map(buildEvent)
    .sort(
      (a, b) =>
        new Date(b.lastUpdateAt).getTime() - new Date(a.lastUpdateAt).getTime(),
    );
}
