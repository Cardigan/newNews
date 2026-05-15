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
  // Pixel-based bg sizing so background-position can be in pixels too.
  // (Percentage background-position is relative to container - bg width,
  // not container width, so a "100% per frame" scheme produces a blank
  // 7th frame at the end of the cycle.)
  return (
    <span
      className="pixel-logo inline-block align-middle"
      style={
        {
          width: size,
          height,
          backgroundImage: `url('${BASE}/spider-strip.png')`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${size * FRAMES}px ${height}px`,
          backgroundPosition: '0px 0px',
          imageRendering: 'pixelated',
          animation: `spider-walk 0.9s steps(${FRAMES}) infinite`,
          ['--spider-cycle' as string]: `-${size * FRAMES}px`,
        } as React.CSSProperties
      }
      aria-label="Pixel spider mascot"
      role="img"
    />
  );
}


