/**
 * Coğrafi çıkarım — saf fonksiyonlar (read-time).
 *
 * Neden ingest'te DEĞİL: kalıcılaştırmak `events` tablosuna yeni kolon
 * eklemek demek (Drizzle + SCHEMA_SQL + EVENT_COLUMNS + EVENT_UPDATE_COLUMNS
 * = 4 yer) ve üretim Postgres'ten okuduğu için alan sızarsa harita prod'da
 * boş kalır. Read-time hesap mevcut veriye anında uygulanır ve geri alınabilir.
 *
 * ÖNEMLİ: burada `fold()` KULLANILMAZ. `src/lib/sources/text.ts` içindeki
 * `fold()` yalnızca Türkçe diakritik katlar ve ingest'te relevance
 * skorlamasında kullanılır; davranışını değiştirmek mevcut etiket
 * dağılımını kaydırır. Bu yüzden ayrı bir `foldGeo()` var.
 */
import type { PlagueEvent } from '@/types';
import { FEDERAL_SUBJECTS, MACRO_REGIONS, regionName } from './gazetteer';

/**
 * Coğrafi metin normalizasyonu.
 *
 * `fold()`'dan farkları:
 *  - NFD ile ayrıştırıp birleşen işaretleri siler → ş/ğ/ç/ö/ü/â de kapsanır,
 *  - Kiril'i olduğu gibi korur ama `й`/`ё` gibi ayrışan harfleri sadeleştirir,
 *  - `ı` için açık eşleme (NFD bunu çözmez).
 */
export function foldGeo(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
}

