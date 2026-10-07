import type { EventLabel, SourceDef, SourceIdentity, Tier } from '@/types';

/**
 * Güven skoru ve etiket mantığı.
 *
 * ÖNEMLİ: Bu modülde "verified"/"doğrulandı" kavramı YOKTUR ve olmayacaktır.
 * Sistem doğrulama yapmaz; kaynak durumunu raporlar. En yüksek seviye
 * `corroborated` = "çoklu bağımsız kaynak bildiriyor".
 */

/** Etiket önceliği: küçük sayı = daha güçlü iddia. */
const LABEL_PRIORITY: Record<EventLabel, number> = {
  contradicted: 0, // çelişki her şeyin üstünde: kullanıcı bilmeli
  corroborated: 1,
  official: 2,
  single: 3,
  unverified: 4,
};

export function labelPriority(label: EventLabel): number {
  return LABEL_PRIORITY[label];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Kaynak güven puanı.
 *
 * trust = taban + çoklu bağımsız teyit bonusu + devlet kontrolü cezası
 *
 * Bu puan UI'da RAKAM olarak gösterilmez (yanlış kesinlik hissi vermemek için);
 * metodoloji sayfasında formülüyle açıklanır.
 */
export function trustScore(source: SourceDef, independentGroupCount: number): number {
  const corroborationBonus = Math.min(Math.max(independentGroupCount - 1, 0), 4) * 6;
  const penalty = source.stateControlPenalty ?? 0;
  return clamp(Math.round(source.trustBase + corroborationBonus + penalty), 0, 100);
}

/**
 * Yalnızca GERÇEK resmi kurumlar `official` etiketi alır.
 * CIDRAP, ProMED, ReliefWeb birer araştırma/toplama kuruluşudur — resmi
 * makam değildir; tek başlarına `single` kalırlar.
 */
const OFFICIAL_GROUPS = new Set(['who-family', 'us-cdc', 'eu-ecdc', 'ru-gov']);

export function isOfficialGroup(group: string): boolean {
  return OFFICIAL_GROUPS.has(group);
}

/**
 * Olay etiketini hesaplar.
 *
 * Sıra: çelişki > çoklu bağımsız kaynak > resmi açıklama > tek kaynak > doğrulanmamış.
 *
 * `official` yalnızca gerçek resmi kurumlara verilir (WHO/CDC/ECDC/ru-gov).
 * Devlet MEDYASI (kremlin grubu) resmi kaynak sayılmaz → `single`.
 */
export function computeEventLabel(args: {
  groups: string[];
  sources: SourceIdentity[];
  hasContradiction: boolean;
}): EventLabel {
  const { groups, sources, hasContradiction } = args;

  if (hasContradiction) return 'contradicted';
  if (groups.length >= 2) return 'corroborated';

  const only = sources[0];
  if (!only) return 'unverified';

  if (only.tier === 5) return 'unverified';
  if (isOfficialGroup(only.group)) return 'official';
  return 'single';
}

/** Etiketlerin TR/EN görünen adları — sitede "doğrulandı" ifadesi geçmez. */
export const LABEL_TEXT: Record<EventLabel, { tr: string; en: string; tone: string }> = {
  official: { tr: 'Resmî açıklama', en: 'Official statement', tone: 'info' },
  corroborated: {
    tr: 'Çoklu bağımsız kaynak bildiriyor',
    en: 'Reported by multiple independent sources',
    tone: 'ok',
  },
  single: { tr: 'Tek kaynak bildiriyor', en: 'Reported by a single source', tone: 'warn' },
  unverified: { tr: 'Doğrulanmamış iddia', en: 'Unverified claim', tone: 'alert' },
  contradicted: { tr: 'Çelişkili bilgi', en: 'Conflicting reports', tone: 'danger' },
};

/** Sitede yasaklı ifadeler — otomatik test bunları arar. */
export const FORBIDDEN_VERIFICATION_PHRASES = [
  'doğrulandı',
  'doğrulanmış haber',
  'teyit edildi',
  'confirmed',
  'verified',
] as const;

export function tierWeight(tier: Tier): number {
  return { 1: 100, 2: 85, 3: 65, 4: 70, 5: 30 }[tier];
}
