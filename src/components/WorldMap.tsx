import type { LocationAggregate } from '@/lib/geo/location';
import {
  MAP_FOCUS_FRAME,
  MAP_FRAME,
  frameAspect,
  pointInFrame,
  type MapFrame,
} from '@/lib/geo/map-frame';
import { getDict, type Locale } from '@/lib/i18n';

/**
 * Dünya haritası — bağlam katmanı (`docs/harita-plani.md` Seçenek A).
 *
 * TASARIM KARARLARI (gerekçeler ölçüme dayalı):
 *
 * 1. **Ülke BOYAMASI yok.** Ölçüm (08 Eki 2026): ülke adı geçen 71 olayın 39'u
 *    Rusya; diğer üç geçiş (ukraine 2, mongolia 1, china 1) ilgisiz — biri
 *    "a shortage of troops has *plagued* Ukraine" cümlesinden geliyor. Yoğunluk
 *    boyaması Ukrayna'yı yakardı, yani yanlış bilgi üretirdi. Bu yüzden harita
 *    yalnızca Rusya'yı vurgular ve bilinen üç konumu işaretler.
 *
 * 2. **Görsel bir VARLIK (`/world-map.svg`), satır içi SVG değil.** CSP
 *    (`img-src 'self' data:`) dış karo sunucusunu bloklar; ayrıca ~41 KB yol
 *    verisini her HTML yanıtına gömmek yerine statik dosya önbelleklenir.
 *    Varlıklar `scripts/build-world-map.ts` ile Natural Earth 110m'den üretilir.
 *
 * 3. **İşaretçiler HTML, haritanın üstünde yüzde koordinatla.** Böylece
 *    etiketler gerçek HTML metni olur: dil duyarlı, erişilebilir ve `ui-check`
 *    tipografi kurallarına (mikro punto ≥ 11 px) tabi. İşaretçi rozeti haritayla
 *    ÖLÇEKLENMEZ, bu yüzden küçük ekranda da okunur kalır (ölçülen sorun buydu).
 *
 * 4. **İki çerçeve, iki varlık.** Yüzde konumlar `map-frame.ts`teki TEK
 *    kaynaktan gelir; `viewBox` ile kap oranı aynı sabitten üretilir, böylece
 *    işaretçi haritadan kayamaz. Mobilde dünya çerçevesi yerine odak çerçevesi
 *    kullanılır (ölçüm ve gerekçe: `map-frame.ts` → `MAP_FOCUS_FRAME`).
 *
 * 5. **Ad etiketleri < 640 px'te gizlenir.** 358 px genişlikte büyük harfli mono
 *    adlar komşu işaretçiyle çakışıyor; o genişlikte adlar zaten hemen alttaki
 *    bölge listesinde yazılı. Harita "nerede", liste "ne kadar" sorusunu cevaplar.
 */

/** İşaretçi yerleşimi — koordinatlar gerçek; `side` yalnızca etiketin taşma yönü. */
const MARKER_LAYOUT: Record<
  string,
  { lon: number; lat: number; side: 'left' | 'right' | 'top' | 'bottom' }
> = {
  /*
   * Sibirya bir MERKEZ değil, makro-bölgenin temsilî noktasıdır (85°D 60°K —
   * Krasnoyarsk Krayı, bölgenin içi). Ölçüm: 95°D seçildiğinde İrkutsk'a çok
   * yaklaşıyordu (mobilde 29 px), 85°D ile iki işaretçi her ekranda ayrışıyor.
   * İrkutsk bu makro-bölgenin İÇİNDE olduğu için ikisi ayrı işaretlenir ve bu,
   * alttaki listede de böyle yazılıdır.
   */
  siberian: { lon: 85, lat: 60, side: 'top' },
  irkutsk: { lon: 104.3, lat: 52.3, side: 'bottom' },
  moscow: { lon: 37.6, lat: 55.75, side: 'left' },
};

