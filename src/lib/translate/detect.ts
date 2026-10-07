/**
 * Kaynak dil tespiti.
 *
 * Kaynaklarda `lang` alanı çoğu zaman doğru; ama Google News üzerinden gelen
 * öğelerde `unknown` oluyor. Bu yüzden ucuz bir sezgisel katman eklenir.
 *
 * Yanlış "bu zaten Türkçe" kararı çeviriyi tamamen atlatacağı için tespit
 * MUHAFAZAKÂR: yalnızca güçlü Türkçe kanıtı (diakritik) varsa `tr` denir,
 * aksi halde `en` varsayılır.
 */
import { fold } from '@/lib/sources/text';

export type DetectedLang = 'tr' | 'ru' | 'en';

const TURKISH_CHARS = /[çğıöşü]/i;

export function detectSourceLang(text: string): DetectedLang {
  if (/[а-яё]/i.test(text)) return 'ru';
  // Diakritiksiz Türkçe metin (nadir) yanlış tespit edilmesin diye
  // yalnızca Türkçeye özgü harfler kanıt sayılır.
  if (TURKISH_CHARS.test(text)) return 'tr';
  return 'en';
}

/** Kaynak zaten hedef dilde mi? */
export function shouldTranslate(lang: string | null | undefined, text: string): boolean {
  if (!text.trim()) return false;
  if (lang === 'tr') return false;
  if (lang && lang !== 'unknown' && lang !== 'multi') return true;
  return detectSourceLang(text) !== 'tr';
}

/** Sağlayıcıya gönderilecek dil kodu (DeepL açık kod ister, Google auto kabul eder). */
export function resolveSourceLang(lang: string | null | undefined, text: string): string {
  if (lang && lang !== 'unknown' && lang !== 'multi') return lang;
  return detectSourceLang(text);
}

/** Basit Türkçe kanıtı — doğrulama kapısında da kullanılır. */
export function looksTurkish(text: string): boolean {
  if (TURKISH_CHARS.test(text)) return true;
  const folded = ` ${fold(text).replace(/[^a-z0-9]+/g, ' ')} `;
  const markers = [' ve ', ' bir ', ' icin ', ' ile ', ' olarak ', ' olan ', ' bu '];
  return markers.filter((m) => folded.includes(m)).length >= 2;
}
