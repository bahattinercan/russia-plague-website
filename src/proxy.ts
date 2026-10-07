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

export const LOCALES = ['tr', 'en'] as const;
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
  if (hasLocale) return NextResponse.next();

  const locale = pickLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Statik dosyalar, API ve Next iç yolları hariç her şeyi yakala.
  matcher: ['/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
