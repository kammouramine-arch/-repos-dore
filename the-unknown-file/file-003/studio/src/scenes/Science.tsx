import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp, rng } from "../lib/anim";
import { boltGeometry } from "../components/Storm";
import { Tag } from "../components/UI";

/*
 * Scientific illustrations (U.S. National Weather Service — weather.gov/safety/lightning-*).
 *  - charge separation in a thunderstorm, stepped leader, upward streamers, return stroke
 *  - ways lightning injures people: direct strike, side flash, ground current (+ conduction, streamers)
 *  - effects on the body: nervous system, heart; most people struck survive (NWS), lasting injuries possible
 *  - vehicle: a hard-topped metal vehicle with windows closed offers protection (current follows the outer shell)
 * Drawn in a fixed 1920×1080 design space and scaled to the frame. Never claims to show Roy's own strikes.
 */
const INK = "rgba(236,230,218,0.82)", DIM = "rgba(236,230,218,0.38)", ACC = C.burgundyHi, BOLT = "#dfe6ff";

const Board: React.FC<{ children: React.ReactNode; tag?: string; src?: string }> = ({ children, tag = "SCIENTIFIC ILLUSTRATION", src = "SOURCE: U.S. NATIONAL WEATHER SERVICE" }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #121a26 0%, #05070a 75%)" }}>
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(236,230,218,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(236,230,218,0.035) 1px, transparent 1px)", backgroundSize: `${60 * u}px ${60 * u}px` }} />
      <svg viewBox={v ? "0 -420 1920 1920" : "0 0 1920 1080"} preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>{children}</svg>
      <div style={{ position: "absolute", right: 72 * u, top: 70 * u, fontFamily: F.mono, fontSize: 14 * u, letterSpacing: "0.2em", color: C.paperDim, border: `${1.2 * u}px solid rgba(236,230,218,0.35)`, padding: `${6 * u}px ${12 * u}px` }}>{tag}</div>
      <div style={{ position: "absolute", left: 72 * u, bottom: 46 * u, fontFamily: F.mono, fontSize: 12 * u, letterSpacing: "0.12em", color: "rgba(236,230,218,0.55)" }}>{src}</div>
    </AbsoluteFill>
  );
};

