import type { SourceHealth } from '@/types';
import type { Locale } from '@/lib/i18n';
import { getDict } from '@/lib/i18n';
import { healthSummary } from '@/lib/health';
import { LangSwitch } from './LangSwitch';
import { TimeAgo } from './TimeAgo';
import { TimeZoneToggle } from './TimeZoneToggle';
import { Nav } from './Nav';

/**
 * Sabit durum bandı: veri tazeliği ve kaynak sağlığı her zaman görünür.
 * Tazelik iddiası ölçülebilir olmalı — bu yüzden "son tarama" burada.
 *
 * TEKRAR KURALI (ölçüldü, docs/arayuz-plani.md §1.6): olay/kaynak/sinyal
 * SAYILARI burada gösterilmez — panodaki durum kartlarında var. Üst barda
 * yalnızca panonun göstermediği şey kalır: ani tazelik ve ARIZA/BAYATLIK
 * uyarıları (gizlenmez, yalnızca tekrar edilmez).
 */
export function StatusBar({
  locale,
  generatedAt,
  sources,
}: {
  locale: Locale;
  generatedAt: string;
  sources: SourceHealth[];
}) {
  const t = getDict(locale);
  const health = healthSummary(sources);

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-void/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <a href={`/${locale}`} className="flex items-center gap-2.5">
          <span
            className={`pulse-dot h-2 w-2 rounded-full ${health.failed + health.stale === 0 ? 'bg-signal' : 'bg-caution'}`}
            aria-hidden
          />
          <span className="narrative text-[16px] font-semibold tracking-tight text-chalk">
            {t.siteName}
          </span>
        </a>

        <span className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
          {t.lastScan}: <TimeAgo iso={generatedAt} locale={locale} className="text-mist" />
        </span>

        {health.stale > 0 && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-caution">
            {health.stale} {t.stale}
          </span>
        )}
        {health.failed > 0 && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-critical">
            {health.failed} {t.failed}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <a
            href={`/${locale}/methodology`}
            className="link-underline hidden text-[12.5px] text-mist transition-colors hover:text-chalk sm:inline"
          >
            {t.methodologyHint}
          </a>
          <LangSwitch locale={locale} />
          <TimeZoneToggle locale={locale} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Nav locale={locale} />
      </div>
    </header>
  );
}
