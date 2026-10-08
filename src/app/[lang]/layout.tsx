import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google';
import '../globals.css';
import { RevealProvider } from '@/components/RevealProvider';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';

/*
 * Yazı tipleri kendi sunucumuzdan servis edilir (next/font):
 *   - dış istek yok → gizlilik notu (docs/guvenlik-denetimi.md §3) kapanır
 *   - CSP `style-src`/`font-src` dış kaynakları kaldırılabilir (src/lib/security/csp.ts)
 *   - preload + `font-display: swap` otomatik → CLS'e katkı yok
 *
 * Değişken adları bilinçli olarak `--font-*` DEĞİL: `@theme` içindeki
 * `--font-sans` gibi anlamsal adlar `:root`'ta tanımlı, `html`'e yazılan bir
 * değişkeni ezer. Anlamsal eşleme globals.css'te yapılır.
 *
 * `latin-ext` ŞART: Türkçe (ı ğ ş İ) glifleri bu alt kümede gelir.
 * Kanıt: `npm run layout-check` → document.fonts.check('…','ığşçöü İĞŞÇÖÜ').
 */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-jetbrains',
});

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
  const t = getDict(locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${newsreader.variable} ${jetbrains.variable}`}
    >
      <body className="bg-canvas relative min-h-screen">
        <a href="#icerik" className="skip-link">
          {t.skipToContent}
        </a>
        <div className="bg-grid pointer-events-none fixed inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <RevealProvider />
          {children}
        </div>
      </body>
    </html>
  );
}
