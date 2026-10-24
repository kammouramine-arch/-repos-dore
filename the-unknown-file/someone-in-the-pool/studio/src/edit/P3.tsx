import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, staticFile } from "remotion";
import { Timeline, Cue, Shot, Still, ScreenFill, Black, Grain, Flash, CCTV, FPS, ease, clamp } from "./kit";
import { LockScreen, MessagesScreen, CamApp, Banner, Tap, SAFE_TOP } from "../ui/Phone";
import { NOTE_CAM4, MANAGER } from "../ui/states";

/** NIGHT 3 — IT FOLLOWED YOU HOME. Times are narration seconds (frame 0 is the first sentence). */
export const P3_END = 159.6;
const S = (n: string) => `shots/p3/${n}.mp4`;
const J = (n: string) => `shots/p3/${n}.jpg`;
const S2 = (n: string) => `shots/p2/${n}.mp4`;
const NOTE_IMG = { at: 0.35, title: "New camera image", body: "Motion event — tap to view", time: "now" };

/** the security app showing the live CAM 4 video, graded like CCTV, inside the phone */
const PhoneFeed: React.FC<{ t: number; at: number; zoom?: number; fy?: number }> = ({ t, at, zoom = 1, fy = 0.5 }) => (
  <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `50% ${fy * 100}%`, filter: "grayscale(0.55) sepia(0.18) hue-rotate(130deg) saturate(1.3) contrast(1.18) brightness(1.1) blur(0.5px)" }}>
    <OffthreadVideo src={staticFile(S("p3_cc4"))} startFrom={Math.round(at * FPS)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);
/** a still "camera image" in the app */
const PhoneImg: React.FC<{ src: string; zoom?: number; fx?: number; fy?: number }> = ({ src, zoom = 1, fx = 0.5, fy = 0.5 }) => (
  <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}>
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.85) contrast(1.25) brightness(1.05) blur(0.4px)" }} />
  </AbsoluteFill>
);

