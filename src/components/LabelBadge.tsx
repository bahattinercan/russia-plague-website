import type { EventLabel } from '@/types';
import { LABEL_TEXT_I18N, type Locale } from '@/lib/i18n';

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
 */
export function LabelBadge({
  label,
  locale,
  size = 'md',
}: {
  label: EventLabel;
  locale: Locale;
  size?: 'sm' | 'md';
}) {
  const info = LABEL_TEXT_I18N[label];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[10.5px]';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider ${pad} ${TONE[info.tone]}`}
    >
      <span aria-hidden className="text-[11px] leading-none">
        {GLYPH[label]}
      </span>
      {info[locale]}
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
