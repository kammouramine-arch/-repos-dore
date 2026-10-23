import React from "react";
import { useCurrentFrame } from "remotion";
import { add, angleOf, fromAngle, ik2, len, lerpV, mul, norm, QC, rot, sub, V } from "./math";
import { Expr, EXPR, Face } from "./Face";
import { Hand, HandKind } from "./Hands";

/**
 * THE SKIP BUTTON — one reusable vector rig for every character.
 * Proportions are measured from the supplied character reference (units = reference pixels; the
 * protagonist stands ~1205 units tall from sole to hair tips) and are LOCKED: every shot draws the
 * same skeleton, only joint targets change. Limbs are solved with two-bone IK so bones never stretch.
 */
export const P = {
  hipY: 485, // pelvis height above ground when standing
  thigh: 205,
  shin: 205,
  ankleY: 75, // ankle height above the sole
  hipHalf: 62, // half distance between hip joints (front view)
  shoulderY: 335, // shoulders above pelvis
  neckY: 365, // shirt neckline above pelvis
  shoulderHalf: 100,
  upper: 165,
  fore: 160,
  headR: 128,
  headUp: 160, // head centre above the neckline
  limbW: 20, // arm / shin thickness (white)
  line: 5, // outline width
};
export const INK = "#14161a"; // outline colour (near-black, like the reference)
export const SKIN = "#ffffff";

export type Look = {
  shirt: string; // T-shirt / top colour
  shirtShade?: string;
  sleeves?: "short" | "long";
  bottoms: "shorts" | "pants" | "skirt";
  bottomColor: string;
  bottomShade?: string;
  cuff?: string; // rolled-cuff colour (shorts)
  shoes: string;
  shoeLine?: string;
  hair: "kid" | "kidOlder" | "mom" | "momGray" | "dad" | "dadGray" | "bun" | "long" | "cap" | "bald" | "short" | "curly" | "messy";
  hood?: boolean; // hoodie: hood folded behind the neck, drawstrings, kangaroo pocket
  capColor?: string;
  badge?: boolean; // uniform shirt: small badge + epaulette line
  hairColor?: string;
  glasses?: boolean;
  mustache?: boolean;
  stubble?: number; // 0..1 (subtle ageing for the protagonist)
  shirtLen?: number; // extra length of the top (cardigans)
  build?: number; // torso width multiplier
};

export const KID: Look = { shirt: "#141518", shirtShade: "#24262b", sleeves: "short", bottoms: "shorts", bottomColor: "#4f79a7", bottomShade: "#3f6690", cuff: "#6f95bf", shoes: "#ffffff", hair: "kid" };
export const KID_OLDER: Look = { ...KID, hair: "kidOlder", stubble: 0.55 };
export const MOM: Look = { shirt: "#8a4b4f", shirtShade: "#74393d", sleeves: "long", bottoms: "skirt", bottomColor: "#3b4152", bottomShade: "#30364a", shoes: "#5b4636", shoeLine: INK, hair: "mom", hairColor: "#4a3a33", shirtLen: 30 };
export const DAD: Look = { shirt: "#5f6a4e", shirtShade: "#4f5941", sleeves: "long", bottoms: "pants", bottomColor: "#4b4d55", bottomShade: "#3e4048", shoes: "#3b302a", shoeLine: INK, hair: "dad", hairColor: "#3a332e", glasses: true, mustache: true, build: 1.06 };
export const DAD_OLD: Look = { ...DAD, hair: "dadGray", hairColor: "#c9c6c0", shirt: "#6b6656", shirtShade: "#5a5547" };
export const MOM_OLDER: Look = { ...MOM, hair: "momGray", hairColor: "#b9b4ae" };

export type HandPose = { at: V; kind?: HandKind; ang?: number; thumb?: 1 | -1; front?: boolean; overHead?: boolean; obj?: "phone" | "phoneLit" | "mug" | "none"; objAng?: number; screenToCam?: boolean };
export type FootPose = { at: V; ang?: number };
export type Pose = {
  root: V; // pelvis (local coords: x right, y down, ground at y = 0)
  yaw: number; // body yaw in degrees: 0 = facing camera, +90 = facing screen-right, -90 = screen-left, 180 = back
  headYaw?: number;
  lean?: number; // torso lean toward the facing direction (deg)
  headTilt?: number; // + nods the head down/forward
  L: HandPose;
  R: HandPose;
  fL: FootPose;
  fR: FootPose;
  expr?: Expr | keyof typeof EXPR;
  look?: V; // pupil offset -1..1
  look2?: V; // independent offset for the screen-right eye (the double's drifting eyes)
  brim?: number; // 0..1 shadow over the upper face (the driver's cap brim)
  blink?: number; // 0 open .. 1 closed
  breathe?: number; // 0..1 phase amplitude
  sit?: boolean;
  stoop?: number; // extra upper-back curve (elderly)
  talk?: number; // 0..1 mouth moves as if speaking (no audible dialogue)
};

const sgn = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const d2r = Math.PI / 180;

