import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFeedSnapshot } from '@/lib/data';
import { aggregateLocations, eventsInLocation } from '@/lib/geo/location';
import { regionName, MACRO_BY_SLUG, REGION_BY_SLUG } from '@/lib/geo/gazetteer';
import { sortByRecency } from '@/lib/feed-selectors';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { StatusBar } from '@/components/StatusBar';
import { EventCard } from '@/components/EventCard';
import { Disclaimer, Footer } from '@/components/Disclaimer';

/** `force-dynamic`: slug kümesi her ingest'te değişebilir; derleme anında donmamalı. */
export const dynamic = 'force-dynamic';

function knownSlug(slug: string): boolean {
  return REGION_BY_SLUG.has(slug) || MACRO_BY_SLUG.has(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const name = regionName(decodeURIComponent(slug), locale);
  return {
    title: name,
    description:
      locale === 'tr'
        ? `${name} ile eşleşen olaylar ve kaynakları.`
        : `Events and sources matched to ${name}.`,
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug: rawSlug } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  const tr = locale === 'tr';

  const slug = decodeURIComponent(rawSlug);
  if (!knownSlug(slug)) notFound();

  const { feed } = await getFeedSnapshot();
  const coverage = aggregateLocations(feed.events);
  const aggregate = coverage.aggregates.find((a) => a.slug === slug);
  const events = sortByRecency(eventsInLocation(feed.events, slug));
  const name = regionName(slug, locale);

  const parentMacro =
    aggregate?.kind === 'subject' ? (REGION_BY_SLUG.get(slug)?.macro ?? null) : null;

  return (
    <>
      <StatusBar locale={locale} generatedAt={feed.generatedAt} sources={feed.report.sources} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <a
          href={`/${locale}/locations`}
          className="link-underline font-mono text-[11px] uppercase tracking-wider text-mist-2"
        >
          ← {t.navLocations}
        </a>

        <h1 className="narrative mt-4 text-[26px] font-semibold tracking-tight text-chalk sm:text-[32px]">
          {name}
        </h1>

        <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-mist">
          {tr
            ? 'Bu sayfa, kaynak metinlerinde bu bölgenin adı geçen olayları listeler. Konum eşleşmesi kelime bazlıdır ve yanlış olabilir; aşağıdaki olayların kendi metinleri ve kaynakları her kartta görünür.'
            : 'This page lists events whose source texts mention this region. Location matching is token-based and can be wrong; each card below shows the event text and its sources.'}
        </p>

        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {events.length} {tr ? 'olay' : 'events'}
          {aggregate ? ` · ${aggregate.groupCount} ${tr ? 'bağımsız grup' : 'independent groups'}` : ''}
          {parentMacro ? (
            <>
              {' · '}
              <a
                href={`/${locale}/locations/${encodeURIComponent(parentMacro)}`}
                className="link-underline text-official"
              >
                {regionName(parentMacro, locale)}
              </a>
            </>
          ) : null}
        </p>

        {events.length === 0 ? (
          <div className="surface reveal mt-6 rounded-xl p-6">
            <p className="text-[14px] font-medium text-chalk">
              {tr
                ? 'Şu anki feed’de bu bölgeyle eşleşen olay yok'
                : 'No event in the current feed matches this region'}
            </p>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-mist">
              {tr
                ? 'Bu, bölgede olay olmadığı anlamına gelmez: konum yalnızca kaynak metninde bölge adı geçtiğinde tespit edilebiliyor ve eski olaylar feed’den düşebiliyor.'
                : 'This does not mean nothing happened there: a location is only detected when the source text names the region, and older events can drop out of the feed.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3.5">
            {events.map((event, i) => (
              <EventCard key={event.id} event={event} locale={locale} index={i} />
            ))}
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
