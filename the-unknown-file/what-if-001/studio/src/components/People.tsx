import React from "react";

/*
 * Character rig for the WHAT IF? episode — cinematic backlit silhouettes with a rim of light.
 * Fictional characters (continuity marks in brackets):
 *   Mia, ~7 [ponytail + red ribbon] · Mia as an adult [same profile and ponytail, red scarf] · her mother [bob]
 *   the fisherman [cap + beard] · his partner [bun] · their son · townspeople.
 * Units: centimetres. Origin at the feet. Profile faces +x (dir = -1 mirrors).
 */

type P = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;

/** smooth path through points (Catmull-Rom → cubic Bézier) */
export function smooth(pts: P[], closed = true, k = 1 / 6) {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: P = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: P = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return closed ? d + " Z" : d;
}

/** tapered limb outline along a chain of joints with a width at each joint */
function taper(chain: P[], widths: number[], capEnd = true) {
  const L: P[] = [], R: P[] = [];
  for (let i = 0; i < chain.length; i++) {
    const a = chain[Math.max(0, i - 1)], b = chain[Math.min(chain.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    const nx = -dy / n, ny = dx / n, w = widths[i] / 2;
    L.push([chain[i][0] + nx * w, chain[i][1] + ny * w]);
    R.push([chain[i][0] - nx * w, chain[i][1] - ny * w]);
  }
  const end = chain[chain.length - 1], prev = chain[chain.length - 2];
  const dx = end[0] - prev[0], dy = end[1] - prev[1], n = Math.hypot(dx, dy) || 1;
  const tip: P = [end[0] + (dx / n) * widths[widths.length - 1] * 0.45, end[1] + (dy / n) * widths[widths.length - 1] * 0.45];
  return smooth([...L, ...(capEnd ? [tip] : []), ...R.reverse()]);
}

export type Build = "girl" | "woman" | "man" | "boy";
export type Hair = "ponytail" | "bob" | "short" | "cap" | "bun" | "long";
export type Outfit = "nightgown" | "cardigan" | "coat" | "jacket" | "oilskin" | "tee" | "dress";

export type Pose = {
  headTilt?: number; // + looks up (deg)
  headTurn?: number; // 0 profile .. 1 toward camera (narrows the face, shows more hair mass)
  lean?: number; // torso lean forward (deg)
  armF?: [number, number]; // front arm: shoulder angle from hanging (+ forward/up), elbow bend (+ forward)
  armB?: [number, number];
  legF?: number; legB?: number; // hip swing (+ forward)
  kneeF?: number; kneeB?: number; // knee bend
  mouth?: number; // 0 closed .. 1 parted (awe)
  breathe?: number; // 0..1
};

export type PersonProps = {
  build: Build; hair?: Hair; outfit?: Outfit; ribbon?: boolean; scarf?: boolean; beard?: boolean;
  pose?: Pose; x: number; y: number; scale?: number; dir?: 1 | -1;
  fill?: string; rim?: string; rimSide?: 1 | -1; rimW?: number; rimOpacity?: number;
  opacity?: number; phone?: number; t?: number; blur?: number;
};

type Dim = { H: number; head: number; sh: number; hip: number; chest: number; back: number; limb: number; curvy: number };
const DIM: Record<Build, Dim> = {
  woman: { H: 166, head: 23, sh: 137, hip: 86, chest: 13, back: 10, limb: 1.0, curvy: 1 },
  man: { H: 178, head: 24, sh: 148, hip: 93, chest: 14, back: 12, limb: 1.18, curvy: 0 },
  girl: { H: 122, head: 21, sh: 96, hip: 60, chest: 8.5, back: 7.5, limb: 0.74, curvy: 0 },
  boy: { H: 142, head: 22, sh: 113, hip: 72, chest: 10, back: 9, limb: 0.86, curvy: 0 },
};

/** profile head outline in head-height units, origin at head centre, facing +x */
function headOutline(build: Build, mouth: number) {
  const child = build === "girl" || build === "boy";
  const nose = child ? 0.43 : build === "man" ? 0.53 : 0.49;
  const m = mouth * 0.05;
  return smooth([
    [-0.04, -0.54], [0.18, -0.49], [0.32, -0.36], [0.385, -0.18], [0.38, -0.1], // crown → forehead → brow
    [0.355, -0.05], [0.385, 0.01], [nose, 0.13], [nose - 0.04, 0.165], [0.385, 0.18], // eye notch, bridge, nose
    [0.41, 0.235], [0.375, 0.27 + m * 0.4], [0.4, 0.3 + m], [0.35, 0.355 + m], // lips
    [child ? 0.335 : 0.365, 0.44 + m * 0.8], [0.2, 0.5], [0.06, 0.53], // chin, jaw, throat
    [-0.14, 0.48], [-0.32, 0.34], [-0.46, 0.08], [-0.45, -0.2], [-0.3, -0.45], // nape → back of skull
  ]);
}

function hairShapes(hair: Hair, build: Build, t: number, turn: number): string[] {
  const s = Math.sin(t * 1.1) * 0.025;
  const longTail = build === "woman" ? 1.05 : 0.78;
  switch (hair) {
    case "ponytail":
      return [
        smooth([[-0.06, -0.6], [0.2, -0.56], [0.36, -0.42], [0.42, -0.24], [0.33, -0.2], [0.24, -0.33], [0.06, -0.38], [-0.16, -0.28], [-0.36, -0.08], [-0.5, -0.12], [-0.52, -0.36], [-0.34, -0.54]]),
        smooth([[-0.48, -0.16], [-0.66, -0.06 + s], [-0.74, 0.22 + s], [-0.7, longTail * 0.8 + s], [-0.62, longTail + s], [-0.58, 0.5], [-0.56, 0.12], [-0.46, -0.02]]),
      ];
    case "bob":
      return [smooth([[-0.04, -0.62], [0.24, -0.56], [0.42, -0.36], [0.42, -0.2], [0.3, -0.26], [0.14, -0.34], [0.06, -0.16], [0.08, 0.2], [0.02, 0.5], [-0.2, 0.66 + s], [-0.46, 0.6], [-0.6, 0.3], [-0.58, -0.18], [-0.4, -0.5]])];
    case "long":
      return [smooth([[-0.04, -0.62], [0.24, -0.56], [0.42, -0.36], [0.42, -0.2], [0.28, -0.28], [0.1, -0.32], [0.04, -0.1], [0.06, 0.4], [-0.04, 1.1 + s], [-0.3, 1.25 + s], [-0.52, 1.0], [-0.6, 0.4], [-0.58, -0.18], [-0.4, -0.5]])];
    case "bun":
      return [
        smooth([[-0.06, -0.6], [0.2, -0.56], [0.36, -0.42], [0.42, -0.24], [0.33, -0.22], [0.2, -0.34], [0.0, -0.36], [-0.2, -0.26], [-0.42, -0.06], [-0.5, -0.24], [-0.44, -0.46], [-0.26, -0.58]]),
        smooth([[-0.42, -0.5], [-0.58, -0.62], [-0.74, -0.52], [-0.72, -0.32], [-0.56, -0.28], [-0.44, -0.36]]),
      ];
    case "cap":
      return [smooth([[-0.08, -0.64], [0.2, -0.6], [0.36, -0.46], [0.42, -0.36], [0.74, -0.32], [0.76, -0.26], [0.34, -0.24], [0.0, -0.24], [-0.36, -0.18], [-0.5, -0.16], [-0.52, -0.4], [-0.36, -0.58]])];
    case "short":
    default:
      return [smooth([[-0.06, -0.6], [0.2, -0.56], [0.37, -0.42], [0.41, -0.26], [0.32, -0.26], [0.2, -0.36], [0.0, -0.34], [-0.22, -0.24], [-0.44, -0.04], [-0.5, -0.26], [-0.44, -0.46], [-0.26, -0.58]])];
  }
}

function joint(o: P, ang: number, len: number): P {
  return [o[0] + Math.sin(rad(ang)) * len, o[1] + Math.cos(rad(ang)) * len];
}

/** all outlines of one figure, in its local frame */
function figureShapes(p: PersonProps) {
  const D = DIM[p.build];
  const k = D.limb;
  const pose = p.pose ?? {};
  const { headTilt = 0, lean = 0, armF = [6, 8], armB = [-4, 6], legF = 2, legB = -2, kneeF = 0, kneeB = 0, mouth = 0, breathe = 0 } = pose;
  const t = p.t ?? 0;
  const shY = -D.sh, hipY = -D.hip, torsoH = D.sh - D.hip;
  const ch = D.chest * (1 + 0.025 * breathe);
  const cv = D.curvy;
  // torso + neck (profile)
  const torso = smooth([
    [-2.6 * k, shY - 7], [2.8 * k, shY - 7.5], // neck
    [4.2 * k, shY - 1], [ch * 0.62, shY + 2.5], [ch * (0.9 + 0.1 * cv), shY + torsoH * 0.28], [ch * (0.72 + 0.1 * cv), shY + torsoH * 0.42],
    [ch * 0.6, shY + torsoH * 0.62], [ch * 0.7, shY + torsoH * 0.86], [ch * 0.6, hipY + 7],
    [-D.back * (0.82 + 0.25 * cv), hipY + 8], [-D.back * (1.0 + 0.25 * cv), hipY], [-D.back * 0.66, shY + torsoH * 0.72],
    [-D.back * 0.86, shY + torsoH * 0.3], [-D.back * 0.8, shY + 2], [-4.2 * k, shY - 2],
  ]);
  // legs
  const hip: P = [-1, hipY + 2];
  const legLen = D.hip - 6;
  const legShape = (swing: number, knee: number) => {
    const kneeP = joint(hip, swing, legLen * 0.5);
    const ank = joint(kneeP, swing - knee, legLen * 0.47);
    const toe: P = [ank[0] + 10 * k, ank[1] + 3.5];
    return {
      leg: taper([hip, joint(hip, swing, legLen * 0.24), kneeP, joint(kneeP, swing - knee, legLen * 0.22), ank], [16 * k, 13 * k, 9.5 * k, 9.5 * k, 6 * k], false),
      foot: smooth([[ank[0] - 3.5 * k, ank[1] - 2], [ank[0] + 3 * k, ank[1] - 2.5], [toe[0], toe[1] - 1.2], [toe[0], toe[1] + 1.4], [ank[0] - 4 * k, ank[1] + 3.6]]),
    };
  };
  const lf = legShape(legF, kneeF), lb = legShape(legB, kneeB);
  // arms
  const sh: P = [0.5, shY + 4];
  const armLen = torsoH * 1.18;
  const armShape = (a: [number, number]) => {
    const el = joint(sh, a[0], armLen * 0.5);
    const wr = joint(el, a[0] + a[1], armLen * 0.44);
    const hand = joint(wr, a[0] + a[1], 6.5 * k);
    return { arm: taper([[sh[0] - 1, sh[1] - 2], joint(sh, a[0], armLen * 0.25), el, joint(el, a[0] + a[1], armLen * 0.22), wr, hand], [12.5 * k, 8.8 * k, 6.6 * k, 6.2 * k, 4.8 * k, 4.4 * k]), hand };
  };
  const af = armShape(armF), ab = armShape(armB);
  // garments
  const hem = (f: number) => -D.hip * (1 - f);
  let garment: string | null = null;
  if (p.outfit === "nightgown") garment = smooth([[-D.back * 0.7, shY + 1], [ch * 0.6, shY + 2], [ch * 0.95, shY + torsoH * 0.4], [ch * 1.2, hipY], [ch * 1.9, hem(0.75)], [ch * 0.2, hem(0.73)], [-D.back * 1.8, hem(0.75)], [-D.back * 1.15, hipY]]);
  if (p.outfit === "dress") garment = smooth([[-D.back * 0.7, shY + 1], [ch * 0.6, shY + 2], [ch * 0.95, shY + torsoH * 0.4], [ch * 1.0, hipY], [ch * 1.6, hem(0.55)], [-D.back * 1.6, hem(0.55)], [-D.back * 1.1, hipY]]);
  if (p.outfit === "cardigan") garment = smooth([[-D.back * 0.9, shY + 1], [ch * 0.7, shY + 2], [ch * 1.05, shY + torsoH * 0.4], [ch * 1.05, hipY + 6], [ch * 1.1, hem(0.16)], [-D.back * 1.35, hem(0.16)], [-D.back * 1.2, hipY]]);
  if (p.outfit === "coat") garment = smooth([[-D.back * 0.95, shY + 1], [ch * 0.75, shY + 2], [ch * 1.1, shY + torsoH * 0.4], [ch * 1.15, hipY + 6], [ch * 1.4, hem(0.42)], [-D.back * 1.5, hem(0.42)], [-D.back * 1.25, hipY]]);
  if (p.outfit === "oilskin" || p.outfit === "jacket") garment = smooth([[-D.back * 1.0, shY + 0], [ch * 0.8, shY + 1], [ch * 1.15, shY + torsoH * 0.4], [ch * 1.15, hipY + 4], [ch * 1.2, hem(p.outfit === "oilskin" ? 0.14 : 0.04)], [-D.back * 1.35, hem(p.outfit === "oilskin" ? 0.14 : 0.04)], [-D.back * 1.25, hipY]]);
  const headC: P = [4.5 * k, shY - D.head * 0.55];
  return { D, torso, lf, lb, af, ab, garment, headC, headTilt, lean, hipY, mouth, t };
}

const Figure: React.FC<{ p: PersonProps; color: string }> = ({ p, color }) => {
  const f = figureShapes(p);
  const { D } = f;
  const hairs = hairShapes(p.hair ?? "short", p.build, f.t, p.pose?.headTurn ?? 0);
  const red = color === "__rim" ? null : "#a3212b";
  const fill = color === "__rim" ? (p.rim ?? "#c9dcf2") : color;
  return (
    <g transform={`rotate(${f.lean}, 0, ${f.hipY})`} fill={fill}>
      <path d={f.ab.arm} />
      <path d={f.lb.leg} /><path d={f.lb.foot} />
      <path d={f.lf.leg} /><path d={f.lf.foot} />
      <path d={f.torso} />
      {f.garment && <path d={f.garment} />}
      <g transform={`translate(${f.headC[0]},${f.headC[1]}) rotate(${-f.headTilt}) scale(${D.head})`}>
        <path d={headOutline(p.build, f.mouth)} />
        {hairs.map((d, i) => <path key={i} d={d} />)}
        {p.beard && <path d={smooth([[0.06, 0.14], [0.36, 0.2], [0.44, 0.4], [0.3, 0.58], [0.04, 0.56], [-0.12, 0.34]])} />}
        {p.ribbon && red && (p.hair === "ponytail") && <path d={smooth([[-0.46, -0.24], [-0.62, -0.32], [-0.68, -0.14], [-0.56, -0.08], [-0.64, 0.06], [-0.48, 0.0]])} fill={red} />}
      </g>
      {p.scarf && red && <path d={smooth([[-D.back * 0.8, -D.sh - 4], [D.chest * 0.55, -D.sh - 3], [D.chest * 0.7, -D.sh + 6], [0, -D.sh + 8], [-D.back * 0.75, -D.sh + 18], [-D.back * 1.05, -D.sh + 16], [-D.back * 1.0, -D.sh + 2]])} fill={red} />}
      <path d={f.af.arm} />
    </g>
  );
};

export const Person: React.FC<PersonProps> = (p) => {
  const { x, y, scale = 1, dir = 1, fill = "#0b0f16", rimSide = -1, rimW = 1.6, rimOpacity = 0.9, opacity = 1, phone = 0, blur = 0 } = p;
  const f = figureShapes(p);
  return (
    <g transform={`translate(${x},${y}) scale(${scale * dir},${scale})`} opacity={opacity} style={blur ? { filter: `blur(${blur}px)` } : undefined}>
      {/* rim light: the same silhouette in light colour, nudged toward the light source */}
      {rimOpacity > 0 && (
        <g transform={`translate(${rimSide * dir * rimW},${-rimW * 0.35})`} opacity={rimOpacity} style={{ filter: `blur(${0.18 * scale}px)` }}>
          <Figure p={p} color="__rim" />
        </g>
      )}
      <Figure p={p} color={fill} />
      {phone > 0 && (
        <g transform={`rotate(${f.lean}, 0, ${f.hipY}) translate(${f.af.hand[0]},${f.af.hand[1] - 3}) rotate(-15)`}>
          <circle r={16} fill="url(#phoneGlow)" opacity={0.6 * phone} />
          <rect x={-2.4} y={-4.4} width={4.8} height={8.8} rx={0.9} fill="#d8ecff" opacity={phone} />
        </g>
      )}
    </g>
  );
};

export const PeopleDefs: React.FC = () => (
  <defs>
    <radialGradient id="phoneGlow"><stop offset="0%" stopColor="#cfe6ff" stopOpacity={0.9} /><stop offset="100%" stopColor="#cfe6ff" stopOpacity={0} /></radialGradient>
  </defs>
);
