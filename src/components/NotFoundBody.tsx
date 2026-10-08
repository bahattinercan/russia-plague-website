'use client';

import { usePathname } from 'next/navigation';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { Footer } from '@/components/Disclaimer';

/**
 * 404 gövdesi.
 *
 * ÖLÇÜLEN GERÇEK (Next 16): `notFound()` ile üretilen 404 yanıtının SSR
 * gövdesi BOŞTUR — içerik yalnızca RSC yükünde gelir ve istemcide render
 * edilir. Bu davranış uygulama kodundan değiştirilemiyor; denenenler:
 *   1. `params` → `not-found.tsx`'e hiç gelmiyor (NO_PARAMS).
 *   2. Saf sunucu bileşeni → içerik SSR DOM'unda yok, yalnızca RSC'de var.
 *   3. `headers()`/`cookies()` → statik prerender'ı bozuyor, gövde yine boş.
 * Sonuç: JS'siz ziyaretçi 404'te boş sayfa görür (bilinen sınır, README'de
 * yazılı). JS'li ziyaretçi için en iyi davranış bu yüzden istemcide tek dil:
 * `usePathname()` ilk render'da doğru dili verir, titreme (flash) olmaz.
 */
export function NotFoundBody() {
  const pathname = usePathname() ?? '';
  const segment = pathname.split('/')[1] ?? '';
  const locale: Locale = isLocale(segment) ? segment : DEFAULT_LOCALE;
  const t = getDict(locale);

  return (
    <>
      <main id="icerik" className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-official">404</p>

        <h1 className="narrative mt-3 text-[28px] font-semibold tracking-tight text-chalk">
          {t.notFoundTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-mist">{t.notFoundHint}</p>

        <ul className="mt-6 flex flex-wrap gap-2">
          {[
            { href: `/${locale}`, label: t.navBoard },
            { href: `/${locale}/timeline`, label: t.allEvents },
            { href: `/${locale}/locations`, label: t.navLocations },
            { href: `/${locale}/figures`, label: t.navFigures },
            { href: `/${locale}/sources`, label: t.navSources },
          ].map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="surface card-lift inline-block rounded-lg px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-official"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </main>
      <Footer locale={locale} />
    </>
  );
}
