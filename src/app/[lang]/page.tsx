import type { Metadata } from 'next';
import { Time } from '@/components/Time';
import {
  getFeedSnapshot,
  healthSummary,
  rankEvents,
  topEvents,
} from '@/lib/data';
import { sortByRecency } from '@/lib/feed-selectors';
import { buildFigures } from '@/lib/figures';
import { aggregateLocations } from '@/lib/geo/location';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { StatusBar } from '@/components/StatusBar';
import { StatusStrip } from '@/components/StatusStrip';
import { LeadStory } from '@/components/LeadStory';
import { FigureCards } from '@/components/FigurePanels';
import { EventCard } from '@/components/EventCard';
import { TopEventList } from '@/components/TopEventList';
import { Disclaimer, Footer } from '@/components/Disclaimer';
import { Counter } from '@/components/Counter';
import { TimeAgo } from '@/components/TimeAgo';

/**
 * NEDEN `force-dynamic`: `data/feed.json` depoda izleniyor; derleme anında
 * prerender edilen bir sayfa son deploy'daki anlık görüntüye donar ve bunu
 * hata vermeden yapar. (docs/arayuz-plani.md §9.3)
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
  return { title: t.siteName, description: t.tagline };
}

/** Durum kartı. Sayı = ÖLÇÜM registerı → mono + tabular (docs/arayuz-plani.md §3). */
function Stat({
  value,
  label,
  tone = 'chalk',
  delay = 0,
}: {
  value: number;
  label: string;
  tone?: 'chalk' | 'signal' | 'caution' | 'alarm';
  delay?: number;
}) {
  const toneClass = {
    chalk: 'text-chalk',
    signal: 'text-signal',
    caution: 'text-caution',
    alarm: 'text-alarm',
  }[tone];

  return (
    <div
      className="surface reveal rounded-lg px-3.5 py-3"
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      <dd className={`tnum font-mono text-[24px] font-medium leading-none ${toneClass}`}>
        <Counter value={value} />
      </dd>
      <dt className="mt-2 font-mono text-[11px] uppercase tracking-wider text-mist-2">
        {label}
      </dt>
    </div>
  );
}

