import type { PlagueEvent } from '@/types';
import type { Locale } from '@/lib/i18n';
import { labelDotClass } from './LabelBadge';
import { MachineTranslatedBadge } from './MachineTranslatedBadge';
import { localizedTitle } from '@/lib/translate/display';

/**
 * Akan son gelişmeler şeridi.
 * Fare üzerine gelince durur (okunabilirlik). `prefers-reduced-motion`
 * açıksa animasyon kapanır ve içerik sarılarak statik gösterilir.
 */
export function Ticker({ events, locale }: { events: PlagueEvent[]; locale: Locale }) {
  if (events.length === 0) return null;
  const items = events.slice(0, 12);
  const doubled = [...items, ...items];

  return (
    <div className="ticker-mask border-y border-edge bg-abyss/70">
      <div className="ticker-track py-2.5">
        {doubled.map((event, i) => (
          <span
            key={`${event.id}-${i}`}
            className="flex shrink-0 items-center gap-2.5 text-[13px]"
            aria-hidden={i >= items.length}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${labelDotClass(event.label)}`}
            />
            <span className="whitespace-nowrap text-mist/85">{localizedTitle(locale, event).text}</span>
            {localizedTitle(locale, event).machine && <MachineTranslatedBadge locale={locale} compact />}
            <span className="text-edge">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
