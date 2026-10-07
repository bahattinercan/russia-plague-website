import type { EventLabel } from '@/types';

/**
 * TR/EN sözlükleri.
 *
 * Editoryal kural: "doğrulandı / teyit edildi / confirmed / verified"
 * ifadeleri HİÇBİR dilde kullanılmaz. En yüksek seviye
 * "çoklu bağımsız kaynak bildiriyor"dur.
 */

export const LOCALES = ['tr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export interface Dict {
  siteName: string;
  tagline: string;
  disclaimerShort: string;
  disclaimerLong: string;
  lastScan: string;
  never: string;
  sourcesHealthy: string;
  events: string;
  sources: string;
  independentGroups: string;
  reportedBy: (n: number) => string;
  whatWeKnow: string;
  timeline: string;
  timelineHint: string;
  noEvents: string;
  noEventsHint: string;
  signals: string;
  signalsHint: string;
  sourceHealth: string;
  methodology: string;
  methodologyHint: string;
  publishedAt: string;
  seenBySystem: string;
  archive: string;
  original: string;
  showSources: (n: number) => string;
  hideSources: string;
  viaAggregator: string;
  stale: string;
  staleHint: string;
  failed: string;
  ok: string;
  noDate: string;
  conflictingReports: string;
  sideA: string;
  sideB: string;
  claimCount: (n: number) => string;
  groupCount: (n: number) => string;
  tier: string;
  language: string;
  switchLanguage: string;
  filters: string;
  all: string;
  machineTranslated: string;
  translationUnavailable: string;
  readOriginal: string;
  updated: string;
  dataFreshness: string;
  dataSource: string;
  detail: string;
  close: string;
  closeHint: string;
  aboutProject: string;
}

const tr: Dict = {
  siteName: 'Plague Tracker',
  tagline: 'Rusya’daki veba olayları için kaynak izleme ve şeffaflık panosu',
  disclaimerShort: 'Haber izleme aracıdır — tıbbi tavsiye değildir.',
  disclaimerLong:
    'Bu site bir haber izleme aracıdır, tıbbi tavsiye veya resmî bilgi kaynağı değildir. Resmî kurum açıklamalarını (WHO, ECDC, Sağlık Bakanlıkları) esas alın. Sistem hiçbir bilgi için “doğrulandı” iddiasında bulunmaz; yalnızca hangi kaynağın ne bildirdiğini gösterir.',
  lastScan: 'Son tarama',
  never: 'hiç',
  sourcesHealthy: 'kaynak sağlıklı',
  events: 'olay',
  sources: 'kaynak',
  independentGroups: 'bağımsız grup',
  reportedBy: (n) => `${n} bağımsız kaynak grubu bildiriyor`,
  whatWeKnow: 'Şu an ne biliyoruz?',
  timeline: 'Zaman çizelgesi',
  timelineHint: 'En yeni gelişmeler üstte',
  noEvents: 'Son taramada ilgili gelişme bulunamadı',
  noEventsHint:
    'Bu, olayın bittiği anlamına gelmez. Kaynak sağlık panelinden hangi kaynakların çalıştığını görebilirsiniz.',
  signals: 'Doğrulanmamış sinyaller',
  signalsHint:
    'Telegram ve kayıt dışı yayıncılardan gelen iddialar. Bunlar ana akışta haber olarak sayılmaz.',
  sourceHealth: 'Kaynak sağlığı',
  methodology: 'Metodoloji',
  methodologyHint: 'Bu site nasıl çalışır?',
  publishedAt: 'Yayın',
  seenBySystem: 'Sistemimiz gördü',
  archive: 'Arşiv',
  original: 'Orijinal',
  showSources: (n) => `${n} kaynağı göster`,
  hideSources: 'Kaynakları gizle',
  viaAggregator: 'toplayıcı üzerinden',
  stale: 'BAYAT',
  staleHint: 'Feed canlı görünüyor ama içerik eski',
  failed: 'HATA',
  ok: 'sağlıklı',
  noDate: 'tarih yok',
  conflictingReports: 'Taraflar ne diyor?',
  sideA: 'Bir taraf',
  sideB: 'Karşı taraf',
  claimCount: (n) => `${n} kaynak`,
  groupCount: (n) => `${n} grup`,
  tier: 'Katman',
  language: 'Dil',
  switchLanguage: 'Dili değiştir',
  filters: 'Filtreler',
  all: 'Tümü',
  machineTranslated: 'makine çevirisi',
  translationUnavailable: 'çevrilmedi',
  readOriginal: 'Orijinali oku',
  updated: 'Güncellendi',
  dataFreshness: 'Son güncelleme',
  dataSource: 'Veri kaynağı',
  detail: 'Detay',
  close: 'Kapat',
  closeHint: 'Esc veya arka plana tıklayarak kapatın',
  aboutProject: 'Proje hakkında',
};

