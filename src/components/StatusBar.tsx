import type { PlagueEvent, SourceHealth } from '@/types';
import type { Locale } from '@/lib/i18n';
import { getDict } from '@/lib/i18n';
import { formatDate, healthSummary } from '@/lib/data';
import { LangSwitch } from './LangSwitch';
import { Counter } from './Counter';
import { TimeAgo } from './TimeAgo';

/**
 * Sabit durum bandı: veri tazeliği ve kaynak sağlığı her zaman görünür.
 * Tazelik iddiası ölçülebilir olmalı — bu yüzden "son tarama" burada.
 */
export function StatusBar({
  locale,
  generatedAt,
  sources,
  events,
  signals,
}: {
  locale: Locale;
  generatedAt: string;
  sources: SourceHealth[];
  events: PlagueEvent[];
  signals: number;
}) {
  const t = getDict(locale);
  const health = healthSummary(sources);
  const allGood = health.failed === 0 && health.stale === 0;

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-void/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <a href={`/${locale}`} className="flex items-center gap-2.5">
          <span
            className={`pulse-dot h-2 w-2 rounded-full ${allGood ? 'bg-signal' : 'bg-caution'}`}
            aria-hidden
          />
          <span className="text-[15px] font-semibold tracking-tight text-chalk">
            {t.siteName}
          </span>
        </a>

        <span className="hidden font-mono text-[10.5px] uppercase tracking-wider text-mist/70 md:inline">
          {t.lastScan}: <TimeAgo iso={generatedAt} locale={locale} className="text-mist" />
        </span>

        <div className="ml-auto flex items-center gap-3">
          <a
            href={`/${locale}/methodology`}
            className="link-underline hidden text-[12.5px] text-mist transition-colors hover:text-chalk sm:inline"
          >
            {t.methodologyHint}
          </a>
          <LangSwitch locale={locale} />
        </div>
      </div>

      <div className="border-t border-edge-soft bg-abyss/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-mist/75 sm:px-6">
          <span>
            {t.events}:{' '}
            <span className="tnum text-chalk">
              <Counter value={events.length} />
            </span>
          </span>
          <span>
            {t.sources}:{' '}
            <span className={`tnum ${allGood ? 'text-signal' : 'text-caution'}`}>
              <Counter value={health.healthy} />
            </span>
            /{health.total} {t.sourcesHealthy}
          </span>
          {health.stale > 0 && <span className="text-caution">{health.stale} {t.stale}</span>}
          {health.failed > 0 && (
            <span className="text-critical">
              {health.failed} {t.failed}
            </span>
          )}
          <span className="hidden sm:inline">
            {t.signals}: <span className="tnum text-chalk">{signals}</span>
          </span>
          <span className="ml-auto hidden lg:inline">
            {t.dataFreshness}: {formatDate(generatedAt, locale)} UTC
          </span>
        </div>
      </div>
    </header>
  );
}
