import { NotFoundBody } from '@/components/NotFoundBody';

/**
 * 404.
 *
 * Gövde ayrı bir istemci bileşeninde: `not-found.tsx` sunucuda `params` almaz
 * ve Next 16'da 404 yanıtının SSR gövdesi boş gelir (ölçümler ve denenen
 * yollar: `src/components/NotFoundBody.tsx` başlığı).
 *
 * Bilinmeyen yollar buraya `[lang]/[...rest]/page.tsx` yakalayıcısıyla gelir;
 * aksi hâlde Next kök `not-found`'a düşer ve `[lang]` layout'u (tipografi,
 * gezinme, alt bilgi) kaybolurdu.
 */
export default function NotFound() {
  return <NotFoundBody />;
}
