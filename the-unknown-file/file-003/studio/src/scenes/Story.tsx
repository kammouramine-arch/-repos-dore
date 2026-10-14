import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeIn, easeInOut, easeOut, easeSoft, lerp, ramp } from "../lib/anim";
import { size } from "../lib/assets";
import { Bolts, CloudGlow, FlashWash, Plate, Rain, Strike, flash, nearFlash, plateMap } from "../components/Storm";
import { People } from "../three/Person";
import { BoltIcon, Tag } from "../components/UI";
import { Kicker, Rule } from "../components/Type";
import va from "../data/map_virginia.json";
import shen from "../data/map_shen.json";

/*
 * Story scenes: the opening storm, the ranger silhouette, the "7", the real Roy Sullivan photograph (NPS, public
 * domain), Virginia / Shenandoah maps, time passing, and the seven-strike timeline.
 */

// ── opening: thunderstorm over the Virginia Blue Ridge ─────────────────────────────────────
export const OpenStorm: React.FC<{ t: number; strikeAt?: number; push?: number }> = ({ t, strikeAt = 1.15, push = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const strikes: Strike[] = [
    { t: strikeAt - 0.9, from: [0.2, -0.1], to: [0.15, 0.3], seed: 3, strokes: 1, power: 0.35, cloud: true },
    { t: strikeAt, from: [0.55, -0.15], to: [0.6, 0.66], seed: 101, strokes: 4, power: 1.35, width: 1.4, branches: 1.3, near: 0.25 },
    { t: strikeAt + 2.4, from: [0.85, -0.1], to: [0.9, 0.62], seed: 5, strokes: 2, power: 0.6 },
  ];
  const [pw, ph] = size("photos/shen_blue_ridge_dusk.jpg");
  const cam = { fx: v ? 0.55 : 0.5, fy: 0.55, k: (v ? 1.0 : 1.08) + 0.06 * ramp(t, 0, 6) + push };
  const pm = plateMap(pw, ph, W, H, cam);
  const f = flash(t, strikes), near = nearFlash(t, strikes);
  return (
    <AbsoluteFill style={{ background: "#020305", overflow: "hidden" }}>
      <Plate src="photos/shen_blue_ridge_dusk.jpg" iw={pw} ih={ph} cam={cam} f={f} look={{ exp: 0.95, flashGain: 0.9, sat: 0.25, con: 1.15 }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,14,26,0.55) 0%, rgba(10,14,26,0.1) 40%, rgba(0,0,0,0) 70%)" }} />
      <AbsoluteFill style={{ background: "#3a4d78", mixBlendMode: "soft-light", opacity: 0.75 }} />
      <CloudGlow t={t} strikes={strikes} map={pm.map} radius={0.5} />
      <Bolts t={t} strikes={strikes} map={pm.map} />
      <Rain t={t} amount={0.45} wind={0.2} light={f} />
      <FlashWash f={f} near={near} />
    </AbsoluteFill>
  );
};

