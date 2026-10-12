import type { NextConfig } from 'next';

/**
 * Güvenlik başlıkları.
 *
 * NOT: `Content-Security-Policy` burada DEĞİL. CSP istek başına üretilen
 * nonce içerdiği için `src/proxy.ts` içinde (`buildCsp`) kurulur; statik
 * başlık olarak buradan verilseydi iki farklı CSP çakışırdı.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // COEP (Tur 4, 12 Eki 2026): tüm alt kaynaklar ya aynı origin olmalı ya da
  // CORP/CORS ile açıkça izin vermeli. Google Fonts dış kaynağı kaldırıldığından
  // (next/font self-host) sayfa yalnızca kendi kaynaklarını gömüyor; kendi
  // yanıtlarımız da `Cross-Origin-Resource-Policy: same-origin` taşıyor.
  // Regresyon kapıları: `security-check` bu başlığın yerinde kaldığını ve
  // stil direktiflerinde dış host bulunmadığını doğrular; dış alt kaynak
  // ölçümü docs/guvenlik-denetimi.md §5, B-13.
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  // Kaynaklarımızın başka origin'ler tarafından gömülmesini engeller.
  // (Yazı tipleri `next/font` ile kendi sunucumuzdan servis ediliyor; CORP kaynağın
  // kendi yanıtında gelir, bu yüzden burada ayarlanması yazı tiplerini etkilemez.)
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // X-Powered-By: Next.js başlığını kaldır (gereksiz teknoloji ifşası).
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
