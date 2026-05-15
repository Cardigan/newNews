'use client';

// 16x16 pixel-art spider mascot. Body in the middle, 4 legs per side, two
// frames where the leg tips wiggle so it looks like it's scuttling. Pure
// CSS animation alternates the frames + adds a 2px bob.

const BODY = '#5c2da8';      // purple body
const BODY_HI = '#a36bf0';   // highlight
const LEG = '#2d2d44';       // ink
const EYE_W = '#fff8e7';     // cream

type P = [number, number];

// Filled oval body, rows 6-10, cols 5-10 (with rounded top/bottom).
const BODY_PIXELS: P[] = [
  [6, 6], [7, 6], [8, 6], [9, 6],
  [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
  [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8],
  [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9],
  [6, 10], [7, 10], [8, 10], [9, 10],
];

// Tiny highlight + spinneret to give the body a bit of shape.
const HIGHLIGHT_PIXELS: P[] = [
  [6, 7], [7, 6],
];

// Two cream-colored eyes.
const EYES_W: P[] = [
  [6, 8], [9, 8],
];

// 8 legs, each a sequence of pixels from inner segment out to the tip.
// LEGS_A is the "rest" pose, LEGS_B is the "wiggle" pose — outer tips
// move 1-2 pixels perpendicular to give a scuttle effect.
const LEGS_A: P[][] = [
  // Left
  [[4, 5], [3, 4], [2, 3]],          // L1 top diagonal
  [[4, 7], [3, 7], [2, 7], [1, 7]],  // L2 horizontal upper
  [[4, 9], [3, 9], [2, 9], [1, 9]],  // L3 horizontal lower
  [[4, 11], [3, 12], [2, 13]],       // L4 bottom diagonal
  // Right (mirror)
  [[11, 5], [12, 4], [13, 3]],
  [[11, 7], [12, 7], [13, 7], [14, 7]],
  [[11, 9], [12, 9], [13, 9], [14, 9]],
  [[11, 11], [12, 12], [13, 13]],
];

const LEGS_B: P[][] = [
  [[4, 5], [3, 4], [2, 2]],          // L1 tip up
  [[4, 6], [3, 6], [2, 6], [1, 6]],  // L2 raised
  [[4, 10], [3, 10], [2, 10], [1, 10]], // L3 lowered
  [[4, 11], [3, 12], [2, 14]],       // L4 tip down
  [[11, 5], [12, 4], [13, 2]],
  [[11, 6], [12, 6], [13, 6], [14, 6]],
  [[11, 10], [12, 10], [13, 10], [14, 10]],
  [[11, 11], [12, 12], [13, 14]],
];

function rect(x: number, y: number, fill: string, key: string) {
  return <rect key={key} x={x} y={y} width={1} height={1} fill={fill} />;
}

function renderFrame(legs: P[][], suffix: string) {
  const cells: JSX.Element[] = [];
  // Legs first so the body/eyes draw over the inner attach pixels.
  legs.forEach((leg, li) => {
    leg.forEach(([x, y], pi) => {
      cells.push(rect(x, y, LEG, `l-${li}-${pi}-${suffix}`));
    });
  });
  BODY_PIXELS.forEach(([x, y]) =>
    cells.push(rect(x, y, BODY, `b-${x}-${y}-${suffix}`)),
  );
  HIGHLIGHT_PIXELS.forEach(([x, y]) =>
    cells.push(rect(x, y, BODY_HI, `h-${x}-${y}-${suffix}`)),
  );
  EYES_W.forEach(([x, y]) =>
    cells.push(rect(x, y, EYE_W, `e-${x}-${y}-${suffix}`)),
  );
  return cells;
}

export function PixelLogo({ size = 96 }: { size?: number }) {
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
          <g className="pixel-logo__frameA">{renderFrame(LEGS_A, 'a')}</g>
          <g className="pixel-logo__frameB">{renderFrame(LEGS_B, 'b')}</g>
        </svg>
      </span>
    </span>
  );
}

