'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getDict, type Dict, type Locale } from '@/lib/i18n';

/**
 * Ana gezinme.
 *
 * Neden istemci bileşeni: aktif bağlantıyı işaretlemek için `usePathname()`
 * gerekir. Veri taşımaz, yalnızca sözlükten etiket okur (sözlük istemci-güvenli).
 *
 * Neden yatay kaydırılabilir şerit: 6 öğe 390 px'e sığmaz; hamburger menü
 * JS gerektirir ve dokunmada iki adım ister. Şerit JS'siz çalışır, kaydırılır ve
 * tüm bağlantılar ekran okuyucuya açık kalır (docs/arayuz-plani.md §4).
 */
const ITEMS: { path: string; key: keyof Dict }[] = [
  { path: '', key: 'navBoard' },
  { path: '/timeline', key: 'navTimeline' },
  { path: '/locations', key: 'navLocations' },
  { path: '/figures', key: 'navFigures' },
  { path: '/signals', key: 'navSignals' },
  { path: '/sources', key: 'navSources' },
];

export function Nav({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const pathname = usePathname() ?? `/${locale}`;

  return (
    <nav aria-label={t.siteName} className="border-t border-edge-soft">
      <ul className="-mx-4 flex items-stretch gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {ITEMS.map((item) => {
          const href = `/${locale}${item.path}`;
          const active = item.path === '' ? pathname === href : pathname.startsWith(href);
          return (
            <li key={item.key} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-2.5 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  active
                    ? 'border-official text-chalk'
                    : 'border-transparent text-mist-2 hover:border-edge hover:text-chalk'
                }`}
              >
                {String(t[item.key])}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
