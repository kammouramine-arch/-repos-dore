import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeOut, lerp, ramp, rng } from "../lib/anim";

/*
 * EMU Portable Life Support System — simplified, technically faithful schematic (after the ICES-2015 failure
 * analysis, NTRS 20150003027): the fan, pump and water separator share one shaft (the "FPS", ~19,300 rpm).
 * Vent loop: helmet → suit → CO2 scrubber → fan → sublimator (cools, condenses) → water separator → helmet.
 * Cooling loop: pump → cooling garment (LCVG) → sublimator → pump; separated condensate returns to the cooling loop.
 * Failure: silica/silicate deposits blocked all 8 separator drum holes → cooling water spilled into the vent loop,
 * around the fan, and was blown into the helmet through the vent duct at the back of the head.
 */
const VENT = "#cfe3ee"; // oxygen flow
const COOL = "#3fa7d6"; // cooling water
const WARN = C.burgundyHi;

// node positions in a 1600×1000 diagram
export const N = {
  helmet: { x: 250, y: 230 }, suit: { x: 250, y: 610 }, scrub: { x: 640, y: 820 }, fan: { x: 900, y: 640 },
  subl: { x: 1180, y: 420 }, sep: { x: 1020, y: 470 }, pump: { x: 900, y: 760 }, lcvg: { x: 250, y: 830 },
};
const ventPath = `M${N.helmet.x + 60},${N.helmet.y + 40} C330,380 300,480 ${N.suit.x + 40},${N.suit.y} C340,760 480,830 ${N.scrub.x - 70},${N.scrub.y} L${N.scrub.x + 70},${N.scrub.y} C760,820 820,700 ${N.fan.x - 50},${N.fan.y} C960,600 1100,560 ${N.subl.x - 60},${N.subl.y + 20} C1140,380 1080,420 ${N.sep.x + 40},${N.sep.y} C900,420 700,200 ${N.helmet.x + 90},${N.helmet.y - 40}`;
const coolPath = `M${N.pump.x - 40},${N.pump.y} C760,760 500,900 ${N.lcvg.x + 90},${N.lcvg.y} C140,830 120,700 160,660 C210,640 700,560 ${N.subl.x - 40},${N.subl.y + 60} C1260,520 1100,800 ${N.pump.x + 40},${N.pump.y}`;
const spillPath = `M${N.sep.x},${N.sep.y + 20} C980,560 940,600 ${N.fan.x + 20},${N.fan.y - 30} C860,520 600,240 ${N.helmet.x + 80},${N.helmet.y - 30}`;

/** frame-exact point sampler for "M x,y C ... " paths (cubic segments only) */
function sampler(d: string) {
  const nums = d.replace(/[MC]/g, " ").trim().split(/[\s,]+/).map(Number);
  const segs: number[][] = [];
  let x = nums[0], y = nums[1];
  for (let i = 2; i + 5 < nums.length + 1; i += 6) { segs.push([x, y, nums[i], nums[i + 1], nums[i + 2], nums[i + 3], nums[i + 4], nums[i + 5]]); x = nums[i + 4]; y = nums[i + 5]; }
  return (p: number) => {
    const f = clamp(p) * segs.length; const k = Math.min(segs.length - 1, Math.floor(f)); const u = f - k;
    const [x0, y0, x1, y1, x2, y2, x3, y3] = segs[k]; const v = 1 - u;
    return { x: v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, y: v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3 };
  };
}
const spillAt = sampler(spillPath);

const GRAINS = (() => {
  const r = rng(4);
  return Array.from({ length: 220 }, () => ({ a: r() * Math.PI * 2, d: r(), k: r(), s: 1 + r() * 2.6 }));
})();

export type SuitSystemProps = {
  t: number;
  vent?: number; cool?: number; fps?: number; spill?: number; block?: number; drum?: number;
  labels?: { text: string; x: number; y: number; at: number; out?: number; ax?: number; ay?: number; color?: string }[];
  cam?: { x: number; y: number; zoom: number };
  dim?: number;
};

