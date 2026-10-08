'use client';

import { useState } from 'react';
import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { LabelBadge } from './LabelBadge';
import { EventModal } from './EventModal';
import { localizedTitle } from '@/lib/translate/display';

/**
 * "Şu an ne biliyoruz?" listesi — satıra tıklamak olay detayını açar.
 * Zaman çizelgesiyle aynı modalı kullanır.
 */
export function TopEventList({
  events,
  locale,
}: {
  events: PlagueEvent[];
  locale: Locale;
}) {
  const t = getDict(locale);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="mt-4 space-y-2">
      {events.map((event, i) => (
        <li
          key={event.id}
          data-event-id={event.id}
          data-summary-row
          className="surface reveal card-lift flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-lg px-4 py-3"
          style={{ '--reveal-delay': `${i * 45}ms` } as React.CSSProperties}
          onClick={(e) => {
            if ((e.target as Element).closest?.('a, button, dialog')) return;
            setOpenId(event.id);
          }}
        >
          {/* Dar ekranda rozet + grup sayısı tek satırda, başlık TAM genişlik alır.
              Ölçüm (önce): rozet 242 px · başlığa kalan 19 px, satır 338 px —
              docs/arayuz-plani.md §1.1 */}
          <span className="flex w-full items-center justify-between gap-3">
            <LabelBadge label={event.label} locale={locale} size="sm" shortOnNarrow />
            <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-mist-2">
              {t.groupCount(event.independentGroupCount)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOpenId(event.id)}
            aria-haspopup="dialog"
            className="event-title narrative min-w-0 flex-1 text-left text-[15px] leading-snug text-chalk"
          >
            {localizedTitle(locale, event).text}
          </button>

          {openId === event.id && (
            <EventModal event={event} locale={locale} onClose={() => setOpenId(null)} />
          )}
        </li>
      ))}
    </ul>
  );
}