/** Rounded tube along a polyline (outline drawn underneath, fill on top, so joints stay seamless). */
const Tube: React.FC<{ pts: V[]; w: number; fill: string; line?: number; stroke?: string }> = ({ pts, w, fill, line = P.line, stroke = INK }) => {
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
  return (
    <g>
      <path d={d} stroke={stroke} strokeWidth={w + line * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={fill} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

/** Quad between two points with widths wa→wb (used for sleeves, thigh tubes, trouser legs). */
const quad = (a: V, b: V, wa: number, wb: number) => {
  const u = norm(sub(b, a));
  const n: V = [-u[1], u[0]];
  const p1 = add(a, mul(n, wa / 2)), p2 = add(b, mul(n, wb / 2)), p3 = sub(b, mul(n, wb / 2)), p4 = sub(a, mul(n, wa / 2));
  return { p1, p2, p3, p4, d: `M${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} L${p3[0]} ${p3[1]} L${p4[0]} ${p4[1]} Z` };
};

export type Solved = {
  shoulderL: V; shoulderR: V; elbowL: V; elbowR: V; wristL: V; wristR: V;
  hipL: V; hipR: V; kneeL: V; kneeR: V; ankleL: V; ankleR: V; neck: V; head: V; pelvis: V;
};

/** Solve the skeleton for a pose (also used by QC tools and by shots that need joint positions). */
export function solve(p: Pose, look?: Look): Solved {
  const phi = p.yaw * d2r;
  const c = Math.cos(phi), s = Math.sin(phi);
  const face = sgn(s); // facing direction on screen
  const lean = (p.lean ?? 0) * face; // lean only reads as rotation in profile
  const leanFront = (p.lean ?? 0) * Math.abs(c); // toward camera: foreshortening
  const build = look?.build ?? 1;
  const pelvis = p.root;
  const torsoLen = 1 - Math.max(0, leanFront) * 0.004;
  const breathe = (p.breathe ?? 0) * 3;
  const neck = add(pelvis, rot([0, -P.neckY * torsoLen - breathe], lean));
  const sc = add(pelvis, rot([0, -P.shoulderY * torsoLen - breathe], lean + (p.stoop ?? 0) * face * 0.5));
  // person's right side sits at screen x = -cos(phi) (front view: right appears on screen-left)
  const sh = P.shoulderHalf * build;
  const shoulderR = add(sc, rot([-sh * c, 0], lean));
  const shoulderL = add(sc, rot([sh * c, 0], lean));
  const hipR = add(pelvis, [-P.hipHalf * c, 0]);
  const hipL = add(pelvis, [P.hipHalf * c, 0]);
  const prof = Math.abs(s); // 0 front/back .. 1 profile
  // knees point the way the body faces; in front views the bend is toward camera → foreshorten
  const kneePref: V = [face * 1, 0.15];
  const flatLeg = 1 - prof;
  const legR = ik2(hipR, p.fR.at, P.thigh, P.shin, [kneePref[0] - 0.35 * c * (prof < 0.3 ? 1 : 0), kneePref[1]], flatLeg * 0.92, "legR");
  const legL = ik2(hipL, p.fL.at, P.thigh, P.shin, [kneePref[0] + 0.35 * c * (prof < 0.3 ? 1 : 0), kneePref[1]], flatLeg * 0.92, "legL");
  // elbows point backward/down (away from facing) and outward in front views
  const armPref = (side: 1 | -1): V => [-face * 0.8 * prof + side * -c * 0.9 * (1 - prof), 0.6];
  const flatArm = (1 - prof) * 0.55;
  const armR = ik2(shoulderR, p.R.at, P.upper, P.fore, armPref(-1), flatArm, "armR");
  const armL = ik2(shoulderL, p.L.at, P.upper, P.fore, armPref(1), flatArm, "armL");
  const head = add(neck, rot([0, -P.headUp], lean * 0.6 + (p.headTilt ?? 0) * face));
  return {
    shoulderL, shoulderR, elbowL: armL.mid, elbowR: armR.mid, wristL: armL.end, wristR: armR.end,
    hipL, hipR, kneeL: legL.mid, kneeR: legR.mid, ankleL: legL.end, ankleR: legR.end, neck, head, pelvis,
  };
}

/** Sneaker / shoe in side or front view, drawn around the ankle. */
const Shoe: React.FC<{ ankle: V; ang: number; face: number; prof: number; look: Look; back: boolean }> = ({ ankle, ang, face, prof, look, back }) => {
  const fill = look.shoes;
  const stroke = look.shoeLine ?? INK;
  if (prof > 0.35) {
    const sx = face >= 0 ? 1 : -1;
    const k = 0.55 + 0.45 * prof; // 3/4 shoes are a little shorter
    return (
      <g transform={`translate(${ankle[0]} ${ankle[1]}) scale(${sx * k} 1) rotate(${-ang})`}>
        <path d="M-38 -14 C-48 10 -50 40 -44 62 L-40 74 L96 74 C118 74 124 56 112 44 C96 30 70 24 52 18 C40 0 30 -18 14 -22 C-6 -26 -28 -24 -38 -14 Z" fill={fill} stroke={stroke} strokeWidth={P.line} strokeLinejoin="round" />
        <path d="M-44 56 L114 56" stroke={stroke} strokeWidth={P.line * 0.8} fill="none" />
        {look.shoes === "#ffffff" && <path d="M58 22 C78 30 98 38 110 48 L104 56 L52 56 C46 44 48 30 58 22 Z" fill="#f1f1ee" stroke={stroke} strokeWidth={P.line * 0.7} />}
        {look.shoes === "#ffffff" && [0, 1, 2].map((i) => <path key={i} d={`M${16 + i * 13} ${4 + i * 7} l12 -8`} stroke={stroke} strokeWidth={3.2} strokeLinecap="round" />)}
      </g>
    );
  }
  // front / back view: rounded toe box seen head-on
  return (
    <g transform={`translate(${ankle[0]} ${ankle[1]})`}>
      <path d="M-34 -10 C-56 18 -62 52 -56 70 L-50 76 L50 76 L56 70 C62 52 56 18 34 -10 C18 -22 -18 -22 -34 -10 Z" fill={fill} stroke={stroke} strokeWidth={P.line} strokeLinejoin="round" />
      <path d="M-58 58 L58 58" stroke={stroke} strokeWidth={P.line * 0.8} />
      {!back && look.shoes === "#ffffff" && (
        <>
          <path d="M-30 52 C-30 30 30 30 30 52" fill="#f1f1ee" stroke={stroke} strokeWidth={P.line * 0.7} />
          {[0, 1, 2].map((i) => <path key={i} d={`M-12 ${8 + i * 11} L12 ${8 + i * 11}`} stroke={stroke} strokeWidth={3.2} strokeLinecap="round" />)}
        </>
      )}
    </g>
  );
};

/** Hair styles drawn relative to the head centre (r = 128); `fx` is the face offset (yaw). */
const Hair: React.FC<{ look: Look; fx: number; c: number; layer: "back" | "front" }> = ({ look, fx, c, layer }) => {
  const r = P.headR;
  const col = look.hairColor ?? INK;
  const sw = P.line;
  switch (look.hair) {
    case "kid":
    case "kidOlder": {
      if (layer === "back") return null;
      // three thin strands rising from the crown, slightly left of centre (as in the reference)
      const o = -fx * 0.15;
      const strands = look.hair === "kid"
        ? [`M${o - 34} ${-r + 6} C${o - 44} ${-r - 22} ${o - 62} ${-r - 34} ${o - 76} ${-r - 36}`, `M${o - 12} ${-r + 2} C${o - 16} ${-r - 34} ${o - 22} ${-r - 60} ${o - 30} ${-r - 72}`, `M${o + 10} ${-r + 3} C${o + 12} ${-r - 26} ${o + 8} ${-r - 46} ${o + 2} ${-r - 58}`]
        : [`M${o - 34} ${-r + 6} C${o - 44} ${-r - 18} ${o - 60} ${-r - 26} ${o - 72} ${-r - 28}`, `M${o - 12} ${-r + 2} C${o - 16} ${-r - 28} ${o - 22} ${-r - 50} ${o - 30} ${-r - 60}`, `M${o + 10} ${-r + 3} C${o + 12} ${-r - 22} ${o + 8} ${-r - 38} ${o + 2} ${-r - 48}`];
      return <g>{strands.map((d, i) => <path key={i} d={d} stroke={INK} strokeWidth={6.5} fill="none" strokeLinecap="round" />)}</g>;
    }
    case "mom":
    case "momGray": {
      // soft shoulder-length bob: back mass behind the head, fringe over the crown
      if (layer === "back") return <path d={`M${-r - 10} ${-10} C${-r - 22} ${-r * 1.45} ${r + 22} ${-r * 1.45} ${r + 10} ${-10} C${r + 14} ${50} ${r + 4} ${92} ${r - 18} ${110} L${-r + 18} ${110} C${-r - 4} ${92} ${-r - 14} ${50} ${-r - 10} ${-10} Z`} fill={col} stroke={INK} strokeWidth={sw} />;
      const fr = fx * 0.35;
      return <path d={`M${-r - 4} ${-2} C${-r - 6} ${-r * 1.4} ${r + 6} ${-r * 1.4} ${r + 4} ${-2} C${r - 26 + fr} ${-58} ${fr + 30} ${-74} ${fr - 6} ${-62} C${fr - 40} ${-84} ${-r + 26 + fr} ${-56} ${-r - 4} ${-2} Z`} fill={col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />;
    }
    case "dad":
    case "dadGray": {
      if (layer === "back") return null;
      // receding hair: side tufts only, a few strands on top
      const side = (sx: number) => <path d={`M${sx * (r - 6)} ${-20} C${sx * (r + 8)} ${-60} ${sx * (r - 6)} ${-96} ${sx * (r - 34)} ${-108} C${sx * (r - 26)} ${-80} ${sx * (r - 22)} ${-50} ${sx * (r - 18)} ${-14} Z`} fill={col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />;
      const showL = c > -0.2 || fx > 0, showR = c > -0.2 || fx < 0;
      return (
        <g>
          {showR && side(-1)}
          {showL && side(1)}
          {[-18, 0, 18].map((x, i) => <path key={i} d={`M${x - fx * 0.1} ${-r + 2} q${6} ${-14} ${14} ${-16}`} stroke={look.hair === "dadGray" ? "#8a8781" : INK} strokeWidth={4} fill="none" strokeLinecap="round" />)}
        </g>
      );
    }
    case "bun":
      if (layer === "back") return <circle cx={-fx * 0.4} cy={-r - 18} r={44} fill={col} stroke={INK} strokeWidth={sw} />;
      return <path d={`M${-r - 2} ${-8} C${-r - 4} ${-r * 1.38} ${r + 4} ${-r * 1.38} ${r + 2} ${-8} C${r - 40} ${-56} ${-r + 40} ${-56} ${-r - 2} ${-8} Z`} fill={col} stroke={INK} strokeWidth={sw} />;
    case "long":
      if (layer === "back") return <path d={`M${-r - 8} ${-20} C${-r - 20} ${-r * 1.45} ${r + 20} ${-r * 1.45} ${r + 8} ${-20} L${r + 6} ${170} L${-r - 6} ${170} Z`} fill={col} stroke={INK} strokeWidth={sw} />;
      return <path d={`M${-r - 2} ${-4} C${-r - 4} ${-r * 1.38} ${r + 4} ${-r * 1.38} ${r + 2} ${-4} C${r - 50 + fx * 0.3} ${-70} ${-r + 50 + fx * 0.3} ${-70} ${-r + 4} ${-4} Z`} fill={col} stroke={INK} strokeWidth={sw} />;
    case "cap":
      if (layer === "back") return null;
      return (
        <g>
          <path d={`M${-r - 4} ${-34} C${-r - 2} ${-r * 1.42} ${r + 2} ${-r * 1.42} ${r + 4} ${-34} Z`} fill={look.capColor ?? col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <path d={`M${-r - 4} ${-34} L${r + 4} ${-34}`} stroke={INK} strokeWidth={sw} />
          {/* brim: seen from the front it is a flat band over the eyes, in profile it sticks out forward */}
          {Math.abs(fx) < 40 ? (
            <path d={`M${-r + 6 + fx} ${-36} C${-r + 20 + fx} ${-8} ${r - 20 + fx} ${-8} ${r - 6 + fx} ${-36} Z`} fill={look.capColor ?? col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          ) : (
            <path d={`M${sgn(fx) * 20} ${-40} L${sgn(fx) * (r + 64)} ${-30} C${sgn(fx) * (r + 70)} ${-22} ${sgn(fx) * (r + 50)} ${-18} ${sgn(fx) * (r + 30)} ${-20} L${sgn(fx) * 20} ${-26} Z`} fill={look.capColor ?? col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          )}
          <circle cx={fx * 0.3} cy={-r * 0.92} r={9} fill={INK} />
          {c < 0.3 && <path d={`M${-r * 0.92 - fx * 0.3} ${-30} C${-r * 0.95 - fx * 0.3} ${r * 0.95} ${r * 0.95 - fx * 0.3} ${r * 0.95} ${r * 0.92 - fx * 0.3} ${-30} Z`} fill={col} stroke={INK} strokeWidth={sw} opacity={Math.min(1, (0.3 - c) * 2)} />}
        </g>
      );
    case "short":
      if (layer === "back") return null;
      return <path d={`M${-r - 2} ${-24} C${-r - 4} ${-r * 1.38} ${r + 4} ${-r * 1.38} ${r + 2} ${-24} C${r - 50} ${-80} ${-r + 50} ${-80} ${-r + 2} ${-24} Z`} fill={col} stroke={INK} strokeWidth={sw} />;
    case "messy": {
      // short dark hair, uneven fringe, a couple of tufts sticking up at the crown
      if (layer === "back") return <path d={`M${-r - 6} ${-6} C${-r - 14} ${-r * 1.42} ${r + 14} ${-r * 1.42} ${r + 6} ${-6} C${r - 4} ${-40} ${r - 14} ${-60} ${r - 20} ${-66} L${-r + 20} ${-66} C${-r + 14} ${-60} ${-r + 4} ${-40} ${-r - 6} ${-6} Z`} fill={col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />;
      const o = fx * 0.3;
      if (c < -0.2) {
        // seen from behind / three-quarter back: the hair covers the back of the head down to the nape
        const k = 1;
        return (
          <g>
            <path d={`M${-r * 0.86 - fx * 0.3} ${r * 0.52} C${-r - 4 - fx * 0.3} ${r * 0.1} ${-r - 6 - fx * 0.3} ${-r * 0.9} ${-fx * 0.3} ${-r * 1.16} C${r + 6 - fx * 0.3} ${-r * 0.9} ${r + 4 - fx * 0.3} ${r * 0.1} ${r * 0.86 - fx * 0.3} ${r * 0.52} C${r * 0.5 - fx * 0.4} ${r * 0.78} ${-r * 0.5 - fx * 0.4} ${r * 0.78} ${-r * 0.86 - fx * 0.4} ${r * 0.52} Z`} fill={col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" opacity={k} />
            <path d={`M${-18 - fx * 0.3} ${-r - 8} q-8 -26 -30 -34 M${8 - fx * 0.3} ${-r - 10} q4 -24 22 -30`} stroke={col} strokeWidth={14} fill="none" strokeLinecap="round" />
            {k < 1 && <path d={`M${-r - 2} ${-20} C${-r - 6} ${-r * 1.42} ${r + 6} ${-r * 1.42} ${r + 2} ${-20} L${-r + 8} ${-44} Z`} fill={col} stroke={INK} strokeWidth={sw} opacity={1 - k} />}
          </g>
        );
      }
      const fringe = `M${-r - 2} ${-20} C${-r - 6} ${-r * 1.42} ${r + 6} ${-r * 1.42} ${r + 2} ${-20} L${r - 10 + o * 0.2} ${-40} L${r - 34 + o} ${-58} L${r - 52 + o} ${-46} L${36 + o} ${-74} L${12 + o} ${-58} L${-14 + o} ${-80} L${-40 + o} ${-60} L${-66 + o} ${-76} L${-92 + o * 0.6} ${-52} L${-r + 8} ${-44} Z`;
      const sd = fx >= 0 ? 1 : -1; // face side
      const backMass = c < 0.75 ? (
        <path d={`M${sd * r * 0.15} ${-r * 1.08} C${-sd * r * 0.75} ${-r * 1.15} ${-sd * (r + 12)} ${-r * 0.45} ${-sd * (r + 2)} ${r * 0.3} C${-sd * r * 0.8} ${r * 0.42} ${-sd * r * 0.45} ${r * 0.1} ${-sd * r * 0.2} ${-r * 0.35} Z`} fill={col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" opacity={Math.min(1, (0.75 - c) * 2.5)} />
      ) : null;
      return (
        <g>
          {backMass}
          <path d={fringe} fill={col} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <path d={`M${-18 - fx * 0.1} ${-r - 8} q-8 -26 -30 -34 M${8 - fx * 0.1} ${-r - 10} q4 -24 22 -30`} stroke={col} strokeWidth={14} fill="none" strokeLinecap="round" />
          <path d={`M${-18 - fx * 0.1} ${-r - 8} q-8 -26 -30 -34 M${8 - fx * 0.1} ${-r - 10} q4 -24 22 -30`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6} />
        </g>
      );
    }
    case "curly":
      if (layer === "back") return <g>{[-100, -60, -20, 20, 60, 100].map((x, i) => <circle key={i} cx={x} cy={-r + 12 + Math.abs(x) * 0.5} r={34} fill={col} stroke={INK} strokeWidth={sw} />)}</g>;
      // front: a row of curls along the hairline (shifted with the face)
      return <g>{[-0.8, -0.45, -0.1, 0.25, 0.6].map((k, i) => { const a = (-90 + k * 70) * Math.PI / 180; return <circle key={i} cx={Math.cos(a) * (r - 14) + fx * 0.15} cy={Math.sin(a) * (r - 14) + 6} r={28} fill={col} stroke={INK} strokeWidth={sw} />; })}</g>;
    default:
      return null;
  }
};

/** Pocket lip drawn over a forearm that enters a front pocket (front & 3/4 views). */
const PocketLip: React.FC<{ at: V; side: number; color: string }> = ({ at, side, color }) => (
  <path d={`M${at[0] - 26} ${at[1] + 4} C${at[0] - 8} ${at[1] - 8} ${at[0] + 14} ${at[1] - 8} ${at[0] + 28 * (side || 1)} ${at[1] + 6} L${at[0] + 26} ${at[1] + 30} L${at[0] - 24} ${at[1] + 30} Z`} fill={color} stroke={INK} strokeWidth={P.line * 0.9} strokeLinejoin="round" />
);

export const Person: React.FC<{ pose: Pose; look?: Look; x?: number; y?: number; scale?: number; t?: number; seed?: number; shadow?: number; tint?: string; qcName?: string }> = ({ pose, look = KID, x = 0, y = 0, scale = 1, t = 0, seed = 1, shadow = 0.28, tint, qcName = "char" }) => {
  const frame = useCurrentFrame();
  if (QC.on) QC.faults = [];
  const j = solve(pose, look);
  const phi = pose.yaw * d2r;
  const c = Math.cos(phi), s = Math.sin(phi);
  const face = sgn(s);
  const prof = Math.abs(s);
  const back = c < -0.25;
  const lean = (pose.lean ?? 0) * face;
  const build = look.build ?? 1;

  // --- automatic blink (deterministic per character) unless the shot overrides it
  const per = 3.1 + (seed % 5) * 0.37;
  const ph = (t + seed * 0.71) % per;
  const autoBlink = ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
  const blink = pose.blink ?? autoBlink;

  // ----- torso / shirt outline in torso-local coordinates (origin pelvis), then rotated by lean
  const wsF = 106 * build, wsP = 74 * build; // shoulder half widths (front / profile)
  const whF = 104 * build, whP = 80 * build;
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const shL = -lerp(wsF, wsP, prof), shR = lerp(wsF, wsP, prof) + 8 * prof; // chest side slightly fuller
  const hmL = -lerp(whF, whP, prof), hmR = lerp(whF, whP, prof) + 6 * prof;
  const hemY = 18 + (look.shirtLen ?? 0);
  const mirror = face < 0 ? -1 : 1; // profile asymmetry follows the facing side
  const X = (v: number) => v * mirror;
  const stoop = pose.stoop ?? 0;
  const top = -P.neckY;
  const shirtD = [
    `M${X(-30)} ${top + 4}`,
    `C${X(-62)} ${top + 4} ${X(shL + 26)} ${top + 10} ${X(shL + 2)} ${top + 42 - stoop}`,
    `C${X(shL - 6)} ${top + 120} ${X(hmL - 4)} ${-60} ${X(hmL)} ${hemY - 6}`,
    `C${X(hmL * 0.4)} ${hemY + 6} ${X(hmR * 0.4)} ${hemY + 6} ${X(hmR)} ${hemY - 6}`,
    `C${X(hmR + 6 * prof)} ${-80} ${X(shR + 10 * prof)} ${top + 120} ${X(shR)} ${top + 34}`,
    `C${X(shR - 26)} ${top + 10} ${X(62)} ${top + 4} ${X(30)} ${top + 4}`,
    "Z",
  ].join(" ");
  const torsoT = `translate(${j.pelvis[0]} ${j.pelvis[1]}) rotate(${lean})`;

  // ----- hands / arms
  const armSides: Array<{ side: "L" | "R"; z: number }> = [
    { side: "R", z: s },
    { side: "L", z: -s },
  ];
  const armDraw = (side: "L" | "R", late = false) => {
    const hp = side === "L" ? pose.L : pose.R;
    if (!!hp.overHead !== late) return null;
    const sh = side === "L" ? j.shoulderL : j.shoulderR;
    const el = side === "L" ? j.elbowL : j.elbowR;
    const wr = side === "L" ? j.wristL : j.wristR;
    const kind = hp.kind ?? "relax";
    const longSleeve = look.sleeves === "long";
    const sleeveLen = P.upper * 0.58;
    const u = norm(sub(el, sh));
    const sEnd = add(sh, mul(u, sleeveLen));
    const sleeve = quad(add(sh, mul(u, -18)), sEnd, 70, 78);
    const foreDir = norm(sub(wr, el));
    const handAng = hp.ang ?? angleOf(foreDir);
    // thumb side: side of the hand facing "forward + up" for profile views, toward the body midline for front/back
    const sideSign = side === "R" ? -1 : 1; // screen side of this arm in front view (scaled by cos)
    const n: V = rot(fromAngle(handAng), 90);
    const pref: V = prof > 0.5 ? [face * 0.75, -0.66] : [-sideSign * Math.sign(c || 1) * 1, -0.2];
    const thumb = hp.thumb ?? ((n[0] * pref[0] + n[1] * pref[1]) >= 0 ? 1 : -1);
    const farSide = (side === "R" && s < -0.35) || (side === "L" && s > 0.35);
    const sleeveCol = farSide ? look.shirtShade ?? look.shirt : look.shirt;
    return (
      <g key={side}>
        {longSleeve ? (
          <Tube pts={[sh, el, add(wr, mul(foreDir, -6))]} w={44} fill={sleeveCol} />
        ) : (
          <Tube pts={[sh, el, wr]} w={P.limbW} fill={SKIN} />
        )}
        {kind !== "pocket" && <Hand at={wr} ang={handAng} kind={kind} thumb={thumb} obj={hp.obj} objAng={hp.objAng} t={t} screenToCam={hp.screenToCam} />}
        {!longSleeve && (
          <g>
            <path d={sleeve.d} fill={sleeveCol} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />
          </g>
        )}
        {kind === "pocket" && prof < 0.75 && <PocketLip at={wr} side={sideSign} color={look.bottomColor} />}
      </g>
    );
  };

  // ----- legs
  const legDraw = (side: "L" | "R", part: "shin" | "thigh") => {
    const hip = side === "L" ? j.hipL : j.hipR;
    const knee = side === "L" ? j.kneeL : j.kneeR;
    const ankle = side === "L" ? j.ankleL : j.ankleR;
    const fp = side === "L" ? pose.fL : pose.fR;
    const shade = (side === "L" && s > 0.3) || (side === "R" && s < -0.3);
    if (part === "shin") {
      if (look.bottoms === "pants") {
        return (
          <g key={side + "s"}>
            <Tube pts={[knee, add(ankle, [0, -10])]} w={50} fill={shade ? look.bottomShade ?? look.bottomColor : look.bottomColor} />
            <Shoe ankle={ankle} ang={fp.ang ?? 0} face={face} prof={prof} look={look} back={back} />
          </g>
        );
      }
      return (
        <g key={side + "s"}>
          <Tube pts={[knee, ankle]} w={P.limbW + 2} fill={SKIN} />
          <Shoe ankle={ankle} ang={fp.ang ?? 0} face={face} prof={prof} look={look} back={back} />
        </g>
      );
    }
    // thigh tube (shorts / trousers / skirt panel)
    const col = shade ? look.bottomShade ?? look.bottomColor : look.bottomColor;
    if (look.bottoms === "skirt") return null;
    const u = norm(sub(knee, hip));
    const top = add(hip, mul(u, -30));
    const isShorts = look.bottoms === "shorts";
    const endPt = isShorts ? add(hip, mul(u, P.thigh * 0.96)) : add(knee, mul(u, 6));
    const q = quad(top, endPt, isShorts ? 92 : 74, isShorts ? 82 : 56);
    return (
      <g key={side + "t"}>
        <path d={q.d} fill={col} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />
        {isShorts && (() => {
          const c0 = add(hip, mul(u, P.thigh * 0.86));
          const cq = quad(c0, add(hip, mul(u, P.thigh * 1.0)), 90, 90);
          return <path d={cq.d} fill={look.cuff ?? col} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />;
        })()}
      </g>
    );
  };

  const shortsWaist = () => {
    if (look.bottoms === "skirt") {
      const kneeMid = lerpV(j.kneeL, j.kneeR, 0.5);
      const hemY = Math.max(j.kneeL[1], j.kneeR[1]) + 40;
      const sitting = pose.sit;
      const w0 = lerp(118, 86, prof) * build;
      if (sitting) {
        // skirt drapes over the lap toward the knees
        const kx = kneeMid[0] + face * 30;
        return <path d={`M${j.pelvis[0] - w0 * (face >= 0 ? 1 : 0.6)} ${j.pelvis[1] - 30} L${j.pelvis[0] + w0 * (face >= 0 ? 0.6 : 1)} ${j.pelvis[1] - 30} L${kx + face * 20} ${kneeMid[1] - 10} L${kx + face * 10} ${kneeMid[1] + 60} L${j.pelvis[0] - face * 40} ${j.pelvis[1] + 70} Z`} fill={look.bottomColor} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />;
      }
      return <path d={`M${j.pelvis[0] - w0} ${j.pelvis[1] - 30} L${j.pelvis[0] + w0} ${j.pelvis[1] - 30} L${j.pelvis[0] + w0 + 30} ${hemY} L${j.pelvis[0] - w0 - 30} ${hemY} Z`} fill={look.bottomColor} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />;
    }
    const w0 = lerp(112, 84, prof) * build;
    return (
      <g>
        <path d={`M${j.pelvis[0] - w0} ${j.pelvis[1] - 34} L${j.pelvis[0] + w0} ${j.pelvis[1] - 34} L${j.pelvis[0] + w0 * 0.98} ${j.pelvis[1] + 40} L${j.pelvis[0] - w0 * 0.98} ${j.pelvis[1] + 40} Z`} fill={look.bottomColor} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" transform={`rotate(${lean * 0.5} ${j.pelvis[0]} ${j.pelvis[1]})`} />
        {look.bottoms === "shorts" && !back && prof < 0.6 && (
          <g stroke={INK} strokeWidth={3} fill="none" opacity={0.8}>
            <path d={`M${j.pelvis[0] - 6} ${j.pelvis[1] - 10} L${j.pelvis[0] - 6} ${j.pelvis[1] + 34}`} />
            <path d={`M${j.pelvis[0] - 6} ${j.pelvis[1] + 34} q14 4 22 -12`} />
          </g>
        )}
      </g>
    );
  };

  // depth ordering: far limbs first
  const nearArm = s >= 0 ? "R" : "L";
  const farArm = nearArm === "R" ? "L" : "R";
  const nearLeg = nearArm, farLeg = farArm;
  const farHand = farArm === "L" ? pose.L : pose.R;
  const nearHand = nearArm === "L" ? pose.L : pose.R;
  const frontView = prof < 0.35 && !back;
  const backView = prof < 0.35 && back;

  // head
  const headYaw = pose.yaw + (pose.headYaw ?? 0);
  const hc = Math.cos(headYaw * d2r), hs = Math.sin(headYaw * d2r);
  const fx = hs * P.headR * 0.56;
  const headRot = lean * 0.6 + (pose.headTilt ?? 0) * (face || 1) * (prof > 0.3 ? 1 : 0.25);
  const nod = (pose.headTilt ?? 0) * (1 - prof) * 1.2; // front-view nod: face slides down

  const expr0: Expr = typeof pose.expr === "string" ? EXPR[pose.expr] : pose.expr ?? EXPR.neutral;
  const talkOpen = (pose.talk ?? 0) > 0 ? (pose.talk ?? 0) * Math.max(0, 0.5 * Math.sin(t * 13 + seed) + 0.35 * Math.sin(t * 7.3 + seed * 2) + 0.15) : 0;
  const expr: Expr = talkOpen > 0 ? { ...expr0, open: Math.max(expr0.open, talkOpen * 0.55) } : expr0;

  const body = (
    <g>
      {/* contact shadow */}
      {shadow > 0 && <ellipse cx={(j.ankleL[0] + j.ankleR[0]) / 2} cy={6} rx={170} ry={20} fill="#000" opacity={shadow} />}
      {/* far arm behind everything unless it reaches in front of the torso */}
      {!frontView && !farHand.front && armDraw(farArm)}
      {backView && armDraw("L")}
      {backView && armDraw("R")}
      {/* legs */}
      {legDraw(farLeg, "shin")}
      {legDraw(farLeg, "thigh")}
      {legDraw(nearLeg, "shin")}
      {legDraw(nearLeg, "thigh")}
      {shortsWaist()}
      {/* torso */}
      <g transform={torsoT}>
        {look.hood && !back && <path d={`M${X(-78)} ${top + 18} C${X(-92)} ${top - 34} ${X(92)} ${top - 34} ${X(78)} ${top + 18} Z`} fill={look.shirtShade ?? look.shirt} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />}
        <path d={shirtD} fill={look.shirt} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />
        {!back && prof < 0.7 && !look.hood && <path d={`M${X(-34) + fx * 0.2} ${top + 6} C${X(-24) + fx * 0.2} ${top + 30} ${X(24) + fx * 0.2} ${top + 30} ${X(34) + fx * 0.2} ${top + 6}`} stroke="#2c2f35" strokeWidth={6} fill="none" />}
        {look.hood && back && <path d={`M${-96} ${top + 10} C${-80} ${top + 120} ${80} ${top + 120} ${96} ${top + 10} C${60} ${top - 20} ${-60} ${top - 20} ${-96} ${top + 10} Z`} fill={look.shirtShade ?? look.shirt} stroke={INK} strokeWidth={P.line} strokeLinejoin="round" />}
        {look.hood && !back && prof < 0.8 && (
          <g>
            {/* drawstrings + kangaroo pocket */}
            <path d={`M${X(-22) + fx * 0.25} ${top + 22} l${X(-4)} 120 M${X(22) + fx * 0.25} ${top + 22} l${X(4)} 112`} stroke="#c9ccd2" strokeWidth={6} strokeLinecap="round" />
            <path d={`M${X(-70) + fx * 0.2} ${-30} L${X(70) + fx * 0.2} ${-30} L${X(84) + fx * 0.2} ${hemY - 18} L${X(-84) + fx * 0.2} ${hemY - 18} Z`} fill="none" stroke={look.shirtShade ?? INK} strokeWidth={5} strokeLinejoin="round" />
            <rect x={-120} y={hemY - 22} width={240} height={0.1} fill="none" />
          </g>
        )}
        {look.badge && !back && prof < 0.85 && <path d={`M${X(36) + fx * 0.2} ${top + 60} l${X(26)} 0 l0 30 l${X(-13)} 10 l${X(-13)} -10 Z`} fill="#b8a46a" stroke={INK} strokeWidth={3} />}
        {/* soft fold lines (loose tee) */}
        <path d={`M${X(hmL * 0.55)} ${-40} c${X(10)} ${30} ${X(6)} ${50} ${X(-4)} ${58}`} stroke={look.shirtShade ?? "#2a2c31"} strokeWidth={5} fill="none" opacity={0.9} />
      </g>
      {/* neck */}
      <Tube pts={[add(j.neck, [0, 10]), add(j.neck, rot([0, -34], lean))]} w={22} fill={SKIN} />
      {/* arms in front of torso */}
      {frontView && armDraw("L")}
      {frontView && armDraw("R")}
      {!frontView && !backView && farHand.front && armDraw(farArm)}
      {!frontView && !backView && armDraw(nearArm)}
      {/* head */}
      <g transform={`translate(${j.head[0]} ${j.head[1] + nod}) rotate(${headRot})`}>
        <Hair look={look} fx={fx} c={hc} layer="back" />
        <circle cx={0} cy={0} r={P.headR} fill={SKIN} stroke={INK} strokeWidth={P.line} />
        {hc > -0.3 && <Face fx={fx} c={hc} s={hs} expr={expr} look={pose.look ?? [0, 0]} look2={pose.look2} blink={blink} stubble={look.stubble ?? 0} glasses={look.glasses} mustache={look.mustache} />}
        {(pose.brim ?? 0) > 0 && hc > -0.3 && (
          <g opacity={pose.brim}>
            <defs>
              <linearGradient id={`brim${seed}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#020304" stopOpacity={0.98} />
                <stop offset="0.74" stopColor="#020304" stopOpacity={0.95} />
                <stop offset="1" stopColor="#020304" stopOpacity={0} />
              </linearGradient>
              <clipPath id={`headclip${seed}`}><circle cx={0} cy={0} r={P.headR - 2} /></clipPath>
            </defs>
            <rect x={-P.headR} y={-P.headR} width={P.headR * 2} height={P.headR * 1.42} fill={`url(#brim${seed})`} clipPath={`url(#headclip${seed})`} />
          </g>
        )}
        <Hair look={look} fx={fx} c={hc} layer="front" />
      </g>
      {/* hands that touch the face / head are drawn over it */}
      {armDraw("L", true)}
      {armDraw("R", true)}
      {/* phone glow on the face */}
      {(pose.L.obj === "phoneLit" || pose.R.obj === "phoneLit") && !back && (
        <circle cx={j.head[0] + fx * 0.6} cy={j.head[1] + 30} r={P.headR * 0.9} fill="url(#phoneGlow)" style={{ mixBlendMode: "screen" }} />
      )}
    </g>
  );

  if (QC.on && QC.faults.length) {
    // eslint-disable-next-line no-console
    console.warn(`[QC] F${QC.frame}|${look.hair}|${QC.faults.join(", ")}`); void frame;
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} style={tint ? { filter: tint } : undefined}>
      <defs>
        <radialGradient id="phoneGlow">
          <stop offset="0" stopColor="#9fd0ff" stopOpacity={0.28} />
          <stop offset="1" stopColor="#9fd0ff" stopOpacity={0} />
        </radialGradient>
      </defs>
      {body}
      {QC.on && QC.faults.length > 0 && <circle cx={j.pelvis[0]} cy={j.pelvis[1]} r={60} fill="none" stroke="red" strokeWidth={12} />}
    </g>
  );
};

/**
 * Make a pose physically reachable before drawing: standing/walking figures lower the pelvis until
 * both planted feet are within leg length (bent knees instead of floating feet); any remaining hand or
 * foot target beyond reach is pulled in along its limb. Limbs therefore never stretch or detach.
 */
export function settle(p: Pose, look?: Look): Pose {
  let q = p;
  const LM = (P.thigh + P.shin) * 0.99, AM = (P.upper + P.fore) * 0.99;
  if (!p.sit) {
    for (let it = 0; it < 4; it++) {
      const j = solve(q, look);
      const ex = Math.max(len(sub(q.fR.at, j.hipR)), len(sub(q.fL.at, j.hipL))) - LM;
      if (ex <= 0.3) break;
      q = { ...q, root: [q.root[0], q.root[1] + ex + 0.3] };
    }
  }
  const j = solve(q, look);
  const pull = (from: V, to: V, max: number): V => {
    const d = sub(to, from); const l = len(d);
    return l > max ? add(from, mul(d, max / l)) : to;
  };
  return {
    ...q,
    fR: { ...q.fR, at: pull(j.hipR, q.fR.at, LM) }, fL: { ...q.fL, at: pull(j.hipL, q.fL.at, LM) },
    R: { ...q.R, at: pull(j.shoulderR, q.R.at, AM) }, L: { ...q.L, at: pull(j.shoulderL, q.L.at, AM) },
  };
}
