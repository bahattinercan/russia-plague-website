import type { Metadata } from 'next';
import { getFeedSnapshot } from '@/lib/data';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { StatusBar } from '@/components/StatusBar';
import { SignalList } from '@/components/SignalList';
import { Disclaimer, Footer } from '@/components/Disclaimer';

/** `force-dynamic` gerekçesi: bkz. timeline/page.tsx (derleme anında donma). */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 40;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  return { title: t.signals, description: t.signalsHint };
}

export default async function SignalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);

  const sp = await searchParams;
  const rawPage = Number.parseInt(Array.isArray(sp.page) ? (sp.page[0] ?? '') : (sp.page ?? ''), 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 100 ? rawPage : 1;

  const { feed } = await getFeedSnapshot();
  const total = feed.signals.length;
  const visible = feed.signals.slice(0, page * PAGE_SIZE);
  const hasMore = total > visible.length;

  return (
    <>
      <StatusBar locale={locale} generatedAt={feed.generatedAt} sources={feed.report.sources} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <a
          href={`/${locale}`}
          className="link-underline font-mono text-[11px] uppercase tracking-wider text-mist-2"
        >
          ← {t.backToBoard}
        </a>

        <h1 className="narrative mt-4 text-[26px] font-semibold tracking-tight text-chalk sm:text-[32px]">
          {t.signals}
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-mist">{t.signalsHint}</p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {t.showing(visible.length, total)}
        </p>

        <div className="mt-5">
          <SignalList signals={visible} locale={locale} />
        </div>

        {hasMore && (
          <div className="mt-8 text-center">
            <a
              href={`/${locale}/signals?page=${page + 1}`}
              className="surface card-lift inline-block rounded-lg px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-official"
            >
              {t.loadMore} ↓
            </a>
          </div>
        )}

        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
