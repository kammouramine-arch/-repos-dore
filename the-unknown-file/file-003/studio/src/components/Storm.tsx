import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { clamp, lerp, rng } from "../lib/anim";

/*
 * FILE #003 storm engine.
 *  - Strike timing follows real cloud-to-ground flashes: a faint, branching stepped leader (~0.1 s), a blinding
 *    return stroke, then 1–4 subsequent return strokes down the same channel tens of ms apart, then afterglow.
 *  - `flash(t, strikes)` gives the scene illumination so every layer (sky, landscape, rain, figures) lights together.
 *  - Bolts are generated deterministically (seeded midpoint displacement + branches) and drawn on a canvas with glow.
 */

export type Strike = {
  t: number;              // time of the first return stroke (s, local to the shot)
  from: [number, number]; // cloud-base point, frame fractions (or plate fractions via `map`)
  to: [number, number];   // ground point
  seed?: number;
  strokes?: number;       // number of return strokes (1–5)
  power?: number;         // overall brightness multiplier
  width?: number;         // channel width multiplier
  branches?: number;      // branch density
  rough?: number;         // tortuosity
  near?: number;          // 0..1 how much it whites out the frame (close strikes)
  cloud?: boolean;        // in-cloud flash only (no channel)
};

const STROKE_GAPS = [0, 0.065, 0.14, 0.235, 0.33];
const STROKE_POW = [1, 0.72, 0.55, 0.42, 0.3];
const LEADER = 0.11;

/** brightness of the channel itself at time t (0 before leader, ~1 at return stroke) */
export function channel(t: number, s: Strike) {
  const dt = t - s.t;
  if (dt < -LEADER) return { lead: 0, I: 0, glow: 0 };
  if (dt < 0) return { lead: (dt + LEADER) / LEADER, I: 0.12 + 0.1 * ((dt + LEADER) / LEADER), glow: 0 };
  const n = clamp(s.strokes ?? 3, 1, 5);
  let I = 0;
  for (let k = 0; k < n; k++) {
    const d = dt - STROKE_GAPS[k];
    if (d >= 0) I = Math.max(I, STROKE_POW[k] * Math.exp(-d / 0.028));
  }
  const after = 0.22 * Math.exp(-dt / 0.16) * (dt < STROKE_GAPS[n - 1] + 0.5 ? 1 : 0);
  return { lead: 1, I: Math.max(I, after) * (s.power ?? 1), glow: after };
}

/** scene illumination from all strikes (0 = dark storm light, 1 = full flash) */
export function flash(t: number, strikes: Strike[]) {
  let f = 0;
  for (const s of strikes) {
    const c = channel(t, s);
    f = Math.max(f, c.I * (s.cloud ? 0.55 : 1));
  }
  return f;
}
export function nearFlash(t: number, strikes: Strike[]) {
  let f = 0;
  for (const s of strikes) f = Math.max(f, channel(t, s).I * (s.near ?? 0));
  return f;
}

// ── bolt geometry ────────────────────────────────────────────────────────────────────────
type Pt = [number, number];
type Seg = { pts: Pt[]; w: number; a: number; order: number };

function fractal(a: Pt, b: Pt, rough: number, depth: number, R: () => number): Pt[] {
  let pts: Pt[] = [a, b];
  let amp = rough * Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const L = Math.hypot(dx, dy) || 1;
      const off = (R() - 0.5) * amp * (d < 2 ? 1 : 0.9);
      const along = (R() - 0.5) * amp * 0.25;
      next.push([mx - (dy / L) * off + (dx / L) * along, my + (dx / L) * off + (dy / L) * along], q);
    }
    pts = next;
    amp *= 0.56;
  }
  return pts;
}

export function boltGeometry(from: Pt, to: Pt, seed: number, opts: { rough?: number; branches?: number } = {}): Seg[] {
  const R = rng(seed * 7919 + 13);
  const rough = opts.rough ?? 0.22;
  const main = fractal(from, to, rough, 8, R);
  const segs: Seg[] = [{ pts: main, w: 1, a: 1, order: 0 }];
  const nb = Math.round((opts.branches ?? 1) * (5 + R() * 5));
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
  for (let i = 0; i < nb; i++) {
    const k = Math.floor((0.05 + Math.pow(R(), 1.4) * 0.7) * (main.length - 1));
    const p = main[k];
    const dir = Math.atan2(to[1] - from[1], to[0] - from[0]) + (R() < 0.5 ? -1 : 1) * (0.35 + R() * 0.75);
    const len = L * (0.08 + R() * 0.26) * (1 - k / main.length * 0.6);
    const q: Pt = [p[0] + Math.cos(dir) * len, p[1] + Math.sin(dir) * len];
    const bp = fractal(p, q, 0.3, 6, R);
    segs.push({ pts: bp, w: 0.42, a: 0.62, order: 1 });
    if (R() < 0.6) {
      const k2 = Math.floor(bp.length * (0.3 + R() * 0.4));
      const p2 = bp[k2];
      const d2 = dir + (R() < 0.5 ? -1 : 1) * (0.3 + R() * 0.6);
      const l2 = len * (0.3 + R() * 0.4);
      segs.push({ pts: fractal(p2, [p2[0] + Math.cos(d2) * l2, p2[1] + Math.sin(d2) * l2], 0.32, 5, R), w: 0.22, a: 0.4, order: 2 });
    }
  }
  return segs;
}

