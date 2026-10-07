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

/**
 * Hedef dilde kabul edilen eşdeğerler.
 *
 * Gerçek MT kurum adlarını çevirir: Google "WHO"yu "DSÖ" yapar. Bu hâliyle
 * çeviri "özel ad kayboldu" diye reddediliyordu.
 */
export const ENTITY_ALIASES: Record<string, string[]> = {
  WHO: ['DSÖ', 'Dünya Sağlık Örgütü'],
  CDC: ['ABD Hastalık Kontrol ve Önleme Merkezleri'],
};

/** Kısaltmalar (WHO, CDC…) kaynakta yalnızca BÜYÜK harfli hâliyle sayılır. */
function isAcronym(entity: string): boolean {
  return /^[A-Z]{2,6}$/.test(entity);
}

/**
 * Özel ad kaynakta geçiyor mu?
 *
 * Kısaltmalarda büyük/küçük harf ayrımı şart: İngilizce "who" (ilgi zamiri)
 * aksi hâlde "WHO" ile eşleşip "lab worker who died…" gibi başlıkların
 * çevirisini reddettiriyordu.
 */
export function entityInSource(source: string, entity: string): boolean {
  if (isAcronym(entity)) {
    return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(entity)}([^A-Za-z0-9]|$)`).test(source);
  }
  return wordMatch(source, fold(entity));
}

/** Özel ad (veya kabul edilen eşdeğeri) çıktıda duruyor mu? */
export function entityInOutput(output: string, entity: string): boolean {
  return [entity, ...(ENTITY_ALIASES[entity] ?? [])].some((candidate) =>
    wordMatch(output, fold(candidate)),
  );
}

/**
 * Kelime sınırı eşleşmesi.
 *
 * Tırnak/kesme işareti AYIRICI sayılır (fold onları siler): Türkçe ekler
 * kesme işaretiyle bitişir ("DSÖ'ye", "WHO'ya"). Silinirse "DSÖ'ye" →
 * "dsoye" olur ve "dso" kelimesi bulunamaz.
 */
function wordMatch(text: string, needle: string): boolean {
  const haystack = ` ${fold(text.replace(/[’'`´]/g, ' '))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
  return haystack.includes(` ${needle} `);
}

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
  'onaylandi',
  'kesin',
  // Tek başına "resmen" listede YOK: "formally"nin doğru karşılığıdır
  // ("ABD resmen talep etti"), kesinlik iddiası değildir. Yalnızca
  // "resmen onaylandı" gibi onay bildiren kalıp ihlal sayılır.
  'resmen onaylandi',
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
    if (entityInSource(sourceText, entity)) {
      lines.push(`- "${entity}" aynen korunur (çevrilmez)`);
    }
  }

  return lines.join('\n');
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
