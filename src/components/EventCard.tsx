'use client';

import { useRef, useState } from 'react';
import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { formatDate } from '@/lib/format';
import { fold, safeExternalUrl } from '@/lib/sources/text';
import { LabelBadge } from './LabelBadge';
import { ContradictionPanel } from './ContradictionPanel';
import { EventModal } from './EventModal';
import { TimeAgo } from './TimeAgo';
import { localizedTitle } from '@/lib/translate/display';

/**
 * Zaman çizelgesi kartı.
 *
 * Erişim yolları (hepsi aynı modalı açar):
 *   - kartın herhangi bir yerine tıklamak (fare/dokunma)
 *   - başlık butonu (klavye için gerçek <button>)
 *   - alt bardaki "Detay" butonu
 *
 * Kart içindeki linkler ve butonlar tıklamayı yutar — "kaynakları göster"
 * gibi eylemler modal açmaz.
 */
export function EventCard({
  event,
  locale,
  index,
}: {
  event: PlagueEvent;
  locale: Locale;
  index: number;
}) {
  const t = getDict(locale);
  const title = localizedTitle(locale, event);
  const [open, setOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const titleRef = useRef<HTMLButtonElement>(null);

  function openModal() {
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    titleRef.current?.focus();
  }

  return (
    <article
      className="surface reveal card-lift rounded-xl p-4 sm:p-5"
      style={{ '--reveal-delay': `${index * 60}ms` } as React.CSSProperties}
      onClick={(e) => {
        if ((e.target as Element).closest?.('a, button, dialog')) return;
        openModal();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <LabelBadge label={event.label} locale={locale} />
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-mist/70">
          {t.reportedBy(event.independentGroupCount)} · {t.claimCount(event.claims.length)}
        </span>
      </div>

      <h3 className="mt-2.5 text-[16px] font-semibold leading-snug text-chalk">
        <button
          ref={titleRef}
          type="button"
          onClick={openModal}
          aria-haspopup="dialog"
          className="event-title text-left"
        >
          {title.text}
        </button>
      </h3>

      {title.machine && event.titleOriginal && (
        <p className="mt-1 font-mono text-[10.5px] text-mist/60">
          {t.readOriginal}: {event.titleOriginal}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {event.groups.map((group) => (
          <span
            key={group}
            className="rounded border border-edge-soft bg-abyss/60 px-2 py-0.5 font-mono text-[10px] text-mist/85"
          >
            {GROUP_LABELS[group] ?? group}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-mist/70">
        <span>
          {t.publishedAt}: {formatDate(event.firstSeenAt, locale)} UTC
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-signal" aria-hidden />
          {t.updated}: <TimeAgo iso={event.lastUpdateAt} locale={locale} />
        </span>
        <button
          type="button"
          onClick={openModal}
          aria-haspopup="dialog"
          className="link-underline font-mono text-[10.5px] uppercase tracking-wider text-official/85 transition-colors hover:text-official"
        >
          {t.detail}
        </button>
      </div>

      <ContradictionPanel event={event} locale={locale} />

      {event.articles.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setSourcesOpen((v) => !v)}
            aria-expanded={sourcesOpen}
            className="font-mono text-[10.5px] uppercase tracking-wider text-mist/80 transition-colors hover:text-chalk"
          >
            {sourcesOpen ? t.hideSources : t.showSources(event.articles.length)}
          </button>

          {sourcesOpen && (
            <ul className="mt-2 space-y-2.5">
              {event.articles.map((a) => {
                const href = safeExternalUrl(a.url);
                if (!href) return null;
                const aTitle = localizedTitle(locale, a);
                return (
                  <li key={a.id} className="border-l-2 border-edge pl-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-official/80">
                        T{a.tier}
                      </span>
                      <span className="text-[12.5px] font-medium text-chalk/90">{a.sourceName}</span>
                      <span className="font-mono text-[10px] text-mist/60">
                        {GROUP_LABELS[a.independenceGroup] ?? a.independenceGroup}
                      </span>
                      <span className="font-mono text-[10px] text-mist/50">
                        {formatDate(a.publishedAt, locale)}
                      </span>
                      {a.viaAggregator && (
                        <span className="font-mono text-[10px] text-caution">
                          via {a.viaAggregator}
                        </span>
                      )}
                      {a.sourceStale && (
                        <span className="font-mono text-[10px] text-caution">{t.stale}</span>
                      )}
                    </div>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      title={a.titleOriginal}
                      className="link-underline mt-1 inline-block font-mono text-[10px] text-official/80"
                    >
                      {!aTitle.machine && `${t.readOriginal}: `}
                      {aTitle.machine ? aTitle.text : fold(aTitle.text)}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {open && <EventModal event={event} locale={locale} onClose={closeModal} />}
    </article>
  );
}
