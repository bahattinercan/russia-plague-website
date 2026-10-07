/**
 * Dil algılama.
 *
 * KURAL (proje sahibi kararı, 6 Eki 2026):
 *   - Tarayıcı dili Türkçe ise → /tr
 *   - Türkçe DIŞINDA herhangi bir dil → /en
 *
 * Kullanıcı manuel seçim yaparsa `lang` çerezi onu geçersiz kılar.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, generateNonce } from '@/lib/security/csp';

export const LOCALES = ['tr', 'en'] as const;

/**
 * CSP'yi istek başına üretir ve HEM istek HEM yanıt başlığına yazar.
 *
 * Neden istek başlığı da: Next.js nonce'u yalnızca istekteki
 * `Content-Security-Policy` başlığından okuyup framework'ün inline
 * script'lerine ekler. Yanıt başlığı ise tarayıcının uyguladığı politikadır.
 */
function withSecurityHeaders(req: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const COOKIE = 'lang';

export function pickLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie === 'tr' || cookie === 'en') return cookie;

  const accept = (req.headers.get('accept-language') ?? '').toLowerCase();
  // "tr-TR,tr;q=0.9,en;q=0.8" → ilk tercih tr ise Türkçe.
  const primary = accept.split(',')[0]?.trim() ?? '';
  return primary.startsWith('tr') ? 'tr' : 'en';
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return withSecurityHeaders(req);

  const locale = pickLocale(req);
  const url = req.nextUrl.clone();

  // Sertleştirme: yalnızca tek eğik çizgiyle başlayan normalize yol kullanılır.
  // `//evil.com` gibi bir yol birleştirme sırasında protokol-göreli URL
  // yorumlanmasına yol açmasın (açık yönlendirme savunması).
  const safePath = pathname.startsWith('//')
    ? `/${pathname.replace(/^\/+/, '')}`
    : pathname;

  url.pathname = `/${locale}${safePath === '/' ? '' : safePath}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Statik dosyalar, API, metadata rotaları ve Next iç yolları hariç her şeyi
  // yakala.
  //
  // DİKKAT: `apple-icon` gibi UZANTISIZ metadata route'ları ayrıca listelenmeli;
  // aksi hâlde dil yönlendirmesi onları da yakalar (`/apple-icon` →
  // `/en/apple-icon` → 404). Nokta içerenler (`icon.svg`, `robots.txt`,
  // `manifest.webmanifest`) zaten `.*\..*` kuralına takılıyor — ileride
  // `opengraph-image` gibi uzantısız bir route eklenirse buraya yazılmalı.
  matcher: ['/((?!_next|api|favicon.ico|apple-icon|robots.txt|sitemap.xml|.*\\..*).*)'],
};