/** the ranger in silhouette (low angle, campaign hat) lit by distant flashes — anonymous, never a portrait */
export const RangerSilhouette: React.FC<{ t: number; strikeAt?: number }> = ({ t, strikeAt = 0.25 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const strikes: Strike[] = [
    { t: strikeAt, from: [0.75, -0.1], to: [0.8, 0.55], seed: 121, strokes: 3, power: 1.1 },
    { t: strikeAt + 1.6, from: [0.15, -0.1], to: [0.1, 0.5], seed: 122, strokes: 2, power: 0.5, cloud: true },
  ];
  const f = flash(t, strikes);
  const [sw, sh] = size("photos/storm_gust_noaa.jpg");
  return (
    <AbsoluteFill style={{ background: "#020305", overflow: "hidden" }}>
      <Plate src="photos/storm_gust_noaa.jpg" iw={sw} ih={sh} cam={{ fx: 0.5, fy: 0.45, k: 1.15 + 0.05 * ramp(t, 0, 4), px: -t * 0.008 }} f={f} look={{ exp: 0.45, flashGain: 1.1, sat: 0.15, con: 1.2 }} />
      <AbsoluteFill style={{ background: "#2b3a5c", mixBlendMode: "soft-light", opacity: 0.6 }} />
      <CloudGlow t={t} strikes={strikes} />
      <Bolts t={t} strikes={strikes} />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, #020305 0%, rgba(2,3,5,0.85) 16%, rgba(0,0,0,0) 40%)" }} />
      <People f={f} rim={1.2 + 2 * f} people={[{ anim: "Idle_Loop", time: t + 2, x: W * (v ? 0.5 : 0.56), y: H * (v ? 1.18 : 1.42), h: H * (v ? 0.78 : 1.25), yaw: v ? 200 : 205, pitch: -8 }]} />
      <Rain t={t} amount={0.6} wind={0.18} light={f} />
      <FlashWash f={f} />
    </AbsoluteFill>
  );
};

/** "7": seven restrained flashes, one per strike, building into the number */
export const SevenReveal: React.FC<{ t: number; at?: number; dur?: number }> = ({ t, at = 0.1, dur = 2.6 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const step = dur / 7;
  const marks = Array.from({ length: 7 }, (_, i) => {
    const s = at + i * step;
    const k = ramp(t, s, s + 0.12, easeOut);
    const fl = Math.exp(-Math.max(0, t - s) / 0.09) * (t >= s ? 1 : 0);
    return { k, fl };
  });
  const lit = marks.reduce((a, m) => a + m.k, 0) / 7;
  const flashNow = Math.max(...marks.map((m) => m.fl));
  const big = (v ? 760 : 620) * u;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, #0d1420 0%, #030406 70%)", alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ background: `rgba(180,195,255,${0.12 * flashNow})` }} />
      <div style={{ position: "relative", fontFamily: F.sans, fontWeight: 800, fontSize: big, lineHeight: 0.8, color: "transparent", WebkitTextStroke: `${2 * u}px rgba(236,230,218,${0.18 + 0.2 * lit})`, marginTop: -60 * u }}>
        7
        <div style={{ position: "absolute", inset: 0, color: "#fff", WebkitTextStroke: "0", clipPath: `inset(${(1 - lit) * 100}% 0 0 0)`, textShadow: `0 0 ${80 * u * flashNow}px rgba(200,215,255,${0.9 * flashNow}), 0 0 ${30 * u}px rgba(160,180,255,0.35)` }}>7</div>
      </div>
      <div style={{ position: "absolute", bottom: (v ? 560 : 150) * u, display: "flex", gap: 20 * u }}>
        {marks.map((m, i) => (
          <div key={i} style={{ opacity: 0.25 + 0.75 * m.k, transform: `scale(${1 + 0.5 * m.fl})` }}><BoltIcon s={(v ? 60 : 52) * u} color={m.k > 0.5 ? "#fff" : C.paperDim} glow={m.fl * 1.5 + m.k * 0.3} /></div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── the real photograph (NPS) ───────────────────────────────────────────────────────────────
export const NPS_CREDIT = "PHOTO: NATIONAL PARK SERVICE · SHENANDOAH NATIONAL PARK · PUBLIC DOMAIN";
export const RoyPhoto: React.FC<{ t: number; dur: number; mode?: "full" | "face" | "hat" | "tag"; name?: boolean; years?: boolean; label?: boolean; nameAt?: number; grade?: number }> = ({
  t, dur, mode = "full", name, years, label = true, nameAt = 0.5, grade = 0,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const p = easeInOut(clamp(t / dur));
  const [iw, ih] = size("photos/roy_sullivan_nps.jpg");
  // focus points (fractions of the photo): face, burned hat, name tag
  const F_: Record<string, [number, number, number, number]> = { full: [0.42, 0.42, 1.0, 1.08], face: [0.24, 0.2, 1.9, 2.15], hat: [0.74, 0.65, 1.7, 1.95], tag: [0.06, 0.53, 2.6, 2.9] };
  const [fx, fy, k0, k1] = F_[mode];
  const k = lerp(k0, k1, p) * (v ? 1 : 1);
  // vertical: fill the frame. landscape + full: the whole portrait at full height right of centre, over a blurred copy
  const land = !v && mode === "full";
  const kk = land ? 1 : k;
  const pm0 = plateMap(iw, ih, W, H, { fx, fy, k: kk });
  const lh = H * lerp(1.02, 1.1, p), lw = lh * iw / ih, lx = W * 0.66 - lw / 2, ly = H / 2 - lh * 0.48;
  const pm = land ? { ox: lx, oy: ly, w: lw, h: lh } : pm0;
  const fg = land ? { ox: lx - 6 * p, oy: ly, w: lw * 1.006, h: lh * 1.006 } : plateMap(iw, ih, W, H, { fx: fx - 0.01 * p, fy, k: k * 1.012 });
  const nm = ramp(t, nameAt, nameAt + 0.7, easeOut);
  return (
    <AbsoluteFill style={{ background: "#07080a", overflow: "hidden" }}>
      {land && <Img src={staticFile("photos/roy_sullivan_nps.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) blur(40px) brightness(0.35)", transform: "scale(1.2)" }} />}
      <div style={{ position: "absolute", left: pm.ox, top: pm.oy, width: pm.w, height: pm.h, boxShadow: land ? "0 0 120px 40px rgba(0,0,0,0.6)" : undefined }}>
        <Img src={staticFile("photos/roy_sullivan_nps.jpg")} style={{ width: "100%", height: "100%", filter: `grayscale(1) contrast(1.08) brightness(${0.92 - 0.25 * grade}) blur(${mode === "full" ? 0 : 0}px)` }} />
      </div>
      <div style={{ position: "absolute", left: fg.ox, top: fg.oy, width: fg.w, height: fg.h }}>
        <Img src={staticFile("cut/roy.png")} style={{ width: "100%", height: "100%", filter: `grayscale(1) contrast(1.1) brightness(${0.95 - 0.25 * grade})` }} />
      </div>
      <AbsoluteFill style={{ background: "#1c2638", mixBlendMode: "soft-light", opacity: 0.45 }} />
      <AbsoluteFill style={{ background: v ? "linear-gradient(0deg, rgba(4,5,7,0.92) 0%, rgba(4,5,7,0.55) 30%, rgba(0,0,0,0) 55%)" : "linear-gradient(90deg, rgba(4,5,7,0.85) 0%, rgba(4,5,7,0.4) 35%, rgba(0,0,0,0) 60%)" }} />
      {label && <Tag t={t} text="REAL PHOTOGRAPH" sub="RANGER ROY C. SULLIVAN" />}
      {label && <div style={{ position: "absolute", left: (v ? 48 : 72) * u, bottom: (v ? 300 : 46) * u, fontFamily: F.mono, fontSize: (v ? 13 : 12) * u, letterSpacing: "0.12em", color: "rgba(236,230,218,0.66)", opacity: ramp(t, 0.5, 1.1) }}>{NPS_CREDIT}</div>}
      {name && (
        <div style={{ position: "absolute", ...(v ? { left: 0, right: 0, bottom: 520 * u, textAlign: "center" } : { left: 110 * u, top: H * 0.38 }), opacity: nm }}>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (v ? 120 : 132) * u, color: "#fff", letterSpacing: `${0.02 + (1 - nm) * 0.12}em`, lineHeight: 0.95, filter: nm < 1 ? `blur(${(1 - nm) * 12 * u}px)` : undefined, textShadow: "0 8px 40px rgba(0,0,0,0.8)" }}>ROY{v ? <br /> : " "}SULLIVAN</div>
          {years && (
            <>
              <Rule t={t} at={nameAt + 0.4} width={v ? 520 : 640} center={v} style={{ margin: `${22 * u}px ${v ? "auto" : 0}` }} />
              <div style={{ fontFamily: F.mono, fontSize: (v ? 44 : 40) * u, letterSpacing: "0.32em", color: C.paper, opacity: ramp(t, nameAt + 0.6, nameAt + 1.2) }}>1942 – 1977</div>
            </>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── maps ─────────────────────────────────────────────────────────────────────────────────────
type MapData = { w: number; h: number; states: Record<string, string>; park: string; places: Record<string, number[]> };
const MAPS: Record<string, { img: string; d: MapData }> = { virginia: { img: "map/virginia.jpg", d: va as unknown as MapData }, shen: { img: "map/shen.jpg", d: shen as unknown as MapData } };

export const MapView: React.FC<{ t: number; which: "virginia" | "shen"; cx: number; cy: number; zoom: number; highlight?: number; park?: number; labels?: string[]; labelAt?: number; title?: string }> = ({
  t, which, cx, cy, zoom, highlight = 1, park = 0, labels = [], labelAt = 0.5, title,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const M = MAPS[which];
  const sc = zoom * Math.max(W / M.d.w, H / M.d.h);
  const ox = W / 2 - cx * sc, oy = H / 2 - cy * sc;
  const sw = 1 / sc; // 1 screen px in map units
  return (
    <AbsoluteFill style={{ background: "#05080b", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: ox, top: oy, width: M.d.w * sc, height: M.d.h * sc }}>
        <Img src={staticFile(M.img)} style={{ width: "100%", height: "100%" }} />
        <svg viewBox={`0 0 ${M.d.w} ${M.d.h}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          {Object.entries(M.d.states).map(([n, d]) => (
            <path key={n} d={d} fill={n === "Virginia" ? `rgba(160,180,210,${0.1 * highlight})` : "rgba(0,0,0,0.28)"} stroke={n === "Virginia" ? `rgba(236,230,218,${0.35 + 0.5 * highlight})` : "rgba(236,230,218,0.22)"} strokeWidth={(n === "Virginia" ? 2.2 : 1.1) * u * sw} />
          ))}
          {park > 0 && (
            <g opacity={park}>
              <path d={M.d.park} fill="rgba(176,65,74,0.38)" stroke="#ff8a7a" strokeWidth={2.4 * u * sw} style={{ filter: `drop-shadow(0 0 ${6 * u * sw}px rgba(255,120,110,0.8))` }} />
            </g>
          )}
          {labels.map((l, i) => {
            const pt = M.d.places[l]; if (!pt) return null;
            const a = ramp(t, labelAt + i * 0.25, labelAt + i * 0.25 + 0.5);
            return (
              <g key={l} opacity={a}>
                <circle cx={pt[0]} cy={pt[1]} r={5 * u * sw} fill="#fff" />
                <text x={pt[0] + 12 * u * sw} y={pt[1] + 6 * u * sw} fill={C.paper} fontFamily="IBM Plex Mono" fontSize={(v ? 26 : 22) * u * sw} letterSpacing={3 * u * sw} style={{ paintOrder: "stroke" }} stroke="rgba(0,0,0,0.75)" strokeWidth={5 * u * sw}>{l.toUpperCase()}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 50%, rgba(2,3,5,0.75) 100%)" }} />
      {title && (
        <div style={{ position: "absolute", left: (v ? 0 : 96) * u, right: v ? 0 : undefined, top: (v ? 300 : 96) * u, textAlign: v ? "center" : "left" }}>
          <Kicker text={title} t={t} at={0.3} size={v ? 26 : 22} color={C.paper} />
        </div>
      )}
      <div style={{ position: "absolute", right: (v ? 48 : 72) * u, bottom: (v ? 300 : 46) * u, fontFamily: F.mono, fontSize: 12 * u, letterSpacing: "0.12em", color: "rgba(236,230,218,0.5)" }}>MAP: NATURAL EARTH · NPS PARK BOUNDARY · TERRAIN: MAPZEN/SRTM</div>
    </AbsoluteFill>
  );
};

/** Virginia → Shenandoah National Park (camera move across the two relief maps) */
export const VirginiaToPark: React.FC<{ t: number; dur: number; zoomAt?: number }> = ({ t, dur, zoomAt }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const za = zoomAt ?? dur * 0.45;
  const z = ramp(t, za - 1.2, za + 0.2, easeInOut);
  const close = ramp(t, za, za + 1.6, easeInOut);
  const pVA = va.places["Big Meadows"];
  const cx = lerp(v ? 2150 : 2000, pVA[0], z), cy = lerp(v ? 950 : 1000, pVA[1], z);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - close }}>
        <MapView t={t} which="virginia" cx={cx} cy={cy} zoom={lerp(v ? 1.15 : 1.0, 4.5, z)} highlight={1} park={ramp(t, 0.6, 1.4)} labels={v ? ["Richmond", "Washington, D.C."] : ["Washington, D.C.", "Richmond"]} labelAt={0.8} title="VIRGINIA · UNITED STATES" />
      </AbsoluteFill>
      {close > 0 && (
        <AbsoluteFill style={{ opacity: close }}>
          <MapView t={t - za} which="shen" cx={lerp(1950, 1900, ramp(t, za, dur))} cy={lerp(1700, 1800, ramp(t, za, dur))} zoom={lerp(v ? 1.05 : 1.25, v ? 1.2 : 1.45, ramp(t, za, dur))} park={1} labels={["Front Royal", "Thornton Gap", "Skyland", "Big Meadows", "Swift Run Gap"]} labelAt={0.4} title="SHENANDOAH NATIONAL PARK · BLUE RIDGE MOUNTAINS" />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ── time passing / timeline ─────────────────────────────────────────────────────────────────
export const STRIKES_Y = [
  { y: 1942, d: "APRIL 1942", what: "FIRE LOOKOUT TOWER" },
  { y: 1969, d: "JULY 1969", what: "DRIVING HIS TRUCK" },
  { y: 1970, d: "JULY 1970", what: "IN HIS GARDEN" },
  { y: 1972, d: "16 APRIL 1972", what: "INSIDE A GUARDHOUSE" },
  { y: 1973, d: "7 AUGUST 1973", what: "ON PATROL" },
  { y: 1976, d: "5 JUNE 1976", what: "WALKING OUTDOORS" },
  { y: 1977, d: "25 JUNE 1977", what: "FISHING" },
];

/** year counter rolling between two years (e.g. 1942 → 1969) with a thin progress line */
export const YearsPass: React.FC<{ t: number; from: number; to: number; dur: number; label?: string }> = ({ t, from, to, dur, label }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const p = ramp(t, 0.3, dur - 0.6, easeInOut);
  const y = Math.round(lerp(from, to, p));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #111722 0%, #030406 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: F.mono, fontSize: (v ? 28 : 24) * u, letterSpacing: "0.4em", color: C.paperDim, marginBottom: 20 * u }}>{label ?? "YEARS PASS"}</div>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (v ? 260 : 250) * u, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>{y}</div>
      <div style={{ width: (v ? 700 : 900) * u, height: 2 * u, background: "rgba(236,230,218,0.2)", marginTop: 40 * u, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: C.burgundyHi }} />
        <div style={{ position: "absolute", left: 0, top: 16 * u, fontFamily: F.mono, fontSize: 18 * u, color: C.paperDim }}>{from}</div>
        <div style={{ position: "absolute", right: 0, top: 16 * u, fontFamily: F.mono, fontSize: 18 * u, color: C.paperDim }}>{to}</div>
      </div>
      <div style={{ fontFamily: F.mono, fontSize: (v ? 30 : 26) * u, letterSpacing: "0.25em", color: C.paper, marginTop: 70 * u, opacity: ramp(t, dur - 1.0, dur - 0.5) }}>{to - from} YEARS LATER</div>
    </AbsoluteFill>
  );
};

/** the seven strikes on one 35-year line */
export const Timeline7: React.FC<{ t: number; reveal?: number; at?: number; step?: number; highlight?: number; title?: string; sub?: string }> = ({ t, at = 0.4, step = 0.35, highlight = -1, title, sub }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const draw = ramp(t, at - 0.3, at + 7 * step, easeInOut);
  const idx = (y: number) => STRIKES_Y.findIndex((s) => s.y === y);
  const pos = (y: number) => (y === 1942 ? 0.04 : 0.34 + (idx(y) - 1) / 5 * 0.62);
  const gapA = ramp(t, at + step, at + step + 0.5);
  if (v) {
    const top = H * 0.2, bot = H * 0.8, x = W * 0.3;
    return (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #0f141d 0%, #030406 80%)" }}>
        {title && <div style={{ position: "absolute", top: H * 0.09, left: 0, right: 0, textAlign: "center", fontFamily: F.sans, fontWeight: 800, fontSize: 64 * u, color: "#fff", opacity: ramp(t, 0.1, 0.7) }}>{title}</div>}
        <div style={{ position: "absolute", left: x, top, width: 2 * u, height: (bot - top) * draw, background: "rgba(236,230,218,0.45)" }} />
        <div style={{ position: "absolute", left: x + 34 * u, top: lerp(top, bot, 0.15) , fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.28em", color: C.burgundyHi, opacity: gapA }}>27 YEARS</div>
        <div style={{ position: "absolute", left: x - 7 * u, top: lerp(top, bot, 0.09), width: 16 * u, height: lerp(0, (bot - top) * 0.2, gapA), borderLeft: `${2 * u}px dashed ${C.burgundyHi}`, opacity: gapA }} />
        {STRIKES_Y.map((s, i) => {
          const a = ramp(t, at + i * step, at + i * step + 0.4, easeOut);
          const y = lerp(top, bot, pos(s.y));
          const hl = highlight === i ? 1 : 0;
          return (
            <div key={i} style={{ position: "absolute", left: x - 24 * u, top: y - 24 * u, display: "flex", alignItems: "center", opacity: a }}>
              <BoltIcon s={48 * u} color={hl ? "#fff" : C.paper} glow={0.5 + hl} />
              <div style={{ marginLeft: 30 * u }}>
                <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 44 * u, color: "#fff", lineHeight: 1 }}>{s.y}</div>
                <div style={{ fontFamily: F.mono, fontSize: 18 * u, letterSpacing: "0.18em", color: C.paperDim }}>{s.what}</div>
              </div>
            </div>
          );
        })}
        {sub && <div style={{ position: "absolute", bottom: H * 0.1, left: 0, right: 0, textAlign: "center", fontFamily: F.mono, fontSize: 26 * u, letterSpacing: "0.3em", color: C.paper, opacity: ramp(t, at + 7 * step, at + 7 * step + 0.6) }}>{sub}</div>}
      </AbsoluteFill>
    );
  }
  const L = W * 0.08, R = W * 0.92, y0 = H * 0.55;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #0f141d 0%, #030406 80%)" }}>
      {title && <div style={{ position: "absolute", top: H * 0.16, left: 0, right: 0, textAlign: "center", fontFamily: F.sans, fontWeight: 800, fontSize: 70 * u, color: "#fff", opacity: ramp(t, 0.1, 0.7) }}>{title}</div>}
      <div style={{ position: "absolute", left: L, top: y0, height: 2 * u, width: (R - L) * draw, background: "rgba(236,230,218,0.45)" }} />
      <div style={{ position: "absolute", left: lerp(L, R, 0.07), width: lerp(L, R, 0.31) - lerp(L, R, 0.07), top: y0 - 8 * u, height: 16 * u, borderTop: `${2 * u}px dashed ${C.burgundyHi}`, opacity: gapA }} />
      <div style={{ position: "absolute", left: lerp(L, R, 0.07), width: lerp(L, R, 0.31) - lerp(L, R, 0.07), top: y0 + 22 * u, textAlign: "center", fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.28em", color: C.burgundyHi, opacity: gapA }}>27 YEARS</div>
      {STRIKES_Y.map((s, i) => {
        const a = ramp(t, at + i * step, at + i * step + 0.4, easeOut);
        const x = lerp(L, R, pos(s.y));
        const up = i % 2 === 0;
        const hl = highlight === i ? 1 : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y0, opacity: a }}>
            <div style={{ position: "absolute", left: -1 * u, top: up ? -110 * u : 0, width: 2 * u, height: 110 * u, background: "rgba(236,230,218,0.3)" }} />
            <div style={{ position: "absolute", left: -20 * u, top: -20 * u }}><BoltIcon s={40 * u} color={hl ? "#fff" : C.paper} glow={0.5 + hl} /></div>
            <div style={{ position: "absolute", left: -90 * u, width: 180 * u, top: up ? -200 * u : 120 * u, textAlign: "center" }}>
              <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 40 * u, color: "#fff", lineHeight: 1 }}>{s.y}</div>
              <div style={{ fontFamily: F.mono, fontSize: 13 * u, letterSpacing: "0.14em", color: C.paperDim, marginTop: 6 * u }}>{s.what}</div>
            </div>
          </div>
        );
      })}
      {sub && <div style={{ position: "absolute", bottom: H * 0.1, left: 0, right: 0, textAlign: "center", fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.3em", color: C.paper, opacity: ramp(t, at + 7 * step, at + 7 * step + 0.6) }}>{sub}</div>}
    </AbsoluteFill>
  );
};

/** calm after the storm: clearing sky over the ridges */
export const AfterStorm: React.FC<{ t: number; src?: string }> = ({ t, src = "photos/shen_fog_ocean.jpg" }) => {
  const { width: W, height: H } = useVideoConfig();
  const [iw, ih] = size(src);
  return (
    <AbsoluteFill style={{ background: "#05070a", overflow: "hidden" }}>
      <Plate src={src} iw={iw} ih={ih} cam={{ fx: 0.5, fy: 0.5, k: 1.05 + 0.05 * ramp(t, 0, 8), px: -0.01 * t }} f={0} look={{ exp: 0.78, sat: 0.55, con: 1.08 }} />
      <AbsoluteFill style={{ background: "#1c2a3c", mixBlendMode: "soft-light", opacity: 0.35 }} />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(4,5,7,0.6) 0%, rgba(0,0,0,0) 45%)" }} />
    </AbsoluteFill>
  );
};

export { easeIn, easeSoft };
