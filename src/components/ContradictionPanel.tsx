import type { PlagueEvent } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { LabelBadge } from './LabelBadge';
import { localizedText } from '@/lib/translate/display';

/**
 * Çelişki paneli: resmî açıklama ile bağımsız bildirim karşı karşıya.
 * Bu panel elle yazılmaz; pipeline'daki çelişki tespitinden üretilir.
 * Deneysel olduğu için kullanıcıya bu açıkça söylenir.
 */
export function ContradictionPanel({
  event,
  locale,
}: {
  event: PlagueEvent;
  locale: Locale;
}) {
  const t = getDict(locale);
  if (!event.contradiction.hasContradiction) return null;

  const [a, b] = event.contradiction.sides;

  return (
    <div className="mt-4 rounded-lg border border-critical/35 bg-critical/5 p-3.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-critical">
          ⇄
        </span>
        <h4 className="font-mono text-[11px] uppercase tracking-wider text-critical">
          {t.conflictingReports}
        </h4>
        <LabelBadge label="contradicted" locale={locale} size="sm" />
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {[a, b].filter(Boolean).map((side, i) => (
          <div key={`${side.group}-${i}`} className="surface-soft rounded-md p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-mist">
              {side.group}
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-chalk/90">
              “{localizedText(locale, side.statement, side.statementTr).text}”
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-mist/70">{side.sourceSlug}</p>
          </div>
        ))}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-mist/70">
        {locale === 'tr'
          ? 'Bu karşılaştırma deneyseldir ve iddia düzeyinde kalibre edilmektedir. Bir taraf diğerini yalanlamıyor olabilir; kaynak bağlantılarına bakın.'
          : 'This comparison is experimental and being calibrated at the claim level. One side may not be refuting the other; check the source links.'}
      </p>
    </div>
  );
}
