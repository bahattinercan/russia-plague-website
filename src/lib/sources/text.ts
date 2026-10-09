/**
 * Metin yardımcıları.
 *
 * `fold()` kritik: TR/RU/EN karışık kaynaklarda anahtar kelime araması
 * yaparken Türkçe diakritikleri ve büyük/küçük harf farklarını normalize eder.
 * Böylece "Veba", "VEBA", "hıyarcıklı" ve "hiyarcikli" aynı şekilde eşleşir.
 */

import { stripEmDashes } from '@/lib/text-normalize';

export function fold(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u');
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&mdash;': '-',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

/**
 * Sayısal HTML varlığını karaktere çevirir; geçersizse ham metni korur.
 *
 * GÜVENLİK: `String.fromCodePoint` 0x10FFFF üstündeki kod noktaları için
 * `RangeError` fırlatır. Dış kaynaklı bir `&#99999999;` bu yüzden
 * `cleanTitle`/`stripHtml` çağrısını patlatıp kaynağın tüm taramasını
 * düşürebiliyordu (kaynak bazlı DoS + yanlış "kaynak HATA" alarmı).
 * Ayrıca vekil (surrogate) aralığı geçerli UTF-8 değildir; Postgres'e
 * yazılamaz, o yüzden o da reddedilir.
 */
function decodeNumericEntity(match: string, code: string): string {
  const n = Number(code);
  if (!Number.isSafeInteger(n) || n < 0 || n > 0x10ffff) return match;
  if (n >= 0xd800 && n <= 0xdfff) return match;
  // NUL: geçerli bir metin karakteri ama Postgres text kolonuna yazılamaz
  // ("unsupported Unicode escape") → kaynağın tüm yazımını düşürürdü.
  if (n === 0) return match;
  return String.fromCodePoint(n);
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, decodeNumericEntity);
}

/**
 * Em dash (—) normalizasyonu paylaşılan modülde: feed, küratörlü kayıtlar ve
 * görünüm katmanı AYNI fonksiyondan geçsin diye tek kopya tutulur.
 */
export function cleanTitle(input: string): string {
  return stripEmDashes(
    decodeEntities(
      input
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    ),
  );
}

/**
 * HTML metinlerinde güvenli üst sınır.
 * Kötü niyetli veya bozuk bir kaynak megabaytlarca gövde döndürüp
 * bellek ve CPU yakmasın diye uygulanır.
 */
const MAX_TEXT_INPUT = 400_000;

/**
 * script/style bloklarını LINEAR zamanda temizler.
 *
 * ÖLÇÜM: önceki regex (`/<script[\s\S]*?<\/script>/gi`) kapanmayan
 * etiketlerde O(n²) davranıyordu — 1 MB `<script>` tekrarı 4.9 saniye
 * sürüyordu. Bu, ingest için gerçek bir DoS yüzeyiydi.
 */
function stripBlocks(input: string): string {
  const lower = input.toLowerCase();
  let out = '';
  let i = 0;

  while (i < input.length) {
    const scriptIdx = lower.indexOf('<script', i);
    const styleIdx = lower.indexOf('<style', i);

    let next = -1;
    let tag = '';
    if (scriptIdx !== -1 && (styleIdx === -1 || scriptIdx < styleIdx)) {
      next = scriptIdx;
      tag = 'script';
    } else if (styleIdx !== -1) {
      next = styleIdx;
      tag = 'style';
    }

    if (next === -1) {
      out += input.slice(i);
      break;
    }

    out += input.slice(i, next);
    const closeIdx = lower.indexOf(`</${tag}`, next);
    if (closeIdx === -1) {
      i = input.length;
    } else {
      const gt = input.indexOf('>', closeIdx);
      i = gt === -1 ? input.length : gt + 1;
    }
  }

  return out;
}

export function stripHtml(input: string): string {
  const bounded = input.length > MAX_TEXT_INPUT ? input.slice(0, MAX_TEXT_INPUT) : input;
  return stripEmDashes(
    decodeEntities(
      stripBlocks(bounded)
        // Nitelik uzunluğu sınırlı: iç içe niceleyici yok, geri izleme (backtracking) olmaz.
        .replace(/<[^>]{0,4000}>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    ),
  );
}

/** Çeşitli tarih biçimlerini ISO-8601'e çevirir; geçersizse null. */
export function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Yalnızca http/https URL'leri kabul eder; aksi halde null.
 *
 * Neden zorunlu: dış kaynaklardan gelen bir bağlantı `javascript:`,
 * `data:` veya `vbscript:` şeması taşıyabilir. React `<a href>` değerini
 * temizlemez — böyle bir bağlantı tıklandığında kod çalışır.
 * Bu yüzden dış kaynaklı HER bağlantı bu filtreden geçer.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** URL'den takip parametrelerini temizler. */
export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const drop = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ocid', 'ns_campaign', 'ns_mchannel', 'ns_source',
      'at_medium', 'at_campaign', 'ref', 'cmpid',
    ];
    for (const key of drop) u.searchParams.delete(key);
    u.hash = '';
    let out = u.toString();
    if (out.endsWith('/')) out = out.slice(0, -1);
    return out;
  } catch {
    return raw;
  }
}

/**
 * Arşiv linki.
 * `web.archive.org/web/2/<url>` en yakın anlık görüntüye yönlendirir.
 * Google News yönlendirme URL'leri için arşiv anlamlı değildir → null.
 */
export function archiveUrlFor(url: string): string | null {
  if (!url.startsWith('http')) return null;
  if (url.includes('news.google.com')) return null;
  return `https://web.archive.org/web/2/${url}`;
}

export function shortHash(input: string): string {
  // Node crypto bağımlılığını pipeline dışında tutmak için basit FNV-1a.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function slugify(input: string): string {
  return fold(input)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70);
}
