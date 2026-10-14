import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import { clamp, easeIn, easeInOut, easeOut, lerp, ramp, rng } from "../lib/anim";
import { size } from "../lib/assets";
import { Stage, FireFootage, FireGlow } from "./Stage";
import { Bolts, CloudGlow, FlashWash, Plate, Rain, Strike, channel, flash, nearFlash, plateMap } from "../components/Storm";
import { People } from "../three/Person";

/*
 * Reenactments for strikes 2–7 (illustrative). Each strike has its own place, framing and grade:
 *  1969 night-blue road + truck cab · 1970 sickly green-gold garden light · 1972 tungsten guardhouse vs cold window
 *  1973 steel-grey overlook, amber hair fire (callback to 1972) · 1976 violet dusk trail · 1977 deep teal stream pool.
 * Plates are real photographs (NPS Shenandoah, USDA, Flickr CC0/CC BY — see register); figures are anonymous.
 */

// ── shared bits ─────────────────────────────────────────────────────────────────────────
export const Vid: React.FC<{ src: string; start?: number; rate?: number; style?: React.CSSProperties; filter?: string; fx?: number; fy?: number; scale?: number }> = ({ src, start = 0, rate = 1, style, filter, fx = 0.5, fy = 0.5, scale = 1 }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <OffthreadVideo src={staticFile(`footage/${src}.mp4`)} trimBefore={Math.round(start * fps)} playbackRate={rate} muted
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${fx * 100}% ${fy * 100}%`, filter, transform: `scale(${scale})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }} />
    </AbsoluteFill>
  );
};