/**
 * Canvas layer that draws all strikes for the current time.
 * `map` converts the strike's coordinates (frame fractions by default) into canvas pixels.
 */
export const Bolts: React.FC<{ t: number; strikes: Strike[]; map?: (p: Pt) => Pt; scale?: number; tint?: string }> = ({ t, strikes, map, scale = 1, tint = "185,200,255" }) => {
  const { width: W, height: H } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const u = Math.min(W, H) / 1080 * scale;
  const geo = useMemo(
    () => strikes.map((s) => (s.cloud ? [] : boltGeometry(map ? map(s.from) : [s.from[0] * W, s.from[1] * H], map ? map(s.to) : [s.to[0] * W, s.to[1] * H], s.seed ?? 1, s))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(strikes), W, H, map ? map([0.5, 0.5]).join() : ""],
  );
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, W, H);
    g.lineCap = "round";
    g.lineJoin = "round";
    strikes.forEach((s, i) => {
      if (s.cloud) return;
      const c = channel(t, s);
      if (c.lead <= 0 && c.I <= 0.004) return;
      const segs = geo[i];
      const y0 = segs[0].pts[0][1], y1 = segs[0].pts[segs[0].pts.length - 1][1];
      const leaderY = lerp(y0, y1, Math.pow(c.lead, 0.8));
      const wm = (s.width ?? 1) * u;
      const draw = (pass: "glow" | "mid" | "core") => {
        for (const sg of segs) {
          const isLeader = c.I < 0.25 && t < s.t;
          // during the leader only the part above the leader tip exists; after the return stroke branches fade faster
          const branchFade = sg.order === 0 ? 1 : t < s.t ? 1 : Math.exp(-(t - s.t) / (sg.order === 1 ? 0.09 : 0.05));
          const a = (isLeader ? 0.35 : c.I) * sg.a * branchFade;
          if (a < 0.004) continue;
          g.beginPath();
          let started = false;
          for (const p of sg.pts) {
            if (isLeader && p[1] > leaderY) break;
            if (!started) { g.moveTo(p[0], p[1]); started = true; } else g.lineTo(p[0], p[1]);
          }
          if (pass === "glow") { g.strokeStyle = `rgba(${tint},${0.42 * a})`; g.lineWidth = 26 * wm * sg.w; }
          else if (pass === "mid") { g.strokeStyle = `rgba(215,225,255,${0.7 * a})`; g.lineWidth = 6.5 * wm * sg.w; }
          else { g.strokeStyle = `rgba(255,255,255,${Math.min(1, 1.2 * a)})`; g.lineWidth = Math.max(1, 2.4 * wm * sg.w); }
          g.stroke();
        }
      };
      g.globalCompositeOperation = "lighter";
      g.filter = `blur(${16 * u}px)`; draw("glow");
      g.filter = `blur(${3 * u}px)`; draw("mid");
      g.filter = "none"; draw("core");
      g.globalCompositeOperation = "source-over";
    });
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "screen" }} />;
};

