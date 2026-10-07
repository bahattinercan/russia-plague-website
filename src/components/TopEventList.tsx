'use client';

import { useState } from 'react';
import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { LabelBadge } from './LabelBadge';
import { EventModal } from './EventModal';

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
          className="surface reveal card-lift flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg px-4 py-3"
          style={{ '--reveal-delay': `${i * 45}ms` } as React.CSSProperties}
          onClick={(e) => {
            if ((e.target as Element).closest?.('a, button, dialog')) return;
            setOpenId(event.id);
          }}
        >
          <LabelBadge label={event.label} locale={locale} size="sm" />
          <button
            type="button"
            onClick={() => setOpenId(event.id)}
            aria-haspopup="dialog"
            className="event-title min-w-0 flex-1 text-left text-[13.5px] leading-snug text-chalk/95"
          >
            {event.title}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-mist/70">
            {t.groupCount(event.independentGroupCount)}
          </span>

          {openId === event.id && (
            <EventModal event={event} locale={locale} onClose={() => setOpenId(null)} />
          )}
        </li>
      ))}
    </ul>
  );
}
