'use client';

// 16x16 pixel-art mascot: a tiny rolled-up newspaper with eyes. Two frames
// for blinking + a constant 2px bob. All animation is pure CSS so it keeps
// going forever with zero JS cost.
//
// Each rect is one "pixel" at 6px on screen (96px sprite). image-rendering
// pixelated keeps it crisp on hi-dpi.

const INK = '#2d2d44';
const PAPER = '#fff8e7';
const SHADOW = '#c8b88a';
const RED = '#e52521';
const SKY = '#5c94fc';
const BLACK = '#1a1a2e';

// Pixel grid for frame A (eyes open).
// Each character maps to a color. ' ' = transparent.
//   . = ink outline
//   p = paper (cream)
//   s = shadow
//   r = red banner
//   o = open eye (white pupil with black dot, simplified to two cells)
const FRAME_A = [
  '   ........     ',
  '  .pppppppp.    ',
  ' .prrrrrrrp.    ',
  ' .pppppppppp.   ',
  ' .pp.pp.pp.p.   ',
  ' .pppppppppp.   ',
  ' .p.WBp.WBp.s.  ',
  ' .ppppppppps.   ',
  ' .pp.pp.pp.s.   ',
  ' .pppppppps.    ',
  '  .ppppppps.    ',
  '   .ppppps.     ',
  '    .pppps.     ',
  '     .pps.      ',
  '      ..        ',
  '                ',
];

const FRAME_B = [
  '   ........     ',
  '  .pppppppp.    ',
  ' .prrrrrrrp.    ',
  ' .pppppppppp.   ',
  ' .pp.pp.pp.p.   ',
  ' .pppppppppp.   ',
  ' .p.--p.--p.s.  ',
  ' .ppppppppps.   ',
  ' .pp.pp.pp.s.   ',
  ' .pppppppps.    ',
  '  .ppppppps.    ',
  '   .ppppps.     ',
  '    .pppps.     ',
  '     .pps.      ',
  '      ..        ',
  '                ',
];

const COLOR: Record<string, string> = {
  '.': INK,
  p: PAPER,
  s: SHADOW,
  r: RED,
  W: '#ffffff',
  B: BLACK,
  '-': INK,
};

function renderFrame(rows: string[]) {
  const cells: JSX.Element[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const fill = COLOR[ch];
      if (!fill) continue;
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={fill}
        />,
      );
    }
  });
  return cells;
}

export function PixelLogo({ size = 64 }: { size?: number }) {
  return (
    <span
      className="pixel-logo inline-block align-middle"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="pixel-logo__bob block h-full w-full">
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          shapeRendering="crispEdges"
          style={{ imageRendering: 'pixelated' as const, display: 'block' }}
        >
          {/* sky chip behind the news icon */}
          <rect x={0} y={0} width={16} height={16} fill={SKY} opacity={0.0} />
          <g className="pixel-logo__frameA">{renderFrame(FRAME_A)}</g>
          <g className="pixel-logo__frameB">{renderFrame(FRAME_B)}</g>
        </svg>
      </span>
    </span>
  );
}
