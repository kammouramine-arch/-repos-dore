import React from "react";
import type { V } from "./math";

const INK = "#14161a";

/** Minimal face, as in the reference: tall oval eyes, thin brows, a single-line mouth. */
export type Expr = {
  brow: [number, number]; // raise of (screen-left, screen-right) brow, -1..1
  browTilt: number; // + = inner ends up (worry/sadness), - = inner ends down (impatience)
  eye: number; // eye scale (1 normal, 1.3 wide with shock)
  lid: number; // upper-lid droop 0..1 (tired/sad)
  smile: number; // mouth curvature -1 (frown) .. 1 (smile)
  mouthW: number; // width multiplier
  open: number; // 0 closed .. 1 open
  skew: number; // asymmetric "sly" smile (-1..1)
  closed?: number; // eyes gently closed as arcs (contentment) 0..1
};

export const EXPR = {
  neutral: { brow: [0, 0], browTilt: 0, eye: 1, lid: 0, smile: 0.1, mouthW: 0.8, open: 0, skew: 0 },
  smirk: { brow: [-0.1, 0.6], browTilt: 0, eye: 1, lid: 0, smile: 0.7, mouthW: 1, open: 0, skew: 0.6 }, // the reference expression
  curious: { brow: [0.5, 0.2], browTilt: 0.1, eye: 1.08, lid: 0, smile: 0.15, mouthW: 0.6, open: 0.15, skew: 0.2 },
  excited: { brow: [0.7, 0.7], browTilt: 0, eye: 1.1, lid: 0, smile: 1, mouthW: 1.15, open: 0.55, skew: 0 },
  happy: { brow: [0.35, 0.35], browTilt: 0, eye: 1, lid: 0, smile: 0.9, mouthW: 1.05, open: 0.15, skew: 0 },
  bored: { brow: [-0.2, -0.2], browTilt: 0.1, eye: 0.95, lid: 0.45, smile: -0.15, mouthW: 0.75, open: 0, skew: -0.2 },
  impatient: { brow: [-0.4, -0.4], browTilt: -0.6, eye: 1, lid: 0.2, smile: -0.35, mouthW: 0.8, open: 0, skew: 0.3 },
  awkward: { brow: [0.3, -0.1], browTilt: 0.5, eye: 1, lid: 0.1, smile: 0.15, mouthW: 0.9, open: 0, skew: -0.6 },
  confused: { brow: [0.8, -0.3], browTilt: 0.2, eye: 1.05, lid: 0, smile: -0.1, mouthW: 0.6, open: 0.1, skew: 0.5 },
  uneasy: { brow: [0.2, 0.2], browTilt: 0.7, eye: 1, lid: 0.1, smile: -0.25, mouthW: 0.7, open: 0, skew: 0 },
  shock: { brow: [1, 1], browTilt: 0.3, eye: 1.32, lid: 0, smile: -0.2, mouthW: 0.45, open: 0.8, skew: 0 },
  fear: { brow: [0.8, 0.8], browTilt: 0.9, eye: 1.22, lid: 0, smile: -0.5, mouthW: 0.7, open: 0.35, skew: 0 },
  sad: { brow: [0.1, 0.1], browTilt: 1, eye: 0.95, lid: 0.45, smile: -0.5, mouthW: 0.7, open: 0, skew: 0 },
  grief: { brow: [0.2, 0.2], browTilt: 1.2, eye: 0.9, lid: 0.7, smile: -0.6, mouthW: 0.6, open: 0, skew: 0 },
  regret: { brow: [0, 0], browTilt: 0.8, eye: 0.95, lid: 0.35, smile: -0.3, mouthW: 0.65, open: 0, skew: -0.2 },
  relief: { brow: [0.2, 0.2], browTilt: 0.5, eye: 1, lid: 0.2, smile: 0.45, mouthW: 0.85, open: 0, skew: 0, closed: 1 },
  warm: { brow: [0.25, 0.25], browTilt: 0.35, eye: 1, lid: 0.15, smile: 0.6, mouthW: 0.9, open: 0, skew: 0 },
  focus: { brow: [-0.1, -0.1], browTilt: -0.2, eye: 1, lid: 0.15, smile: 0, mouthW: 0.6, open: 0, skew: 0 },
} satisfies Record<string, Expr>;

/** Blend two expressions (for smooth emotional transitions). */
export const mixExpr = (a: Expr, b: Expr, k: number): Expr => {
  const l = (x: number, y: number) => x + (y - x) * k;
  return {
    brow: [l(a.brow[0], b.brow[0]), l(a.brow[1], b.brow[1])], browTilt: l(a.browTilt, b.browTilt), eye: l(a.eye, b.eye), lid: l(a.lid, b.lid),
    smile: l(a.smile, b.smile), mouthW: l(a.mouthW, b.mouthW), open: l(a.open, b.open), skew: l(a.skew, b.skew), closed: l(a.closed ?? 0, b.closed ?? 0),
  };
};

