import type { Metadata } from 'next';
import { getFeedSnapshot, healthSummary } from '@/lib/data';
import { DEFAULT_LOCALE, getDict, isLocale, type Locale } from '@/lib/i18n';
import { GROUP_LABELS, SOURCES } from '@/lib/sources/registry';
import { StatusBar } from '@/components/StatusBar';
import { SourceHealthPanel } from '@/components/SourceHealthPanel';
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
  return { title: t.sourceHealth, description: t.methodologyHint };
}

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  const tr = locale === 'tr';

  const { feed } = await getFeedSnapshot();
  const health = healthSummary(feed.report.sources);

  // Bağımsızlık grupları: hangi yayıncılar aynı çatı altında toplanıyor.
  const groupMap = new Map<string, string[]>();
  for (const source of SOURCES) {
    const list = groupMap.get(source.group) ?? [];
    list.push(source.name);
    groupMap.set(source.group, list);
  }
  const groups = [...groupMap.entries()].sort((a, b) => b[1].length - a[1].length);

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
          {t.sourceHealth}
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-mist">
          {tr
            ? `Taranan ${health.total} kaynağın şu anki durumu. Bozuk feed'i gizlemek yerine göstermek güvenin parçasıdır: “şu an bu kaynağı çekemiyoruz” demek, sessizce eksik göstermekten iyidir.`
            : `Live status of the ${health.total} sources being monitored. Showing a broken feed instead of hiding it is part of the trust model: saying “we cannot fetch this source right now” beats silently showing less.`}
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {health.healthy} {t.ok}
          {health.stale > 0 && ` · ${health.stale} ${t.stale}`}
          {health.failed > 0 && ` · ${health.failed} ${t.failed}`}
        </p>

        <div className="mt-5">
          <SourceHealthPanel sources={feed.report.sources} locale={locale} />
        </div>

        {/* ── Bağımsızlık grupları: sitenin en kritik editoryal kuralı ─── */}
        <section className="mt-14">
          <h2 className="narrative text-[21px] font-semibold tracking-tight text-chalk">
            {tr ? 'Bağımsızlık grupları' : 'Independence groups'}
          </h2>
          <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-mist">
            {tr
              ? 'Aynı sahiplik/editoryal çatı altındaki kaynaklar TEK kaynak sayılır. Örnek: TASS + RIA + RT + Sputnik aynı haberi yazsa bile bağımsız kaynak sayısı 1’dir. Bu kural, “tek kaynağı çok kaynak gibi gösterme” riskine karşı en önemli korumadır ve “çoklu bağımsız kaynak bildiriyor” etiketinin temelidir.'
              : 'Sources under the same ownership/editorial umbrella count as ONE source. Example: even if TASS + RIA + RT + Sputnik all report the same story, the independent source count is 1. This rule is the main protection against presenting a single source as many, and it is the basis of the “reported by multiple independent sources” label.'}
          </p>

          <div className="surface mt-4 overflow-hidden rounded-lg">
            <ul className="divide-y divide-edge-soft">
              {groups.map(([group, members]) => (
                <li key={group} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
                  <span className="text-[12.5px] font-medium text-chalk">
                    {GROUP_LABELS[group] ?? group}
                  </span>
                  <span className="tnum font-mono text-[11px] text-official">
                    {members.length}
                  </span>
                  <span className="w-full text-[11px] leading-relaxed text-mist-2">
                    {members.join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-mist-2">
            {tr ? 'Katman tanımları ve güven puanı formülü: ' : 'Tier definitions and trust score formula: '}
            <a href={`/${locale}/methodology`} className="link-underline text-official">
              {t.methodology} →
            </a>
          </p>
        </section>

        <div className="mt-14">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