const boltPath = (from: [number, number], to: [number, number], seed: number, branches = 1, rough = 0.2) =>
  boltGeometry(from, to, seed, { branches, rough }).map((s) => ({ d: "M" + s.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L"), w: s.w, order: s.order, n: s.pts.length }));

const Glow: React.FC<{ d: string; w: number; a: number; dash?: number }> = ({ d, w, a, dash }) => (
  <g opacity={a}>
    <path d={d} fill="none" stroke="#9fb2ff" strokeWidth={w * 10} strokeOpacity={0.35} style={{ filter: "blur(6px)" }} strokeLinecap="round" strokeLinejoin="round" {...(dash !== undefined ? { strokeDasharray: 4000, strokeDashoffset: 4000 * (1 - dash) } : {})} />
    <path d={d} fill="none" stroke={BOLT} strokeWidth={w * 2.6} strokeLinecap="round" strokeLinejoin="round" {...(dash !== undefined ? { strokeDasharray: 4000, strokeDashoffset: 4000 * (1 - dash) } : {})} />
  </g>
);

const Label: React.FC<{ x: number; y: number; text: string; a: number; size?: number; color?: string; anchor?: "start" | "middle" | "end"; mono?: boolean; weight?: number }> = ({ x, y, text, a, size = 24, color = INK, anchor = "start", mono = true, weight = 400 }) => (
  <text x={x} y={y} fill={color} opacity={a} textAnchor={anchor} fontFamily={mono ? "IBM Plex Mono" : "Inter Variable"} fontWeight={weight} fontSize={size} letterSpacing={mono ? size * 0.14 : 0}>{text}</text>
);

/** simple standing person (outline) used in diagrams */
const PersonGlyph: React.FC<{ x: number; y: number; h: number; stroke?: string; fill?: string; a?: number }> = ({ x, y, h, stroke = INK, fill = "rgba(236,230,218,0.06)", a = 1 }) => {
  const s = h / 400;
  return (
    <g transform={`translate(${x - 120 * s},${y - 405 * s}) scale(${s})`} opacity={a}>
      <path d="M120 6 C138 6 146 20 146 36 C146 50 140 60 132 64 L132 72 C150 76 168 80 176 92 C186 110 190 150 196 196 C198 210 200 222 198 232 L188 234 C184 210 180 180 172 150 L168 196 C170 230 168 262 164 300 C162 330 160 360 158 384 C160 392 168 396 168 402 L140 402 C140 380 138 350 136 320 C134 290 130 260 120 236 C110 260 106 290 104 320 C102 350 100 380 100 402 L72 402 C72 396 80 392 82 384 C80 360 78 330 76 300 C72 262 70 230 72 196 L68 150 C60 180 56 210 52 234 L42 232 C40 222 42 210 44 196 C50 150 54 110 64 92 C72 80 90 76 108 72 L108 64 C100 60 94 50 94 36 C94 20 102 6 120 6 Z" fill={fill} stroke={stroke} strokeWidth={2.2 / s * 0.6} />
    </g>
  );
};

const Tree: React.FC<{ x: number; y: number; h: number; a?: number }> = ({ x, y, h, a = 1 }) => (
  <g opacity={a} stroke={INK} strokeWidth={2.2} fill="rgba(236,230,218,0.05)">
    <path d={`M${x - 8},${y} L${x - 6},${y - h * 0.38} L${x + 6},${y - h * 0.38} L${x + 8},${y} Z`} />
    <path d={`M${x},${y - h} C${x + h * 0.32},${y - h * 0.82} ${x + h * 0.36},${y - h * 0.5} ${x + h * 0.2},${y - h * 0.36} L${x - h * 0.2},${y - h * 0.36} C${x - h * 0.36},${y - h * 0.5} ${x - h * 0.32},${y - h * 0.82} ${x},${y - h} Z`} />
  </g>
);

// ── 1. how a cloud-to-ground strike forms ─────────────────────────────────────────────────
export const StormPhysics: React.FC<{ t: number; leaderAt?: number; strokeAt?: number }> = ({ t, leaderAt = 3.2, strokeAt = 5.4 }) => {
  const R = rng(9);
  const cloudA = ramp(t, 0, 0.8);
  const charges = ramp(t, 0.8, 2.4);
  const lead = ramp(t, leaderAt, strokeAt - 0.15, (k) => k);
  const stream = ramp(t, strokeAt - 0.8, strokeAt - 0.05);
  const I = t < strokeAt ? 0 : Math.max(Math.exp(-(t - strokeAt) / 0.08), 0.35 * Math.exp(-(t - strokeAt) / 1.2));
  const bolt = boltPath([980, 340], [1010, 860], 404, 1.3, 0.18);
  const plus = Array.from({ length: 16 }, () => [560 + R() * 820, 150 + R() * 70]);
  const minus = Array.from({ length: 22 }, () => [520 + R() * 900, 300 + R() * 60]);
  const gplus = Array.from({ length: 14 }, (_, i) => [600 + i * 55 + R() * 20, 905]);
  return (
    <Board>
      {/* cumulonimbus */}
      <g opacity={cloudA}>
        <path d="M430,380 C380,330 420,260 500,270 C520,190 620,170 680,210 C700,120 830,90 900,150 C950,80 1080,80 1130,150 C1200,110 1310,140 1320,220 C1420,200 1500,260 1480,330 C1540,350 1530,410 1470,420 L460,420 C420,420 400,400 430,380 Z" fill="rgba(160,175,200,0.08)" stroke={INK} strokeWidth={2.4} />
        <path d="M520,140 L1420,140" stroke={DIM} strokeDasharray="6 10" />
        <Label x={1500} y={150} text="ANVIL / CLOUD TOP" a={cloudA * 0.8} size={18} />
      </g>
      {plus.map(([x, y], i) => <Label key={`p${i}`} x={x} y={y} text="+" a={charges} size={34} color="#ffb0a0" anchor="middle" />)}
      {minus.map(([x, y], i) => <Label key={`m${i}`} x={x} y={y} text="−" a={charges} size={38} color="#a9c1ff" anchor="middle" />)}
      <Label x={1500} y={215} text="POSITIVE CHARGE (UPPER CLOUD)" a={charges} size={18} color="#ffb0a0" />
      <Label x={1500} y={330} text="NEGATIVE CHARGE (LOWER CLOUD)" a={charges} size={18} color="#a9c1ff" />
      {/* ground */}
      <path d="M200,900 L1720,900" stroke={INK} strokeWidth={2.4} />
      {gplus.map(([x, y], i) => <Label key={`g${i}`} x={x} y={y + 40} text="+" a={charges * 0.85} size={28} color="#ffb0a0" anchor="middle" />)}
      <Label x={200} y={975} text="POSITIVE CHARGE INDUCED ON THE GROUND BELOW" a={charges} size={18} color="#ffb0a0" />
      <Tree x={1110} y={900} h={170} />
      <PersonGlyph x={760} y={900} h={120} />
      {/* stepped leader (faint, branching, downward) */}
      {t < strokeAt && bolt.map((b, i) => <path key={i} d={b.d} fill="none" stroke="#c8d3ff" strokeWidth={b.order === 0 ? 2.2 : 1.2} strokeOpacity={0.55} strokeDasharray={1600} strokeDashoffset={1600 * (1 - Math.min(1, lead * (b.order === 0 ? 1 : 1.3)))} strokeLinecap="round" />)}
      <Label x={700} y={560} text="STEPPED LEADER" a={ramp(t, leaderAt + 0.2, leaderAt + 0.7) * (t < strokeAt ? 1 : 0.3)} size={22} />
      {/* upward streamers from tall objects */}
      <g opacity={stream * (t < strokeAt + 0.3 ? 1 : 0.2)} stroke="#c8d3ff" strokeWidth={2} fill="none">
        <path d={`M1110,730 L1095,${730 - 70 * stream}`} />
        <path d={`M1010,900 L1012,${900 - 60 * stream}`} />
        <path d={`M760,780 L768,${780 - 40 * stream}`} strokeOpacity={0.6} />
      </g>
      <Label x={1150} y={700} text="UPWARD STREAMERS" a={stream} size={22} />
      {/* return stroke */}
      {t >= strokeAt && bolt.map((b, i) => <Glow key={i} d={b.d} w={b.order === 0 ? 1.6 : 0.6} a={b.order === 0 ? I : I * Math.exp(-(t - strokeAt) / 0.2)} />)}
      <rect x={0} y={0} width={1920} height={1080} fill="#dfe6ff" opacity={0.25 * (t >= strokeAt ? Math.exp(-(t - strokeAt) / 0.07) : 0)} />
      <Label x={1060} y={520} text="RETURN STROKE" a={ramp(t, strokeAt + 0.1, strokeAt + 0.5)} size={26} color="#fff" weight={600} />
      <Label x={1060} y={556} text="AIR HEATED TO ~50,000 °F" a={ramp(t, strokeAt + 0.6, strokeAt + 1.1)} size={18} />
    </Board>
  );
};

// ── 2. ways lightning injures people ─────────────────────────────────────────────────────
export const Mechanisms: React.FC<{ t: number; at?: [number, number, number]; extra?: number }> = ({ t, at = [0.5, 2.5, 4.5], extra }) => {
  const panel = (i: number, x: number, title: string, sub: string, draw: (k: number, I: number) => React.ReactNode) => {
    const k = ramp(t, at[i], at[i] + 0.8, easeOut);
    const ts = at[i] + 0.9;
    const I = t < ts ? 0 : Math.max(Math.exp(-(t - ts) / 0.1), 0.25);
    return (
      <g key={i} opacity={0.25 + 0.75 * k}>
        <rect x={x} y={170} width={560} height={720} fill="rgba(236,230,218,0.025)" stroke={DIM} strokeWidth={1.4} />
        <Label x={x + 280} y={240} text={title} a={1} size={30} anchor="middle" color="#fff" mono={false} weight={800} />
        <Label x={x + 280} y={276} text={sub} a={0.9} size={15} anchor="middle" />
        <path d={`M${x + 30},780 L${x + 530},780`} stroke={INK} strokeWidth={2} />
        {draw(k, I)}
      </g>
    );
  };
  const b1 = boltPath([270, 300], [285, 625], 501, 0.4, 0.14);
  const b2 = boltPath([960, 300], [1010, 560], 502, 0.4, 0.14);
  const b3 = boltPath([1470, 300], [1490, 780], 503, 0.5, 0.16);
  return (
    <Board>
      {panel(0, 40, "DIRECT STRIKE", "THE PERSON BECOMES PART OF THE CHANNEL", (k, I) => (
        <>
          <PersonGlyph x={290} y={780} h={160} />
          {I > 0 && b1.map((b, j) => <Glow key={j} d={b.d} w={b.order ? 0.5 : 1.3} a={I} />)}
          <Label x={320} y={850} text="RARE · OFTEN THE MOST SEVERE" a={k} size={16} anchor="middle" color="#ffb0a0" />
        </>
      ))}
      {panel(1, 680, "SIDE FLASH", "CURRENT JUMPS FROM A NEARBY TALL OBJECT", (k, I) => (
        <>
          <Tree x={1010} y={780} h={250} />
          <PersonGlyph x={900} y={780} h={160} />
          {I > 0 && b2.map((b, j) => <Glow key={j} d={b.d} w={b.order ? 0.5 : 1.3} a={I} />)}
          {I > 0 && <Glow d="M1000,620 L960,650 L975,662 L925,690" w={0.8} a={I} />}
          <Label x={960} y={850} text="E.G. SHELTERING UNDER A TREE" a={k} size={16} anchor="middle" color="#ffb0a0" />
        </>
      ))}
      {panel(2, 1320, "GROUND CURRENT", "CURRENT SPREADS THROUGH THE GROUND", (k, I) => (
        <>
          <PersonGlyph x={1690} y={780} h={160} />
          {I > 0 && b3.map((b, j) => <Glow key={j} d={b.d} w={b.order ? 0.5 : 1.3} a={I} />)}
          {[1, 2, 3, 4].map((r) => {
            const p = clamp((t - at[2] - 0.9) * 1.6 - r * 0.15);
            return p > 0 ? <ellipse key={r} cx={1490} cy={782} rx={60 * r * p + 10} ry={10 * r * p + 3} fill="none" stroke="#c8d3ff" strokeOpacity={(1 - p * 0.7) * 0.9} strokeWidth={2} /> : null;
          })}
          <Label x={1600} y={850} text="CAUSES THE MOST DEATHS & INJURIES" a={k} size={16} anchor="middle" color="#ffb0a0" />
        </>
      ))}
      {extra !== undefined && <Label x={960} y={960} text="THE NWS ALSO LISTS CONDUCTION (WIRES, METAL) AND UPWARD STREAMERS" a={ramp(t, extra, extra + 0.6)} size={18} anchor="middle" />}
    </Board>
  );
};

// ── 3. effects on the body ──────────────────────────────────────────────────────────────────
export const BodyEffects: React.FC<{ t: number; nerveAt?: number; heartAt?: number; killAt?: number }> = ({ t, nerveAt = 0.6, heartAt = 2.0, killAt = 3.6 }) => {
  const nv = ramp(t, nerveAt, nerveAt + 1.0);
  const hv = ramp(t, heartAt, heartAt + 0.6);
  const beat = 0.6 + 0.4 * Math.pow(Math.max(0, Math.sin(t * 7.2)), 8);
  const kv = ramp(t, killAt, killAt + 0.6);
  const cx = 760, top = 150, H = 820, s = H / 410;
  const P = (x: number, y: number) => `${cx - 120 * s + x * s},${top + y * s}`;
  return (
    <Board>
      <PersonGlyph x={cx} y={top + 405 * s} h={H} fill="rgba(236,230,218,0.04)" />
      {/* brain + spinal cord + nerves */}
      <g opacity={nv} stroke="#c8d3ff" fill="none" strokeLinecap="round">
        <ellipse cx={cx} cy={top + 34 * s} rx={20 * s} ry={18 * s} strokeWidth={3} fill="rgba(160,180,255,0.15)" />
        <path d={`M${P(120, 52)} L${P(120, 230)}`} strokeWidth={4} strokeDasharray={900} strokeDashoffset={900 * (1 - nv)} />
        {[[120, 100, 60, 200], [120, 100, 180, 200], [120, 150, 50, 230], [120, 150, 190, 230], [120, 230, 88, 390], [120, 230, 152, 390]].map(([x1, y1, x2, y2], i) => (
          <path key={i} d={`M${P(x1, y1)} Q${P((x1 + x2) / 2 + (x2 > x1 ? -8 : 8), (y1 + y2) / 2)} ${P(x2, y2)}`} strokeWidth={1.6} strokeOpacity={0.7} strokeDasharray={900} strokeDashoffset={900 * (1 - clamp(nv * 1.3 - 0.3))} />
        ))}
      </g>
      {/* heart */}
      <g opacity={hv} transform={`translate(${cx + 12 * s},${top + 118 * s}) scale(${s * beat * 0.9})`}>
        <path d="M0,8 C-14,-10 -32,4 -18,20 L0,36 L18,20 C32,4 14,-10 0,8 Z" fill="rgba(255,120,110,0.4)" stroke="#ff8a7a" strokeWidth={2} />
      </g>
      <g>
        <Label x={1150} y={330} text="LIGHTNING IS AN ENORMOUS" a={ramp(t, 0.1, 0.6)} size={40} color="#fff" mono={false} weight={800} />
        <Label x={1150} y={380} text="ELECTRICAL DISCHARGE" a={ramp(t, 0.1, 0.6)} size={40} color="#fff" mono={false} weight={800} />
        <Label x={1150} y={480} text="→ CAN DAMAGE THE NERVOUS SYSTEM" a={nv} size={24} color="#c8d3ff" />
        <Label x={1150} y={530} text="→ CAN DISRUPT THE HEART" a={hv} size={24} color="#ff8a7a" />
        <Label x={1150} y={580} text="→ IN SOME CASES, IT KILLS ALMOST INSTANTLY" a={kv} size={24} color={INK} />
        <Label x={1150} y={680} text="NWS: LIGHTNING IS PRIMARILY AN INJURY" a={kv} size={16} color={DIM} />
        <Label x={1150} y={706} text="TO THE NERVOUS SYSTEM" a={kv} size={16} color={DIM} />
      </g>
    </Board>
  );
};

// ── 4. most people struck survive (NWS) ─────────────────────────────────────────────────────
export const SurvivalStat: React.FC<{ t: number; at?: number; caveatAt?: number }> = ({ t, at = 0.4, caveatAt = 3 }) => {
  const k = ramp(t, at, at + 2.0, easeInOut);
  const n = 100;
  return (
    <Board src="SOURCE: U.S. NATIONAL WEATHER SERVICE (ABOUT 10% OF PEOPLE STRUCK ARE KILLED)">
      {Array.from({ length: n }, (_, i) => {
        const col = i % 20, row = Math.floor(i / 20);
        const x = 260 + col * 46, y = 330 + row * 92;
        const dead = i >= 90;
        const a = ramp(t, at + i * 0.012, at + i * 0.012 + 0.3);
        return <PersonGlyph key={i} x={x} y={y + 70} h={70} a={a} stroke={dead && k > 0.98 ? "#ff8a7a" : INK} fill={dead && k > 0.98 ? "rgba(255,120,110,0.25)" : "rgba(236,230,218,0.06)"} />;
      })}
      <Label x={1240} y={420} text="ABOUT 9 IN 10" a={ramp(t, at + 1.4, at + 2)} size={78} color="#fff" mono={false} weight={800} />
      <Label x={1240} y={480} text="PEOPLE STRUCK BY LIGHTNING SURVIVE" a={ramp(t, at + 1.6, at + 2.2)} size={24} />
      <Label x={1240} y={600} text="BUT MANY LIVE WITH LASTING EFFECTS:" a={ramp(t, caveatAt, caveatAt + 0.6)} size={22} color="#ffb0a0" />
      {["NERVE INJURY · CHRONIC PAIN", "MEMORY & CONCENTRATION PROBLEMS", "HEADACHES · DIZZINESS · SLEEP CHANGES"].map((l, i) => (
        <Label key={i} x={1240} y={650 + i * 40} text={`— ${l}`} a={ramp(t, caveatAt + 0.4 + i * 0.3, caveatAt + 0.9 + i * 0.3)} size={20} />
      ))}
    </Board>
  );
};

// ── 5. a hard-topped metal vehicle (windows closed) ───────────────────────────────────────
export const VehicleShell: React.FC<{ t: number; strikeAt?: number; noteAt?: number }> = ({ t, strikeAt = 1.4, noteAt = 4 }) => {
  const I = t < strikeAt ? 0 : Math.max(Math.exp(-(t - strikeAt) / 0.1), 0.3);
  const flow = ramp(t, strikeAt, strikeAt + 1.4, (k) => k);
  const shell = "M520,700 L520,612 L870,606 L880,512 C882,500 892,494 906,494 L1060,494 C1076,494 1086,500 1092,512 L1140,598 L1395,606 C1425,608 1440,622 1440,648 L1440,700";
  const bolt = boltPath([1000, 120], [985, 494], 601, 0.6, 0.15);
  return (
    <Board>
      <path d="M200,780 L1720,780" stroke={INK} strokeWidth={2} />
      <path d={`${shell} Z`} fill="rgba(236,230,218,0.05)" stroke={INK} strokeWidth={3} />
      <path d="M905,512 L1052,512 L1100,590 L905,592 Z" fill="rgba(160,190,220,0.12)" stroke={DIM} strokeWidth={2} />
      <path d="M560,612 L860,608" stroke={DIM} strokeWidth={2} />
      <circle cx={650} cy={720} r={62} fill="#05070a" stroke={INK} strokeWidth={3} />
      <circle cx={1290} cy={720} r={62} fill="#05070a" stroke={INK} strokeWidth={3} />
      {I > 0 && bolt.map((b, j) => <Glow key={j} d={b.d} w={b.order ? 0.5 : 1.3} a={I} />)}
      {/* current follows the outer metal shell to the ground (arrows) */}
      <path d={shell} fill="none" stroke="#c8d3ff" strokeWidth={5} strokeDasharray="30 22" strokeDashoffset={-flow * 400} opacity={flow > 0 ? 0.85 * (1 - ramp(t, strikeAt + 3, strikeAt + 4)) + 0.15 : 0} />
      <path d="M520,700 L500,780 M1440,700 L1460,780" stroke="#c8d3ff" strokeWidth={4} opacity={flow} />
      <Label x={960} y={890} text="CURRENT TENDS TO FOLLOW THE OUTER METAL SHELL TO THE GROUND" a={ramp(t, strikeAt + 0.6, strikeAt + 1.2)} size={22} anchor="middle" />
      <Label x={960} y={940} text="SAFE PRACTICE (NWS): HARD-TOPPED VEHICLE · WINDOWS CLOSED · AVOID TOUCHING METAL PARTS" a={ramp(t, noteAt, noteAt + 0.6)} size={18} anchor="middle" color="#ffb0a0" />
      <Label x={960} y={190} text="A HARD-TOPPED METAL VEHICLE" a={ramp(t, 0.1, 0.6)} size={46} anchor="middle" color="#fff" mono={false} weight={800} />
      <Label x={960} y={240} text="NORMALLY OFFERS PROTECTION — WITH THE WINDOWS CLOSED" a={ramp(t, 0.4, 0.9)} size={22} anchor="middle" />
    </Board>
  );
};

// ── 6. why him? physical conditions, not targeting ────────────────────────────────────────
export const Factors: React.FC<{ t: number; at?: number[] }> = ({ t, at = [0.4, 1.4, 2.4, 3.4] }) => {
  const items = ["ATMOSPHERIC ELECTRICITY", "THE SURROUNDING LANDSCAPE", "NEARBY OBJECTS", "THE PATHS DISCHARGES TAKE"];
  const glyph = (i: number, x: number, y: number) => {
    if (i === 0) return <g stroke={INK} fill="none" strokeWidth={2}><path d={`M${x - 90},${y + 10} C${x - 100},${y - 30} ${x - 50},${y - 50} ${x - 20},${y - 30} C${x},${y - 70} ${x + 70},${y - 60} ${x + 70},${y - 20} C${x + 110},${y - 20} ${x + 110},${y + 10} ${x + 80},${y + 10} Z`} /><text x={x - 40} y={y} fill="#a9c1ff" stroke="none" fontSize={28} fontFamily="IBM Plex Mono">− − −</text></g>;
    if (i === 1) return <path d={`M${x - 120},${y + 20} L${x - 60},${y - 50} L${x - 20},${y - 10} L${x + 30},${y - 70} L${x + 120},${y + 20} Z`} stroke={INK} fill="rgba(236,230,218,0.05)" strokeWidth={2} />;
    if (i === 2) return <><Tree x={x - 40} y={y + 30} h={110} /><path d={`M${x + 40},${y + 30} L${x + 40},${y - 70} M${x + 20},${y - 60} L${x + 60},${y - 60}`} stroke={INK} strokeWidth={3} /></>;
    return <path d={boltPath([x - 10, y - 80], [x + 10, y + 40], 777, 0.8, 0.22)[0].d} stroke={BOLT} strokeWidth={2.5} fill="none" />;
  };
  return (
    <Board src="LIGHTNING FOLLOWS PHYSICAL CONDITIONS · THERE IS NO EVIDENCE IT TARGETS INDIVIDUALS">
      <Label x={960} y={190} text="LIGHTNING BEHAVES ACCORDING TO PHYSICAL CONDITIONS" a={ramp(t, 0, 0.6)} size={40} anchor="middle" color="#fff" mono={false} weight={800} />
      {items.map((s, i) => {
        const x = 300 + i * 440, y = 560;
        const a = ramp(t, at[i], at[i] + 0.6, easeOut);
        return (
          <g key={i} opacity={a} transform={`translate(0,${(1 - a) * 20})`}>
            <rect x={x - 190} y={y - 200} width={380} height={420} fill="rgba(236,230,218,0.03)" stroke={DIM} />
            {glyph(i, x, y - 30)}
            <Label x={x} y={y + 150} text={s} a={1} size={19} anchor="middle" color="#fff" />
          </g>
        );
      })}
    </Board>
  );
};

/** lifetime odds (NWS 2009–2018 averages) — general population, not Roy's personal risk */
export const Odds: React.FC<{ t: number }> = ({ t }) => (
  <Board src="SOURCE: NWS, AVERAGES 2009–2018 · GENERAL U.S. POPULATION — NOT AN ESTIMATE OF ANY ONE PERSON'S RISK">
    <Label x={960} y={330} text="ODDS OF BEING STRUCK IN AN 80-YEAR LIFETIME (U.S.)" a={ramp(t, 0.1, 0.6)} size={24} anchor="middle" />
    <Label x={960} y={520} text="1 IN 15,300" a={ramp(t, 0.4, 1.0)} size={150} anchor="middle" color="#fff" mono={false} weight={800} />
    <Label x={960} y={640} text="IN A GIVEN YEAR: ABOUT 1 IN 1.2 MILLION" a={ramp(t, 1.2, 1.8)} size={24} anchor="middle" />
    <Label x={960} y={780} text="ROY'S OUTDOOR WORK MAY HAVE INCREASED HIS EXPOSURE —" a={ramp(t, 2.4, 3.0)} size={22} anchor="middle" color="#ffb0a0" />
    <Label x={960} y={820} text="BUT HIS PERSONAL RISK CANNOT BE CALCULATED FROM HIS STORY ALONE" a={ramp(t, 2.8, 3.4)} size={22} anchor="middle" color="#ffb0a0" />
  </Board>
);

export { Tag, lerp, easeOut };
