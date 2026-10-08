import type { PlagueEvent } from '@/types';
import { Time } from './Time';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { formatDate } from '@/lib/format';
import { localizedText, localizedTitle } from '@/lib/translate/display';
import { shouldShowSummary } from '@/lib/event-detail';
import { LabelBadge } from './LabelBadge';

/**
 * Manşet — panonun en üstündeki TEK olay.
 *
 * NEDEN: ilk kez gelen okuyucu "şu an ne oluyor" sorusunu bir cümlede görmeli.
 * Seçim kuralı `rankEvents` (çelişki > çoklu kaynak > resmî > tek kaynak >
 * doğrulanmamış), yani manşet "en çok bağımsız kaynak bildiren" gelişmedir.
 *
 * EDİTORYAL SINIR (PLAN.md §10, panik önleme):
 *   - Etiket rozeti manşetin ÜSTÜNDE durur; başlıktan büyük punto ile
 *     sansasyon üretilmez, sakin serif başlık kullanılır.
 *   - Kaynak ve zaman satırı manşetten ayrılmaz.
 *   - Özet, kaynağın kendi metninden gelir (üretken değil, çıkarımsal).
 */
export function LeadStory({ event, locale }: { event: PlagueEvent; locale: Locale }) {
  const t = getDict(locale);
  const title = localizedTitle(locale, event);
  const summary = localizedText(locale, event.summary, event.summaryTr);
  const href = `/${locale}/event/${encodeURIComponent(event.slug)}`;

  return (
    <article className="surface reveal rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <LabelBadge label={event.label} locale={locale} shortOnNarrow />
        <span className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {t.reportedBy(event.independentGroupCount)}
        </span>
      </div>

      <h2 className="narrative mt-3 text-[22px] font-semibold leading-tight tracking-tight text-chalk sm:text-[28px]">
        <a href={href} className="link-underline">
          {title.text}
        </a>
      </h2>

      {title.machine && event.titleOriginal && (
        <p className="mt-2 font-mono text-[11px] text-mist-2">
          {t.readOriginal}: {event.titleOriginal}
        </p>
      )}

      {shouldShowSummary(event, summary.text) && (
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-mist">{summary.text}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-mist-2">
        <span>
          {t.seenBySystem}: <Time iso={event.firstSeenAt} locale={locale} />
        </span>
        {event.groups.slice(0, 4).map((group) => (
          <span key={group}>{GROUP_LABELS[group] ?? group}</span>
        ))}
        <a href={href} className="link-underline ml-auto text-official">
          {t.detail} →
        </a>
      </div>
    </article>
  );
}
