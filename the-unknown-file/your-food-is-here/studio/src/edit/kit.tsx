import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SW, SH, SAFE_TOP, clamp, ease } from "../ui/Phone";

export const FPS = 30;
const PS = 0.92;   // phone screen scale in screen-fill shots
export type Cue = { from: number; to: number; el: (t: number, d: number) => React.ReactNode; key?: string };

/** plays cues (seconds) as hard-cut sequences; t = local seconds */
export const Timeline: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>
    {cues.map((c, i) => (
      <Sequence key={i} from={Math.round(c.from * FPS)} durationInFrames={Math.max(1, Math.round((c.to - c.from) * FPS))}>
        <Local d={c.to - c.from} el={c.el} />
      </Sequence>
    ))}
  </>
);
const Local: React.FC<{ d: number; el: Cue["el"] }> = ({ d, el }) => {
  const f = useCurrentFrame();
  return <>{el(f / FPS, d)}</>;
};

const drift = (t: number, amp: number, seed = 1) => ({
  x: (Math.sin(t * 0.7 + seed) * 6 + Math.sin(t * 1.9 + seed * 2) * 2.5) * amp,
  y: (Math.cos(t * 0.6 + seed) * 6 + Math.sin(t * 2.3 + seed) * 2) * amp,
  r: Math.sin(t * 0.5 + seed) * 0.18 * amp,
});

/** a rendered 3D shot (public/shots/<ep>/<name>.mp4) with optional slow push + handheld drift */
export const Shot: React.FC<{ src: string; t: number; d: number; at?: number; z0?: number; z1?: number; fx?: number; fy?: number; hand?: number; grade?: string; shake?: number }> = ({ src, t, d, at = 0, z0 = 1, z1 = 1, fx = 0.5, fy = 0.45, hand = 0, grade, shake = 0 }) => {
  const z = z0 + (z1 - z0) * ease(t / d);
  const dr = drift(t, hand);
  const sk = shake ? { x: Math.sin(t * 87) * shake, y: Math.cos(t * 71) * shake * 0.7 } : { x: 0, y: 0 };
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${dr.x + sk.x}px, ${dr.y + sk.y}px) rotate(${dr.r}deg) scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`, filter: grade }}>
        <OffthreadVideo src={staticFile(src)} startFrom={Math.round(at * FPS)} muted style={{ width: 1080, height: 1920 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Still: React.FC<{ src: string; t: number; d: number; z0?: number; z1?: number; fx?: number; fy?: number; hand?: number; grade?: string; children?: React.ReactNode }> = ({ src, t, d, z0 = 1.0, z1 = 1.07, fx = 0.5, fy = 0.45, hand = 0.6, grade, children }) => {
  const z = z0 + (z1 - z0) * ease(t / d);
  const dr = drift(t, hand, 3);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${dr.x}px, ${dr.y}px) rotate(${dr.r}deg) scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`, filter: grade }}>
        <Img src={staticFile(src)} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** the phone screen filling the frame: shows the centre 1080x1920 of the 1080x2376 UI canvas.
 *  zoom/focus push into a region; buzz = vibration; glass reflection + edge falloff so it reads as a lit screen in a dark room */
export const ScreenFill: React.FC<{ t: number; d: number; z0?: number; z1?: number; fx?: number; fy?: number; buzz?: number; hand?: number; children: React.ReactNode; dim?: number }> = ({ t, d, z0 = 1.0, z1 = 1.04, fx = 0.5, fy = 0.5, buzz = 0, hand = 0.7, children, dim = 0 }) => {
  const z = z0 + (z1 - z0) * ease(t / d);
  const dr = drift(t, hand, 7);
  const bz = buzz ? Math.sin(t * 140) * 9 * buzz : 0;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${dr.x + bz}px, ${dr.y}px) rotate(${dr.r * 0.6}deg) scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}>
        {/* the phone: screen scaled to 92 %, centred; side bezels and glow visible, top/bottom run off frame like a close-up */}
        <div style={{ position: "absolute", left: (1080 - SW * PS) / 2 - 16, top: (1920 - SH * PS) / 2 - 16, width: SW * PS + 32, height: SH * PS + 32, borderRadius: 96,
          background: "linear-gradient(90deg, #2a2d33, #0c0d10 6%, #0c0d10 94%, #2a2d33)", boxShadow: "0 0 140px 30px rgba(120,150,210,0.10)" }} />
        <div style={{ position: "absolute", left: (1080 - SW * PS) / 2, top: (1920 - SH * PS) / 2, width: SW, height: SH, transform: `scale(${PS})`, transformOrigin: "0 0", borderRadius: 86 / PS, overflow: "hidden" }}>{children}</div>
        {dim ? <AbsoluteFill style={{ background: "#000", opacity: dim }} /> : null}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.03) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

/** doorbell live feed (prepped 1080x1440 clip) for use inside DoorbellScreen */
export const Feed: React.FC<{ src: string; t: number; at?: number; z?: number; fx?: number; fy?: number; glitch?: number }> = ({ src, t, at = 0, z = 1, fx = 0.5, fy = 0.5, glitch = 0 }) => {
  const g = glitch > 0 && Math.sin(t * 53) > 0.2 ? glitch : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${z}) translateX(${g * 30 * Math.sin(t * 97)}px)`, transformOrigin: `${fx * 100}% ${fy * 100}%`, filter: g ? `contrast(${1 + g}) hue-rotate(${g * 40}deg)` : undefined }}>
        <OffthreadVideo src={staticFile(src)} startFrom={Math.round(at * FPS)} muted style={{ width: 1080, height: 1440 }} />
      </AbsoluteFill>
      {g ? <AbsoluteFill style={{ background: `repeating-linear-gradient(0deg, rgba(255,255,255,${0.12 * g}) 0 3px, rgba(0,0,0,0) 3px 11px)`, transform: `translateY(${(t * 900) % 40}px)` }} /> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)" }} />
    </AbsoluteFill>
  );
};

export const Black: React.FC = () => <AbsoluteFill style={{ background: "#000" }} />;

/** global film grain + vignette */
export const Grain: React.FC<{ o?: number }> = ({ o = 0.09 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Img src={staticFile(`fx/grain_${f % 8}.png`)} style={{ width: 1080, height: 1920, opacity: o, mixBlendMode: "overlay", imageRendering: "auto" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 75% at 50% 48%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)" }} />
    </AbsoluteFill>
  );
};

/** white-ish frame burst (camera flash) */
export const Flash: React.FC<{ t: number; at: number; dur?: number; o?: number }> = ({ t, at, dur = 0.25, o = 0.9 }) => {
  if (t < at || t > at + dur) return null;
  return <AbsoluteFill style={{ background: "#f4f1ea", opacity: o * (1 - (t - at) / dur) }} />;
};
export { clamp, ease };
