import type { Metadata } from 'next';
import { Time } from '@/components/Time';
import { getFeedSnapshot } from '@/lib/data';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { formatDay } from '@/lib/format';
import {
  availableGroups,
  availableTiers,
  filterEvents,
  filterQuery,
  groupByDay,
  paginate,
  parseTimelineFilters,
} from '@/lib/feed-selectors';
import { StatusBar } from '@/components/StatusBar';
import { FilterBar } from '@/components/FilterBar';
import { EventCard } from '@/components/EventCard';
import { Disclaimer, Footer } from '@/components/Disclaimer';

/**
 * NEDEN `force-dynamic` (ve neden bu satır silinmemeli):
 * `data/feed.json` depoda izleniyor, yani derleme anında dinamik API
 * kullanmayan bir rota prerender edilirse **son deploy'daki anlık görüntüye
 * donar** — sayfa açılır, hata vermez, ama veri güncellenmez. Feed okuyan her
 * rota bu yüzden isteğe bağlı render edilir. (docs/arayuz-plani.md §9.3)
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  return { title: t.allEvents, description: t.timelineHint };
}

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);

  const filters = parseTimelineFilters(await searchParams);
  const { feed } = await getFeedSnapshot();

  const matched = filterEvents(feed.events, filters);
  const { visible, total, hasMore } = paginate(matched, filters.page);
  const dayGroups = groupByDay(visible);

  let cardIndex = 0;

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

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="narrative text-[26px] font-semibold tracking-tight text-chalk sm:text-[32px]">
            {t.allEvents}
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
            {t.timelineHint}
          </p>
        </div>

        <div className="mt-5">
          <FilterBar
            locale={locale}
            filters={filters}
            groups={availableGroups(feed.events)}
            tiers={availableTiers(feed.events)}
          />
        </div>

        {total === 0 ? (
          <div className="surface reveal mt-6 rounded-xl p-6">
            <p className="narrative text-[16px] font-medium text-chalk">{t.noMatch}</p>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-mist">
              {t.noMatchHint}
            </p>
            <a
              href={`/${locale}/timeline`}
              className="link-underline mt-3 inline-block font-mono text-[11px] uppercase tracking-wider text-official"
            >
              {t.clear}
            </a>
          </div>
        ) : (
          <>
            <p
              aria-live="polite"
              className="mt-4 font-mono text-[11px] uppercase tracking-wider text-mist-2"
            >
              {t.showing(visible.length, total)}
            </p>

            {dayGroups.map((group) => (
              <section key={group.day} className="mt-6">
                <h2 className="narrative flex items-baseline gap-2 border-b border-edge-soft pb-1.5 text-[17px] font-semibold text-chalk">
                  <Time iso={group.day} locale={locale} mode="day" />
                  <span className="font-mono text-[11px] font-normal uppercase tracking-wider text-mist-2">
                    {group.events.length}
                  </span>
                </h2>
                <div className="mt-3 space-y-3.5">
                  {group.events.map((event) => (
                    <EventCard key={event.id} event={event} locale={locale} index={cardIndex++} />
                  ))}
                </div>
              </section>
            ))}

            {hasMore && (
              <div className="mt-8 text-center">
                <a
                  href={`/${locale}/timeline${filterQuery(filters, { page: filters.page + 1 })}`}
                  className="surface card-lift inline-block rounded-lg px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-official"
                >
                  {t.loadMore} ↓
                </a>
              </div>
            )}
          </>
        )}

        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