const SIDE_CLASS: Record<'left' | 'right' | 'top' | 'bottom', string> = {
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
};

interface PlacedRegion extends LocationAggregate {
  lon: number;
  lat: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

/** Çerçeveye göre konumlanmış işaretçi katmanı — iki varyantta da aynı mantık. */
function Markers({
  regions,
  locale,
  frame,
  hrefFor,
}: {
  regions: PlacedRegion[];
  locale: Locale;
  frame: MapFrame;
  hrefFor: (slug: string) => string;
}) {
  const t = getDict(locale);
  const tr = locale === 'tr';

  return (
    <>
      {regions.map((marker) => {
        const position = pointInFrame(marker.lon, marker.lat, frame);
        return (
          <a
            key={marker.slug}
            href={hrefFor(marker.slug)}
            aria-label={`${tr ? marker.nameTr : marker.nameEn} — ${marker.eventCount} ${t.events}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
          >
            <span className="tnum relative flex h-[26px] min-w-[26px] items-center justify-center rounded-full border border-official bg-void px-1.5 font-mono text-[11px] font-medium text-official transition-colors group-hover:bg-official group-hover:text-void">
              {marker.eventCount}
            </span>
            <span
              className={`pointer-events-none absolute hidden whitespace-nowrap rounded bg-void px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-chalk sm:block ${SIDE_CLASS[marker.side]}`}
            >
              {tr ? marker.nameTr : marker.nameEn}
            </span>
          </a>
        );
      })}
    </>
  );
}

export function WorldMap({
  regions,
  locale,
  hrefFor,
}: {
  regions: LocationAggregate[];
  locale: Locale;
  hrefFor: (slug: string) => string;
}) {
  const t = getDict(locale);

  const placed: PlacedRegion[] = regions
    .filter((region) => MARKER_LAYOUT[region.slug])
    .map((region) => ({ ...region, ...MARKER_LAYOUT[region.slug]! }));

  return (
    <figure className="reveal m-0">
      <div className="surface relative overflow-hidden rounded-xl">
        {/* ≥ 640 px: tüm dünya. < 640 px: odak çerçevesi (bkz. map-frame.ts). */}
        <div
          className="relative hidden w-full sm:block"
          style={{ aspectRatio: frameAspect(MAP_FRAME) }}
        >
          <MapImage file="world-map.svg" alt={t.mapAlt} frame={MAP_FRAME} />
          <Markers regions={placed} locale={locale} frame={MAP_FRAME} hrefFor={hrefFor} />
        </div>

        <div
          className="relative w-full sm:hidden"
          style={{ aspectRatio: frameAspect(MAP_FOCUS_FRAME) }}
        >
          <MapImage file="world-map-focus.svg" alt={t.mapAlt} frame={MAP_FOCUS_FRAME} />
          <Markers
            regions={placed}
            locale={locale}
            frame={MAP_FOCUS_FRAME}
            hrefFor={hrefFor}
          />
        </div>
      </div>
      <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-wider text-mist-2">
        {t.mapMarkerNote}
      </figcaption>
    </figure>
  );
}

/**
 * Harita görseli. `<img>` bilinçli: `next/image` yerel SVG için
 * `dangerouslyAllowSVG` ister ve optimizasyon katmanını SVG'ye açardı; varlık
 * zaten statik, aynı origin'den ve önbelleklenebilir. `width`/`height` CLS
 * üretmemek için verilir.
 *
 * `hidden`/`sm:hidden` + `loading="lazy"`: iki varyanttan yalnızca görünür olan
 * indirilir (layout kutusu olmayan görsel lazy-load ile istenmez).
 */
function MapImage({ file, alt, frame }: { file: string; alt: string; frame: MapFrame }) {
  return (
    <img
      src={`/${file}`}
      alt={alt}
      width={Math.round(frame.width)}
      height={Math.round(frame.height)}
      className="absolute inset-0 h-full w-full"
      loading="lazy"
      decoding="async"
    />
  );
}
