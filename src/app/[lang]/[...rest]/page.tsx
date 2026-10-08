import { notFound } from 'next/navigation';

/**
 * Bilinmeyen yollar için yakalayıcı.
 *
 * NEDEN GEREKLİ: dil öneki olmayan her adres `proxy.ts` tarafından `/tr…` veya
 * `/en…` altına yönlendirilir. Ama `/tr/boyle-bir-sayfa-yok` hiçbir rotayla
 * eşleşmezse Next KÖK `not-found`'a düşer — o dosya `[lang]` layout'unu
 * kullanmadığı için stilsiz, varsayılan hata ekranı çıkıyordu (ölçüldü).
 * Bu yakalayıcı eşleşmeyen yolları `[lang]` ağacının içine çeker, böylece
 * `[lang]/not-found.tsx` (dil duyarlı, stilli) gösterilir.
 *
 * Statik segmentler her zaman bu dosyadan önce gelir: `/tr/timeline`,
 * `/tr/figures` vb. buraya düşmez.
 */
export default function CatchAll(): never {
  notFound();
}
