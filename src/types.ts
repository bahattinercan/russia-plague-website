/**
 * Çekirdek tipler.
 *
 * Tasarım kuralı: `Article` her zaman bir `SourceDef`'e bağlıdır ve
 * `Event` içindeki iddialar `independenceGroup` üzerinden sayılır.
 * "Doğrulama" kavramı tipte YOKTUR — bilinçli olarak. Sistem yalnızca
 * "kim ne bildirdi" bilgisini taşır.
 */

/** Kaynak güven katmanı. 1 = küresel otorite, 5 = doğrulanmamış sinyal. */
export type Tier = 1 | 2 | 3 | 4 | 5;

/**
 * Makine çevirisi durumu.
 *
 * `ok`      → TR metin üretildi ve doğrulama kapılarından geçti
 * `skipped` → çeviri gerekmedi (metin zaten TR) veya sağlayıcı yok
 * `failed`  → çeviri denendi ama doğrulama düştü; UI orijinali gösterir
 *
 * Editoryal kural: `ok` bile olsa UI'da "makine çevirisi" etiketi ve
 * orijinal başlık her zaman görünür kalır.
 */
export type TranslationStatus = 'ok' | 'skipped' | 'failed';

/**
 * Bağımsızlık grubu = sahiplik/editoryal çatı.
 *
 * Kural: aynı gruptaki kaynaklar TEK kaynak sayılır. Çoğu kaynakta grup
 * kuruluşun kendisidir (bbc, reuters, meduza). Tek istisna, aynı çatı
 * altında toplanan devlet medyası: TASS + RIA + RT + Sputnik → `kremlin`.
 *
 * Bu, "tek kaynağı çok kaynak gibi gösterme" riskine karşı en önemli
 * korumadır ve `corroborated` etiketinin temelidir.
 *
 * Tip bilinçli olarak `string`: yeni kaynak eklemek tip değişikliği
 * gerektirmez. Grup etiketleri `registry.ts` içindeki `GROUP_LABELS`
 * kaydından üretilir ve metodoloji sayfasında yayınlanır.
 */
export type IndependenceGroup = string;

export type AdapterKind = 'rss' | 'google-news' | 'html' | 'telegram';

export type SourceLang = 'en' | 'tr' | 'ru' | 'de' | 'fr' | 'multi' | 'unknown';

/**
 * Kaynak KİMLİĞİ: hem aktif taranan kaynaklar hem de yalnızca tanınan
 * yayıncılar (Google News üzerinden gelen) bu alanları taşır.
 *
 * Ayrım önemli: `SOURCES` = aktif tarananlar, `KNOWN_PUBLISHERS` = kimlik
 * ataması için tanınanlar. Böylece bir CNN haberi T5'e düşmez, T2 olur.
 */
export interface SourceIdentity {
  slug: string;
  name: string;
  tier: Tier;
  group: IndependenceGroup;
  trustBase: number;
  lang?: SourceLang;
}

export interface SourceDef extends SourceIdentity {
  homepage: string;
  tier: Tier;
  group: IndependenceGroup;
  trustBase: number;
  lang: SourceLang;
  adapter: AdapterConfig;
  /** Yayıncı adı eşleştirmesi için alternatif adlar ("AP News", "NBC"…). */
  aliases?: string[];
  /** Devlet kontrolü cezası: kremlin/ru-gov için negatif. */
  stateControlPenalty?: number;
  notes?: string;
}

export type AdapterConfig =
  | { kind: 'rss'; url: string }
  | { kind: 'google-news'; query: string; hl: string; gl: string; ceid: string }
  | { kind: 'html'; url: string; itemSelector: string; titleSelector?: string; dateSelector?: string; linkAttr?: string; linkPattern?: string }
  | { kind: 'telegram'; channel: string };

/** Adaptörlerin döndürdüğü ham öğe. Pipeline bunu Article'a çevirir. */
export interface RawItem {
  sourceSlug: string;
  url: string;
  title: string;
  publishedAt: string | null;
  excerpt?: string;
  lang?: string;
  /** Google News gibi toplayıcılarda gerçek yayıncı adı. */
  originalPublisher?: string;
  originalPublisherUrl?: string;
  viaAggregator?: string;
}

export interface Article {
  id: string;
  sourceSlug: string;
  sourceName: string;
  tier: Tier;
  independenceGroup: IndependenceGroup;
  trustBase: number;
  url: string;
  canonicalUrl: string;
  title: string;
  titleOriginal: string;
  lang: string;
  publishedAt: string | null;
  fetchedAt: string;
  excerpt: string;
  contentHash: string;
  archiveUrl: string | null;
  viaAggregator: string | null;
  /** Toplayıcı üzerinden geldiyse gerçek yayıncı adı (UI'da gösterilir). */
  originalPublisher: string | null;
  /** Bayat feed tespiti: kaynak canlı görünüp eski veri veriyorsa true. */
  sourceStale: boolean;
  /** TR başlık (makine çevirisi). null → UI orijinali gösterir. */
  titleTr: string | null;
  /** TR özet/alıntı (makine çevirisi). null → gösterilmez. */
  excerptTr: string | null;
  translatedAt: string | null;
  translationProvider: string | null;
  translationStatus: TranslationStatus;
}

export interface EventClaim {
  sourceSlug: string;
  sourceName: string;
  tier: Tier;
  independenceGroup: IndependenceGroup;
  title: string;
  /** TR başlık (makine çevirisi). null → UI orijinali gösterir. */
  titleTr: string | null;
  url: string;
  publishedAt: string | null;
}

/**
 * Olay etiketi. `verified` YOKTUR.
 * En yüksek seviye `corroborated` = "çoklu bağımsız kaynak bildiriyor".
 */
export type EventLabel =
  | 'official'      // resmi kurum açıklaması
  | 'corroborated'  // ≥2 bağımsız grup bildirdi
  | 'single'        // tek grup bildirdi
  | 'unverified'    // T5 / sosyal sinyal
  | 'contradicted'; // aynı olayda zıt iddialar

export interface PlagueEvent {
  id: string;
  slug: string;
  title: string;
  titleOriginal: string;
  summary: string;
  firstSeenAt: string;
  lastUpdateAt: string;
  label: EventLabel;
  /** Farklı bağımsızlık gruplarının sayısı — ham kaynak sayısı değil. */
  independentGroupCount: number;
  groups: IndependenceGroup[];
  claims: EventClaim[];
  articles: Article[];
  /** TR temsilci başlık (makine çevirisi). null → UI orijinali gösterir. */
  titleTr: string | null;
  /** TR özet (makine çevirisi). null → gösterilmez. */
  summaryTr: string | null;
  translatedAt: string | null;
  translationProvider: string | null;
  translationStatus: TranslationStatus;
  /** Aynı olayda çelişen ifadeler varsa doldurulur. */
  contradiction: {
    hasContradiction: boolean;
    sides: {
      group: IndependenceGroup;
      statement: string;
      /** TR ifade (makine çevirisi). null → UI orijinali gösterir. */
      statementTr: string | null;
      sourceSlug: string;
    }[];
  };
}

export interface SourceHealth {
  sourceSlug: string;
  checkedAt: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  itemsFound: number;
  newestItemAt: string | null;
  /** Feed canlı ama içerik eski → bayat. */
  stale: boolean;
  error: string | null;
}

export interface IngestReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  sources: SourceHealth[];
  articlesFetched: number;
  articlesNew: number;
  articlesRelevant: number;
  events: number;
  labelCounts: Record<EventLabel, number>;
  deadManSwitch: { ingestHealthy: boolean; message: string };
}
