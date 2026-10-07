import { ImageResponse } from 'next/og';

/**
 * iOS ana ekran simgesi (PNG).
 *
 * Neden PNG: `apple-icon` yalnızca .jpg/.jpeg/.png kabul ediyor, SVG kabul
 * etmiyor. Yeni bir görsel kütüphanesi eklemek yerine Next'in kendi
 * `ImageResponse` (satori) üreticisi kullanılıyor — statik olarak build
 * zamanında üretilir, dış bağımlılık yok.
 *
 * Metin içermediği için font gömülmesi gerekmiyor. Desen `icon.svg` ile
 * birebir aynı: iç içe iki amber halka + merkez nokta.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const AMBER = '#f2b544';
const ABYSS = '#0a0f17';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: ABYSS,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 58,
            border: `15px solid ${AMBER}`,
            opacity: 0.45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              border: `15px solid ${AMBER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 8, background: AMBER }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
