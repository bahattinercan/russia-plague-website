/**
 * Çeviri doğrulama kapıları.
 *
 * Amaç: makine çevirisinin (özellikle üretken LLM'in) editoryal kuralı
 * bozmasını engellemek. Bir kapı düşerse çeviri KULLANILMAZ; UI orijinal
 * başlığı gösterir. Sessizce yanlış çeviri göstermek yasak.
 *
 * Kapılar:
 *   1. Yasaklı kelime (doğrulandı/teyit edildi/…) çıktıda geçemez
 *   2. Belirsizlik (hedging) korunumu
 *   3. Sayı korunumu
 *   4. Özel ad korunumu (WHO, CDC, Rospotrebnadzor…)
 *   5. Uzunluk oranı
 *   6. No-op (çevrilmemiş metin) tespiti
 *   7. Latin dışı sızıntı (EN kaynak → çıktıda Kiril)
 *   8. Türkçe kanıtı / boş çıktı
 */
import { fold } from '@/lib/sources/text';
import {
  CERTAINTY_TARGET,
  FORBIDDEN_OUTPUT,
  HEDGE_SOURCE,
  HEDGE_TARGET,
  PROTECTED_ENTITIES,
  entityInOutput,
  entityInSource,
} from './glossary';
import { looksTurkish } from './detect';

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateTranslation(
  source: string,
  output: string | null | undefined,
  sourceLang: string,
): ValidationResult {
  if (!output || !output.trim()) return { ok: false, reason: 'bos-cikti' };

  const out = fold(output);
  const src = fold(source);

  // 1. Yasaklı kelime
  const forbidden = FORBIDDEN_OUTPUT.find((w) => out.includes(w));
  if (forbidden) return { ok: false, reason: `yasakli-kelime:${forbidden}` };

  // 6. No-op: hiçbir şey değişmemişse çeviri yapılmamış demektir.
  if (src === out) return { ok: false, reason: 'cevrilmemis' };

  // 3. Sayı korunumu
  const numbers = source.match(/\d+/g) ?? [];
  for (const n of numbers) {
    if (!output.includes(n)) return { ok: false, reason: `sayi-kayip:${n}` };
  }

  // 4. Özel ad korunumu (kısaltmalarda büyük/küçük harf ayrımı ve kabul
  //    edilen eşdeğerler için bkz. glossary.ts).
  for (const entity of PROTECTED_ENTITIES) {
    if (entityInSource(source, entity) && !entityInOutput(output, entity)) {
      return { ok: false, reason: `ozel-ad-kayip:${entity}` };
    }
  }

  // 2. Belirsizlik korunumu
  const sourceHedge = HEDGE_SOURCE.some((w) => src.includes(w));
  const outputHedge = HEDGE_TARGET.some((w) => out.includes(w));
  if (sourceHedge && !outputHedge) return { ok: false, reason: 'belirsizlik-kayip' };
  if (!sourceHedge && CERTAINTY_TARGET.some((w) => out.includes(w))) {
    return { ok: false, reason: 'kesinlik-eklendi' };
  }

  // 5. Uzunluk oranı (çok kısa kaynaklarda anlamsız)
  if (source.length >= 12) {
    const ratio = output.length / source.length;
    if (ratio < 0.5 || ratio > 2.0) return { ok: false, reason: `uzunluk-orani:${ratio.toFixed(2)}` };
  }

  // 7. Kiril sızıntısı: EN kaynak çevrilmemiş Rusça'ya dönüşmesin.
  if (sourceLang === 'en' && /[а-яё]/i.test(output)) {
    return { ok: false, reason: 'kiril-sizintisi' };
  }

  // 8. Türkçe kanıtı (kısa/özel-ad ağırlıklı başlıklar muaf)
  if (output.length >= 24 && !looksTurkish(output)) {
    return { ok: false, reason: 'turkce-degil' };
  }

  return { ok: true };
}
