/**
 * Dünya haritası varlığı üreticisi — `public/world-map.svg`.
 *
 * Çalıştır:  npx tsx scripts/build-world-map.ts
 *
 * NEDEN AYRI BİR VARLIK (satır içi SVG değil), docs/harita-plani.md §2.4:
 *  - CSP `img-src 'self' data:` dış karo sunucusunu bloklar → harita kendi
 *    malzememiz olmak zorunda,
 *  - satır içi yol verisi HTML yükünü ~40 KB şişirir ve her istekte yeniden
 *    gönderilir; statik dosya tarayıcıda önbelleklenir,
 *  - işaretçiler HTML olarak haritanın ÜSTÜNE bindirilir (yüzde koordinat),
 *    böylece etiketler gerçek HTML metni olur: dil duyarlı, erişilebilir ve
 *    `ui-check` tipografi kurallarına tabi.
 *
 * Kaynak: Natural Earth 110m `admin_0_countries` (kamu malı). Basitleştirme
 * Douglas–Peucker; tolerans `TOLERANCE` ile büyütülüp küçültülebilir.
 *
 * Antarktika ATILIR: dünya ölçeğinde bu olay için bilgi taşımıyor ama yol
 * verisinin en büyük parçası (bütçeyi tek başına yer).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  MAP_FOCUS_FRAME,
  MAP_FRAME,
  MAP_PROJECTION,
  frameAspect,
  type MapFrame,
} from '../src/lib/geo/map-frame';

/**
 * Equirectangular (eşdikdörtgen) projeksiyon: x = boylam, y = −enlem.
 *
 * İzdüşüm ve kırpma penceresi `src/lib/geo/map-frame.ts`ten gelir — bileşen
 * işaretçileri aynı sabitlerle konumlandırdığı için TEK kaynak olmak zorunda.
 */
const WIDTH = MAP_PROJECTION.width;
const HEIGHT = MAP_PROJECTION.height;
/**
 * Projeksiyon birimi cinsinden basitleştirme toleransı (1 birim = 0.375°).
 *
 * 1.1 SEÇİLDİ (ölçüm 08 Eki 2026, `.shots/map-tolerance.png`): 0.75 → 53.8 KB,
 * 1.5 → 31.9 KB ve kıyı çizgileri gözle görülür şekilde köşeli. 1.1 → 41.2 KB ve
 * 0.75'ten ayırt edilemiyor. Varlık statik dosya olduğu için boyut yalnızca
 * ilk yüklemede ödenir; yine de gereksiz bayt taşımıyoruz.
 */
const TOLERANCE = Number(process.env.TOL ?? 1.1);
/** Bu değerden az noktalı adalar haritada görünmez, atılır (gürültü). */
const MIN_POINTS = 4;

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

type Ring = [number, number][];
type Geometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };
interface Feature {
  properties: Record<string, unknown>;
  geometry: Geometry | null;
}

const project = ([lon, lat]: [number, number]): [number, number] => [
  (lon + 180) * (WIDTH / 360),
  (90 - lat) * (HEIGHT / 180),
];

/** Bir doğru parçasına dik uzaklığın karesi (karekök yok — karşılaştırma yeter). */
function sqSegDist(p: [number, number], a: [number, number], b: [number, number]): number {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/** Douglas–Peucker. Yinelemeli değil (Kiril/büyük halkalarda yığın taşmasın). */
function simplify(points: Ring, tolerance: number): Ring {
  if (points.length <= 2) return points;
  const sqTol = tolerance * tolerance;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxSq = sqTol;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i]!, points[first]!, points[last]!);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

/** 1 ondalık = 960 birimde ~0.1 px; 2 ondalık gereksiz bayt. */
const fmt = (n: number): string => String(Math.round(n * 10) / 10);

function ringToPath(ring: Ring): string {
  const parts: string[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = ring[i]!;
    parts.push(`${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`);
  }
  return `${parts.join('')}Z`;
}

function geometryToPath(geometry: Geometry): string {
  const polygons: Ring[][] =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

  const chunks: string[] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const projected = ring.map(project);
      const simplified = simplify(projected, TOLERANCE);
      if (simplified.length < MIN_POINTS) continue;
      chunks.push(ringToPath(simplified));
    }
  }
  return chunks.join('');
}

