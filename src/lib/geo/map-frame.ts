/**
 * Harita çerçeveleri — TEK KAYNAK.
 *
 * Neden ayrı modül: aynı sayıları hem SVG varlıklarını üreten script
 * (`scripts/build-world-map.ts`) hem de işaretçileri yüzde konumlandıran
 * bileşen (`src/components/WorldMap.tsx`) kullanıyor. İki yerde ayrı yazılsa
 * işaretçiler haritadan kayardı — sessizce, hata vermeden.
 *
 * İzdüşüm: equirectangular (eşdikdörtgen). `MAP_PROJECTION` TAM dünyadır
 * (90°K → 90°G); çerçeveler bu izdüşümden kırpılan pencerelerdir.
 */

export interface MapFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MAP_PROJECTION = { width: 960, height: 480 } as const;

/**
 * DÜNYA çerçevesi (≥ 640 px) — 84°K → 56°G.
 *
 * Kırpma gerekçesi (ölçüm, `.shots/map-desktop.png`): tam dünya 2:1 olduğu için
 * 1088 px genişlikte 544 px yükseklik üretiyordu ve kutunun ~%30'u kutup
 * denizine gidiyordu. Bu çerçeve hiçbir KARA parçasını atmaz: en kuzey kara
 * 84°K (Grönland), en güney 56°G (Horn Burnu). Antarktika zaten varlığa konmaz.
 */
export const MAP_FRAME: MapFrame = { x: 0, y: 16, width: 960, height: 373.333 };

/**
 * ODAK çerçevesi (< 640 px) — 5°D → 180°D.
 *
 * Neden gerekli (ölçüldü): mobilde kap genişliği 358 px. Dünya çerçevesinde
 * ölçek 0.373 olduğu için Sibirya ile İrkutsk işaretçileri 13 px aralığa
 * düşüyordu; 26 px'lik rozetler üst üste biniyordu. Odak çerçevesi aynı
 * aralığı ~42 px'e çıkarır ve zaten tüm olaylar Rusya'da olduğu için
 * dünyanın Atlas Okyanusu yarısı bilgi taşımıyor.
 *
 * 5°D seçildi: Moskova (37.6°D) kenara yapışmasın; Avrupa'nın batısı
 * (İngiltere, İberya) mobilde görünmez, karşılığında işaretçiler okunur kalır.
 */
export const MAP_FOCUS_FRAME: MapFrame = { x: 493.333, y: 16, width: 466.667, height: 373.333 };

/** Boylam → izdüşüm x'i. */
export const projectX = (lon: number): number =>
  ((lon + 180) / 360) * MAP_PROJECTION.width;

/** Enlem → izdüşüm y'si (kuzey yukarı). */
export const projectY = (lat: number): number =>
  ((90 - lat) / 180) * MAP_PROJECTION.height;

/**
 * Konumun verilen çerçeve İÇİNDEKİ yüzde konumu.
 * 0–100 aralığına kıstırılır: çerçeve dışına düşen bir işaretçi haritadan
 * kaybolmak yerine kenarda durur (görünmez olmaktan iyidir).
 */
export function pointInFrame(
  lon: number,
  lat: number,
  frame: MapFrame = MAP_FRAME,
): { left: number; top: number } {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  return {
    left: clamp(((projectX(lon) - frame.x) / frame.width) * 100),
    top: clamp(((projectY(lat) - frame.y) / frame.height) * 100),
  };
}

/** Çerçevenin en/boy oranı — `aspect-ratio` ve `viewBox` aynı sayıyı kullanır. */
export const frameAspect = (frame: MapFrame): number => frame.width / frame.height;