/** Metni harf/rakam dizilerine böler — `\b` Kiril'de çalışmadığı için elle. */
function tokenize(folded: string): string[] {
  return folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Alias anahtarı ile metin penceresi AYNI biçimde üretilmeli. */
function keyize(folded: string): string {
  return tokenize(folded).join(' ');
}

interface AliasEntry {
  slug: string;
  kind: 'subject' | 'macro';
}

/** Tek token alias'lar için alt sınır: kısa kelimeler yanlış pozitif üretir. */
const MIN_SINGLE_TOKEN_ALIAS = 4;

const INDEX = new Map<string, AliasEntry[]>();
let MAX_ALIAS_TOKENS = 1;

/*
 * Kiril ÇEKİM sorunu: Rusça metinde bölge adları ek alır —
 * "в Иркутской области" (İrkutsk), "в Туве" (Tuva). Tam token eşleşmesi
 * bunları kaçırır. Çözüm: Kiril tek-token alias'lar için son harfi atılmış
 * bir GÖVDE indeksi tutmak ve token'ın o gövdeyle BAŞLAMASINI kabul etmek.
 *
 * Neden son harf: Rusça çekimde değişen kısım genelde sonda (иркутск →
 * иркутской, кемерово → кемеровской). Kısa alias'larda (≤4) gövde
 * uygulanmaz — "урал" gibi kökler yanlış pozitif üretir.
 *
 * Latin alias'lara gövde UYGULANMAZ: "perm" gibi kısa İngilizce kelimeler
 * gövde eşleşmesiyle "permanent"i yakalardı.
 */
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const STEM_BUCKETS = new Map<string, { stem: string; entry: AliasEntry }[]>();

function addStem(stem: string, entry: AliasEntry): void {
  const bucketKey = stem.slice(0, 2);
  const bucket = STEM_BUCKETS.get(bucketKey);
  const item = { stem, entry };
  if (bucket) {
    if (!bucket.some((x) => x.stem === stem && x.entry.slug === entry.slug)) bucket.push(item);
  } else {
    STEM_BUCKETS.set(bucketKey, [item]);
  }
}

function addAlias(raw: string, entry: AliasEntry): void {
  const parts = tokenize(foldGeo(raw));
  if (parts.length === 0) return;
  if (parts.length === 1 && parts[0]!.length < MIN_SINGLE_TOKEN_ALIAS) return;

  const key = parts.join(' ');
  MAX_ALIAS_TOKENS = Math.max(MAX_ALIAS_TOKENS, parts.length);

  const list = INDEX.get(key);
  if (list) {
    if (!list.some((e) => e.slug === entry.slug)) list.push(entry);
  } else {
    INDEX.set(key, [entry]);
  }

  const only = parts[0]!;
  if (parts.length === 1 && only.length >= 5 && CYRILLIC_RE.test(only)) {
    addStem(only.slice(0, -1), entry);
  }
}

for (const subject of FEDERAL_SUBJECTS) {
  for (const alias of subject.aliases) addAlias(alias, { slug: subject.slug, kind: 'subject' });
}
for (const macro of MACRO_REGIONS) {
  for (const alias of macro.aliases) addAlias(alias, { slug: macro.slug, kind: 'macro' });
}

export interface EventLocation {
  slug: string;
  kind: 'subject' | 'macro';
  nameTr: string;
  nameEn: string;
  /** Subject ise bağlı olduğu federal bölge. */
  macro: string | null;
  /** Kaç alias eşleşmesi bulundu (aynı yer birden çok kez geçebilir). */
  matches: number;
  matchedOn: string[];
}

export interface LocationScan {
  locations: EventLocation[];
  subjects: string[];
  macros: string[];
  /** ≥3 farklı federal subject → olay birden çok bölgeye yayılıyor olabilir. */
  ambiguous: boolean;
}

const EMPTY_SCAN: LocationScan = { locations: [], subjects: [], macros: [], ambiguous: false };

/** Bir olayın konum taraması için kullanılacak metin (sınırlı uzunlukta). */
const MAX_TEXT_CHARS = 24_000;

export function eventText(event: PlagueEvent): string {
  const parts: string[] = [event.title, event.titleOriginal, event.summary];
  for (const claim of event.claims) parts.push(claim.title);
  for (const article of event.articles) {
    parts.push(article.title, article.excerpt);
  }
  return parts.filter(Boolean).join(' \n ').slice(0, MAX_TEXT_CHARS);
}

/**
 * Metinde geçen yerleri bulur. Eşleşme tam token penceresi üzerinden yapılır;
 * "Perm" ile "permanent" eşleşmez. Emin olunmayan durumda boş dizi döner —
 * uydurma yok.
 */
export function extractLocationsFromText(text: string): LocationScan {
  const tokens = tokenize(foldGeo(text));
  if (tokens.length === 0) return EMPTY_SCAN;

  interface RawMatch {
    entry: AliasEntry;
    i: number;
    n: number;
    key: string;
  }

  const raw: RawMatch[] = [];
  const maxN = Math.min(MAX_ALIAS_TOKENS, tokens.length);
  for (let n = maxN; n >= 1; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const key = tokens.slice(i, i + n).join(' ');
      const entries = INDEX.get(key);
      if (!entries) continue;
      for (const entry of entries) raw.push({ entry, i, n, key });
    }
  }

  // Kiril gövde eşleşmesi (çekim ekleri). Yalnızca tek token penceresinde.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.length < 4) continue;
    const bucket = STEM_BUCKETS.get(token.slice(0, 2));
    if (!bucket) continue;
    for (const { stem, entry } of bucket) {
      if (token.startsWith(stem)) raw.push({ entry, i, n: 1, key: stem });
    }
  }

  if (raw.length === 0) return EMPTY_SCAN;

  /*
   * Çakışma çözümü — yanlış pozitifin en büyük kaynağı burada.
   *
   * "Moscow Oblast" hem `moscow-oblast` (0,2) hem `moscow` (0,1) eşleşmesi
   * üretir; "Nizhny Novgorod Oblast" ise `nizhny-novgorod` (0,2) ve
   * `novgorod` (1,2) üretir. Kural:
   *   - daha uzun pencere kazanır,
   *   - eşit uzunlukta örtüşen farklı pencerelerde en soldaki kazanır,
   *   - TAM AYNI pencere farklı slug'lara işaret ediyorsa ikisi de kalır
   *     (gerçek belirsizlik: "Altai" → hem Krayı hem Cumhuriyeti).
   */
  const sorted = [...raw].sort((a, b) => b.n - a.n || a.i - b.i);
  const selected: RawMatch[] = [];
  for (const m of sorted) {
    const blocked = selected.some(
      (s) =>
        s.i < m.i + m.n &&
        m.i < s.i + s.n &&
        (s.n > m.n || (s.n === m.n && s.i !== m.i)),
    );
    if (!blocked) selected.push(m);
  }

  const hits = new Map<string, { entry: AliasEntry; count: number; aliases: Set<string> }>();
  for (const m of selected) {
    const current = hits.get(m.entry.slug);
    if (current) {
      current.count++;
      current.aliases.add(m.key);
    } else {
      hits.set(m.entry.slug, { entry: m.entry, count: 1, aliases: new Set([m.key]) });
    }
  }

  if (hits.size === 0) return EMPTY_SCAN;

  const locations: EventLocation[] = [...hits.entries()]
    .map(([slug, hit]) => ({
      slug,
      kind: hit.entry.kind,
      nameTr: regionName(slug, 'tr'),
      nameEn: regionName(slug, 'en'),
      macro:
        hit.entry.kind === 'subject'
          ? (FEDERAL_SUBJECTS.find((s) => s.slug === slug)?.macro ?? null)
          : null,
      matches: hit.count,
      matchedOn: [...hit.aliases].sort(),
    }))
    .sort((a, b) => b.matches - a.matches || a.slug.localeCompare(b.slug));

  const subjects = locations.filter((l) => l.kind === 'subject').map((l) => l.slug);
  const macros = locations.filter((l) => l.kind === 'macro').map((l) => l.slug);

  return { locations, subjects, macros, ambiguous: subjects.length >= 3 };
}

