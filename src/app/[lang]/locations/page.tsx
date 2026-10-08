import type { Metadata } from 'next';
import { getFeedSnapshot } from '@/lib/data';
import { aggregateLocations } from '@/lib/geo/location';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { StatusBar } from '@/components/StatusBar';
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
    title: t.navLocations,
    description:
      locale === 'tr'
        ? 'Olayların kaynak metinlerinden çıkarılan bölge dağılımı ve kapsama oranı.'
        : 'Regional distribution extracted from source texts, with its measured coverage.',
  };
}

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  const tr = locale === 'tr';

  const { feed } = await getFeedSnapshot();
  const coverage = aggregateLocations(feed.events);
  const percent = Math.round(coverage.ratio * 100);

  const macros = coverage.aggregates.filter((a) => a.kind === 'macro');
  const subjects = coverage.aggregates.filter((a) => a.kind === 'subject');
  const unnamed = coverage.total - coverage.matched;

  const section = (
    title: string,
    hint: string,
    rows: typeof coverage.aggregates,
  ) => (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-edge-soft pb-1.5">
        <h2 className="narrative text-[19px] font-semibold tracking-tight text-chalk">{title}</h2>
        <p className="max-w-lg text-[11.5px] leading-relaxed text-mist-2">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-mist-2">
          {tr ? 'Eşleşen bölge yok.' : 'No matching region.'}
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {rows.map((row, i) => (
            <li key={row.slug}>
              <a
                href={`/${locale}/locations/${encodeURIComponent(row.slug)}`}
                className="surface card-lift reveal flex h-full items-baseline gap-3 rounded-lg px-4 py-3"
                style={{ '--reveal-delay': `${i * 40}ms` } as React.CSSProperties}
              >
                <span className="narrative text-[16px] font-semibold text-chalk">
                  {tr ? row.nameTr : row.nameEn}
                </span>
                <span className="tnum font-mono text-[11px] text-official">
                  {row.eventCount} {tr ? 'olay' : 'events'}
                </span>
                <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-mist-2">
                  {row.groupCount} {tr ? 'grup' : 'groups'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

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
          {t.navLocations}
        </h1>

        <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-mist">
          <p>
            {tr
              ? `Konum bilgisi kaynakların KENDİ metinlerinden kelime eşleşmesiyle çıkarılır. ${coverage.total} olayın ${coverage.matched}’inde konum belirlenebildi (%${percent}).`
              : `Locations are extracted from the sources’ OWN texts by token matching. A location could be determined for ${coverage.matched} of ${coverage.total} events (${percent}%).`}
          </p>
          <p>
            {tr
              ? `Harita yerine liste gösteriyoruz: kapsama %60’ın altında olduğu için harita, olayların çoğunu sessizce dışarıda bırakır ve yanlış bir yoğunluk izlenimi verir. ${unnamed} olay hiçbir bölgeye atanmadı — atanmadı, “başka yerde” demek değil.`
              : `We show a list instead of a map: coverage is below 60%, so a map would silently drop most events and give a false impression of density. ${unnamed} events are assigned to no region — unassigned, not “elsewhere”.`}
          </p>
          <p>
            {tr
              ? 'Bölge eşleşmesi yanlış olabilir (örneğin bir kaynak başka bir ülkeden söz ediyorsa). Hatalı eşleşme, olayın kendi metninden doğrulanabilir; her bölge sayfası olayları ve kaynaklarını gösterir.'
              : 'A region match can be wrong (e.g. when a source mentions another country). A wrong match can be checked against the event text itself; every region page lists the events and their sources.'}
          </p>
        </div>

        {section(
          tr ? 'Federal bölgeler' : 'Federal subjects',
          tr
            ? 'Birincil idari birimler (oblast, kray, cumhuriyet).'
            : 'Primary administrative units (oblast, krai, republic).',
          subjects,
        )}

        {section(
          tr ? 'Makro bölgeler' : 'Macro regions',
          tr
            ? 'Metinler çoğu zaman eyalet yerine büyük bölge adı verir (“Sibirya”); makro bölge federal bölge değildir, ayrı tutulur.'
            : 'Texts often name a large region instead of a subject (“Siberia”); a macro region is not a federal district and is tracked separately.',
          macros,
        )}

        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
