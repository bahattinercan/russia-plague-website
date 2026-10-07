'use client';

import { useEffect, useRef } from 'react';
import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { safeExternalUrl, fold } from '@/lib/sources/text';
import { formatDate } from '@/lib/format';
import { LabelBadge } from './LabelBadge';
import { ContradictionPanel } from './ContradictionPanel';

/**
 * Olay detay modalı — native <dialog> + showModal() (top-layer).
 *
 * Neden native dialog? Kartlar `.reveal` (transform) ve `.surface`
 * (backdrop-filter) taşıyor; bu özellikler `position: fixed` için
 * containing block oluşturur ve gömülü bir modal viewport'u değil kartı
 * kaplar (ölçüldü: 1102×207 px). Top-layer bundan bağımsız.
 *
 * Kapanma: Esc (native), arka plana tıklama, "Kapat ×".
 * Dialog viewport'u tam kaplar; "arka plan" = dialogun padding alanı.
 * Kartın içine tıklamak kapatmaz (e.target === dialog kontrolü).
 */
export function EventModal({
  event,
  locale,
  onClose,
}: {
  event: PlagueEvent;
  locale: Locale;
  onClose: () => void;
}) {
  const t = getDict(locale);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    closeRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // Dialog kartın içinde; tıklama article'a yukarı doğru yayılır ve
        // modalı tekrar açar. Bunu kesmek şart.
        e.stopPropagation();
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="event-detail-title"
      className="modal-dialog"
    >
      <div className="modal-card surface rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <LabelBadge label={event.label} locale={locale} />
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-mist/75">
            {t.reportedBy(event.independentGroupCount)} · {t.claimCount(event.claims.length)}
          </span>
          <button
            ref={closeRef}
            type="button"
            data-close
            onClick={onClose}
            aria-label={t.close}
            className="ml-auto rounded border border-edge bg-abyss/60 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider text-mist transition-colors hover:border-official/40 hover:text-chalk"
          >
            {t.close} ×
          </button>
        </div>

        <h2 id="event-detail-title" className="mt-3 text-[20px] font-semibold leading-snug text-chalk">
          {event.title}
        </h2>

        {event.titleOriginal && event.titleOriginal !== event.title && (
          <p className="mt-1.5 font-mono text-[10.5px] text-mist/70">
            {t.readOriginal}: {event.titleOriginal}
          </p>
        )}

        {/* Bazı feed'lerin excerpt'i başlığın aynısı (Google News: "başlık - Yayıncı").
           Yineleme göstermek yerine atlıyoruz. */}
        {event.summary && !fold(event.summary).startsWith(fold(event.title)) && (
          <p className="mt-3 text-[14px] leading-relaxed text-mist">{event.summary}</p>
        )}

        <ContradictionPanel event={event} locale={locale} />

        <div className="mt-4 flex flex-wrap gap-1.5">
          {event.groups.map((group) => (
            <span
              key={group}
              className="rounded border border-edge-soft bg-abyss/60 px-2 py-0.5 font-mono text-[10px] text-mist/85"
            >
              {GROUP_LABELS[group] ?? group}
            </span>
          ))}
        </div>

        <ul className="mt-4 space-y-3">
          {event.claims.map((claim) => {
            const href = safeExternalUrl(claim.url);
            return (
              <li key={`${claim.sourceSlug}-${claim.url}`} className="border-l-2 border-edge pl-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-official/80">
                    T{claim.tier}
                  </span>
                  <span className="text-[13px] font-medium text-chalk/95">{claim.sourceName}</span>
                  <span className="font-mono text-[10px] text-mist/70">
                    {GROUP_LABELS[claim.independenceGroup] ?? claim.independenceGroup}
                  </span>
                  <span className="font-mono text-[10px] text-mist/55">
                    {formatDate(claim.publishedAt, locale)} UTC
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-mist">{claim.title}</p>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="link-underline mt-1 inline-block font-mono text-[10px] text-official/80"
                  >
                    {t.original} ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge-soft pt-3 font-mono text-[10.5px] text-mist/70">
          <span>
            {t.publishedAt}: {formatDate(event.firstSeenAt, locale)} UTC
          </span>
          <span>
            {t.updated}: {formatDate(event.lastUpdateAt, locale)} UTC
          </span>
        </footer>

        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-mist/50">
          {t.closeHint}
        </p>
      </div>
    </dialog>
  );
}
