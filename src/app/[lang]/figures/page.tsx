import type { Metadata } from 'next';
import { getFeedSnapshot } from '@/lib/data';
import { buildFigures } from '@/lib/figures';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { StatusBar } from '@/components/StatusBar';
import { FigureTable } from '@/components/FigurePanels';
import { Disclaimer, Footer } from '@/components/Disclaimer';

/** `force-dynamic` gerekçesi: bkz. timeline/page.tsx (derleme anında donma). */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  return {
    title: t.navFigures,
    description:
      locale === 'tr'
        ? 'Kaynakların bildirdiği vaka, ölüm ve kısıtlama sayıları — her biri kaynağına ve zamanına bağlı.'
        : 'Case, death and restriction figures reported by sources — each bound to its source and timestamp.',
  };
}

export default async function FiguresPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  const tr = locale === 'tr';

  const { feed } = await getFeedSnapshot();
  const snapshot = await buildFigures(feed.events);

  const dated = feed.events
    .map((e) => e.lastUpdateAt)
    .sort()
    .slice(-1)[0];

  return (
    <>
      <StatusBar locale={locale} generatedAt={feed.generatedAt} sources={feed.report.sources} />

      <main id="icerik" className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <a
          href={`/${locale}`}
          className="link-underline font-mono text-[11px] uppercase tracking-wider text-mist-2"
        >
          ← {t.backToBoard}
        </a>

        <h1 className="narrative mt-4 text-[26px] font-semibold tracking-tight text-chalk sm:text-[32px]">
          {t.navFigures}
        </h1>

        <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-mist">
          <p>
            {tr
              ? 'Aşağıdaki sayılar kaynakların KENDİ cümlelerinden geliyor ve her biri kaynağına, katmanına ve bildirim zamanına bağlı. Sistem bu sayıları toplamaz, ortalamasını almaz ve hiçbirini “doğru” kabul etmez.'
              : 'The figures below come from the sources’ OWN sentences, each bound to its source, tier and report time. The system does not sum, average or accept any of them as “correct”.'}
          </p>
          <p>
            {tr
              ? 'Tabloyu okurken: her satır tek bir kaynağın kendi cümlesidir ve o cümleye “Olayı aç” bağlantısından ulaşılır. Satırlar toplanmaz; aynı ölçüt için iki kaynak farklı sayı veriyorsa ikisi de görünür, aradaki fark gizlenmez. Kaynağın kendi ihtiyat ifadesi (“yaklaşık”, “en az”, “fazla”) sayının yanında korunur — “200” ile “neredeyse 200” aynı şey değildir.'
              : 'How to read the table: each row is one source’s own sentence, reachable through the “Open the event” link. Rows are not summed; if two sources give different numbers for the same metric, both stay visible and the gap is not hidden. Each source’s own hedging (“about”, “at least”, “more than”) is kept beside the number — “200” and “nearly 200” are not the same thing.'}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
            {tr ? 'Semboller' : 'Symbols'}: ≈ {tr ? 'yaklaşık / neredeyse' : 'about / nearly'} · ≥{' '}
            {tr ? 'en az' : 'at least'} · {'>'} {tr ? 'fazla' : 'more than'} ·{' '}
            {tr ? 'sembolsüz' : 'no symbol'} = {tr ? 'kaynağın verdiği tam sayı' : 'exact number as given'}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
            {t.lastScan}: {tr ? 'en yeni olay' : 'newest event'} {dated ? dated.slice(0, 16) : '—'} UTC
          </p>
        </div>

        <div className="mt-8">
          <FigureTable snapshot={snapshot} locale={locale} />
        </div>

        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
