import type { EventLabel } from '@/types';
import { LABEL_SHORT_I18N, LABEL_TEXT_I18N, type Locale } from '@/lib/i18n';

const TONE: Record<string, string> = {
  info: 'text-official border-official/35 bg-official/10',
  ok: 'text-signal border-signal/35 bg-signal/10',
  warn: 'text-caution border-caution/35 bg-caution/10',
  alert: 'text-alarm border-alarm/35 bg-alarm/10',
  danger: 'text-critical border-critical/40 bg-critical/10',
};

const GLYPH: Record<EventLabel, string> = {
  official: '§',
  corroborated: '◆',
  single: '◇',
  unverified: '?',
  contradicted: '⇄',
};

/**
 * Doğruluk etiketi.
 * Sitede "doğrulandı" diye bir etiket YOKTUR ve olmayacaktır.
 *
 * DAR EKRAN KURALI (<640 px), `shortOnNarrow` ile:
 *   Tam metin ("ÇOKLU BAĞIMSIZ KAYNAK BİLDİRİYOR") 390 px'te 242 px yer kaplayıp
 *   yanındaki başlığa 19 px bırakıyordu (ölçüm: docs/arayuz-plani.md §1.1).
 *   Dar ekranda kısa metin (`Çoklu kaynak`) gösterilir; tam metin `title`
 *   niteliğinde kalır. İki metinden yalnızca biri DOM'da görünür olduğu için
 *   yardımcı teknoloji aynı etiketi iki kez okumaz.
 */
export function LabelBadge({
  label,
  locale,
  size = 'md',
  shortOnNarrow = false,
}: {
  label: EventLabel;
  locale: Locale;
  size?: 'sm' | 'md';
  shortOnNarrow?: boolean;
}) {
  const info = LABEL_TEXT_I18N[label];
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      title={info[locale]}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-mono text-[11px] uppercase tracking-wider ${pad} ${TONE[info.tone]}`}
    >
      <span aria-hidden className="text-[11px] leading-none">
        {GLYPH[label]}
      </span>
      {shortOnNarrow ? (
        <>
          <span className="sm:hidden">{LABEL_SHORT_I18N[label][locale]}</span>
          <span className="hidden sm:inline">{info[locale]}</span>
        </>
      ) : (
        info[locale]
      )}
    </span>
  );
}

export function labelDotClass(label: EventLabel): string {
  const tone = LABEL_TEXT_I18N[label].tone;
  return {
    info: 'bg-official',
    ok: 'bg-signal',
    warn: 'bg-caution',
    alert: 'bg-alarm',
    danger: 'bg-critical',
  }[tone];
}
