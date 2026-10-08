import type { FigureMetric, FigureQualifier, FiguresSnapshot, ResolvedFigure } from '@/lib/figures';
import { Time } from './Time';
import type { Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';

/**
 * Sayısal durum panelleri (PLAN.md §9.5).
 *
 * EDİTORYAL KURALLAR (uygulama, `figures.ts` ve `figures-check` ile zorlanır):
 *   1. Her sayı KAYNAĞA bağlıdır: kaynak adı + tier + `as_of` + kaynağın kendi
 *      cümlesi gösterilir. Bağ kurulamayan kayıt GÖSTERİLMEZ.
 *   2. Sistem sayıları TOPLAMAZ, BİRLEŞTİRMEZ, TEYİT ETMEZ. Aynı ölçüt için
 *      farklı değer/ifade varsa ikisi de yan yana gösterilir.
 *   3. Ölçüt için rakam yoksa “bildirilen rakam yok” yazar (boş bırakılmaz).
 *
 * Sunucu bileşeni: `figures.ts` `node:fs` kullanır, istemciye sızmamalı.
 */

const METRIC_LABEL: Record<FigureMetric, { tr: string; en: string }> = {
  cases: { tr: 'Bildirilen vaka', en: 'Reported cases' },
  deaths: { tr: 'Bildirilen ölüm', en: 'Reported deaths' },
  restricted: { tr: 'Kısıtlanan kişi', en: 'People restricted' },
};

/** Belirsizliği KORU: “200” ile “neredeyse 200” aynı değildir. */
const QUALIFIER_SYMBOL: Record<FigureQualifier, string> = {
  exact: '',
  about: '≈',
  nearly: '≈',
  'at-least': '≥',
  'more-than': '>',
};

const QUALIFIER_WORD: Record<FigureQualifier, { tr: string; en: string }> = {
  exact: { tr: 'tam', en: 'exact' },
  about: { tr: 'yaklaşık', en: 'about' },
  nearly: { tr: 'neredeyse', en: 'nearly' },
  'at-least': { tr: 'en az', en: 'at least' },
  'more-than': { tr: 'daha fazla', en: 'more than' },
};

function figureValue(figure: ResolvedFigure): string {
  const symbol = QUALIFIER_SYMBOL[figure.qualifier];
  return `${symbol ? `${symbol} ` : ''}${figure.value}`;
}

function Measure({ figure, locale }: { figure: ResolvedFigure; locale: Locale }) {
  const tr = locale === 'tr';
  return (
    <li className="border-l-2 border-edge pl-3 py-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="tnum font-mono text-[15px] font-medium text-chalk">
          {figureValue(figure)}
        </span>
        <span className="text-[12.5px] text-mist">{figure.sourceName}</span>
        <span className="font-mono text-[11px] text-official">T{figure.tier}</span>
        {figure.measureTr && <span className="font-mono text-[11px] text-mist-2">
          {tr ? figure.measureTr : (figure.measureEn ?? figure.measureTr)}
        </span>}
        <span className="font-mono text-[11px] text-mist-2">
          <Time iso={figure.asOf} locale={locale} />
        </span>
        <span
          className="font-mono text-[11px] text-mist-2"
          title={QUALIFIER_WORD[figure.qualifier][locale]}
        >
          {figure.qualifier === 'exact' ? '' : `(${QUALIFIER_WORD[figure.qualifier][locale]})`}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-mist">
        “{figure.phrase}”
      </p>
      <a
        href={`/${locale}/event/${encodeURIComponent(figure.eventSlug)}`}
        className="link-underline mt-1 inline-block font-mono text-[11px] text-official"
      >
        {tr ? 'Olayı aç' : 'Open the event'} →
      </a>
    </li>
  );
}

/** Panodaki kompakt özet: 3 ölçüt, değer(ler) ve kaç bağımsız grup bildirdiği. */
export function FigureCards({ snapshot, locale }: { snapshot: FiguresSnapshot; locale: Locale }) {
  const tr = locale === 'tr';
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {snapshot.groups.map((group, i) => (
        <div
          key={group.metric}
          className="surface reveal rounded-lg px-4 py-3"
          style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}
        >
          <dt className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
            {METRIC_LABEL[group.metric][locale]}
          </dt>
          <dd className="mt-2">
            {group.figures.length === 0 ? (
              <span className="text-[13px] text-mist-2">
                {tr ? 'bildirilen rakam yok' : 'no figure reported'}
              </span>
            ) : (
              <>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  {group.distinctValues.map((value) => {
                    const figure = group.figures.find((f) => f.value === value);
                    return (
                      <span
                        key={value}
                        className="tnum font-mono text-[24px] font-medium leading-none text-chalk"
                      >
                        {figure ? figureValue(figure) : value}
                      </span>
                    );
                  })}
                </span>
                <span className="mt-2 block text-[11.5px] leading-snug text-mist-2">
                  {group.figures.length} {tr ? 'kaynak bildirdi' : 'sources reported'} ·{' '}
                  {group.independentGroups} {tr ? 'bağımsız grup' : 'independent groups'}
                </span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** `/figures` sayfasının tam tablosu. */
export function FigureTable({ snapshot, locale }: { snapshot: FiguresSnapshot; locale: Locale }) {
  const tr = locale === 'tr';
  return (
    <div className="space-y-8">
      {snapshot.groups.map((group) => (
        <section key={group.metric}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-edge-soft pb-1.5">
            <h2 className="narrative text-[19px] font-semibold tracking-tight text-chalk">
              {METRIC_LABEL[group.metric][locale]}
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
              {group.figures.length} {tr ? 'kaynak' : 'sources'} · {group.independentGroups}{' '}
              {tr ? 'bağımsız grup' : 'independent groups'}
            </p>
          </div>

          {group.disagreement && (
            <p className="mt-3 border-l-2 border-caution pl-3 text-[12.5px] leading-relaxed text-caution">
              {tr
                ? 'Kaynaklar farklı değer ya da farklı ölçü ifadesi veriyor. Sistem bunları birleştirmez veya ortalamasını almaz; ikisi de aşağıda ayrı ayrı durur.'
                : 'Sources give different values or different measures. The system does not merge or average them; both appear separately below.'}
            </p>
          )}

          {group.figures.length === 0 ? (
            <p className="mt-3 text-[13px] text-mist-2">
              {tr
                ? 'Bu ölçüt için kaynaklarda bildirilen bir rakam yok. Küratörlü listede kayıt yoksa burada sayı gösterilmez — tahmin üretilmez.'
                : 'No figure reported by sources for this metric. If the curated list has no entry, no number is shown here — no estimates are produced.'}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {group.figures.map((figure) => (
                <Measure key={figure.id} figure={figure} locale={locale} />
              ))}
            </ul>
          )}
        </section>
      ))}

      {snapshot.unresolved.length > 0 && (
        <p className="font-mono text-[11px] text-caution">
          ⚠ {snapshot.unresolved.length}{' '}
          {tr
            ? 'küratörlü kayıt feed’deki bir kaynağa bağlanamadı ve gösterilmiyor.'
            : 'curated entries could not be resolved to a source record and are not shown.'}
        </p>
      )}
    </div>
  );
}
