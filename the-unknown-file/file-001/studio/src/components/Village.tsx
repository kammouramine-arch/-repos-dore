import React, { useMemo } from "react";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import { C } from "../theme";
import { clamp, lerp, rng } from "../lib/anim";

/*
 * Original, non-identifying illustration of a hillside village in the Cameroon grassfields at night.
 * Parallax layers; "gas" is an illustrative low-lying veil (CO2 itself is invisible).
 */
const ridge = (seed: number, base: number, amp: number, freq: number) => {
  const r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6, r() * 6];
  const pts: [number, number][] = [];
  for (let x = -400; x <= 2400; x += 20) {
    const y = base - amp * (0.55 * Math.sin(x * freq + ph[0]) + 0.3 * Math.sin(x * freq * 2.3 + ph[1]) + 0.15 * Math.sin(x * freq * 5.1 + ph[2]));
    pts.push([x, y]);
  }
  return pts;
};
const toPath = (pts: [number, number][]) => `M-400,1200 L${pts.map((p) => `${p[0]},${p[1].toFixed(1)}`).join(" L")} L2400,1200 Z`;
const yAt = (pts: [number, number][], x: number) => {
  const i = clamp(Math.floor((x + 400) / 20), 0, pts.length - 2);
  return lerp(pts[i][1], pts[i + 1][1], ((x + 400) % 20) / 20);
};

const FAR = ridge(3, 520, 90, 0.0028);
const MID = ridge(8, 640, 70, 0.0041);
const VIL = ridge(11, 770, 55, 0.0019);
const FG = ridge(21, 960, 40, 0.006);

type House = { x: number; w: number; h: number; kind: "rect" | "round"; lit: number[]; smoke: boolean; k: number };
const HOUSES: House[] = (() => {
  const r = rng(1986);
  const out: House[] = [];
  let x = 180;
  while (x < 1800) {
    const kind = r() < 0.4 ? "round" : "rect";
    const w = kind === "round" ? 70 + r() * 30 : 95 + r() * 60;
    out.push({ x, w, h: kind === "round" ? 46 + r() * 12 : 48 + r() * 18, kind, lit: r() < 0.8 ? [r() < 0.6 ? 1 : 0, 1] : [0, 0], smoke: r() < 0.3, k: r() });
    x += w + 30 + r() * 110;
  }
  return out;
})();
const TREES = (() => {
  const r = rng(55);
  return Array.from({ length: 26 }, () => ({ x: -200 + r() * 2400, s: 0.6 + r() * 0.8, k: r(), banana: r() < 0.45 }));
})();
const STARS = (() => {
  const r = rng(99);
  return Array.from({ length: 160 }, () => ({ x: r() * 2200 - 100, y: r() * 520, r: 0.5 + r() * 1.4, o: 0.2 + r() * 0.6 }));
})();

export type VillageProps = { t: number; gasRange?: [number, number]; pan?: number; dusk?: number; dawn?: number; gas?: number; lights?: number; cam?: { x: number; y: number; zoom: number }; moon?: number };