const cues: Cue[] = [
  { from: 0.0, to: 2.98, el: (t, d) => <Still src={J("p3_01")} t={t} d={d} z0={1.0} z1={1.06} /> },
  { from: 2.98, to: 4.6, el: (t, d) => <Shot src={S2("p2_16")} t={t} d={d} at={10.9} z0={1.1} z1={1.14} grade="grayscale(0.4) brightness(0.8)" /> },
  { from: 4.6, to: 7.12, el: (t, d) => <Shot src={S2("p2_04")} t={t} d={d} z0={1.0} z1={1.05} grade="grayscale(0.4) brightness(0.85)" /> },
  { from: 7.12, to: 10.64, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.05} fy={0.3}><MessagesScreen t={t} time="11:42" name="Manager" msgs={[{ at: 0.3, text: MANAGER[0].text }, { at: 1.4, text: MANAGER[1].text }]} typingAt={0.6} /></ScreenFill> },
  { from: 10.64, to: 14.0, el: (t, d) => <Shot src={S("p3_02")} t={t} d={d} /> },
  { from: 14.0, to: 16.98, el: (t, d) => <Shot src={S("p3_03")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 16.98, to: 21.6, el: (t, d) => <Shot src={S("p3_04")} t={t} d={d} z0={1.0} z1={1.06} /> },
  { from: 21.6, to: 27.26, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.18} fy={0.48} buzz={t < 0.5 ? 1 : 0}><LockScreen t={t + 2} time="3:07" notes={[NOTE_CAM4]} hi={t > 3.7 ? 1 : 0} /></ScreenFill> },
  { from: 27.26, to: 29.92, el: (t, d) => <ScreenFill t={t} d={d} z0={1.18} z1={1.2} fy={0.48}><LockScreen t={t + 2} time="3:07" notes={[NOTE_CAM4]} hi={1} /><Tap t={t} at={1.2} x={540} y={SAFE_TOP + 820} /></ScreenFill> },
  // the app: CAM 4, the pool full of dark water — she is there, then she looks at you, then points behind you
  { from: 29.92, to: 47.5, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.0} hand={0.5}>
      <CamApp t={t} time="3:07" cam="CAMERA 4" place="Pool — deep end" stamp={`2026-10-22  03:07:${String(29 + Math.floor(t)).padStart(2, "0")}`} loading={t < 0.5 ? 1 : 0}
        feed={<PhoneFeed t={t} at={t} zoom={1.0 + 0.25 * ease((t - 8) / 2.5) + 0.2 * ease((t - 12) / 3)} fy={0.4} />} />
    </ScreenFill> },
  { from: 47.5, to: 50.32, el: (t, d) => <Shot src={S("p3_05")} t={t} d={d} /> },
  { from: 50.32, to: 53.0, el: (t, d) => <Shot src={S("p3_06")} t={t} d={d} /> },
  { from: 53.0, to: 57.14, el: (t, d) => <Shot src={S("p3_07")} t={t} d={d} /> },
  { from: 57.14, to: 60.46, el: (t, d) => <Shot src={S("p3_08")} t={t} d={d} /> },
  { from: 60.46, to: 64.96, el: (t, d) => <Shot src={S("p3_09")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 64.96, to: 69.18, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.1} fy={0.4} buzz={t < 0.6 ? 1 : 0}>
      <CamApp t={t} time="3:09" cam="CAMERA 4" place="Pool — deep end" stamp="2026-10-22  03:09:12" feed={<PhoneFeed t={t} at={17.5} />} />
      <Banner t={t} n={NOTE_IMG} /><Tap t={t} at={3.1} x={540} y={SAFE_TOP + 170} />
    </ScreenFill> },
  // the image is of HIS bathroom
  { from: 69.18, to: 78.2, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.0} hand={0.5}>
      <CamApp t={t} time="3:09" cam="CAMERA 5" place="Bathroom" stamp="2026-10-22  03:09:14" live={false} snapshot loading={t < 0.4 ? 1 : 0}
        feed={<PhoneImg src={J("p3_photo_a")} zoom={1.0 + 0.3 * ease((t - 4.5) / 3.5)} fx={0.45} fy={0.25} />} />
    </ScreenFill> },
  { from: 78.2, to: 80.34, el: (t, d) => <Still src={J("p3_10")} t={t} d={d} z0={1.0} z1={1.04} hand={1.0} /> },
  { from: 80.34, to: 84.66, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.0} hand={0.5}>
      <CamApp t={t} time="3:09" cam="CAMERA 5" place="Bathroom" stamp="2026-10-22  03:09:21" live={false} snapshot loading={t < 0.35 ? 1 : 0}
        feed={<PhoneImg src={J("p3_photo_b")} zoom={1.0 + 0.35 * ease((t - 1.6) / 2.4)} fx={0.48} fy={0.6} />} />
    </ScreenFill> },
  { from: 84.66, to: 87.64, el: (t, d) => <Shot src={S("p3_11")} t={t} d={d} /> },
  { from: 87.64, to: 97.12, el: (t, d) => <Shot src={S("p3_12")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 97.12, to: 100.46, el: (t, d) => <Shot src={S("p3_13")} t={t} d={d} shake={t > 0.95 && t < 1.4 ? 8 : 0} /> },
  { from: 100.46, to: 101.74, el: () => <Black /> },
  { from: 101.74, to: 108.38, el: (t, d) => <Shot src={S("p3_14")} t={t} d={d} z0={1.0} z1={1.07} fy={0.55} /> },
  { from: 108.38, to: 111.98, el: (t, d) => <Shot src={S("p3_15")} t={t} d={d} /> },
  { from: 111.98, to: 115.86, el: (t, d) => <Shot src={S("p3_16")} t={t} d={d} z0={1.0} z1={1.05} /> },
  // SCARE 1: the hand on his shoulder (116.48)
  { from: 115.86, to: 119.52, el: (t, d) => <AbsoluteFill><Shot src={S("p3_17")} t={t} d={d} shake={t > 1.1 && t < 1.35 ? 6 : 0} /><Flash t={t} at={1.13} dur={0.1} o={0.18} /></AbsoluteFill> },
  { from: 119.52, to: 121.92, el: (t, d) => <Shot src={S("p3_18")} t={t} d={d} /> },
  { from: 121.92, to: 123.6, el: (t, d) => <Shot src={S("p3_19")} t={t} d={d} /> },
  { from: 123.6, to: 124.28, el: (t, d) => <Shot src={S("p3_20")} t={t} d={d} /> },
  { from: 124.28, to: 126.24, el: (t, d) => <Shot src={S("p3_21")} t={t} d={d} /> },
  { from: 126.24, to: 128.96, el: (t, d) => <Shot src={S("p3_22")} t={t} d={d} /> },
  { from: 128.96, to: 134.62, el: (t, d) => <Shot src={S("p3_23")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 134.62, to: 137.44, el: (t, d) => <Shot src={S("p3_24")} t={t} d={d} /> },
  { from: 137.44, to: 139.48, el: (t, d) => <Still src={J("p3_25")} t={t} d={d} z0={1.0} z1={1.03} hand={0.8} /> },
  { from: 139.48, to: 144.32, el: (t, d) => <Shot src={S("p3_26")} t={t} d={d} /> },
  { from: 144.32, to: 147.92, el: (t, d) => <Shot src={S("p3_27")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 147.92, to: 153.36, el: (t, d) => <Shot src={S("p3_28")} t={t} d={d} z0={1.0} z1={1.06} /> },
  // FINAL SCARE: three knocks behind his seat, her face rises beside his, lunges — hard cut
  { from: 153.36, to: 159.25, el: (t, d) => <AbsoluteFill><Shot src={S("p3_29")} t={t} d={d} z0={1.0} z1={1.0 + 0.2 * ease((t - 5.55) / 0.3)} fy={0.4} /><Flash t={t} at={5.58} dur={0.1} o={0.2} /></AbsoluteFill> },
  { from: 159.25, to: P3_END, el: () => <Black /> },
];

export const Pool3: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Timeline cues={cues} />
    <Grain o={0.1} />
    {audio ? <Audio src={staticFile("audio/p3_mix.wav")} /> : null}
  </AbsoluteFill>
);