// ── rain ────────────────────────────────────────────────────────────────────────────────
export const Rain: React.FC<{ t: number; amount?: number; wind?: number; light?: number; seed?: number; speed?: number; length?: number }> = ({
  t, amount = 1, wind = 0.18, light = 0, seed = 3, speed = 1, length = 1,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const u = Math.min(W, H) / 1080;
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, W, H);
    if (amount <= 0) return;
    const R = rng(seed);
    const layers = [
      { n: 520, len: 34, w: 1.0, v: 2.2, a: 0.16 },
      { n: 260, len: 60, w: 1.5, v: 3.2, a: 0.2 },
      { n: 70, len: 110, w: 2.4, v: 4.6, a: 0.22 },
    ];
    g.lineCap = "round";
    for (const L of layers) {
      const n = Math.round(L.n * amount * (W * H) / (1920 * 1080));
      const vy = L.v * H * speed, vx = vy * wind;
      g.lineWidth = L.w * u;
      g.strokeStyle = `rgba(${200 + 55 * light},${210 + 45 * light},${225 + 30 * light},${L.a * (0.55 + 1.6 * light)})`;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const x0 = R() * (W + H * wind), y0 = R() * H, ph = R();
        const y = ((y0 + vy * (t + ph * 3)) % (H + 200 * u)) - 100 * u;
        const x = ((x0 - vx * (t + ph * 3)) % (W + H * Math.abs(wind)) + (W + H)) % (W + H * Math.abs(wind));
        const len = L.len * u * length * (0.7 + R() * 0.6);
        g.moveTo(x, y);
        g.lineTo(x - wind * len, y + len);
      }
      g.stroke();
    }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

// ── plates (photos positioned by a shared camera so cut-outs, skies and bolts line up) ─────
export type Cam = { fx?: number; fy?: number; k?: number; px?: number; py?: number; free?: boolean };
export function plateMap(iw: number, ih: number, W: number, H: number, cam: Cam) {
  const s = Math.max(W / iw, H / ih) * (cam.k ?? 1);
  const fx = cam.fx ?? 0.5, fy = cam.fy ?? 0.5;
  const ox = W / 2 - fx * iw * s + (cam.px ?? 0) * W;
  const oy = H / 2 - fy * ih * s + (cam.py ?? 0) * H;
  // keep the image covering the frame
  // `free`: a sky cut-out may slide down to reveal more sky above it (the bottom edge must still cover the frame)
  const cx = clamp(ox, W - iw * s, 0), cy = cam.free ? Math.max(Math.min(oy, H * 0.6), H - ih * s) : clamp(oy, H - ih * s, 0);
  return { s, ox: cx, oy: cy, w: iw * s, h: ih * s, map: (p: Pt): Pt => [cx + p[0] * iw * s, cy + p[1] * ih * s] };
}

export type Look = { exp?: number; flashGain?: number; sat?: number; con?: number; tint?: string; tintA?: number; mono?: boolean; warm?: number };

/** a photographic plate lit by the storm: dark ambient exposure, cold flash response */
export const Plate: React.FC<{ src: string; iw: number; ih: number; cam: Cam; f?: number; look?: Look; style?: React.CSSProperties; blur?: number }> = ({
  src, iw, ih, cam, f = 0, look = {}, style, blur = 0,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const m = plateMap(iw, ih, W, H, cam);
  const exp = (look.exp ?? 0.42) + (look.flashGain ?? 0.6) * Math.pow(f, 0.8);
  const sat = lerp(look.sat ?? 0.55, 0.25, clamp(f));
  const filter = `brightness(${exp}) contrast(${(look.con ?? 1.12) - 0.08 * f}) saturate(${look.mono ? 0 : sat})${look.warm ? ` sepia(${look.warm})` : ""}${blur ? ` blur(${blur}px)` : ""}`;
  return (
    <div style={{ position: "absolute", left: m.ox, top: m.oy, width: m.w, height: m.h, ...style }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", filter }} />
    </div>
  );
};

/** storm-light colour wash + whiteout for very close strikes */
export const FlashWash: React.FC<{ f: number; near?: number; color?: string }> = ({ f, near = 0, color = "#9fb4ff" }) => (
  <>
    <AbsoluteFill style={{ background: color, mixBlendMode: "soft-light", opacity: clamp(f * 0.5) }} />
    <AbsoluteFill style={{ background: "#eef2ff", opacity: clamp(near * 0.95) }} />
  </>
);

/** in-cloud illumination: a soft bloom on the cloud base around the strike's origin */
export const CloudGlow: React.FC<{ t: number; strikes: Strike[]; map?: (p: Pt) => Pt; radius?: number }> = ({ t, strikes, map, radius = 0.55 }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <>
      {strikes.map((s, i) => {
        const c = channel(t, s);
        if (c.I < 0.01) return null;
        const [x, y] = map ? map(s.from) : [s.from[0] * W, s.from[1] * H];
        const r = radius * Math.max(W, H);
        return (
          <div key={i} style={{ position: "absolute", left: x - r, top: y - r * 0.6, width: r * 2, height: r * 1.2, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(200,212,255,${0.75 * c.I}), rgba(150,170,240,${0.25 * c.I}) 45%, rgba(0,0,0,0) 100%)`, mixBlendMode: "screen" }} />
        );
      })}
    </>
  );
};