export const Village: React.FC<VillageProps> = ({ t, gasRange = [-300, 2300], pan = 0, dusk = 0, dawn = 0, gas = 0, lights = 1, cam = { x: 960, y: 540, zoom: 1 }, moon = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const s = (H / 1080) * cam.zoom;
  const tr = `translate(${W / 2},${H / 2}) scale(${s}) translate(${-cam.x},${-cam.y})`;
  const front = lerp(gasRange[0], gasRange[1], gas); // gas veil advancing from the left (upslope, towards the lake)
  const sky = dawn > 0
    ? [mix("#070c14", "#3a4552", dawn), mix("#1b2a3b", "#9aa3a8", dawn)]
    : [mix("#070c14", "#121a2a", dusk), mix("#1b2a3b", "#4a3a42", dusk)];
  const sil = (base: string, lift: number) => mix(base, "#5b6670", dawn * lift);
  const par = (d: number) => `translate(${-pan * d * 160},0)`;

  const lightList = useMemo(() => {
    const L: { x: number; y: number; w: number; h: number; k: number }[] = [];
    HOUSES.forEach((h) => {
      const gy = yAt(VIL, h.x + h.w / 2);
      h.lit.forEach((on, j) => {
        if (!on) return;
        const wx = h.x + (j === 0 ? h.w * 0.22 : h.w * 0.62);
        L.push({ x: wx, y: gy - h.h * 0.55, w: h.kind === "round" ? 9 : 13, h: h.kind === "round" ? 14 : 15, k: h.k + j * 0.3 });
      });
    });
    return L;
  }, []);

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="vSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky[0]} />
            <stop offset="1" stopColor={sky[1]} />
          </linearGradient>
          <radialGradient id="vMoon">
            <stop offset="0" stopColor="#f4f1e8" stopOpacity="0.95" />
            <stop offset="0.12" stopColor="#e9e6dc" stopOpacity="0.9" />
            <stop offset="0.16" stopColor="#c9d4de" stopOpacity="0.25" />
            <stop offset="1" stopColor="#8aa0b5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vWin">
            <stop offset="0" stopColor="#ffd59a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#e0b06a" stopOpacity="0" />
          </radialGradient>
          <filter id="vBlur"><feGaussianBlur stdDeviation="14" /></filter>
          <filter id="vBlur2"><feGaussianBlur stdDeviation="3" /></filter>
          <pattern id="vWisp" patternUnits="userSpaceOnUse" width="700" height="700" patternTransform={`translate(${t * 26},${-t * 4})`}>
            <image href={staticFile("tex/wisps.png")} width="700" height="700" />
          </pattern>
          <linearGradient id="vGasFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.85" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="vGasMask" maskUnits="userSpaceOnUse" x="-500" y="0" width="3000" height="1200">
            <rect x={-500} y={0} width={front + 500} height={1200} fill="url(#vGasFade)" />
          </mask>
        </defs>
        <g transform={tr}>
          <rect x={-600} y={-300} width={3200} height={1700} fill="url(#vSky)" />
          <g opacity={(1 - dawn) * (1 - dusk * 0.6)}>
            {STARS.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#e6ecf2" opacity={st.o * (0.75 + 0.25 * Math.sin(t * 1.7 + i))} />)}
          </g>
          {moon > 0 && <circle cx={1500 - pan * 30} cy={190} r={230} fill="url(#vMoon)" opacity={moon * (1 - dawn)} />}
          {/* far ridge */}
          <g transform={par(0.15)}><path d={toPath(FAR)} fill={sil("#172231", 0.6)} /></g>
          {/* mist between ridges */}
          <rect x={-600} y={500} width={3200} height={160} fill="#9fb3c6" opacity={0.05 + 0.12 * dawn} filter="url(#vBlur)" />
          {/* mid hills + trees */}
          <g transform={par(0.35)}>
            <path d={toPath(MID)} fill={sil("#111a25", 0.45)} />
            {TREES.slice(0, 14).map((tr, i) => <Tree key={i} x={tr.x} y={yAt(MID, tr.x)} s={tr.s * 0.7} banana={tr.banana} fill={sil("#0d141d", 0.4)} t={t} k={tr.k} />)}
          </g>
          {/* village slope */}
          <g transform={par(0.6)}>
            <path d={toPath(VIL)} fill={sil("#0c121a", 0.35)} />
            {TREES.slice(14).map((tr, i) => <Tree key={i} x={tr.x} y={yAt(VIL, tr.x) + 6} s={tr.s} banana={tr.banana} fill={sil("#0a1017", 0.3)} t={t} k={tr.k} />)}
            {HOUSES.map((h, i) => <HouseShape key={i} h={h} gy={yAt(VIL, h.x + h.w / 2)} fill={sil("#0b1118", 0.3)} rim={dawn > 0 ? "#6c7780" : "#2a3646"} />)}
            {/* smoke */}
            {HOUSES.filter((h) => h.smoke).map((h, i) => {
              const gy = yAt(VIL, h.x + h.w / 2);
              return (
                <path key={i} d={`M${h.x + h.w * 0.5},${gy - h.h - 20} C${h.x + h.w * 0.5 + 20 + Math.sin(t + i) * 10},${gy - h.h - 90} ${h.x + h.w * 0.5 - 30},${gy - h.h - 150} ${h.x + h.w * 0.5 + 10 + Math.sin(t * 0.7 + i) * 20},${gy - h.h - 240}`}
                  stroke="#9aa7b4" strokeOpacity={0.12 * lights * (1 - gas)} strokeWidth={16} fill="none" filter="url(#vBlur2)" />
              );
            })}
            {/* window lights */}
            {lightList.map((l, i) => {
              const off = clamp((front - l.x - 120) / 260);
              const flick = 0.9 + 0.1 * Math.sin(t * (5 + l.k * 4) + i);
              const on = lights * (1 - off) * flick * (1 - dawn);
              if (on <= 0.01) return null;
              return (
                <g key={i} opacity={on}>
                  <circle cx={l.x + l.w / 2} cy={l.y + l.h / 2} r={34} fill="url(#vWin)" opacity={0.55} />
                  <rect x={l.x} y={l.y} width={l.w} height={l.h} fill="#ffcf8a" rx={1.5} />
                </g>
              );
            })}
          </g>
          {/* gas veil (illustration) hugging low ground */}
          {gas > 0 && (
            <g mask="url(#vGasMask)" transform={par(0.7)}>
              <path d={`M-500,${yAt(VIL, -300) - 150} ${VIL.map((p) => `L${p[0]},${(p[1] - 135 - 20 * Math.sin(p[0] * 0.01 + t)).toFixed(1)}`).join(" ")} L2500,1300 L-500,1300 Z`}
                fill="#c3d1db" opacity={0.16} filter="url(#vBlur)" />
              <path d={`M-500,${yAt(VIL, -300) - 120} ${VIL.map((p) => `L${p[0]},${(p[1] - 110 - 25 * Math.sin(p[0] * 0.006 - t * 0.8)).toFixed(1)}`).join(" ")} L2500,1300 L-500,1300 Z`}
                fill="url(#vWisp)" opacity={0.42} filter="url(#vBlur2)" />
            </g>
          )}
          {/* foreground */}
          <g transform={par(1.0)}>
            <path d={toPath(FG)} fill={mix("#05080c", "#2a3138", dawn)} />
            {[120, 560, 1340, 1810].map((x, i) => <Tree key={i} x={x} y={yAt(FG, x) + 20} s={1.6} banana fill={mix("#04070a", "#272e35", dawn)} t={t} k={i * 0.3} />)}
          </g>
          {/* dawn mist */}
          {dawn > 0 && <rect x={-600} y={640} width={3200} height={260} fill="#c9d2d8" opacity={0.22 * dawn} filter="url(#vBlur)" />}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const Tree: React.FC<{ x: number; y: number; s: number; banana?: boolean; fill: string; t: number; k: number }> = ({ x, y, s, banana, fill, t, k }) => {
  const sway = Math.sin(t * 0.8 + k * 6) * 2;
  if (banana) {
    return (
      <g transform={`translate(${x},${y}) scale(${s})`} fill={fill}>
        <rect x={-4} y={-90} width={8} height={92} />
        {[-1, 1, -0.6, 0.6, 0].map((d, i) => (
          <path key={i} d={`M0,-88 Q${d * 50 + sway},${-130 + Math.abs(d) * 10} ${d * 85 + sway},${-70 - (1 - Math.abs(d)) * 50} Q${d * 40},${-95} 0,-84 Z`} />
        ))}
      </g>
    );
  }
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} fill={fill}>
      <rect x={-5} y={-70} width={10} height={72} />
      <ellipse cx={sway} cy={-110} rx={55} ry={48} />
      <ellipse cx={-30 + sway} cy={-85} rx={38} ry={30} />
      <ellipse cx={32 + sway} cy={-88} rx={40} ry={32} />
    </g>
  );
};

const HouseShape: React.FC<{ h: House; gy: number; fill: string; rim: string }> = ({ h, gy, fill, rim }) => {
  const { x, w, kind } = h;
  const hh = h.h;
  if (kind === "round") {
    return (
      <g>
        <rect x={x} y={gy - hh * 0.75} width={w} height={hh * 0.75 + 6} fill={fill} rx={w * 0.12} />
        <path d={`M${x - 10},${gy - hh * 0.72} L${x + w / 2},${gy - hh * 1.75} L${x + w + 10},${gy - hh * 0.72} Z`} fill={fill} />
        <path d={`M${x - 10},${gy - hh * 0.72} L${x + w / 2},${gy - hh * 1.75}`} stroke={rim} strokeWidth={1.5} opacity={0.6} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={gy - hh} width={w} height={hh + 6} fill={fill} />
      <path d={`M${x - 8},${gy - hh} L${x + w * 0.25},${gy - hh * 1.55} L${x + w * 0.75},${gy - hh * 1.55} L${x + w + 8},${gy - hh} Z`} fill={fill} />
      <path d={`M${x - 8},${gy - hh} L${x + w * 0.25},${gy - hh * 1.55} L${x + w * 0.75},${gy - hh * 1.55}`} stroke={rim} strokeWidth={1.5} fill="none" opacity={0.6} />
    </g>
  );
};

function mix(a: string, b: string, p: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const q = clamp(p);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * q)).join(",")})`;
}