/** a restrained flame on a head (hair catching fire): a tight cluster of flickering tongues + warm glow, no exaggeration */
export const HairFlame: React.FC<{ t: number; x: number; y: number; r: number; k: number; seed?: number }> = ({ t, x, y, r, k, seed = 1 }) => {
  if (k <= 0) return null;
  const tongues = Array.from({ length: 11 }, (_, i) => {
    const R = rng(seed * 31 + i);
    const ph = R() * 6, sp = 10 + R() * 9;
    const hgt = r * (1.1 + 1.1 * R()) * (0.7 + 0.3 * Math.sin(t * sp + ph)) * k;
    const bx = x + (i / 10 - 0.5) * r * 1.6 + (R() - 0.5) * r * 0.2;
    const w = r * (0.18 + R() * 0.16);
    const sway = Math.sin(t * 7 + ph) * r * 0.18;
    // teardrop tongue: wide base on the head, pointed tip swaying
    const d = `M${bx - w},${y} C${bx - w},${y - hgt * 0.45} ${bx + sway - w * 0.2},${y - hgt * 0.75} ${bx + sway},${y - hgt} C${bx + sway + w * 0.2},${y - hgt * 0.75} ${bx + w},${y - hgt * 0.45} ${bx + w},${y} Z`;
    return <path key={i} d={d} fill={`url(#flame${seed})`} opacity={0.85} />;
  });
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", mixBlendMode: "screen" }} width="100%" height="100%">
      <defs>
        <linearGradient id={`flame${seed}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#fff6d8" stopOpacity={0.95} />
          <stop offset="35%" stopColor="#ffc160" stopOpacity={0.9} />
          <stop offset="75%" stopColor="#f0641e" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#b02a0a" stopOpacity={0} />
        </linearGradient>
      </defs>
      <ellipse cx={x} cy={y - r * 0.6} rx={r * 2.6} ry={r * 2.2} fill="#ff9a3c" opacity={0.22 * k} style={{ filter: `blur(${r * 0.9}px)` }} />
      <g style={{ filter: `blur(${r * 0.06}px)` }}>{tongues}</g>
    </svg>
  );
};

const lookNight = { exp: 0.3, flashGain: 0.55, sat: 0.45, con: 1.15 };

// ── STRIKE 02 · July 1969 · driving a truck on a mountain road ─────────────────────────
export const Strike2: React.FC<{ t: number; shot: "road" | "cab" | "watch"; strikeAt?: number; drive?: number }> = ({ t, shot, strikeAt = 2.4, drive = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  if (shot === "road") {
    // a period pickup on an overlook road; the storm ridge behind (distant strikes, no hit)
    const strikes: Strike[] = [
      { t: 1.0, from: [0.25, -0.15], to: [0.2, 0.3], seed: 11, strokes: 2, power: 0.55 },
      { t: strikeAt, from: [0.62, -0.2], to: [0.7, 0.28], seed: 19, strokes: 3, power: 0.8 },
    ];
    const cam = v ? { fx: 0.7, fy: 0.55, k: 1.0 } : { fx: 0.6, fy: 0.55, k: 1.0 };
    return (
      <Stage t={t} sky="photos/storm_gust_noaa.jpg" skyCam={{ fx: 0.5, fy: 0.3, k: 1.3 }} skyLook={{ exp: 0.3, flashGain: 0.7, sat: 0.3 }} plate="cut/shen_skyline_drive_tunnel.png" cam={cam}
        look={{ ...lookNight, exp: 0.22 }} strikes={strikes} boltsBehind rain={0.7}>
        {({ f }) => {
          const [tw, th] = size("cut/truck_c20.png");
          const pr = ramp(t + drive, 0, 7, (k) => k);
          const tw2 = (v ? 0.8 : 0.36) * W * (1 + 0.45 * pr);
          const x = lerp(v ? 0.22 : 0.48, v ? 0.12 : 0.44, pr) * W;
          const y = H * lerp(v ? 0.66 : 0.7, v ? 0.72 : 0.78, pr);
          const th2 = tw2 * th / tw;
          return (
            <>
              <div style={{ position: "absolute", left: x, top: y - th2 * 0.5, width: tw2, height: th2 }}>
                <Img src={staticFile("cut/truck_c20.png")} style={{ width: "100%", height: "100%", filter: `brightness(${0.22 + 0.5 * f}) saturate(0.5) contrast(1.15) blur(${0.6 * u}px)` }} />
                {/* headlights */}
                {[[0.765, 0.585], [0.905, 0.6]].map(([hx, hy], i) => (
                  <div key={i} style={{ position: "absolute", left: `${hx * 100}%`, top: `${hy * 100}%`, width: 0, height: 0 }}>
                    <div style={{ position: "absolute", left: -tw2 * 0.06, top: -tw2 * 0.04, width: tw2 * 0.12, height: tw2 * 0.08, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,240,200,0.95), rgba(255,220,160,0.3) 50%, rgba(0,0,0,0))", mixBlendMode: "screen" }} />
                  </div>
                ))}
              </div>
              <div style={{ position: "absolute", left: x + tw2 * 0.83, top: y + th2 * 0.06, width: W * 0.5, height: th2 * 0.25, background: "radial-gradient(ellipse at 0% 50%, rgba(255,230,180,0.28), rgba(0,0,0,0) 70%)", mixBlendMode: "screen", transform: "skewY(4deg)" }} />
            </>
          );
        }}
      </Stage>
    );
  }
  if (shot === "cab") {
    // interior POV through the windscreen; the strike hits the trees just ahead — a restrained white flash
    const strikes: Strike[] = [{ t: strikeAt, from: [0.62, -0.3], to: [0.7, 0.42], seed: 23, strokes: 4, power: 1.3, width: 1.4, near: 0.9 }];
    const f = flash(t, strikes), near = nearFlash(t, strikes);
    const [iw, ih] = size("cut/truck_interior.png");
    const icam = v ? { fx: 0.3, fy: 0.55, k: 1.0 } : { fx: 0.34, fy: 0.5, k: 1.25 };
    const im = plateMap(iw, ih, W, H, icam);
    const [rw, rh] = size("photos/shen_skyline_drive_fall.jpg");
    const fwd = ramp(t, 0, 8, (k) => k);
    const road = { fx: 0.55, fy: 0.62, k: 1.15 + 0.25 * fwd };
    const out = ramp(t, strikeAt + 0.25, strikeAt + 0.9, easeIn); // he lost consciousness: the picture drains to black
    const drops = Array.from({ length: 90 }, (_, i) => {
      const R = rng(i * 17 + 3);
      const x = R() * W, y0 = R() * H * 0.6, life = 0.6 + R() * 1.8, ph = R() * life;
      const k = ((t + ph) % life) / life;
      return <circle key={i} cx={x + Math.sin(i) * 3} cy={y0 + k * k * 60 * u} r={(1.2 + R() * 3) * u} fill="rgba(210,220,235,0.35)" />;
    });
    return (
      <AbsoluteFill style={{ background: "#020304" }}>
        <AbsoluteFill style={{ opacity: 1 - out }}>
          <Plate src="photos/shen_skyline_drive_fall.jpg" iw={rw} ih={rh} cam={road} f={f} look={{ exp: 0.34, flashGain: 0.9, sat: 0.35, con: 1.1 }} blur={1.5 * u} />
          <CloudGlow t={t} strikes={strikes} />
          <Bolts t={t} strikes={strikes} />
          <Rain t={t} amount={0.9} wind={0.05} light={f} speed={1.3} />
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: `blur(${0.8 * u}px)` }}>{drops}</svg>
          <div style={{ position: "absolute", left: im.ox, top: im.oy, width: im.w, height: im.h }}>
            <Img src={staticFile("cut/truck_interior.png")} style={{ width: "100%", height: "100%", filter: `brightness(${0.42 + 0.6 * f}) saturate(0.45) contrast(1.12)` }} />
          </div>
          <FlashWash f={f} near={near} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // watch: the destroyed wristwatch (illustrative: a period watch, cracked crystal, scorch, stopped hands)
  const [ww, wh] = size("cut/watch_26190519246.png");
  const sc = (v ? 1.35 : 1.1) * H / wh;
  const p = ramp(t, 0, 6, easeInOut);
  const cx = W * (v ? 0.5 : 0.42), cy = H * (v ? 0.47 : 0.5);
  const face: [number, number] = [0.555, 0.365]; // dial centre in the cut-out (fractions)
  const R = rng(5);
  const cracks = Array.from({ length: 9 }, (_, i) => {
    let a = (i / 9) * Math.PI * 2 + R() * 0.4, x = 0, y = 0;
    const pts: string[] = ["0,0"];
    for (let k = 0; k < 6; k++) { a += (R() - 0.5) * 0.7; const l = 18 + R() * 30; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push(`${x.toFixed(1)},${y.toFixed(1)}`); }
    return <polyline key={i} points={pts.join(" ")} fill="none" stroke="rgba(235,240,250,0.75)" strokeWidth={1.6} />;
  });
  const fx = cx + (face[0] - 0.5) * ww * sc, fy = cy + (face[1] - 0.5) * wh * sc;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #15191f 0%, #050608 70%)" }}>
      <div style={{ position: "absolute", left: cx - ww * sc / 2, top: cy - wh * sc / 2, width: ww * sc, height: wh * sc, transform: `scale(${1 + 0.08 * p}) rotate(${-8 + 3 * p}deg)`, transformOrigin: `${face[0] * 100}% ${face[1] * 100}%` }}>
        <Img src={staticFile("cut/watch_26190519246.png")} style={{ width: "100%", height: "100%", filter: "brightness(0.55) contrast(1.25) saturate(0.6) sepia(0.25)" }} />
        {/* scorch + cracked crystal */}
        <div style={{ position: "absolute", left: `${face[0] * 100 - 20}%`, top: `${face[1] * 100 - 14}%`, width: "40%", height: "28%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(20,12,6,0.0) 30%, rgba(30,18,8,0.55) 70%, rgba(0,0,0,0) 100%)" }} />
        <svg viewBox="-150 -150 300 300" style={{ position: "absolute", left: `${face[0] * 100 - 19}%`, top: `${face[1] * 100 - 14}%`, width: "38%", height: "28%", overflow: "visible", filter: "drop-shadow(0 0 2px rgba(255,255,255,0.4))" }}>{cracks}</svg>
      </div>
      <div style={{ position: "absolute", left: fx - 200 * u, top: fy - 260 * u, width: 400 * u, height: 400 * u, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(90,90,95,0.25), rgba(0,0,0,0))", filter: `blur(${30 * u}px)`, transform: `translateY(${-60 * u * p}px)`, opacity: 0.7 }} />
    </AbsoluteFill>
  );
};

// ── STRIKE 03 · July 1970 · his garden; strike hits a power transformer and arcs to his left shoulder ─
export const Strike3: React.FC<{ t: number; strikeAt?: number }> = ({ t, strikeAt = 2.8 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const TRANS: [number, number] = [0.5, 0.6];
  const strikes: Strike[] = [
    { t: 0.9, from: [0.1, -0.2], to: [0.05, 0.35], seed: 31, strokes: 2, power: 0.45, cloud: true },
    { t: strikeAt, from: [0.62, -0.6], to: [0.52, 0.03], seed: 33, strokes: 3, power: 1.2, width: 1.3, near: 0.55 },
  ];
  const f = flash(t, strikes);
  const near = nearFlash(t, strikes);
  const [gw, gh] = size("photos/garden_rows.jpg");
  const [pw, ph] = size("cut/pole.png");
  // pole placed by hand (smaller than the frame): transformer at screen (X, Y)
  const ps = (v ? 0.62 : 0.95) * H / ph;
  const X = W * (v ? 0.7 : 0.74), Y = H * (v ? 0.36 : 0.3);
  const pole = { s: ps, w: pw * ps, h: ph * ps, ox: X - TRANS[0] * pw * ps, oy: Y - TRANS[1] * ph * ps, map: (p: [number, number]): [number, number] => [X + (p[0] - TRANS[0]) * pw * ps, Y + (p[1] - TRANS[1]) * ph * ps] };
  const [tx, ty] = pole.map(TRANS);
  const arc = clamp(channel(t, { ...strikes[1], strokes: 3 }).I * 1.4);
  const fig = { x: W * (v ? 0.36 : 0.4), y: H * (v ? 0.84 : 0.88), h: H * (v ? 0.34 : 0.5) };
  const shoulder: [number, number] = [fig.x + fig.h * 0.05, fig.y - fig.h * 0.6];
  const hit = ramp(t, strikeAt, strikeAt + 0.3);
  const green = { exp: 0.52, flashGain: 0.5, sat: 0.55, con: 1.1 };
  return (
    <AbsoluteFill style={{ background: "#05070a", overflow: "hidden" }}>
      <Plate src="photos/storm_sunset.jpg" iw={size("photos/storm_sunset.jpg")[0]} ih={size("photos/storm_sunset.jpg")[1]} cam={{ fx: 0.45, fy: 0.25, k: 1.6, px: -t * 0.01 }} f={f} look={{ exp: 0.38, flashGain: 0.8, sat: 0.35, con: 1.1 }} />
      <AbsoluteFill style={{ background: "#7d8a3a", mixBlendMode: "soft-light", opacity: 0.55 }} />
      <Plate src="cut/shen_doyles_river.png" iw={size("cut/shen_doyles_river.png")[0]} ih={size("cut/shen_doyles_river.png")[1]} cam={v ? { fx: 0.5, fy: 0.5, k: 1.0, py: 0.05, free: true } : { fx: 0.5, fy: 0.5, k: 1.0, py: 0.0, free: true }} f={f} look={green} />
      <div style={{ position: "absolute", left: pole.ox, top: pole.oy, width: pole.w, height: pole.h }}>
        <Img src={staticFile("cut/pole.png")} style={{ width: "100%", height: "100%", filter: `brightness(${0.3 + 0.6 * f}) saturate(0.4) contrast(1.15)` }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.5, WebkitMaskImage: "linear-gradient(0deg, #000 70%, transparent 100%)", maskImage: "linear-gradient(0deg, #000 70%, transparent 100%)" }}>
        <Plate src="photos/garden_rows.jpg" iw={gw} ih={gh} cam={{ fx: 0.5, fy: 0.75, k: 1.0 }} f={f} look={{ ...green, exp: 0.34 }} />
      </div>
      <People f={f} rim={0.5 + 2 * f} people={[{ anim: "Fixing_Kneeling", time: 1.2 + Math.min(t, strikeAt) * 0.6, x: fig.x - hit * W * 0.03 * (1 - ramp(t, strikeAt + 0.3, strikeAt + 1.5)), y: fig.y, h: fig.h, yaw: 70, pitch: -6 * hit }]} />
      <Bolts t={t} strikes={strikes} map={pole.map} />
      {/* the arc from the transformer to his left shoulder */}
      <Bolts t={t} strikes={[{ t: strikeAt + 0.02, from: [tx / W, ty / H], to: [shoulder[0] / W, shoulder[1] / H], seed: 35, strokes: 3, power: 1.1, width: 0.8, branches: 0.3, rough: 0.16 }]} />
      <div style={{ position: "absolute", left: tx - 120 * u, top: ty - 120 * u, width: 240 * u, height: 240 * u, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(210,230,255,0.9), rgba(120,160,255,0.3) 40%, rgba(0,0,0,0))", opacity: arc, mixBlendMode: "screen" }} />
      <Rain t={t} amount={0.35} wind={0.25} light={f} />
      <FlashWash f={f} near={near} color="#c8d8a0" />
    </AbsoluteFill>
  );
};

// ── STRIKE 04 · 16 April 1972 · inside a guardhouse; his hair caught fire ──────────────────
export const Strike4: React.FC<{ t: number; strikeAt?: number; outAt?: number; tight?: boolean }> = ({ t, strikeAt = 2.4, outAt = 5.2, tight }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const strikes: Strike[] = [{ t: strikeAt, from: [0.55, -0.1], to: [0.55, 0.6], seed: 41, strokes: 4, power: 1.3, near: 0.7, cloud: true }];
  const f = flash(t, strikes);
  const near = nearFlash(t, strikes);
  const flame = ramp(t, strikeAt + 0.15, strikeAt + 0.6, easeOut) * (1 - ramp(t, outAt - 0.8, outAt, easeInOut));
  void Vid;
  const lamp = 0.85 + 0.05 * Math.sin(t * 7);
  // window = real night-storm footage (CC BY 4.0) seen from inside a dark booth
  const winW = W * (v ? 0.86 : 0.5), winH = H * (v ? 0.42 : 0.62);
  const wx = W * (v ? 0.07 : 0.42), wy = H * (v ? 0.12 : 0.1);
  const fig = { x: W * (v ? 0.5 : 0.44), y: H * (v ? 1.06 : 1.12), h: H * (v ? 0.62 : 0.95) };
  const head: [number, number] = [fig.x + fig.h * 0.02, fig.y - fig.h * 0.93];
  const sit = t < strikeAt;
  return (
    <AbsoluteFill style={{ background: "#0a0806", overflow: "hidden", transform: tight ? `scale(${1.25 + 0.05 * ramp(t, 0, 6)})` : undefined, transformOrigin: "50% 35%" }}>
      {/* wood-panelled booth: warm lamp light */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${v ? 30 : 22}% 75%, rgba(255,170,90,${0.32 * lamp}) 0%, rgba(120,70,30,0.12) 35%, rgba(0,0,0,0) 65%), repeating-linear-gradient(90deg, #17110c 0px, #1b140e ${38 * u}px, #120d09 ${40 * u}px)` }} />
      <div style={{ position: "absolute", left: wx, top: wy, width: winW, height: winH, overflow: "hidden", boxShadow: `inset 0 0 ${40 * u}px rgba(0,0,0,0.9), 0 0 0 ${16 * u}px #0d0907` }}>
        <Img src={staticFile("photos/bolt_noaa_nssl.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: "70% 50%", filter: `brightness(${0.12 + 1.1 * f}) contrast(1.1) saturate(0.5)`, transform: "scale(1.15)" }} />
        <Img src={staticFile("photos/shen_blue_ridge_dusk.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 80%", filter: `brightness(${0.25 + 0.6 * f}) saturate(0.4)`, mixBlendMode: "screen", opacity: 0.5 }} />
        <Rain t={t} amount={1.4} wind={0.02} light={f} speed={0.4} length={0.6} />
        <AbsoluteFill style={{ background: `rgba(200,215,255,${0.6 * f})`, mixBlendMode: "screen" }} />
        {/* window mullions */}
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 10 * u, background: "#0d0907" }} />
        <div style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 10 * u, background: "#0d0907" }} />
      </div>
      {/* cold window light spilling into the room during flashes */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${v ? 50 : 66}% 30%, rgba(190,205,255,${0.55 * f}), rgba(0,0,0,0) 60%)`, mixBlendMode: "screen" }} />
      <People f={f * 0.6} rim={0.3 + 2.4 * f} people={[{ anim: sit ? "Sitting_Idle_Loop" : "Hit_Head", time: sit ? t : t - strikeAt, x: fig.x, y: fig.y, h: fig.h, yaw: v ? 160 : 150, blend: !sit && t - strikeAt < 0.25 ? { anim: "Sitting_Idle_Loop", time: t, w: 1 - (t - strikeAt) / 0.25 } : undefined }]} />
      <HairFlame t={t} x={head[0]} y={head[1]} r={34 * u * (v ? 1.15 : 1.25)} k={flame} seed={4} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${(head[0] / W) * 100}% ${(head[1] / H) * 100}%, rgba(255,150,60,${0.22 * flame}), rgba(0,0,0,0) 40%)`, mixBlendMode: "screen" }} />
      <FlashWash f={f * 0.6} near={near * 0.8} />
    </AbsoluteFill>
  );
};