const RECENT_COUNT = 3;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  const tr = locale === 'tr';

  const { feed } = await getFeedSnapshot();
  const ranked = rankEvents(feed.events);
  const lead = ranked[0] ?? null;
  // Manşette gösterilen olay listede TEKRARLANMAZ: aynı gelişmeyi iki kez
  // göstermek, panoyu olduğundan zengin göstermek olurdu.
  const withoutLead = lead ? feed.events.filter((e) => e.id !== lead.id) : feed.events;
  const top = topEvents(withoutLead, 5);
  const recent = sortByRecency(
    withoutLead.filter((e) => !top.some((t) => t.id === e.id)),
  ).slice(0, RECENT_COUNT);
  const health = healthSummary(feed.report.sources);
  const figures = await buildFigures(feed.events);
  const coverage = aggregateLocations(feed.events);
  const independentGroups = new Set(feed.events.flatMap((e) => e.groups)).size;
  const corroborated = feed.events.filter((e) => e.label === 'corroborated').length;
  const topRegions = coverage.aggregates.slice(0, 4);
  const coveragePercent = Math.round(coverage.ratio * 100);

  return (
    <>
      <StatusBar locale={locale} generatedAt={feed.generatedAt} sources={feed.report.sources} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {/* ── DURUM: toplamlar + değişim ───────────────────────────────── */}
        <section className="reveal">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-official">
            {tr ? 'kaynak izleme panosu' : 'source monitoring board'}
          </p>
          <h1 className="narrative mt-3 text-[30px] font-semibold leading-[1.1] tracking-tight text-chalk sm:text-[40px]">
            {t.siteName}
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-mist">{t.tagline}</p>

          <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={feed.events.length} label={t.events} delay={0} />
            <Stat
              value={health.healthy}
              label={`${t.sources} ${t.ok}`}
              tone={health.failed + health.stale > 0 ? 'caution' : 'signal'}
              delay={55}
            />
            <Stat value={independentGroups} label={t.independentGroups} delay={110} />
            <Stat
              value={feed.signals.length}
              label={tr ? 'doğrulanmamış sinyal' : 'unverified signals'}
              tone="alarm"
              delay={165}
            />
          </dl>

          <div className="mt-3">
            <StatusStrip
              events={feed.events}
              generatedAt={feed.generatedAt}
              sources={feed.report.sources}
              locale={locale}
            />
          </div>

          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-mist-2">
            <Time iso={feed.generatedAt} locale={locale} /> · {corroborated}{' '}
            {tr ? 'olay çoklu kaynaklı' : 'events multi-sourced'}
          </p>
        </section>

        {/* ── MANŞET ───────────────────────────────────────────────────── */}
        {lead && (
          <section className="mt-10">
            <LeadStory event={lead} locale={locale} />
          </section>
        )}

        {/* ── RAKAMLAR ─────────────────────────────────────────────────── */}
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="reveal narrative text-[21px] font-semibold tracking-tight text-chalk">
              {t.navFigures}
            </h2>
            <a
              href={`/${locale}/figures`}
              className="link-underline font-mono text-[11px] uppercase tracking-wider text-official"
            >
              {tr ? 'Kaynağa bağlı tüm rakamlar' : 'All source-bound figures'} →
            </a>
          </div>
          <p className="reveal mt-2 max-w-3xl text-[12.5px] leading-relaxed text-mist-2">
            {tr
              ? 'Kaynakların kendi cümlelerinden gelen sayılar. Sistem bunları toplamaz veya ortalamasını almaz; her sayı kaynağına ve bildirim zamanına bağlıdır.'
              : 'Numbers taken from the sources’ own sentences. The system does not sum or average them; each is bound to its source and report time.'}
          </p>
          <div className="mt-4">
            <FigureCards snapshot={figures} locale={locale} />
          </div>
        </section>

        {/* ── BÖLGELER ─────────────────────────────────────────────────── */}
        {topRegions.length > 0 && (
          <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="reveal narrative text-[21px] font-semibold tracking-tight text-chalk">
                {t.navLocations}
              </h2>
              <a
                href={`/${locale}/locations`}
                className="link-underline font-mono text-[11px] uppercase tracking-wider text-official"
              >
                {tr ? 'Tüm bölgeler' : 'All regions'} →
              </a>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topRegions.map((region, i) => (
                <li key={region.slug}>
                  <a
                    href={`/${locale}/locations/${encodeURIComponent(region.slug)}`}
                    className="surface card-lift reveal flex h-full items-baseline gap-2 rounded-lg px-4 py-3"
                    style={{ '--reveal-delay': `${i * 50}ms` } as React.CSSProperties}
                  >
                    <span className="narrative text-[15px] font-semibold text-chalk">
                      {tr ? region.nameTr : region.nameEn}
                    </span>
                    <span className="tnum ml-auto font-mono text-[11px] text-official">
                      {region.eventCount}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="reveal mt-3 font-mono text-[11px] uppercase tracking-wider text-mist-2">
              {tr
                ? `${coverage.total} olayın ${coverage.matched}’inde konum belirlenebildi (%${coveragePercent}) — bu yüzden harita değil liste gösteriyoruz`
                : `a location was determined for ${coverage.matched} of ${coverage.total} events (${coveragePercent}%) — hence a list, not a map`}
            </p>
          </section>
        )}

        {/* ── ŞU AN NE BİLİYORUZ ───────────────────────────────────────── */}
        {top.length > 0 && (
          <section className="mt-12">
            <h2 className="reveal narrative text-[21px] font-semibold tracking-tight text-chalk">
              {t.whatWeKnow}
            </h2>
            <TopEventList events={top} locale={locale} />
          </section>
        )}

        {/* ── SON GELİŞMELER (tam akış /timeline'da) ───────────────────── */}
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="reveal narrative text-[21px] font-semibold tracking-tight text-chalk">
              {t.latest}
            </h2>
            <a
              href={`/${locale}/timeline`}
              className="link-underline font-mono text-[11px] uppercase tracking-wider text-official"
            >
              {t.allEvents} ({feed.events.length}) →
            </a>
          </div>

          {ranked.length === 0 ? (
            <div className="surface reveal mt-4 rounded-xl p-6">
              <p className="text-[14px] font-medium text-chalk">{t.noEvents}</p>
              <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-mist">
                {t.noEventsHint}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {recent.map((event, i) => (
                <EventCard key={event.id} event={event} locale={locale} index={i} />
              ))}
            </div>
          )}

          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-mist-2">
            {t.lastScan}: <TimeAgo iso={feed.generatedAt} locale={locale} />
          </p>
        </section>

        {/* ── DİĞER KATMANLAR ──────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="reveal narrative text-[21px] font-semibold tracking-tight text-chalk">
            {tr ? 'Diğer katmanlar' : 'Other layers'}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                href: `/${locale}/signals`,
                label: t.signals,
                count: feed.signals.length,
                hint: t.signalsHint,
              },
              {
                href: `/${locale}/sources`,
                label: t.sourceHealth,
                count: health.total,
                hint: `${health.healthy} ${t.ok}`,
              },
            ].map((item, i) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="surface card-lift reveal flex h-full flex-wrap items-baseline gap-3 rounded-lg px-4 py-3"
                  style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}
                >
                  <span className="narrative text-[16px] font-semibold text-chalk">
                    {item.label}
                  </span>
                  <span className="tnum font-mono text-[11px] text-official">{item.count}</span>
                  <span className="ml-auto max-w-[60%] text-right text-[11.5px] leading-snug text-mist-2">
                    {item.hint}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
