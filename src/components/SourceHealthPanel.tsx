import type { SourceHealth } from '@/types';
import { Time } from './Time';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS, SOURCE_BY_SLUG } from '@/lib/sources/registry';
import { formatDate } from '@/lib/format';

function statusOf(h: SourceHealth): { text: string; className: string } {
  if (!h.ok) return { text: 'HATA', className: 'text-critical' };
  if (h.stale) return { text: 'BAYAT', className: 'text-caution' };
  return { text: 'ok', className: 'text-signal' };
}

/**
 * Kaynak sağlık paneli.
 *
 * Bozuk feed'i GİZLEMEK yerine göstermek güvenin parçasıdır:
 * "şu an şu kaynağı çekemiyoruz" demek, sessizce eksik göstermekten iyidir.
 */
export function SourceHealthPanel({
  sources,
  locale,
}: {
  sources: SourceHealth[];
  locale: Locale;
}) {
  const t = getDict(locale);
  const sorted = [...sources].sort((a, b) => {
    const rank = (h: SourceHealth) => (!h.ok ? 0 : h.stale ? 1 : 2);
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.sourceSlug.localeCompare(b.sourceSlug);
  });

  return (
    <section id="kaynaklar" className="reveal">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="narrative text-[21px] font-semibold tracking-tight text-chalk">
          {t.sourceHealth}
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {sorted.length} {t.sources}
        </p>
      </div>

      <div className="surface mt-4 overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="border-b border-edge font-mono text-[11px] uppercase tracking-wider text-mist-2">
                <th className="px-4 py-2.5 font-normal">{t.sources}</th>
                <th className="px-3 py-2.5 font-normal">{t.tier}</th>
                <th className="px-3 py-2.5 font-normal">{locale === 'tr' ? 'Grup' : 'Group'}</th>
                <th className="px-3 py-2.5 font-normal">{locale === 'tr' ? 'Durum' : 'Status'}</th>
                <th className="px-3 py-2.5 text-right font-normal">
                  {locale === 'tr' ? 'Öğe' : 'Items'}
                </th>
                <th className="px-3 py-2.5 text-right font-normal">ms</th>
                <th className="px-4 py-2.5 font-normal">
                  {locale === 'tr' ? 'En yeni' : 'Newest'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => {
                const def = SOURCE_BY_SLUG.get(h.sourceSlug);
                const status = statusOf(h);
                return (
                  <tr
                    key={h.sourceSlug}
                    className="border-b border-edge-soft/70 transition-colors last:border-0 hover:bg-panel-2/40"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] text-chalk">
                          {def?.name ?? h.sourceSlug}
                        </span>
                        {h.error && (
                          <span
                            title={h.error}
                            className="font-mono text-[11px] text-critical"
                          >
                            ⚠
                          </span>
                        )}
                      </div>
                      {h.stale && (
                        <p className="mt-0.5 text-[11px] text-caution">{t.staleHint}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-official">
                      T{def?.tier ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-mist">
                      {def ? (GROUP_LABELS[def.group] ?? def.group) : '—'}
                    </td>
                    <td className={`px-3 py-2 font-mono text-[11px] uppercase ${status.className}`}>
                      {status.text}
                    </td>
                    <td className="tnum px-3 py-2 text-right font-mono text-[11px] text-mist">
                      {h.itemsFound}
                    </td>
                    <td className="tnum px-3 py-2 text-right font-mono text-[11px] text-mist-2">
                      {h.latencyMs}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-mist">
                      {h.newestItemAt ? <Time iso={h.newestItemAt} locale={locale} /> : t.noDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
