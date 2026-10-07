/**
 * Metin yardımcıları.
 *
 * `fold()` kritik: TR/RU/EN karışık kaynaklarda anahtar kelime araması
 * yaparken Türkçe diakritikleri ve büyük/küçük harf farklarını normalize eder.
 * Böylece "Veba", "VEBA", "hıyarcıklı" ve "hiyarcikli" aynı şekilde eşleşir.
 */

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
  '&mdash;': '—',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

export function cleanTitle(input: string): string {
  return decodeEntities(
    input
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

export function stripHtml(input: string): string {
  return decodeEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** Çeşitli tarih biçimlerini ISO-8601'e çevirir; geçersizse null. */
export function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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
