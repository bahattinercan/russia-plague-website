'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

/**
 * "Son ziyaretimden beri yeni" işaretleri.
 *
 * NASIL ÇALIŞIR
 *   1. Sayfa sunucuda işaretsiz gelir (JS'siz site normal çalışır).
 *   2. Bağlandıktan sonra `localStorage['pt.lastVisit']` okunur, olaylarla
 *      karşılaştırılır ve eşleşen kartlara `data-fresh` niteliği konur.
 *   3. Ziyaret zamanı güncellenir.
 *
 * GİZLİLİK: çerez yok, sunucuya hiçbir şey gönderilmez, profil tutulmaz.
 * Yalnızca tarayıcının kendi deposunda tek bir zaman damgası durur.
 *
 * YERLEŞİM: işaret, CSS'te inset box-shadow ile çizilir (globals.css) —
 * yeni düğüm eklenmez, kaydırma olmaz. Özet satırı için yer önceden ayrılır.
 */

export interface FreshEvent {
  id: string;
  firstSeenAt: string;
  lastUpdateAt: string;
}

const KEY = 'pt.lastVisit';

function mark(fresh: Map<string, 'new' | 'updated'>): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-event-id]')) {
    el.removeAttribute('data-fresh');
    const state = fresh.get(el.dataset.eventId ?? '');
    if (state) el.setAttribute('data-fresh', state);
  }
}

export function NewSinceLastVisit({
  events,
  locale,
  className = '',
}: {
  events: FreshEvent[];
  locale: Locale;
  className?: string;
}) {
  const tr = locale === 'tr';
  const [summary, setSummary] = useState<{ isNew: number; updated: number } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let last: number | null = null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = Date.parse(raw);
        if (!Number.isNaN(parsed)) last = parsed;
      }
    } catch {
      /* depo kapalı (gizli sekme vb.) → işaret gösterilmez, site çalışır */
    }

    if (last === null) {
      setSummary(null);
      mark(new Map());
      try {
        window.localStorage.setItem(KEY, new Date().toISOString());
      } catch {
        /* yok sayılır */
      }
      return;
    }

    const fresh = new Map<string, 'new' | 'updated'>();
    let isNew = 0;
    let updated = 0;
    for (const event of events) {
      const seen = Date.parse(event.firstSeenAt);
      const changed = Date.parse(event.lastUpdateAt);
      if (!Number.isNaN(seen) && seen > last) {
        fresh.set(event.id, 'new');
        isNew++;
      } else if (!Number.isNaN(changed) && changed > last) {
        fresh.set(event.id, 'updated');
        updated++;
      }
    }

    mark(fresh);
    setSummary({ isNew, updated });
    try {
      window.localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* yok sayılır */
    }
    // `pathname`: istemci tarafı gezinmede yeni sunucu HTML'i geldiğinde
    // işaretler yeniden uygulanmalı (bileşen ayakta kalır, effect tekrar koşmaz).
  }, [events, pathname]);

  function clear(): void {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* yok sayılır */
    }
    mark(new Map());
    setSummary({ isNew: 0, updated: 0 });
  }

  return (
    <p
      className={`flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-mist-2 ${className}`}
      aria-live="polite"
    >
      {summary && (summary.isNew > 0 || summary.updated > 0) ? (
        <>
          {summary.isNew > 0 && (
            <span className="text-signal">
              ◗ {summary.isNew} {tr ? 'yeni' : 'new'}
            </span>
          )}
          {summary.updated > 0 && (
            <span className="text-official">
              ◗ {summary.updated} {tr ? 'güncellendi' : 'updated'}
            </span>
          )}
          <span>{tr ? 'son ziyaretinizden beri' : 'since your last visit'}</span>
          <button
            type="button"
            onClick={clear}
            className="link-underline text-mist-2 hover:text-chalk"
          >
            {tr ? 'işaretleri temizle' : 'clear markers'}
          </button>
        </>
      ) : summary ? (
        <span>{tr ? 'son ziyaretinizden beri yeni gelişme yok' : 'no new developments since your last visit'}</span>
      ) : (
        /* İlk ziyaret (veya depo kapalı): işaret yok, yalnızca açıklama. */
        <span>{tr ? 'son ziyaretinizden beri yeni gelişmeler burada işaretlenir' : 'developments since your last visit are marked here'}</span>
      )}
    </p>
  );
}
