/**
 * Görünüm yardımcıları (saf — istemci bileşenleri de kullanır).
 *
 * Kural: `title` daima orijinaldir; `titleTr` doluysa ve dil TR ise
 * çeviri gösterilir ve "makine çevirisi" etiketi açılır. Aksi halde
 * orijinal gösterilir.
 *
 * Bu modül BİLİNÇLİ olarak hiçbir şey import etmez (tip hariç): istemci
 * paketine pg/çeviri sağlayıcı kodu sızmasın.
 */
import type { Locale } from '@/lib/i18n';

export interface LocalizableTitle {
  title: string;
  titleTr?: string | null;
}

export interface LocalizedText {
  text: string;
  machine: boolean;
}

export function localizedTitle(locale: Locale, item: LocalizableTitle): LocalizedText {
  if (locale === 'tr' && typeof item.titleTr === 'string' && item.titleTr.trim()) {
    return { text: item.titleTr, machine: true };
  }
  return { text: item.title, machine: false };
}

export function localizedText(
  locale: Locale,
  original: string,
  translated: string | null | undefined,
): LocalizedText {
  if (locale === 'tr' && typeof translated === 'string' && translated.trim()) {
    return { text: translated, machine: true };
  }
  return { text: original, machine: false };
}
