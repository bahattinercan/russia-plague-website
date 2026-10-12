/**
 * Content-Security-Policy üretici.
 *
 * Neden ayrı modül: nonce istek başına üretilir, bu yüzden CSP statik
 * başlık olarak `next.config.ts`'te tutulamaz. `proxy.ts` üretir,
 * `scripts/security-check.ts` ise politikayı birim testleriyle doğrular.
 *
 * Neden `style-src` eleman/nitelik olarak AYRILDI (Tur 4, 12 Eki 2026):
 *   CSP3 kuralı gereği bir direktifte nonce varsa `'unsafe-inline'` YOK
 *   SAYILIR. React, SSR'da `style={{ ... }}` niteliklerini inline yazar
 *   (`--reveal-delay` animasyon gecikmesi, harita işaretçisi konumu).
 *   Bu yüzden tek bir `style-src`'e hem nonce hem inline izni sığmıyordu:
 *     - `style-src-elem` → nonce'lu; inline `<style>` yalnızca Next.js'in
 *       nonce'ladığı framework stilleri için serbest, enjekte edilen stil bloklanır.
 *     - `style-src-attr 'unsafe-inline'` → React'in nitelik stilleri serbest.
 *   `style-src 'self'` yalnızca CSP2 tarayıcılar için geriye dönük taban
 *   (o tarayıcılarda `-elem`/`-attr` bilinmez; kayıp yalnızca kademeli
 *   animasyon gecikmesi, içerik gizlenmez).
 *   Ölçüm (12 Eki 2026, üretim build + `next start`): tüm rotalarda HTML'de
 *   nonce'suz inline `<style>` yok; 14/14 `<script>` nonce'lu. Ayrıntı:
 *   docs/guvenlik-denetimi.md §5, B-13.
 *
 * `'strict-dynamic'`: nonce'lu bootstrap script'inin yüklediği bundle'lar
 * güvenilir sayılır; `'self'` yalnızca nonce desteklemeyen eski
 * tarayıcılarda devreye girer (geriye dönük uyumluluk).
 */

/**
 * Google Fonts dış kaynağı KALDIRILDI (8 Eki 2026): yazı tipleri artık
 * `next/font` ile kendi sunucumuzdan servis edilir (bkz. `src/app/[lang]/layout.tsx`).
 * Kazanç: ziyaretçinin IP'si Google'a gitmez (docs/guvenlik-denetimi.md §3) ve
 * stil/font direktiflerinde dış host kalmaz — dış kaynak yüzeyi daralır.
 * `scripts/security-check.ts` bu direktiflerde dış host bulunmadığını doğrular.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  // Stil direktifleri: dev'de Next dev sunucusu `<style>` enjekte eder ve nonce
  // kullanmaz → tek direktifte inline izni gerekir. Üretimde ayrım yapılır.
  const styleDirectives = isDev
    ? ["style-src 'self' 'unsafe-inline'"]
    : [
        "style-src 'self'",
        `style-src-elem 'self' 'nonce-${nonce}'`,
        "style-src-attr 'unsafe-inline'",
      ];

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    ...styleDirectives,
    "font-src 'self' data:",
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
