import type { Article } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/data';

const MAX_VISIBLE = 24;

/**
 * Doğrulanmamış sinyaller katmanı.
 *
 * Telegram kanalları ve kayıt dışı yayıncılar burada, ana akıştan AYRI ve
 * görsel olarak geri planda gösterilir. Bunlar haber olarak sayılmaz
 * (PLAN.md §5.3).
 */
export function SignalList({ signals, locale }: { signals: Article[]; locale: Locale }) {
  const t = getDict(locale);
  if (signals.length === 0) return null;

  const social = signals.filter((s) => s.independenceGroup === 'social-signal');
  const unregistered = signals.filter(
    (s) => s.independenceGroup === 'unrecognized-publisher',
  );

  const renderGroup = (title: string, items: Article[]) => {
    if (items.length === 0) return null;
    const visible = items.slice(0, MAX_VISIBLE);

    return (
      <div key={title} className="mt-4">
        <h3 className="font-mono text-[10.5px] uppercase tracking-wider text-mist/70">
          {title} · {items.length}
        </h3>
        <ul className="mt-2 space-y-2">
          {visible.map((s) => (
            <li
              key={s.id}
              className="border-l-2 border-alarm/30 pl-3 transition-colors hover:border-alarm/70"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-alarm/80">
                  {locale === 'tr' ? 'doğrulanmamış' : 'unverified'}
                </span>
                <span className="text-[12px] font-medium text-chalk/85">{s.sourceName}</span>
                <span className="font-mono text-[10px] text-mist/60">
                  {formatDate(s.publishedAt, locale)}
                </span>
              </div>
              <p className="mt-0.5 text-[12.5px] leading-snug text-mist">{s.title}</p>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="link-underline mt-0.5 inline-block font-mono text-[10px] text-official/70"
              >
                {t.original} ↗
              </a>
            </li>
          ))}
        </ul>
        {items.length > visible.length && (
          <p className="mt-2 font-mono text-[10.5px] text-mist/60">
            +{items.length - visible.length} {locale === 'tr' ? 'kayıt' : 'more'}
          </p>
        )}
      </div>
    );
  };

  return (
    <section id="sinyaller" className="reveal surface rounded-xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold tracking-tight text-chalk">{t.signals}</h2>
        <p className="max-w-md text-[11.5px] leading-relaxed text-mist/75">{t.signalsHint}</p>
      </div>

      {renderGroup(locale === 'tr' ? 'Telegram' : 'Telegram', social)}
      {renderGroup(
        locale === 'tr' ? 'Kayıt dışı yayıncılar' : 'Unregistered publishers',
        unregistered,
      )}
    </section>
  );
}