const featureName = (feature: Feature): string =>
  String(feature.properties.ADMIN ?? feature.properties.NAME ?? feature.properties.name ?? '');

async function main(): Promise<void> {
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`kaynak indirilemedi: HTTP ${response.status}`);
  const collection = (await response.json()) as { features: Feature[] };

  const worldChunks: string[] = [];
  const russiaChunks: string[] = [];
  let dropped = 0;

  for (const feature of collection.features) {
    const name = featureName(feature);
    if (!feature.geometry) continue;
    if (name === 'Antarctica') {
      dropped++;
      continue;
    }
    const pathData = geometryToPath(feature.geometry);
    if (pathData === '') continue;
    if (name === 'Russia') russiaChunks.push(pathData);
    else worldChunks.push(pathData);
  }

  const worldPath = worldChunks.join('');
  const russiaPath = russiaChunks.join('');

  /*
   * Izgara (graticule) 30° aralıkla: haritayı "ölçüm aracı" gibi gösterir,
   * dünya görüntüsünü doğrular. Renkler `globals.css` token'larıyla aynı
   * (tema tek: `color-scheme: dark`), böylece varlık CSS'e bağımlı olmaz.
   */
  const graticule: string[] = [];
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = fmt((lon + 180) * (WIDTH / 360));
    graticule.push(`M${x} 0V${HEIGHT}`);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = fmt((90 - lat) * (HEIGHT / 180));
    graticule.push(`M0 ${y}H${WIDTH}`);
  }

  /*
   * İki varlık üretilir, tek kaynaklı iki ÇERÇEVEDEN (map-frame.ts):
   *
   *   world-map.svg       → ≥ 640 px (tüm dünya)
   *   world-map-focus.svg → < 640 px (5°D–180°D odak)
   *
   * Neden gerekli: mobilde kap genişliği 358 px ve dünya çerçevesinde Sibirya
   * ile İrkutsk işaretçileri 13 px aralığa düşüyordu — 26 px'lik rozetler üst
   * üste biniyordu. Kırpma, işaretçi aralığını ~42 px'e çıkarır.
   *
   * Yol verisi iki dosyada DA aynıdır; fark yalnızca `viewBox`. Böylece
   * kırpma, geometri yeniden hesaplanmadan yapılır (drift riski yok).
   */
  const render = (frame: MapFrame): string =>
    [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${frame.x} ${frame.y} ${frame.width.toFixed(2)} ${frame.height.toFixed(2)}" width="${frame.width.toFixed(2)}" height="${frame.height.toFixed(2)}">`,
      '<g fill="none" stroke="#243148" stroke-width="1">',
      `<path d="${graticule.join('')}"/>`,
      '</g>',
      '<g fill="#101825" stroke="#243148" stroke-width="0.6" stroke-linejoin="round">',
      `<path d="${worldPath}"/>`,
      '</g>',
      '<g fill="#2f3e54" stroke="#4da3ff" stroke-width="1.1" stroke-linejoin="round">',
      `<path d="${russiaPath}"/>`,
      '</g>',
      '</svg>',
      '',
    ].join('\n');

  const outDir = path.join(process.cwd(), 'public');
  await mkdir(outDir, { recursive: true });

  console.log(`yol verisi : dünya ${(worldPath.length / 1024).toFixed(1)} KB · rusya ${(russiaPath.length / 1024).toFixed(1)} KB`);
  console.log(`atılan     : ${dropped} özellik (Antarktika)`);
  console.log(`tolerans   : ${TOLERANCE} birim (≈ ${(TOLERANCE * 0.375).toFixed(2)}°)`);

  const outputs: { file: string; frame: MapFrame }[] = [
    { file: 'world-map.svg', frame: MAP_FRAME },
    { file: 'world-map-focus.svg', frame: MAP_FOCUS_FRAME },
  ];

  for (const { file, frame } of outputs) {
    const svg = render(frame);
    await writeFile(path.join(outDir, file), svg, 'utf8');
    console.log(
      `  ✓ public/${file}  ${(svg.length / 1024).toFixed(1)} KB  ·  oran ${frameAspect(frame).toFixed(3)}:1  ·  viewBox ${frame.x} ${frame.y} ${frame.width.toFixed(2)} ${frame.height.toFixed(2)}`,
    );
  }
}

await main();
