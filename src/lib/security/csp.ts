/**
 * Content-Security-Policy üretici.
 *
 * Neden ayrı modül: nonce istek başına üretilir, bu yüzden CSP statik
 * başlık olarak `next.config.ts`'te tutulamaz. `proxy.ts` üretir,
 * `scripts/security-check.ts` ise politikayı birim testleriyle doğrular.
 *
 * Neden `style-src`'te nonce YOK:
 *   CSP3 kuralı gereği bir direktifte nonce varsa `'unsafe-inline'` YOK
 *   SAYILIR. React, SSR'da `style={{ ... }}` niteliklerini inline yazar
 *   (`--reveal-delay` animasyon gecikmesi). `style-src`'e nonce eklemek
 *   bu nitelikleri bloklayıp yerleşimi bozardı. `script-src` nonce'lu,
 *   `style-src` `'unsafe-inline'` — XSS için kritik olan script tarafı.
 *
 * `'strict-dynamic'`: nonce'lu bootstrap script'inin yüklediği bundle'lar
 * güvenilir sayılır; `'self'` yalnızca nonce desteklemeyen eski
 * tarayıcılarda devreye girer (geriye dönük uyumluluk).
 */

/** Google Fonts dış kaynak — gizlilik notu docs/guvenlik-denetimi.md §3'te. */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self'",
  ];

  // Yalnızca üretimde: dev sunucusu http üzerinden çalıştığı için bu
  // direktif alt kaynakları https'e yükseltip yerel geliştirmeyi kırar.
  if (!isDev) directives.push('upgrade-insecure-requests');

  return directives.join('; ');
}

/** İstek başına tahmin edilemez nonce (Edge ve Node'da aynı çağrı). */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}
