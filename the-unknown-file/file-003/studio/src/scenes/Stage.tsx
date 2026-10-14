import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import { clamp, lerp } from "../lib/anim";
import { size } from "../lib/assets";
import { Bolts, Cam, CloudGlow, FlashWash, Look, Plate, Rain, Strike, flash, nearFlash, plateMap } from "../components/Storm";

/*
 * A storm "stage": real storm-sky photograph behind a real landscape photograph (sky removed), both under one
 * camera so bolts can be aimed at exact points of the landscape. Everything is lit together by the strikes.
 */
export type StageProps = {
  t: number;
  sky: string; skyCam?: Cam; skyLook?: Look; skyDrift?: number;
  plate?: string; cam: Cam; look?: Look;
  strikes?: Strike[];
  boltsBehind?: boolean;   // bolts strike behind the landscape (distant)
  rain?: number; wind?: number;
  mono?: boolean;
  children?: (ctx: { f: number; map: (p: [number, number]) => [number, number]; W: number; H: number; u: number; s: number }) => React.ReactNode;
  over?: React.ReactNode;
};

export const Stage: React.FC<StageProps> = ({ t, sky, skyCam = {}, skyLook = {}, skyDrift = 0.012, plate, cam, look = {}, strikes = [], boltsBehind = false, rain = 0, wind = 0.15, mono, children, over }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const f = flash(t, strikes);
  const near = nearFlash(t, strikes);
  const [sw, sh] = size(sky);
  const skyC: Cam = { ...skyCam, px: (skyCam.px ?? 0) - t * skyDrift, k: (skyCam.k ?? 1.12) };
  const pm = plate ? plateMap(...size(plate), W, H, cam) : plateMap(sw, sh, W, H, cam);
  const map = pm.map;
  const bolts = <Bolts t={t} strikes={strikes} map={map} />;
  const lk = mono ? { ...look, mono: true } : look;
  return (
    <AbsoluteFill style={{ background: "#030405", overflow: "hidden" }}>
      <Plate src={sky} iw={sw} ih={sh} cam={skyC} f={f} look={{ exp: 0.5, flashGain: 0.95, sat: 0.4, ...skyLook, mono: mono || skyLook.mono }} />
      <CloudGlow t={t} strikes={strikes} map={map} />
      {boltsBehind && bolts}
      {plate && <Plate src={plate} iw={size(plate)[0]} ih={size(plate)[1]} cam={cam} f={f} look={lk} />}
      {children?.({ f, map, W, H, u, s: pm.s })}
      {!boltsBehind && bolts}
      {rain > 0 && <Rain t={t} amount={rain} wind={wind} light={f} />}
      <FlashWash f={f} near={near} />
      {over}
    </AbsoluteFill>
  );
};

/** flickering fire glow + rising smoke, positioned in screen pixels */
export const FireGlow: React.FC<{ t: number; x: number; y: number; r: number; k: number; seed?: number; smoke?: number }> = ({ t, x, y, r, k, seed = 1, smoke = 1 }) => {
  if (k <= 0) return null;
  const n = (a: number) => 0.5 + 0.5 * Math.sin(t * a + seed * 3.1) * Math.sin(t * a * 0.61 + seed);
  const fl = 0.72 + 0.28 * n(23) * n(37);
  return (
    <>
      {smoke > 0 && [0, 1, 2, 3, 4].map((i) => {
        const ph = ((t * 0.18 + i * 0.2) % 1);
        return (
          <div key={i} style={{ position: "absolute", left: x - r * (0.8 + ph * 1.6) + Math.sin(i * 2 + t) * r * 0.2 + ph * r * 1.8, top: y - r * 0.5 - ph * r * 6, width: r * (1.6 + ph * 3.2), height: r * (1.2 + ph * 2.4), borderRadius: "50%", background: "radial-gradient(closest-side, rgba(20,20,22,0.55), rgba(20,20,22,0))", opacity: k * smoke * (1 - ph) * 0.9, filter: `blur(${r * 0.25}px)` }} />
        );
      })}
      <div style={{ position: "absolute", left: x - r * 3, top: y - r * 3, width: r * 6, height: r * 6, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(255,170,80,${0.55 * k * fl}), rgba(255,110,40,${0.2 * k * fl}) 40%, rgba(0,0,0,0))`, mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", left: x - r, top: y - r * 0.8, width: r * 2, height: r * 1.4, borderRadius: "40% 40% 50% 50%", background: `radial-gradient(ellipse at 50% 70%, rgba(255,236,180,${0.95 * k * fl}), rgba(255,140,50,${0.7 * k * fl}) 45%, rgba(0,0,0,0) 75%)`, mixBlendMode: "screen", filter: `blur(${r * 0.12}px)` }} />
    </>
  );
};

/** real flames (1954 U.S. Forest Service film, public domain) screened into a window/cab, plus glow and smoke */
export const FireFootage: React.FC<{ t: number; x: number; y: number; w: number; h: number; k: number; start?: number; smoke?: number }> = ({ t, x, y, w, h, k, start = 5.5, smoke = 1 }) => {
  if (k <= 0) return null;
  return (
    <>
      <FireGlow t={t} x={x} y={y} r={w * 0.45} k={k} smoke={smoke} />
      <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, overflow: "hidden", mixBlendMode: "screen", opacity: k,
        WebkitMaskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)", maskImage: "radial-gradient(closest-side, #000 55%, transparent 100%)" }}>
        <OffthreadVideo src={staticFile("footage/usfs_fire.mp4")} trimBefore={Math.round(start * 30)} muted
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.6) brightness(0.9) saturate(1.2)" }} />
      </div>
    </>
  );
};

export { clamp, lerp, Img, staticFile };