export const SuitSystem: React.FC<SuitSystemProps> = ({ t, vent = 0, cool = 0, fps = 0, spill = 0, block = 0, drum = 0, labels = [], cam = { x: 800, y: 520, zoom: 1 }, dim = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const s = (Math.min(W, H) / 1000) * cam.zoom * (W > H ? 0.98 : 1.0);
  const tr = `translate(${W / 2},${H / 2}) scale(${s}) translate(${-cam.x},${-cam.y})`;
  const rot = t * 360 * 1.6; // illustrative rotation (real: ~19,300 rpm)
  const flow = (path: string, color: string, amt: number, speed: number, dash = "10 22", w = 4) =>
    amt > 0 ? (
      <g opacity={amt}>
        <path d={path} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={w * 3.5} strokeLinecap="round" />
        <path d={path} fill="none" stroke={color} strokeWidth={w} strokeDasharray={dash} strokeDashoffset={-t * speed} strokeLinecap="round" />
      </g>
    ) : null;
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, hi = 0) => (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={14} fill="#121b27" stroke={hi > 0 ? WARN : "rgba(236,230,218,0.35)"} strokeWidth={hi > 0 ? 2 + 2 * hi : 1.6} />
      <text x={x} y={y - 4} textAnchor="middle" fill={C.paper} fontFamily={F.sans} fontWeight={700} fontSize={22} letterSpacing={1.5}>{title}</text>
      <text x={x} y={y + 22} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={14} letterSpacing={1.5}>{sub}</text>
    </g>
  );
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 55% 45%, #131c28 0%, ${C.ink} 78%)` }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <pattern id="ssGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40,0 L0,0 0,40" fill="none" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="1" /></pattern>
          <radialGradient id="ssDrum" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#3b4552" /><stop offset="1" stopColor="#1a2029" /></radialGradient>
        </defs>
        <g transform={tr}>
          <rect x={-800} y={-600} width={3200} height={2200} fill="url(#ssGrid)" />
          {/* suit outline */}
          <g opacity={0.9}>
            <circle cx={N.helmet.x} cy={N.helmet.y} r={115} fill="rgba(160,190,210,0.06)" stroke="rgba(236,230,218,0.5)" strokeWidth={2} />
            <path d={`M140,340 L360,340 L380,720 L330,900 L170,900 L120,720 Z`} fill="rgba(236,230,218,0.03)" stroke="rgba(236,230,218,0.35)" strokeWidth={2} />
            <text x={N.helmet.x} y={N.helmet.y - 130} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={16} letterSpacing={2}>HELMET</text>
            <path d={`M${N.helmet.x - 95},${N.helmet.y - 40} L${N.helmet.x - 70},${N.helmet.y - 70} L${N.helmet.x - 50},${N.helmet.y - 55}`} fill="none" stroke={VENT} strokeWidth={3} opacity={0.7} />
            <text x={N.helmet.x - 175} y={N.helmet.y - 70} fill={VENT} fontFamily={F.mono} fontSize={13} letterSpacing={1.5} opacity={0.8}>VENT INLET</text>
            {/* LCVG tubing hint */}
            {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M150,${400 + i * 70} C210,${380 + i * 70} 290,${420 + i * 70} 350,${400 + i * 70}`} fill="none" stroke={COOL} strokeOpacity={0.25 * cool} strokeWidth={2} />)}
            <text x={N.lcvg.x} y={N.lcvg.y + 100} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={14} letterSpacing={1.5}>COOLING GARMENT · WATER TUBES</text>
          </g>
          {/* PLSS backpack boundary */}
          <rect x={540} y={300} width={800} height={620} rx={30} fill="rgba(236,230,218,0.02)" stroke="rgba(236,230,218,0.25)" strokeDasharray="8 8" strokeWidth={2} />
          <text x={560} y={290} fill={C.paperDim} fontFamily={F.mono} fontSize={16} letterSpacing={2.4}>LIFE SUPPORT BACKPACK (PLSS)</text>
          {flow(coolPath, COOL, cool, 40, "14 16", 5)}
          {flow(ventPath, VENT, vent, 60, "8 18", 3.5)}
          {box(N.scrub.x, N.scrub.y, 220, 76, "CO₂ SCRUBBER", "REMOVES CO₂")}
          {box(N.subl.x, N.subl.y, 230, 84, "SUBLIMATOR", "COOLS · CONDENSES MOISTURE")}
          {/* FPS assembly */}
          <g>
            <rect x={N.fan.x - 150} y={N.sep.y - 90} width={300} height={N.pump.y - N.sep.y + 170} rx={20} fill="rgba(176,65,74,0.05)" stroke={fps > 0 ? WARN : "rgba(236,230,218,0.25)"} strokeOpacity={0.4 + 0.6 * fps} strokeWidth={2} />
            <line x1={N.fan.x} y1={N.sep.y - 60} x2={N.fan.x} y2={N.pump.y + 60} stroke="#8d96a1" strokeWidth={6} />
            {/* separator drum */}
            <g transform={`translate(${N.sep.x - 120},${N.sep.y})`}>
              <circle r={48} fill="url(#ssDrum)" stroke="#9aa3ad" strokeWidth={2} />
              <g transform={`rotate(${rot})`}>
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  const blocked = block > (i + 0.5) / 8;
                  return <circle key={i} cx={Math.cos(a) * 32} cy={Math.sin(a) * 32} r={6} fill={blocked ? "#c9b48a" : "#06090d"} stroke="#6b7480" strokeWidth={1} />;
                })}
              </g>
              <text x={0} y={76} textAnchor="middle" fill={C.paper} fontFamily={F.sans} fontWeight={700} fontSize={18}>WATER SEPARATOR</text>
            </g>
            {/* fan */}
            <g transform={`translate(${N.fan.x},${N.fan.y})`}>
              <circle r={46} fill="#111821" stroke="#9aa3ad" strokeWidth={2} />
              <g transform={`rotate(${rot * 1.3})`}>{Array.from({ length: 6 }, (_, i) => <path key={i} d="M0,0 C10,-10 30,-14 40,-6 C30,-2 14,4 0,0 Z" fill="#c4ccd5" transform={`rotate(${i * 60})`} />)}</g>
              <text x={0} y={72} textAnchor="middle" fill={C.paper} fontFamily={F.sans} fontWeight={700} fontSize={18}>FAN</text>
            </g>
            {/* pump */}
            <g transform={`translate(${N.pump.x},${N.pump.y})`}>
              <circle r={40} fill="#0f2230" stroke={COOL} strokeWidth={2} />
              <g transform={`rotate(${-rot})`}>{Array.from({ length: 5 }, (_, i) => <rect key={i} x={-3} y={-34} width={6} height={30} fill={COOL} transform={`rotate(${i * 72})`} />)}</g>
              <text x={0} y={66} textAnchor="middle" fill={C.paper} fontFamily={F.sans} fontWeight={700} fontSize={18}>PUMP</text>
            </g>
            <text x={N.fan.x} y={N.pump.y + 130} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={14} letterSpacing={1.6}>FAN · PUMP · SEPARATOR — ONE SHAFT · ~19,300 RPM</text>
          </g>
          {/* spill: cooling water carried by the vent flow into the helmet */}
          {spill > 0 && (
            <g opacity={spill}>
              <path d={spillPath} fill="none" stroke={COOL} strokeOpacity={0.25} strokeWidth={14} strokeLinecap="round" />
              {Array.from({ length: 22 }, (_, i) => {
                const ph = (t * 0.28 + i / 22) % 1;
                const q = spillAt(ph);
                return <circle key={i} cx={q.x + Math.sin(t * 3 + i) * 3} cy={q.y} r={5 + 4 * Math.sin(ph * Math.PI)} fill={COOL} />;
              })}
            </g>
          )}
          {/* drum close-up inset */}
          {drum > 0 && (
            <g opacity={drum} transform={`translate(1300,800) scale(${0.6 + 0.4 * easeOut(clamp(drum))})`}>
              <rect x={-230} y={-230} width={460} height={460} rx={24} fill="#0b1119" stroke="rgba(236,230,218,0.4)" strokeWidth={2} />
              <circle r={170} fill="url(#ssDrum)" stroke="#9aa3ad" strokeWidth={3} />
              <circle r={60} fill="#0c1016" stroke="#6b7480" strokeWidth={2} />
              <g transform={`rotate(${rot * 0.35})`}>
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  const fill = clamp(block * 8 - i * 0.55);
                  return (
                    <g key={i} transform={`translate(${Math.cos(a) * 115},${Math.sin(a) * 115})`}>
                      <circle r={22} fill="#05080b" stroke="#7a838e" strokeWidth={2} />
                      <circle r={22 * fill} fill="#cdb98f" opacity={0.95} />
                      {GRAINS.filter((g, gi) => gi % 8 === i && g.k < fill).map((g, gi) => (
                        <circle key={gi} cx={Math.cos(g.a) * g.d * 24} cy={Math.sin(g.a) * g.d * 24} r={g.s} fill="#efe3c4" opacity={0.8} />
                      ))}
                    </g>
                  );
                })}
              </g>
              <text x={0} y={-196} textAnchor="middle" fill={C.paper} fontFamily={F.mono} fontSize={18} letterSpacing={2}>SEPARATOR DRUM · 8 HOLES</text>
              <text x={0} y={214} textAnchor="middle" fill={block > 0.95 ? WARN : C.paperDim} fontFamily={F.mono} fontSize={16} letterSpacing={2}>
                {block > 0.95 ? "ALL 8 HOLES BLOCKED · SILICA / SILICATES" : "SILICA / SILICATE DEPOSITS"}
              </text>
            </g>
          )}
          {labels.map((l, i) => {
            const a = ramp(t, l.at, l.at + 0.6, easeOut) * (l.out !== undefined ? 1 - ramp(t, l.out, l.out + 0.5) : 1);
            if (a <= 0) return null;
            return (
              <g key={i} opacity={a}>
                {l.ax !== undefined && l.ay !== undefined && (<><line x1={l.x} y1={l.y - 6} x2={l.ax} y2={l.ay} stroke={C.paper} strokeOpacity={0.6} strokeWidth={1.4} /><circle cx={l.ax} cy={l.ay} r={4} fill={C.paper} /></>)}
                <text x={l.x} y={l.y} fill={l.color ?? C.paper} fontFamily={F.mono} fontSize={20} letterSpacing={2.2}>{l.text}</text>
              </g>
            );
          })}
        </g>
      </svg>
      {dim > 0 && <AbsoluteFill style={{ background: C.ink, opacity: dim }} />}
    </AbsoluteFill>
  );
};

/** Elapsed-time timeline of EVA 23 (NASA account). */
export const EVA23_EVENTS: { m: number; text: string }[] = [
  { m: 0, text: "SPACEWALK BEGINS" },
  { m: 44, text: "WATER REPORTED" },
  { m: 62, text: "DECISION: TERMINATE" },
  { m: 67, text: "RETURN · ORBITAL NIGHT" },
  { m: 72, text: "REACHES AIRLOCK" },
  { m: 90, text: "REPRESS BEGINS" },
  { m: 100, text: "HELMET REMOVED" },
];

export const EvaClock: React.FC<{ t: number; minute: number; reveal?: number; highlight?: number }> = ({ t, minute, reveal = 1, highlight }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const vertical = H > W;
  const x0 = vertical ? 90 * u : W * 0.08, x1 = vertical ? W - 90 * u : W * 0.92;
  const y = vertical ? H * 0.62 : H * 0.7;
  const X = (m: number) => lerp(x0, x1, m / 100);
  const mm = Math.floor(minute), ss = Math.floor((minute - mm) * 60);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: vertical ? H * 0.2 : H * 0.18, textAlign: "center", opacity: reveal }}>
        <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.3em", color: C.paperDim }}>EVA 23 · ELAPSED TIME</div>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (vertical ? 170 : 210) * u, color: C.paper, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {String(Math.floor(mm / 60)).padStart(1, "0")}:{String(mm % 60).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </div>
      </div>
      <svg width={W} height={H} style={{ position: "absolute", opacity: reveal }}>
        <line x1={x0} x2={x1} y1={y} y2={y} stroke="rgba(236,230,218,0.25)" strokeWidth={2 * u} />
        <line x1={x0} x2={X(Math.min(100, minute))} y1={y} y2={y} stroke={C.burgundyHi} strokeWidth={3 * u} />
        {EVA23_EVENTS.map((e, i) => {
          const on = minute >= e.m;
          const hi = highlight === i;
          return (
            <g key={i} opacity={on ? 1 : 0.35}>
              <circle cx={X(e.m)} cy={y} r={(hi ? 9 : 6) * u} fill={on ? (hi ? C.burgundyHi : C.paper) : "transparent"} stroke={C.paper} strokeWidth={1.5 * u} />
              <text x={X(e.m)} y={y + [-26, 46, -26, 46, -96, 46, -26][i] * u} textAnchor="middle" fill={on ? C.paper : C.paperDim} fontFamily={F.mono} fontSize={(vertical ? 15 : 16) * u} letterSpacing={1.2 * u}>
                {`${e.m} MIN`}
              </text>
              {!vertical && <text x={X(e.m)} y={y + [-52, 72, -52, 72, -122, 72, -52][i] * u} textAnchor="middle" fill={on ? C.paper : C.paperDim} fontFamily={F.sans} fontWeight={600} fontSize={16 * u} letterSpacing={1 * u}>{e.text}</text>}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
