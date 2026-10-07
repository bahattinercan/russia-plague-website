/**
 * Çeviri sözlüğü ve editoryal kısıtlar.
 *
 * Genel makine çevirisi "plague" kelimesini bağlama göre "bela / salgın"
 * diye çevirebiliyor. Bu sözlük hem LLM prompt'una enjekte edilir hem de
 * doğrulama kapılarında (validate.ts) referans olur.
 *
 * Editoryal kural: çeviri "doğrulandı / teyit edildi / confirmed" anlamı
 * KATAMAZ. Kaynak "suspected" diyorsa çıktı "şüpheli" demelidir.
 */
import { fold } from '@/lib/sources/text';

export interface TermPair {
  source: string;
  target: string;
}

/** İngilizce → Türkçe kilitli terimler. */
export const GLOSSARY_EN: TermPair[] = [
  { source: 'plague', target: 'veba' },
  { source: 'bubonic plague', target: 'hıyarcıklı veba' },
  { source: 'pneumonic plague', target: 'pnömonik (akciğer) veba' },
  { source: 'outbreak', target: 'salgın' },
  { source: 'laboratory worker', target: 'laboratuvar çalışanı' },
  { source: 'lab worker', target: 'laboratuvar çalışanı' },
  { source: 'laboratory technician', target: 'laborant' },
  { source: 'quarantine', target: 'karantina' },
  { source: 'suspected', target: 'şüpheli' },
  { source: 'possibly', target: 'muhtemelen' },
  { source: 'reportedly', target: 'bildirildiğine göre' },
  { source: 'allegedly', target: 'iddiaya göre' },
  { source: 'case', target: 'vaka' },
  { source: 'death toll', target: 'ölü sayısı' },
  { source: 'died of plague', target: 'vebadan hayatını kaybetti' },
  { source: 'travel warning', target: 'seyahat uyarısı' },
  { source: 'monitoring', target: 'izliyor' },
];

/** Rusça → Türkçe kilitli terimler (meduza/tass/telegram kaynakları). */
export const GLOSSARY_RU: TermPair[] = [
  { source: 'чума', target: 'veba' },
  { source: 'бубонная чума', target: 'hıyarcıklı veba' },
  { source: 'лёгочная чума', target: 'pnömonik veba' },
  { source: 'вспышка', target: 'salgın' },
  { source: 'карантин', target: 'karantina' },
  { source: 'случай', target: 'vaka' },
  { source: 'лаборатория', target: 'laboratuvar' },
  { source: 'смерть', target: 'ölüm' },
  { source: 'подозрение', target: 'şüphe' },
];

/**
 * Korunacak özel adlar — kaynakta geçiyorsa çıktıda da AYNEN bulunmalı.
 *
 * Kısa/yanıltıcı olanlar (RT, RIA) listede yok: "short" içindeki "rt"
 * gibi eşleşmeler yanlış pozitif üretirdi. Eşleşme kelime sınırıyla yapılır.
 */
export const PROTECTED_ENTITIES = [
  'WHO',
  'CDC',
  'ECDC',
  'Rospotrebnadzor',
  'ProMED',
  'CIDRAP',
  'Meduza',
  'Sputnik',
  'Reuters',
  'TASS',
  'Yersinia pestis',
];

/** Çıktıda ASLA geçmemesi gereken ifadeler (fold edilmiş). */
export const FORBIDDEN_OUTPUT = [
  'dogrulandi',
  'teyit edildi',
  'kesinlesti',
  'resmen onaylandi',
  'confirmed',
  'verified',
];

/** Kaynakta bu ifadeler varsa çıktı da bir belirsizlik ifadesi içermeli. */
export const HEDGE_SOURCE = [
  'suspected',
  'suspicion',
  'possible',
  'possibly',
  'reportedly',
  'allegedly',
  'likely',
  'unconfirmed',
  'may have',
  'fears',
  'claims',
  'claimed',
  'podozrenie',
  'подозрение',
];

/** Belirsizlik işaretleri (fold edilmiş hali). */
export const HEDGE_TARGET = [
  'supheli',
  'suphe',
  'olasi',
  'olabilecegi',
  'bildirildi',
  'iddia',
  'muhtemel',
  'dogrulanmamis',
  'korku',
  'kaygi',
  'saniyor',
  'olabilir',
];

/** Kaynak belirsizken çıktıda geçerse editoryal ihlal sayılan kesinlik ifadeleri. */
export const CERTAINTY_TARGET = [
  'dogrulandi',
  'dogruladi',
  'teyit edildi',
  'teyit etti',
  'onayladi',
  'kesin',
  'resmen',
];

/**
 * LLM prompt'u için sözlük satırları. Yalnızca kaynakta geçen terimler
 * gönderilir (prompt'u şişirmemek için).
 */
export function glossaryInstructions(sourceText: string): string {
  const folded = fold(sourceText);
  const lines: string[] = [];

  for (const pair of [...GLOSSARY_EN, ...GLOSSARY_RU]) {
    if (folded.includes(fold(pair.source))) {
      lines.push(`- "${pair.source}" → "${pair.target}"`);
    }
  }
  for (const entity of PROTECTED_ENTITIES) {
    if (new RegExp(`(^|[^a-z0-9])${escapeRegExp(fold(entity))}([^a-z0-9]|$)`).test(folded)) {
      lines.push(`- "${entity}" aynen korunur (çevrilmez)`);
    }
  }

  return lines.join('\n');
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
