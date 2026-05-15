'use client';

// Animated spider logo driven by a 6-frame sprite sheet at
// /public/spider-strip.png (2172x500, six 362x500 frames laid out
// horizontally, background already alpha'd out).
//
// Implementation note: we tried a single <span> with background-position
// animation, but Chromium had trouble with CSS custom properties used
// inside @keyframes (the substitution didn't always happen, leaving the
// sprite frozen on frame 0). Using a wrapper with overflow:hidden and an
// <img> that translateX(-100%) of its own width with steps(6) is rock-
// solid across Chrome, Edge, Safari, Firefox, and mobile.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const FRAMES = 6;
const FRAME_W = 362;
const FRAME_H = 500;

export function PixelLogo({ size = 96 }: { size?: number }) {
  const height = Math.round((size * FRAME_H) / FRAME_W);
  const stripWidth = size * FRAMES;
  return (
    <span
      className="pixel-logo inline-block align-middle overflow-hidden"
      style={{
        width: size,
        height,
      }}
      aria-label="Pixel spider mascot"
      role="img"
    >
      <img
        src={`${BASE}/spider-strip.png`}
        alt=""
        width={stripWidth}
        height={height}
        style={{
          width: stripWidth,
          height,
          maxWidth: 'none',
          display: 'block',
          imageRendering: 'pixelated',
          animation: 'spider-walk 0.9s steps(6) infinite',
          willChange: 'transform',
        }}
        draggable={false}
      />
    </span>
  );
}


