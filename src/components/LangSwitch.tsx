'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

/**
 * Dil değiştirici.
 * Seçim çereze yazılır; böylece kullanıcı kök adrese döndüğünde
 * middleware otomatik yönlendirmede bu tercihi kullanır.
 */
export function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other: Locale = locale === 'tr' ? 'en' : 'tr';
  const target = pathname.replace(/^\/(tr|en)/, `/${other}`) || `/${other}`;

  return (
    <Link
      href={target}
      hrefLang={other}
      aria-label={locale === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
      onClick={() => {
        document.cookie = `lang=${other};path=/;max-age=31536000;samesite=lax`;
      }}
      className="surface-soft link-underline inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] tracking-wide text-mist transition-colors hover:text-chalk"
    >
      <span className={locale === 'tr' ? 'text-chalk' : ''}>TR</span>
      <span className="text-edge">/</span>
      <span className={locale === 'en' ? 'text-chalk' : ''}>EN</span>
    </Link>
  );
}
