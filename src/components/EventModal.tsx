'use client';

import { Time } from './Time';

import { useEffect, useRef } from 'react';
import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { formatDate } from '@/lib/format';
import { shouldShowSummary } from '@/lib/event-detail';
import { ClaimList } from './ClaimList';
import { LabelBadge } from './LabelBadge';
import { ContradictionPanel } from './ContradictionPanel';
import { MachineTranslatedBadge } from './MachineTranslatedBadge';
import { localizedText, localizedTitle } from '@/lib/translate/display';

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
  const title = localizedTitle(locale, event);
  const summary = localizedText(locale, event.summary, event.summaryTr);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /*
   * İddia satırları `ClaimList` bileşeninde hazırlanır (kaynağın KENDİ 1-2
   * cümlelik özeti, başlık kopyası ayıklaması, arşiv bağlantısı). Aynı bileşen
   * `/event/<slug>` kalıcı sayfasında da kullanılır: tek davranış, iki görünüm.
   */

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
          <span className="font-mono text-[11px] uppercase tracking-wider text-mist">
            {t.reportedBy(event.independentGroupCount)} · {t.claimCount(event.claims.length)}
          </span>
          <button
            ref={closeRef}
            type="button"
            data-close
            onClick={onClose}
            aria-label={t.close}
            className="ml-auto rounded border border-edge bg-abyss/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-mist transition-colors hover:border-official/40 hover:text-chalk"
          >
            {t.close} ×
          </button>
        </div>

        <h2 id="event-detail-title" className="narrative mt-3 text-[20px] font-semibold leading-snug text-chalk sm:text-[22px]">
          {title.text}
        </h2>

        {/*
         * Çeviri beyanı TEK yerde: modalın başlığı altında.
         * Liste/kart görünümünde tekrar eden rozet kaldırıldı (aynı etiket bir
         * sayfada 100+ kez çıkıp asıl sinyali bastırıyordu); rozeti kaldırınca
         * listede kalan "Orijinali oku" satırı orijinal başlığı göstermeye
         * devam ediyor.
         */}
        {title.machine && (
          <p className="mt-1.5 font-mono text-[11px] text-mist-2">
            <MachineTranslatedBadge locale={locale} />
            {event.titleOriginal && <> · {t.readOriginal}: {event.titleOriginal}</>}
          </p>
        )}

        {/* Bazı feed'lerin excerpt'i başlığın aynısı (Google News: "başlık - Yayıncı").
           Yineleme göstermek yerine atlıyoruz. */}
        {shouldShowSummary(event, summary.text) && (
          <p className="mt-3 text-[14px] leading-relaxed text-mist">
            {summary.text}
          </p>
        )}

        <ContradictionPanel event={event} locale={locale} />

        <div className="mt-4 flex flex-wrap gap-1.5">
          {event.groups.map((group) => (
            <span
              key={group}
              className="rounded border border-edge-soft bg-abyss/60 px-2 py-0.5 font-mono text-[11px] text-mist"
            >
              {GROUP_LABELS[group] ?? group}
            </span>
          ))}
        </div>

        <ClaimList event={event} locale={locale} />

        <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge-soft pt-3 font-mono text-[11px] text-mist-2">
          <span>
            {t.seenBySystem}: <Time iso={event.firstSeenAt} locale={locale} />
          </span>
          <span>
            {t.updated}: <Time iso={event.lastUpdateAt} locale={locale} />
          </span>
          {/* Kalıcı bağlantı: modal kapanınca olay kaybolmasın (F3). */}
          <a
            href={`/${locale}/event/${encodeURIComponent(event.slug)}`}
            className="link-underline text-official"
          >
            {t.permalink} →
          </a>
        </footer>

        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {t.closeHint}
        </p>
      </div>
    </dialog>
  );
}