const en: Dict = {
  siteName: 'Plague Tracker',
  tagline: 'Source monitoring and transparency board for plague events in Russia',
  disclaimerShort: 'A news monitoring tool — not medical advice.',
  disclaimerLong:
    'This site is a news monitoring tool, not medical advice or an official information source. Rely on official statements (WHO, ECDC, health ministries). The system never claims anything is "confirmed"; it only shows which source reported what.',
  lastScan: 'Last scan',
  never: 'never',
  sourcesHealthy: 'sources healthy',
  events: 'events',
  sources: 'sources',
  independentGroups: 'independent groups',
  reportedBy: (n) => `Reported by ${n} independent source groups`,
  whatWeKnow: 'What do we know right now?',
  timeline: 'Timeline',
  timelineHint: 'Newest developments first',
  noEvents: 'No relevant developments found in the last scan',
  noEventsHint:
    'This does not mean the event is over. Check the source health panel to see which sources are working.',
  signals: 'Unverified signals',
  signalsHint:
    'Claims from Telegram and unregistered publishers. These are not counted as news in the main feed.',
  sourceHealth: 'Source health',
  methodology: 'Methodology',
  methodologyHint: 'How does this site work?',
  publishedAt: 'Published',
  seenBySystem: 'Seen by our system',
  archive: 'Archive',
  original: 'Original',
  showSources: (n) => `Show ${n} sources`,
  hideSources: 'Hide sources',
  viaAggregator: 'via aggregator',
  stale: 'STALE',
  staleHint: 'Feed responds but content is old',
  failed: 'FAILED',
  ok: 'healthy',
  noDate: 'no date',
  conflictingReports: 'What are the sides saying?',
  sideA: 'One side',
  sideB: 'Other side',
  claimCount: (n) => `${n} sources`,
  groupCount: (n) => `${n} groups`,
  tier: 'Tier',
  language: 'Language',
  switchLanguage: 'Switch language',
  filters: 'Filters',
  all: 'All',
  machineTranslated: 'machine translation',
  translationUnavailable: 'not translated',
  readOriginal: 'Read original',
  updated: 'Updated',
  dataFreshness: 'Last update',
  dataSource: 'Data source',
  detail: 'Details',
  close: 'Close',
  closeHint: 'Press Esc or click outside to close',
  aboutProject: 'About the project',
};

export const DICTS: Record<Locale, Dict> = { tr, en };

export function getDict(locale: Locale): Dict {
  return DICTS[locale];
}

/** Etiket adları — sözlükten bağımsız, UI'da doğrudan kullanılır. */
export const LABEL_TEXT_I18N: Record<
  EventLabel,
  { tr: string; en: string; tone: 'info' | 'ok' | 'warn' | 'alert' | 'danger' }
> = {
  official: { tr: 'Resmî açıklama', en: 'Official statement', tone: 'info' },
  corroborated: {
    tr: 'Çoklu bağımsız kaynak bildiriyor',
    en: 'Reported by multiple independent sources',
    tone: 'ok',
  },
  single: {
    tr: 'Tek kaynak bildiriyor',
    en: 'Reported by a single source',
    tone: 'warn',
  },
  unverified: { tr: 'Doğrulanmamış iddia', en: 'Unverified claim', tone: 'alert' },
  contradicted: { tr: 'Çelişkili bilgi', en: 'Conflicting reports', tone: 'danger' },
};
