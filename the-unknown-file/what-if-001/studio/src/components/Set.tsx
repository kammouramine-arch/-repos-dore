import React from "react";
import { Img, staticFile, useVideoConfig } from "remotion";
import { rng } from "../lib/anim";

/** A "set" is drawn in its own world units (SW×SH). The camera picks a window into it, so the same set
 *  can be framed for 16:9 and 9:16 without stretching. */
export type Cam = { x: number; y: number; w: number }; // centre + visible width in set units

export const SetView: React.FC<{ SW: number; SH: number; cam: Cam; children: React.ReactNode; bg?: string }> = ({ SW, SH, cam, children, bg = "#05070b" }) => {
  const { width: W, height: H } = useVideoConfig();
  const w = cam.w, h = (cam.w * H) / W;
  const vb = `${cam.x - w / 2} ${cam.y - h / 2} ${w} ${h}`;
  return (
    <svg width={W} height={H} viewBox={vb} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", left: 0, top: 0, background: bg }}>
      {children}
    </svg>
  );
};

/** deterministic star field (in set units) */
export const Stars: React.FC<{ x: number; y: number; w: number; h: number; n?: number; seed?: number; t: number; bright?: number; milky?: number }> = ({ x, y, w, h, n = 260, seed = 7, t, bright = 1, milky = 0 }) => {
  const r = rng(seed);
  const stars = Array.from({ length: n }, () => ({ x: x + r() * w, y: y + r() * h, s: Math.pow(r(), 3) * 2.6 + 0.5, ph: r() * 6.28, c: r() }));
  return (
    <g>
      {milky > 0 && <ellipse cx={x + w * 0.55} cy={y + h * 0.4} rx={w * 0.6} ry={h * 0.12} transform={`rotate(-24 ${x + w * 0.55} ${y + h * 0.4})`} fill="url(#milky)" opacity={milky} />}
      {stars.map((s, i) => {
        const tw = 0.75 + 0.25 * Math.sin(t * (1.2 + s.c) + s.ph);
        const col = s.c < 0.15 ? "#ffe2c4" : s.c > 0.85 ? "#cfe0ff" : "#f2f4ff";
        return <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={col} opacity={Math.min(1, 0.35 + s.s * 0.3) * tw * bright} />;
      })}
    </g>
  );
};

/** the Moon (NASA LRO colour map, rendered as a full-moon disc) with halo; v = visibility 0..1 */
export const Moon: React.FC<{ cx: number; cy: number; r: number; v: number; halo?: number }> = ({ cx, cy, r, v, halo = 1 }) => (
  <g opacity={v}>
    <circle cx={cx} cy={cy} r={r * 6} fill="url(#moonHalo)" opacity={0.55 * halo} />
    <circle cx={cx} cy={cy} r={r * 2.2} fill="url(#moonHalo)" opacity={0.6 * halo} />
    <image href={staticFile("moon/moon_disc.png")} x={cx - r} y={cy - r} width={r * 2} height={r * 2} />
  </g>
);

export const SkyDefs: React.FC = () => (
  <defs>
    <radialGradient id="moonHalo"><stop offset="0%" stopColor="#e8eefa" stopOpacity={0.55} /><stop offset="30%" stopColor="#b9c9e6" stopOpacity={0.18} /><stop offset="100%" stopColor="#8aa0c8" stopOpacity={0} /></radialGradient>
    <radialGradient id="milky"><stop offset="0%" stopColor="#c8d2ea" stopOpacity={0.16} /><stop offset="100%" stopColor="#c8d2ea" stopOpacity={0} /></radialGradient>
    <radialGradient id="warmGlow"><stop offset="0%" stopColor="#ffcf8a" stopOpacity={0.7} /><stop offset="100%" stopColor="#ffcf8a" stopOpacity={0} /></radialGradient>
    <radialGradient id="sodium"><stop offset="0%" stopColor="#ffb760" stopOpacity={0.55} /><stop offset="100%" stopColor="#ffb760" stopOpacity={0} /></radialGradient>
    <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#03060c" /><stop offset="70%" stopColor="#0c1626" /><stop offset="100%" stopColor="#1b2a40" /></linearGradient>
  </defs>
);

/** rooftop skyline silhouette (deterministic) with a few warm windows */
export const Skyline: React.FC<{ x: number; y: number; w: number; seed?: number; fill?: string; lit?: number; scale?: number }> = ({ x, y, w, seed = 3, fill = "#070a10", lit = 1, scale = 1 }) => {
  const r = rng(seed);
  const houses: { x: number; w: number; h: number; roof: number }[] = [];
  let cx = x;
  while (cx < x + w) {
    const hw = (90 + r() * 140) * scale;
    houses.push({ x: cx, w: hw, h: (90 + r() * 120) * scale, roof: r() });
    cx += hw + r() * 10 * scale;
  }
  return (
    <g>
      {houses.map((hs, i) => {
        const top = y - hs.h;
        const peak = hs.roof > 0.45 ? `L${hs.x + hs.w / 2},${top - hs.w * 0.32}` : "";
        const chim = hs.roof > 0.7;
        return (
          <g key={i}>
            <path d={`M${hs.x},${y} L${hs.x},${top} ${peak} L${hs.x + hs.w},${top} L${hs.x + hs.w},${y} Z`} fill={fill} />
            {chim && <rect x={hs.x + hs.w * 0.7} y={top - hs.w * 0.3} width={12 * scale} height={hs.w * 0.25} fill={fill} />}
            {Array.from({ length: 3 }, (_, k) => {
              const on = r() < 0.38 * lit;
              const wx = hs.x + hs.w * (0.2 + k * 0.25), wy = top + hs.h * 0.3;
              return on ? <rect key={k} x={wx} y={wy} width={14 * scale} height={18 * scale} fill="#ffc77a" opacity={0.75} /> : null;
            })}
          </g>
        );
      })}
    </g>
  );
};

/** dust motes drifting in a light beam (clip with the beam polygon) */
export const Motes: React.FC<{ t: number; x: number; y: number; w: number; h: number; n?: number; seed?: number; opacity?: number }> = ({ t, x, y, w, h, n = 70, seed = 5, opacity = 1 }) => {
  const r = rng(seed);
  return (
    <g opacity={opacity}>
      {Array.from({ length: n }, (_, i) => {
        const px = x + ((r() * w + t * (6 + r() * 10)) % w);
        const py = y + ((r() * h + t * (3 + r() * 6) + Math.sin(t * 0.5 + i) * 6) % h);
        return <circle key={i} cx={px} cy={py} r={0.8 + r() * 1.8} fill="#dfe8f6" opacity={0.25 + r() * 0.45} />;
      })}
    </g>
  );
};

export const useVert = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};
export { Img };
