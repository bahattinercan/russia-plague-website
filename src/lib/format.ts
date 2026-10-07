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