// ── STRIKE 05 · 7 August 1973 · on patrol; he moved away from a storm cloud; hair on fire again ─
export const Strike5: React.FC<{ t: number; shot: "cloud" | "strike"; strikeAt?: number }> = ({ t, shot, strikeAt = 3.2 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  if (shot === "cloud") {
    // real time-lapse of a thunderstorm building over the mountains of Southwest Virginia (C. E. Price, public domain)
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <Vid src="price_timelapse" start={2} rate={1} filter="grayscale(0.55) contrast(1.2) brightness(0.8)" scale={v ? 1.0 : 1.04} />
        <AbsoluteFill style={{ background: "#3b4654", mixBlendMode: "soft-light", opacity: 0.6 }} />
      </AbsoluteFill>
    );
  }
  const strikes: Strike[] = [
    { t: 1.2, from: [0.15, -0.2], to: [0.1, 0.32], seed: 51, strokes: 2, power: 0.5 },
    { t: strikeAt, from: [0.42, -0.4], to: [0.45, 1.1], seed: 53, strokes: 4, power: 1.3, width: 1.5, near: 0.85 },
  ];
  const cam = v ? { fx: 0.4, fy: 0.5, k: 1.15, py: 0.32, free: true } : { fx: 0.45, fy: 0.5, k: 1.0, py: 0.36, free: true };
  const hit = t >= strikeAt;
  const flame = ramp(t, strikeAt + 0.1, strikeAt + 0.5, easeOut);
  return (
    <Stage t={t} sky="photos/storm_gust_noaa.jpg" skyCam={{ fx: 0.6, fy: 0.4, k: 1.2 }} skyLook={{ exp: 0.42, sat: 0.2 }} plate="cut/shen_little_devils_stairs.png" cam={cam}
      look={{ exp: 0.28, flashGain: 0.55, sat: 0.25, con: 1.18 }} strikes={strikes} rain={0.75}>
      {({ f }) => {
        const [tw, th] = size("cut/truck_c20.png");
        const tw2 = (v ? 0.9 : 0.42) * W, th2 = tw2 * th / tw;
        const truck = { x: W * (v ? 0.4 : 0.56), y: H * (v ? 0.86 : 0.86) };
        const fig = { x: W * (v ? 0.42 : 0.4) + lerp(0, -W * 0.08, ramp(t, 0, strikeAt)), y: H * (v ? 1.0 : 1.04), h: H * (v ? 0.46 : 0.66) };
        const head: [number, number] = [fig.x - fig.h * 0.035, fig.y - fig.h * 0.97];
        return (
          <>
            <div style={{ position: "absolute", left: truck.x, top: truck.y - th2 * 0.5, width: tw2, height: th2 }}>
              <Img src={staticFile("cut/truck_c20.png")} style={{ width: "100%", height: "100%", filter: `brightness(${0.2 + 0.45 * f}) saturate(0.35) contrast(1.15)`, transform: "scaleX(-1)" }} />
            </div>
            <People f={f * 0.7} rim={0.4 + 2.2 * f} people={[{ anim: hit ? "Hit_Head" : "Walk_Loop", time: hit ? t - strikeAt : t * 0.95, x: fig.x, y: fig.y, h: fig.h, yaw: hit ? -60 : -95 }]} />
            <HairFlame t={t} x={head[0]} y={head[1]} r={30 * u * (v ? 1 : 1.25)} k={flame} seed={5} />
          </>
        );
      }}
    </Stage>
  );
};

