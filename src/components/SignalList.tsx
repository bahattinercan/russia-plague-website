import type { Article } from '@/types';
import { Time } from './Time';
import { getDict, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { archiveUrlFor, safeExternalUrl } from '@/lib/sources/text';
import { localizedTitle } from '@/lib/translate/display';

/**
 * Doğrulanmamış sinyaller katmanı.
 *
 * Telegram kanalları ve kayıt dışı yayıncılar burada, ana akıştan AYRI ve
 * görsel olarak geri planda gösterilir. Bunlar haber olarak sayılmaz
 * (PLAN.md §5.3).
 *
 * Bu bileşen ARTIK KESME YAPMAZ: verilen listeyi olduğu gibi gösterir.
 * Sayfalama/kesme kararı sayfaya aittir (`/signals` → `?page=`), böylece
 * "+N kayıt" satırı ile sayfa bağlantısı çelişmez.
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
    const visible = items;

    return (
      <div key={title} className="mt-4">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {title} · {items.length}
        </h3>
        <ul className="mt-2 space-y-2">
          {visible.map((s) => {
            const href = safeExternalUrl(s.url);
            const sTitle = localizedTitle(locale, s);
            // §13.2: sinyaller de kayıt — arşiv bağlantısı erişilebilir olmalı.
            const archive = safeExternalUrl(s.archiveUrl ?? archiveUrlFor(s.url));
            return (
              <li
                key={s.id}
                className="border-l-2 border-alarm/30 pl-3 transition-colors hover:border-alarm/70"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-alarm">
                    {locale === 'tr' ? 'doğrulanmamış' : 'unverified'}
                  </span>
                  <span className="text-[12px] font-medium text-chalk">{s.sourceName}</span>
                  <span className="font-mono text-[11px] text-mist-2">
                    <Time iso={s.publishedAt} locale={locale} />
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-snug text-mist">
                  {sTitle.text}
                </p>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="link-underline mt-0.5 inline-block font-mono text-[11px] text-official"
                  >
                    {t.original} ↗
                  </a>
                )}
                {archive && (
                  <a
                    href={archive}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="link-underline ml-2 mt-0.5 inline-block font-mono text-[11px] text-mist-2"
                  >
                    {t.archive} ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <section id="sinyaller" className="reveal surface rounded-xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="narrative text-[19px] font-semibold tracking-tight text-chalk">{t.signals}</h2>
        <p className="max-w-md text-[11.5px] leading-relaxed text-mist">{t.signalsHint}</p>
      </div>

      {renderGroup(locale === 'tr' ? 'Telegram' : 'Telegram', social)}
      {renderGroup(
        locale === 'tr' ? 'Kayıt dışı yayıncılar' : 'Unregistered publishers',
        unregistered,
      )}
    </section>
  );
}