export const Face: React.FC<{ fx: number; c: number; s: number; expr: Expr; look: V; blink: number; stubble: number; glasses?: boolean; mustache?: boolean; look2?: V }> = ({ fx, c, s, expr, look, blink, stubble, glasses, mustache, look2 }) => {
  const spread = 46 * Math.max(0.2, c); // half eye distance shrinks as the head turns
  const sq = 0.62 + 0.38 * Math.max(0, c); // horizontal squash of features in profile
  const showFarL = !(s > 0.72); // when facing screen-right, the screen-left eye is the far one... hide in near-profile
  const showFarR = !(s < -0.72);
  const eyeY = -6 + look[1] * 6;
  const px = look[0] * 6;
  const closed = Math.max(blink, expr.closed ?? 0);
  const eye = (x: number, side: 0 | 1) => {
    // the double's eyes can drift independently (look2 drives the screen-right eye)
    const lk = side === 1 && look2 ? look2 : look;
    const eyeY = -6 + lk[1] * 6;
    const px = lk[0] * 6;
    const rx = 10.5 * sq * expr.eye, ry = 15.5 * expr.eye;
    const lid = expr.lid;
    if (closed > 0.6) {
      // closed: gentle arc (downward for contentment, flat for a blink)
      const arc = (expr.closed ?? 0) > 0.5 ? -6 : 1;
      return <path key={side} d={`M${x - rx - 2} ${eyeY} q${rx + 2} ${arc * 1.6} ${(rx + 2) * 2} 0`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
    }
    const h = ry * (1 - closed * 0.9);
    return (
      <g key={side}>
        <ellipse cx={x + px} cy={eyeY + (ry - h) * 0.3} rx={rx} ry={h} fill={INK} />
        {lid > 0.05 && <rect x={x + px - rx - 2} y={eyeY - ry - 2} width={rx * 2 + 4} height={(ry * 2 + 2) * lid * 0.55 + 2} fill="#fff" />}
        {lid > 0.05 && <path d={`M${x + px - rx - 3} ${eyeY - ry + (ry * 2) * lid * 0.55} l${rx * 2 + 6} ${0}`} stroke={INK} strokeWidth={3} />}
      </g>
    );
  };
  const brow = (x: number, side: 0 | 1) => {
    const raise = expr.brow[side] * 12;
    const inner = side === 0 ? 1 : -1; // inner end points toward the face centre
    const y = eyeY - 38 - raise;
    const tilt = expr.browTilt * 8;
    const x0 = x - 18 * sq, x1 = x + 18 * sq;
    const y0 = side === 0 ? y + tilt * -0 + (inner > 0 ? 0 : 0) : y;
    // inner end = toward centre: for screen-left brow that is x1, for screen-right brow it is x0
    const yi = y - tilt, yo = y + tilt * 0.4;
    const ya = side === 0 ? yo : yi, yb = side === 0 ? yi : yo;
    return <path key={"b" + side} d={`M${x0} ${ya} Q${(x0 + x1) / 2} ${Math.min(ya, yb) - 7} ${x1} ${yb}`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" data-y={y0} />;
  };
  const mx = fx + expr.skew * 12 + s * 6;
  const mw = 30 * expr.mouthW * sq;
  const my = 54;
  const curve = expr.smile * 16;
  const skewY = expr.skew * 6;
  const mouth = expr.open > 0.05 ? (
    <path d={`M${mx - mw} ${my + skewY} Q${mx} ${my + curve + 2} ${mx + mw} ${my - skewY} Q${mx} ${my + curve + 6 + expr.open * 26} ${mx - mw} ${my + skewY} Z`} fill="#2a1e1e" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
  ) : (
    <path d={`M${mx - mw} ${my + skewY - curve * 0.15} Q${mx} ${my + curve} ${mx + mw} ${my - skewY - curve * 0.15}`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
  );
  const xl = fx - spread, xr = fx + spread;
  return (
    <g>
      {stubble > 0 && (
        <g fill="#7b7f86" opacity={0.55 * stubble}>
          {Array.from({ length: 26 }).map((_, i) => {
            const a = (200 + i * 5.5) * (Math.PI / 180);
            const rr = 98 + ((i * 37) % 13);
            const x = Math.cos(a) * rr + fx * 0.5, y = -Math.sin(a) * rr * 0.75 + 36;
            return Math.abs(x - fx) < 92 ? <circle key={i} cx={x} cy={y} r={2.4} /> : null;
          })}
        </g>
      )}
      {showFarR && eye(xr, 1)}
      {showFarL && eye(xl, 0)}
      {showFarR && brow(xr, 1)}
      {showFarL && brow(xl, 0)}
      {glasses && (
        <g stroke={INK} strokeWidth={4} fill="rgba(200,220,235,0.12)">
          {showFarL && <circle cx={xl} cy={eyeY} r={25 * Math.max(0.5, sq)} />}
          {showFarR && <circle cx={xr} cy={eyeY} r={25 * Math.max(0.5, sq)} />}
          {showFarL && showFarR && <path d={`M${xl + 24 * sq} ${eyeY - 4} Q${fx} ${eyeY - 12} ${xr - 24 * sq} ${eyeY - 4}`} fill="none" />}
        </g>
      )}
      {mustache && <path d={`M${mx - mw * 0.9} ${my - 8} Q${mx} ${my - 22} ${mx + mw * 0.9} ${my - 8} Q${mx} ${my - 12} ${mx - mw * 0.9} ${my - 8} Z`} fill="#5b544e" stroke={INK} strokeWidth={3} />}
      {mouth}
    </g>
  );
};
