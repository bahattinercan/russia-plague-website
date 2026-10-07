'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { safeExternalUrl } from '@/lib/sources/text';
import { LabelBadge } from './LabelBadge';
import { ContradictionPanel } from './ContradictionPanel';

/**
 * Olay detay modalı.
 *
 * Kapanma yolları (klavye + fare + buton):
 *   1) Esc
 *   2) arka plana tıklama
 *   3) "Kapat ×" butonu
 *
 * Neden native <dialog>? Kartlar `.reveal` (transform) ve `.surface`
 * (backdrop-filter) taşıyor; bu özellikler `position: fixed` için
 * containing block oluşturur ve modal kartın içine hapsolur (ölçüldü:
 * 1102×207 px). `showModal()` top-layer kullanır — ancestor transform'ları
 * onu etkilemez, dolayısıyla arka plan gerçekten tüm viewport'u kaplar.
 * Esc de native olarak çalışır.
 *
 * Dialog viewport'u tam kaplar; "arka plan" = dialogun padding alanı.
 * Kartın içine tıklamak kapatmaz (e.target === dialog kontrolü).
 */

/** data.ts client bundle'a girmesin (pg importu) diye yerel biçimleyici. */
function formatUtc(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(d);
}

function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

export function EventDetail({
  event,
  locale,
}: {
  event: PlagueEvent;
  locale: Locale;
}) {
  const t = getDict(locale);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function close() {
    setOpen(false);
    // Odak tetikleyiciye döner; klavyede gezinen kullanıcı boşluğa düşmez.
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10.5px] uppercase tracking-wider text-official/85 transition-colors hover:text-official"
      >
        {t.detail}
      </button>

      {open && (
        <dialog
          ref={dialogRef}
          onClose={close}
          onClick={(e) => {
            // Arka plana (dialogun kendi padding alanı) tıklama kapatır;
            // kartın içine tıklama kapatmaz.
            if (e.target === dialogRef.current) close();
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
                onClick={close}
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

            {event.summary && (
              <p className="mt-3 text-[14px] leading-relaxed text-mist">{event.summary}</p>
            )}

            <ContradictionPanel event={event} locale={locale} />

            <div className="mt-4 flex flex-wrap gap-1.5">
              {event.groups.map((group) => (
                <span
                  key={group}
                  className="rounded border border-edge-soft bg-abyss/60 px-2 py-0.5 font-mono text-[10px] text-mist/85"
                >
                  {groupLabel(group)}
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
                        {groupLabel(claim.independenceGroup)}
                      </span>
                      <span className="font-mono text-[10px] text-mist/55">
                        {formatUtc(claim.publishedAt)} UTC
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
                {t.publishedAt}: {formatUtc(event.firstSeenAt)} UTC
              </span>
              <span>
                {t.updated}: {formatUtc(event.lastUpdateAt)} UTC
              </span>
            </footer>

            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-mist/50">
              {t.closeHint}
            </p>
          </div>
        </dialog>
      )}
    </>
  );
}
