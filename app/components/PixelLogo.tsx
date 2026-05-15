'use client';

// Animated spider logo driven by a 6-frame sprite sheet at
// /public/spider-strip.png (2172x500, six 362x500 frames laid out
// horizontally, background already alpha'd out).
//
// We don't slice frames — a single CSS background-position animation with
// steps(6) cycles through them, which is dramatically cheaper than React
// re-renders.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const FRAMES = 6;
const FRAME_W = 362;
const FRAME_H = 500;

export function PixelLogo({ size = 96 }: { size?: number }) {
  const height = Math.round((size * FRAME_H) / FRAME_W);
  return (
    <span
      className="pixel-logo inline-block align-middle"
      style={{
        width: size,
        height,
        backgroundImage: `url('${BASE}/spider-strip.png')`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${FRAMES * 100}% 100%`,
        backgroundPosition: '0% 50%',
        imageRendering: 'pixelated',
        animation: 'spider-walk 0.9s steps(6) infinite',
      }}
      aria-label="Pixel spider mascot"
      role="img"
    />
  );
}


