import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SW, SH, SAFE_TOP, clamp, ease, K, Txt } from "../ui/Phone";

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

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
export const clockStr = (secs: number) => `${pad(secs / 3600)}:${pad((secs % 3600) / 60)}:${pad(secs % 60)}`;

/** a CCTV feed filling the frame: 8 fps security footage (540x960 render, upscaled), desaturated cold grade, noise, scanlines,
 *  on-screen display (camera name, date, running timestamp, REC). glitch 0..1 tears + jumps the picture; alert shows MOTION DETECTED. */
export const CCTV: React.FC<{ src: string; t: number; d?: number; still?: boolean; at?: number; cam: string; date: string; clock: number; z0?: number; z1?: number; fx?: number; fy?: number;
  glitch?: number; alert?: number; dark?: number; children?: React.ReactNode; osd?: boolean; zoomLabel?: string }> = ({ src, t, d = 1, still, at = 0, cam, date, clock, z0 = 1, z1 = 1, fx = 0.5, fy = 0.5, glitch = 0, alert = 0, dark = 0, children, osd = true, zoomLabel }) => {
  const z = z0 + (z1 - z0) * ease(t / d);
  const g = glitch > 0 && Math.sin(t * 41) + Math.sin(t * 13.7) > 0.4 ? glitch : glitch * 0.25;
  const jx = g ? Math.sin(t * 97) * 60 * g : 0, jy = g > 0.6 ? ((Math.floor(t * 30) % 3) - 1) * 40 * g : 0;
  const grade = `grayscale(0.55) sepia(0.18) hue-rotate(130deg) saturate(1.3) contrast(1.18) brightness(${1.15 - dark}) blur(0.7px)`;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${jx}px, ${jy}px) scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`, filter: grade }}>
        {still ? <Img src={staticFile(src)} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
          : <OffthreadVideo src={staticFile(src)} startFrom={Math.round(at * FPS)} muted style={{ width: 1080, height: 1920 }} />}
        {children}
      </AbsoluteFill>
      {g ? <AbsoluteFill style={{ background: `linear-gradient(0deg, rgba(0,0,0,0) ${30 + 40 * Math.abs(Math.sin(t * 7))}%, rgba(200,255,250,${0.25 * g}) ${32 + 40 * Math.abs(Math.sin(t * 7))}%, rgba(0,0,0,0) ${36 + 40 * Math.abs(Math.sin(t * 7))}%)`, mixBlendMode: "screen" }} /> : null}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 2px, rgba(0,0,0,0) 2px 5px)" }} />
      <Img src={staticFile(`fx/grain_${Math.floor(t * 8) % 8}.png`)} style={{ position: "absolute", width: 1080, height: 1920, opacity: 0.22 + 0.4 * g, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)" }} />
      {osd ? <>
        <div style={{ position: "absolute", left: 60, top: 150, fontFamily: K.mono, fontSize: 42, color: "#e8f2ee", textShadow: "0 0 6px #000, 2px 2px 0 #000" }}>{cam}</div>
        <div style={{ position: "absolute", right: 60, top: 150, fontFamily: K.mono, fontSize: 42, color: "#e8f2ee", textShadow: "0 0 6px #000, 2px 2px 0 #000", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, background: "#ff2a1a", opacity: Math.sin(t * 5) > -0.2 ? 1 : 0.15 }} />REC
        </div>
        <div style={{ position: "absolute", left: 60, bottom: 170, fontFamily: K.mono, fontSize: 44, color: "#e8f2ee", textShadow: "0 0 6px #000, 2px 2px 0 #000" }}>{date}  {clockStr(clock + t)}</div>
        {zoomLabel ? <div style={{ position: "absolute", right: 60, bottom: 170, fontFamily: K.mono, fontSize: 40, color: "#ffd84a", textShadow: "2px 2px 0 #000" }}>{zoomLabel}</div> : null}
      </> : null}
      {alert ? <div style={{ position: "absolute", left: 60, right: 60, top: 820, padding: "26px 0", textAlign: "center", background: `rgba(190,0,0,${0.78 * alert})`,
        opacity: Math.sin(t * 9) > -0.5 ? 1 : 0.35, fontFamily: K.mono, fontWeight: 500, fontSize: 64, letterSpacing: 6, color: "#fff" }}>MOTION DETECTED</div> : null}
    </AbsoluteFill>
  );
};

/** the monitor bank glitching: no signal / system check */
export const SignalError: React.FC<{ t: number; label?: string }> = ({ t, label = "SIGNAL ERROR" }) => (
  <AbsoluteFill style={{ background: "#03070a", alignItems: "center", justifyContent: "center" }}>
    <Img src={staticFile(`fx/grain_${Math.floor(t * 15) % 8}.png`)} style={{ position: "absolute", width: 1080, height: 1920, opacity: 0.6, mixBlendMode: "screen" }} />
    <div style={{ fontFamily: K.mono, fontSize: 70, color: "#d9f3f0", letterSpacing: 6, opacity: Math.sin(t * 4) > -0.6 ? 1 : 0.3 }}>{label}</div>
    <div style={{ fontFamily: K.mono, fontSize: 40, color: "#7e9a98", marginTop: 30 }}>SYSTEM CHECK REQUIRED</div>
    <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 2px, rgba(0,0,0,0) 2px 5px)" }} />
  </AbsoluteFill>
);

/** analog switch-over between CCTV feeds */
export const Static: React.FC<{ t: number; o?: number }> = ({ t, o = 1 }) => (
  <AbsoluteFill style={{ background: "#888", opacity: o }}>
    <Img src={staticFile(`fx/grain_${Math.floor(t * 30) % 8}.png`)} style={{ position: "absolute", width: 1080, height: 1920, transform: "scale(1.6)", filter: "contrast(3) grayscale(1)" }} />
  </AbsoluteFill>
);
