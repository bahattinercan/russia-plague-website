import type { Metadata } from 'next';
import {
  formatDate,
  getFeedSnapshot,
  healthSummary,
  rankEvents,
  topEvents,
} from '@/lib/data';
import {
  DEFAULT_LOCALE,
  getDict,
  isLocale,
  type Locale,
} from '@/lib/i18n';
import { StatusBar } from '@/components/StatusBar';
import { EventCard } from '@/components/EventCard';
import { TopEventList } from '@/components/TopEventList';
import { SignalList } from '@/components/SignalList';
import { SourceHealthPanel } from '@/components/SourceHealthPanel';
import { Disclaimer, Footer } from '@/components/Disclaimer';
import { Counter } from '@/components/Counter';
import { TimeAgo } from '@/components/TimeAgo';

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
      <dd className={`tnum text-2xl font-semibold leading-none ${toneClass}`}>
        <Counter value={value} />
      </dd>
      <dt className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-mist/70">
        {label}
      </dt>
    </div>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);

  const { feed } = await getFeedSnapshot();
  const ranked = rankEvents(feed.events);
  const top = topEvents(feed.events, 5);
  const health = healthSummary(feed.report.sources);
  const independentGroups = new Set(feed.events.flatMap((e) => e.groups)).size;
  const corroborated = feed.events.filter((e) => e.label === 'corroborated').length;

  return (
    <>
      <StatusBar
        locale={locale}
        generatedAt={feed.generatedAt}
        sources={feed.report.sources}
        events={feed.events}
        signals={feed.signals.length}
      />

      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="reveal">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-official/80">
            {locale === 'tr' ? 'kaynak izleme panosu' : 'source monitoring board'}
          </p>
          <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-tight text-chalk sm:text-[42px]">
            {t.siteName}
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-mist">
            {t.tagline}
          </p>

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
              label={locale === 'tr' ? 'doğrulanmamış sinyal' : 'unverified signals'}
              tone="alarm"
              delay={165}
            />
          </dl>

          <p className="mt-4 font-mono text-[10.5px] uppercase tracking-wider text-mist/60">
            {t.lastScan}: <TimeAgo iso={feed.generatedAt} locale={locale} /> ·{' '}
            {formatDate(feed.generatedAt, locale)} UTC · {corroborated}{' '}
            {locale === 'tr' ? 'olay çoklu kaynaklı' : 'events multi-sourced'}
          </p>
        </section>

        {/* ── ŞU AN NE BİLİYORUZ ───────────────────────────────────────── */}
        {top.length > 0 && (
          <section className="mt-12">
            <h2 className="reveal text-[19px] font-semibold tracking-tight text-chalk">
              {t.whatWeKnow}
            </h2>
            <TopEventList events={top} locale={locale} />
          </section>
        )}

        {/* ── ZAMAN ÇİZELGESİ ──────────────────────────────────────────── */}
        <section className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="reveal text-[19px] font-semibold tracking-tight text-chalk">
              {t.timeline}
            </h2>
            <p className="reveal font-mono text-[10.5px] uppercase tracking-wider text-mist/60">
              {t.timelineHint}
            </p>
          </div>

          {ranked.length === 0 ? (
            <div className="surface reveal mt-4 rounded-xl p-6">
              <p className="text-[14px] font-medium text-chalk/90">{t.noEvents}</p>
              <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-mist">
                {t.noEventsHint}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {ranked.map((event, i) => (
                <EventCard key={event.id} event={event} locale={locale} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* ── SİNYALLER ────────────────────────────────────────────────── */}
        <div className="mt-14">
          <SignalList signals={feed.signals} locale={locale} />
        </div>

        {/* ── KAYNAK SAĞLIĞI ───────────────────────────────────────────── */}
        <div className="mt-14">
          <SourceHealthPanel sources={feed.report.sources} locale={locale} />
        </div>

        {/* ── UYARI ────────────────────────────────────────────────────── */}
        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
