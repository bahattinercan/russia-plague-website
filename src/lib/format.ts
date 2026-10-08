import { DEFAULT_LOCALE, type Locale } from './i18n';

/**
 * Saf biçimleyiciler.
 *
 * Neden ayrı dosya? data.ts depo katmanını (Neon/pg) içine alır. Client
 * component'ların yalnızca bu saf fonksiyonları import etmesi, pg'nin
 * istemci bundle'ına girmesini engeller.
 */

export function formatDate(iso: string | null, locale: Locale = DEFAULT_LOCALE): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(d);
}

export function formatRelative(iso: string | null, locale: Locale): string {
  if (!iso) return locale === 'tr' ? 'tarih yok' : 'no date';
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale === 'tr' ? 'tr' : 'en', {
    numeric: 'auto',
  });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), unit);
  }
  return rtf.format(0, 'minute');
}

/**
 * Bir metnin ilk N cümlesini döndürür (varsayılan 2).
 *
 * Neden gerekli: telif kuralı kaynaktan yalnızca **≤2 cümle** alıntıya izin verir
 * ("Başlık + ≤2 cümle özet + link", PLAN.md §329 — tam metin asla kopyalanmaz).
 * Kaynak özetleri (RSS `description`) bazen 3-4 cümle geliyor; burada kesiliyor.
 *
 * Kısaltma tuzağı: "U.S. President said ..." naif `split(/[.!?]\s/)` ile ikiye
 * bölünür ve cümle yanlış yerde biter. Bu yüzden önceki parça kısaltma/baş harf
 * ile bitiyorsa ya da yeni parça küçük harfle başlıyorsa sınır sayılmaz, parça
 * öncekine eklenir.
 */
export function firstSentences(text: string, max = 2, maxChars = 420): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const chunks = clean.split(/(?<=[.!?])\s+/);
  const ABBREV_END = /(?:\b(?:U\.S|U\.K|Dr|Mr|Mrs|Ms|St|No|vs|etc|approx|Inc|Ltd|Fig|[A-Z])\.)$/;
  const sentences: string[] = [];

  for (const chunk of chunks) {
    if (sentences.length > 0) {
      const prev = sentences[sentences.length - 1];
      const continues = ABBREV_END.test(prev) || /^[a-zçğıöşü]/.test(chunk);
      if (continues) {
        sentences[sentences.length - 1] = `${prev} ${chunk}`;
        continue;
      }
      if (sentences.length >= max) break;
    }
    sentences.push(chunk);
  }

  const joined = sentences.join(' ');
  if (joined.length > maxChars) {
    const cut = joined.slice(0, maxChars);
    return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  }
  return joined.length < clean.length ? `${joined}…` : joined;
}
