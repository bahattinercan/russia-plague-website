/**
 * Metin normalizasyonu: em dash (—) temizliği.
 *
 * Neden: tipografik em dash (—) sitede "yapay zekâ yazmış" izlenimi veren
 * tek karakterdi; kaynak metinlerinden ve kendi kopyamızdan kaldırıldı.
 *
 * Üç yerde birden kullanılır, çünkü em dash üç ayrı yoldan girebiliyor:
 *  1. ingest (`sources/text.ts`): kaynağın HTML/RSS metni → feed'e hiç girmez.
 *  2. görünüm (`data.ts`): Postgres'te zaten duran eski kayıtlar da temiz görünür.
 *  3. küratörlü kayıtlar (`figures.ts`): cümle eşleştirmesi iki taraf da
 *     aynı fonksiyondan geçtiği için bozulmaz.
 *
 * Saf fonksiyon; istemci paketine sızacak bağımlılığı yoktur.
 */
export function stripEmDashes(input: string): string {
  if (!input.includes('—')) return input;
  return input.replace(/\s*—\s*/g, ' - ').replace(/\s+/g, ' ').trim();
}