export function extractLocations(event: PlagueEvent): LocationScan {
  return extractLocationsFromText(eventText(event));
}

export interface LocationAggregate {
  slug: string;
  kind: 'subject' | 'macro';
  nameTr: string;
  nameEn: string;
  macro: string | null;
  eventCount: number;
  /** Eşleşen olaylardaki farklı bağımsızlık gruplarının sayısı. */
  groupCount: number;
}

export interface LocationCoverage {
  total: number;
  matched: number;
  ratio: number;
  aggregates: LocationAggregate[];
  /** Konumu belirlenebilen olayların id kümesi. */
  matchedIds: Set<string>;
}

/**
 * Tüm olaylar üzerinde konum toplamı + KAPSAMA.
 * Kapsama dürüstçe raporlanır: harita/liste boşsa sebebi budur.
 */
export function aggregateLocations(events: PlagueEvent[]): LocationCoverage {
  const acc = new Map<string, LocationAggregate>();
  const matchedIds = new Set<string>();

  for (const event of events) {
    const scan = extractLocations(event);
    if (scan.locations.length === 0) continue;
    matchedIds.add(event.id);

    for (const loc of scan.locations) {
      const current = acc.get(loc.slug);
      if (current) {
        current.eventCount++;
        current.groupCount += event.independentGroupCount;
      } else {
        acc.set(loc.slug, {
          slug: loc.slug,
          kind: loc.kind,
          nameTr: loc.nameTr,
          nameEn: loc.nameEn,
          macro: loc.macro,
          eventCount: 1,
          groupCount: event.independentGroupCount,
        });
      }
    }
  }

  const aggregates = [...acc.values()].sort(
    (a, b) => b.eventCount - a.eventCount || a.nameEn.localeCompare(b.nameEn),
  );

  return {
    total: events.length,
    matched: matchedIds.size,
    ratio: events.length === 0 ? 0 : matchedIds.size / events.length,
    aggregates,
    matchedIds,
  };
}

/**
 * Bir bölgedeki olaylar (bölge sayfası için).
 *
 * Konum, olayın metninden çıkarıldığı için burada "iddia" değil "eşleşme"
 * vardır: sayfa bunu açıkça yazar (yanlış pozitif riski).
 */
export function eventsInLocation(events: PlagueEvent[], slug: string): PlagueEvent[] {
  return events.filter((event) =>
    extractLocations(event).locations.some((location) => location.slug === slug),
  );
}
