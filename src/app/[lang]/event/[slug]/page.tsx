import type { Metadata } from 'next';
import { Time } from '@/components/Time';
import { notFound } from 'next/navigation';
import { getFeedSnapshot } from '@/lib/data';
import { resolveEvent, searchHref } from '@/lib/event-resolve';
import { shouldShowSummary } from '@/lib/event-detail';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { formatDate } from '@/lib/format';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { localizedText, localizedTitle } from '@/lib/translate/display';
import { StatusBar } from '@/components/StatusBar';
import { LabelBadge } from '@/components/LabelBadge';
import { ClaimList } from '@/components/ClaimList';
import { ContradictionPanel } from '@/components/ContradictionPanel';
import { MachineTranslatedBadge } from '@/components/MachineTranslatedBadge';
import { Disclaimer, Footer } from '@/components/Disclaimer';

/** `force-dynamic`: slug kümesi her ingest'te değişebilir (bkz. timeline/page.tsx). */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const { feed } = await getFeedSnapshot();
  const { event } = resolveEvent(feed.events, slug);
  if (!event) return { title: getDict(locale).allEvents, robots: { index: false } };
  const title = localizedTitle(locale, event);
  return {
    title: title.text,
    description: event.summary?.slice(0, 180) || undefined,
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  const tr = locale === 'tr';

  const { feed } = await getFeedSnapshot();
  const resolution = resolveEvent(feed.events, slug);

  // Hiçbir aday yoksa gerçekten bilinmeyen adres → 404 sayfası.
  if (!resolution.event && resolution.suggestions.length === 0) notFound();

  /* ── Yumuşak çözümleme: olay bulunamadı ama adaylar var ──────────────── */
  if (!resolution.event) {
    return (
      <>
        <StatusBar locale={locale} generatedAt={feed.generatedAt} sources={feed.report.sources} />
        <main id="icerik" className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
          <a
            href={`/${locale}/timeline`}
            className="link-underline font-mono text-[11px] uppercase tracking-wider text-mist-2"
          >
            ← {t.allEvents}
          </a>

          <h1 className="narrative mt-4 text-[26px] font-semibold tracking-tight text-chalk">
            {tr ? 'Bu olay artık bu adreste değil' : 'This event is no longer at this address'}
          </h1>

          <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-mist">
            <p>
              {tr
                ? 'Olay kimlikleri her taramada yeniden üretilebiliyor: aynı haberin başlıkları birleşince veya ayrılınca olayın adresi değişebilir. Bağlantı kırılmadı, olay yeniden gruplandı.'
                : 'Event identifiers are regenerated on every scan: when headlines merge or split, the event address can change. The link did not break; the event was regrouped.'}
            </p>
            <p>
              {tr
                ? 'Aşağıdakiler bu başlığa en yakın olaylar. Arama ile de tam metin tarayabilirsiniz.'
                : 'Below are the closest events to that headline. You can also search the full text.'}
            </p>
          </div>

          <a
            href={searchHref(locale, resolution.query)}
            className="surface card-lift mt-5 inline-block rounded-lg px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-official"
          >
            {tr ? 'Akışta ara' : 'Search the timeline'}: “{resolution.query}” →
          </a>

          {resolution.suggestions.length > 0 && (
            <ul className="mt-6 space-y-2">
              {resolution.suggestions.map((event) => (
                <li key={event.id}>
                  <a
                    href={`/${locale}/event/${encodeURIComponent(event.slug)}`}
                    className="surface card-lift flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-4 py-3"
                  >
                    <LabelBadge label={event.label} locale={locale} size="sm" shortOnNarrow />
                    <span className="narrative min-w-0 flex-1 text-[15px] leading-snug text-chalk">
                      {localizedTitle(locale, event).text}
                    </span>
                    <span className="font-mono text-[11px] text-mist-2">
                      {t.groupCount(event.independentGroupCount)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-14">
            <Disclaimer locale={locale} />
          </div>
        </main>
        <Footer locale={locale} />
      </>
    );
  }

  /* ── Tam sayfa ───────────────────────────────────────────────────────── */
  const event = resolution.event;
  const title = localizedTitle(locale, event);
  const summary = localizedText(locale, event.summary, event.summaryTr);

  return (
    <>
      <StatusBar locale={locale} generatedAt={feed.generatedAt} sources={feed.report.sources} />

      <main id="icerik" className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <a
          href={`/${locale}/timeline`}
          className="link-underline font-mono text-[11px] uppercase tracking-wider text-mist-2"
        >
          ← {t.allEvents}
        </a>

        <article className="mt-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <LabelBadge label={event.label} locale={locale} shortOnNarrow />
            <span className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
              {t.reportedBy(event.independentGroupCount)} · {t.claimCount(event.claims.length)}
            </span>
          </div>

          <h1 className="narrative mt-3 text-[26px] font-semibold leading-tight tracking-tight text-chalk sm:text-[32px]">
            {title.text}
          </h1>

          {title.machine && (
            <p className="mt-2 font-mono text-[11px] text-mist-2">
              <MachineTranslatedBadge locale={locale} />
              {event.titleOriginal && <> · {t.readOriginal}: {event.titleOriginal}</>}
            </p>
          )}

          {shouldShowSummary(event, summary.text) && (
            <p className="mt-3 text-[14px] leading-relaxed text-mist">{summary.text}</p>
          )}

          {/* Yumuşak çözümleme uyarısı: kullanıcı yanlış olayı okuduğunu bilmeli. */}
          {resolution.match === 'fuzzy' && (
            <p className="mt-4 border-l-2 border-caution pl-3 text-[12.5px] leading-relaxed text-caution">
              {tr
                ? 'Bu adres tam eşleşmedi; başlık benzerliğine göre EN YAKIN olay gösteriliyor. Olay yeniden gruplanmış olabilir.'
                : 'This address did not match exactly; the CLOSEST event by headline similarity is shown. The event may have been regrouped.'}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {event.groups.map((group) => (
              <span
                key={group}
                className="rounded border border-edge-soft bg-panel-2 px-2 py-0.5 font-mono text-[11px] text-mist"
              >
                {GROUP_LABELS[group] ?? group}
              </span>
            ))}
          </div>

          <ContradictionPanel event={event} locale={locale} />

          <h2 className="narrative mt-8 text-[19px] font-semibold tracking-tight text-chalk">
            {tr ? 'Kim ne bildirdi' : 'Who reported what'}
          </h2>
          <ClaimList event={event} locale={locale} />

          <footer className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge-soft pt-3 font-mono text-[11px] text-mist-2">
            <span>
              {t.seenBySystem}: <Time iso={event.firstSeenAt} locale={locale} />
            </span>
            <span>
              {t.updated}: <Time iso={event.lastUpdateAt} locale={locale} />
            </span>
          </footer>

          {resolution.suggestions.length > 0 && (
            <section className="mt-8">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
                {tr ? 'Benzer olaylar' : 'Similar events'}
              </h2>
              <ul className="mt-2 space-y-2">
                {resolution.suggestions.map((similar) => (
                  <li key={similar.id}>
                    <a
                      href={`/${locale}/event/${encodeURIComponent(similar.slug)}`}
                      className="link-underline narrative text-[14.5px] leading-snug text-mist hover:text-chalk"
                    >
                      {localizedTitle(locale, similar).text}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
