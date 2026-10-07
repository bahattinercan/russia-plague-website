import type { Metadata } from 'next';
import '../globals.css';
import { RevealProvider } from '@/components/RevealProvider';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);

  return {
    title: {
      default: t.siteName,
      template: `%s · ${t.siteName}`,
    },
    description: t.tagline,
    applicationName: t.siteName,
    robots: { index: true, follow: true },
    openGraph: {
      title: t.siteName,
      description: t.tagline,
      type: 'website',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
    },
  };
}

/**
 * Kök layout.
 * Tüm rotalar /[lang] altında olduğu için `lang` niteliği dinamik yazılabilir.
 */
export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;

  return (
    <html lang={locale}>
      <body className="bg-canvas relative min-h-screen">
        <div className="bg-grid pointer-events-none fixed inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <RevealProvider />
          {children}
        </div>
      </body>
    </html>
  );
}
