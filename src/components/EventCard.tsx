import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { formatDate } from '@/lib/data';
import { fold, safeExternalUrl } from '@/lib/sources/text';
import { LabelBadge } from './LabelBadge';
import { ContradictionPanel } from './ContradictionPanel';
import { TimeAgo } from './TimeAgo';

function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

function normText(input: string): string {
  return fold(input)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Google News özetleri çoğu zaman "Başlık Yayıncı" biçimindedir.
 * Başlığı tekrarlayan özeti göstermek gürültüdür — gizlenir.
 */
function isRedundantSummary(summary: string, title: string): boolean {
  const s = normText(summary);
  const t = normText(title);
  if (!s || !t) return true;
  if (s === t) return true;
  return s.startsWith(t) || t.startsWith(s);
}

/**
 * Olay kartı.
 *
 * Her kartta: kaynak adı, katman, bağımsızlık grubu, yayın zamanı,
 * orijinal bağlantı ve arşiv bağlantısı bulunur (PLAN.md §13 kabul kriteri 2).
 */
export function EventCard({
  event,
  locale,
  index = 0,
}: {
  event: PlagueEvent;
  locale: Locale;
  index?: number;
}) {
  const t = getDict(locale);

  return (
    <article
      className="surface card-lift reveal rounded-xl p-5"
      style={{ '--reveal-delay': `${Math.min(index, 8) * 55}ms` } as React.CSSProperties}
    >
      <header className="flex flex-wrap items-center gap-2">
        <LabelBadge label={event.label} locale={locale} />
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-mist/75">
          {t.groupCount(event.independentGroupCount)} · {t.claimCount(event.claims.length)}
        </span>
        {event.groups.some((g) => g === 'kremlin') && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-caution/80">
            {locale === 'tr' ? 'devlet medyası dahil' : 'state media included'}
          </span>
        )}
      </header>

      <h3 className="mt-3 text-[17px] font-semibold leading-snug text-chalk">
        {event.title}
      </h3>

      {event.summary && !isRedundantSummary(event.summary, event.title) && (
        <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-mist">
          {event.summary}
        </p>
      )}

      <ContradictionPanel event={event} locale={locale} />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {event.groups.slice(0, 5).map((group) => (
          <span
            key={group}
            className="rounded border border-edge-soft bg-abyss/60 px-2 py-0.5 font-mono text-[10px] text-mist/85"
          >
            {groupLabel(group)}
          </span>
        ))}
        {event.groups.length > 5 && (
          <span className="px-2 py-0.5 font-mono text-[10px] text-mist/60">
            +{event.groups.length - 5}
          </span>
        )}
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-mist/70">
        <span>
          {t.publishedAt}: {formatDate(event.firstSeenAt, locale)} UTC
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-signal" aria-hidden />
          {t.updated}: <TimeAgo iso={event.lastUpdateAt} locale={locale} />
        </span>
      </footer>

      <details className="group mt-3 border-t border-edge-soft pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-official/90 transition-colors hover:text-official">
          <span
            aria-hidden
            className="inline-block transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          <span className="group-open:hidden">{t.showSources(event.claims.length)}</span>
          <span className="hidden group-open:inline">{t.hideSources}</span>
        </summary>

        <ul className="mt-3 space-y-2.5">
          {event.claims.map((claim) => {
            const href = safeExternalUrl(claim.url);
            return (
              <li
                key={`${claim.sourceSlug}-${claim.url}`}
                className="border-l-2 border-edge pl-3"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-official/80">
                    T{claim.tier}
                  </span>
                  <span className="text-[12.5px] font-medium text-chalk/95">
                    {claim.sourceName}
                  </span>
                  <span className="font-mono text-[10px] text-mist/70">
                    {groupLabel(claim.independenceGroup)}
                  </span>
                  <span className="font-mono text-[10px] text-mist/55">
                    {formatDate(claim.publishedAt, locale)}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-mist">{claim.title}</p>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="link-underline mt-0.5 inline-block font-mono text-[10px] text-official/80"
                  >
                    {t.original} ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </article>
  );
}