// ── STRIKE 06 · June 1976 · walking outdoors; ankle injured ────────────────────────────────
export const Strike6: React.FC<{ t: number; strikeAt?: number }> = ({ t, strikeAt = 3.0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const strikes: Strike[] = [
    { t: 1.1, from: [0.7, -0.3], to: [0.75, 0.2], seed: 61, strokes: 2, power: 0.5, cloud: true },
    { t: strikeAt, from: [0.48, -0.5], to: [0.5, 0.78], seed: 63, strokes: 3, power: 1.25, width: 1.3, near: 0.8 },
  ];
  const [pw, ph] = size("photos/shen_stonyman_trail.jpg");
  const cam = { fx: 0.5, fy: 0.55, k: (v ? 1.0 : 1.05) + 0.05 * ramp(t, 0, 7) };
  const f = flash(t, strikes), near = nearFlash(t, strikes);
  const pm = plateMap(pw, ph, W, H, cam);
  const walking = t < strikeAt;
  const fig = { x: W * 0.5, y: H * (v ? 0.8 : 0.84) + lerp(0, H * 0.04, ramp(t, 0, strikeAt)), h: H * (v ? 0.3 : 0.44) * (1 + 0.12 * ramp(t, 0, strikeAt)) };
  return (
    <AbsoluteFill style={{ background: "#040309", overflow: "hidden" }}>
      <Plate src="photos/shen_stonyman_trail.jpg" iw={pw} ih={ph} cam={cam} f={f} look={{ exp: 0.4, flashGain: 0.6, sat: 0.4, con: 1.12 }} />
      <AbsoluteFill style={{ background: "#3a2a5e", mixBlendMode: "soft-light", opacity: 0.75 }} />
      <CloudGlow t={t} strikes={strikes} map={pm.map} radius={0.35} />
      <People f={f * 0.6} rim={0.35 + 2 * f} people={[{ anim: walking ? "Walk_Loop" : "Hit_Chest", time: walking ? t : t - strikeAt, x: fig.x, y: fig.y, h: fig.h, yaw: walking ? 12 : 30 }]} />
      <Bolts t={t} strikes={strikes} map={pm.map} />
      <Rain t={t} amount={0.8} wind={0.1} light={f} />
      <FlashWash f={f} near={near} color="#b9a8ff" />
    </AbsoluteFill>
  );
};

// ── STRIKE 07 · 25 June 1977 · fishing; chest and stomach burned · the payoff ─────────────
export const Strike7: React.FC<{ t: number; strikeAt?: number; build?: number }> = ({ t, strikeAt = 5.0, build = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const strikes: Strike[] = [
    { t: strikeAt - 2.6, from: [0.2, -0.3], to: [0.2, 0.2], seed: 71, strokes: 1, power: 0.35, cloud: true },
    { t: strikeAt - 1.2, from: [0.8, -0.3], to: [0.8, 0.2], seed: 72, strokes: 2, power: 0.5, cloud: true },
    { t: strikeAt, from: [0.42, -0.6], to: [0.4, 0.6], seed: 77, strokes: 5, power: 1.5, width: 1.8, near: 1 },
  ];
  const [pw, ph] = size("photos/shen_rapidan_pool.jpg");
  const tense = ramp(t, 0, strikeAt, easeIn);
  const cam = { fx: 0.55, fy: 0.55, k: (v ? 1.05 : 1.0) + 0.12 * tense + 0.04 * build };
  const pm = plateMap(pw, ph, W, H, cam);
  const f = flash(t, strikes), near = nearFlash(t, strikes);
  const fig = { x: W * (v ? 0.38 : 0.32), y: H * (v ? 0.83 : 0.88), h: H * (v ? 0.36 : 0.56) };
  const hit = t >= strikeAt;
  return (
    <AbsoluteFill style={{ background: "#020406", overflow: "hidden" }}>
      <Plate src="photos/shen_rapidan_pool.jpg" iw={pw} ih={ph} cam={cam} f={f} look={{ exp: lerp(0.42, 0.2, tense), flashGain: 0.7, sat: lerp(0.6, 0.3, tense), con: 1.15 }} />
      <AbsoluteFill style={{ background: "#0e3a46", mixBlendMode: "soft-light", opacity: 0.4 + 0.4 * tense }} />
      <CloudGlow t={t} strikes={strikes} map={pm.map} radius={0.4} />
      <People f={f * 0.6} rim={0.35 + 2.2 * f} people={[{ anim: hit ? "Hit_Chest" : "Idle_Loop", time: hit ? t - strikeAt : t, x: fig.x, y: fig.y, h: fig.h, yaw: 75, rodBend: hit ? 0 : 0.2 + 0.1 * Math.sin(t * 1.3) }]} />
      <Bolts t={t} strikes={strikes} map={pm.map} />
      <Rain t={t} amount={lerp(0.1, 0.9, tense)} wind={lerp(0.05, 0.3, tense)} light={f} />
      <FlashWash f={f} near={near} color="#a8c8ff" />
    </AbsoluteFill>
  );
};

export { Bolts, Rain, FlashWash, CloudGlow, Plate, plateMap, flash, FireFootage, FireGlow };
