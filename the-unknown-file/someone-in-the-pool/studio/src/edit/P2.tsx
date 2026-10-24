import React from "react";
import { AbsoluteFill, Audio, Img, staticFile } from "remotion";
import { Timeline, Cue, Shot, Still, Black, Grain, Flash, CCTV, SignalError, Static, ease, clamp } from "./kit";

/** NIGHT 2 — THE POOL IS EMPTY. SO WHO IS THAT? Times are narration seconds (frame 0 is the first sentence). */
export const P2_END = 137.6;
const S = (n: string) => `shots/p2/${n}.mp4`;
const J = (n: string) => `shots/p2/${n}.jpg`;
const S1 = (n: string) => `shots/p1/${n}.mp4`;
const DATE = "2026-10-21";
const T307 = 3 * 3600 + 7 * 60;

/** the black monitor glass with a faint reflection of the room (and her) */
const BlackMonitor: React.FC<{ t: number; d: number }> = ({ t, d }) => (
  <AbsoluteFill style={{ background: "#020304" }}>
    <AbsoluteFill style={{ transform: `scaleX(-1) scale(${1.04 + 0.03 * ease(t / d)})`, opacity: 0.32 + 0.45 * ease((t - 0.5) / 0.2), filter: "grayscale(0.6) brightness(0.75) contrast(1.25) blur(0.6px)" }}>
      <Shot src={S("p2_18")} t={t} d={d} />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(120deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.04) 100%)" }} />
    <AbsoluteFill style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0 1px, rgba(0,0,0,0) 1px 4px)" }} />
    <AbsoluteFill style={{ boxShadow: "inset 0 0 0 46px #0b0c0e, inset 0 0 120px 60px #000" }} />
  </AbsoluteFill>
);

const cues: Cue[] = [
  { from: 0.0, to: 3.64, el: (t, d) => <Shot src={S("p2_01")} t={t} d={d} /> },
  { from: 3.64, to: 5.98, el: (t, d) => <Still src={J("p2_02")} t={t} d={d} z0={1.0} z1={1.1} fy={0.4} /> },
  // memory flashes of Night 1
  { from: 5.98, to: 7.4, el: (t, d) => <CCTV src={S1("p1_cc4z")} t={t} d={d} at={4.6} cam="CAM 04  POOL / DEEP END" date="2026-10-20" clock={T307 + 45} z0={1.1} z1={1.2} fy={0.42} glitch={t > 1.2 ? 0.7 : 0} /> },
  { from: 7.4, to: 8.5, el: (t, d) => <Shot src={S1("p1_10")} t={t} d={d} at={2.4} z0={1.08} z1={1.12} /> },
  { from: 8.5, to: 10.24, el: (t, d) => <CCTV src={S1("p1_cc1")} t={t} d={d} at={6.0} cam="CAM 01  SECURITY OFFICE" date="2026-10-20" clock={T307 + 7 * 60 + 15} z0={1.6} z1={1.75} fx={0.5} fy={0.55} glitch={t > 1.4 ? 0.8 : 0} /> },
  { from: 10.24, to: 12.94, el: (t) => <SignalError t={t} /> },
  { from: 12.94, to: 17.18, el: (t, d) => <Shot src={S("p2_03")} t={t} d={d} /> },
  { from: 17.18, to: 20.66, el: (t, d) => <Shot src={S("p2_04")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 20.66, to: 25.02, el: (t, d) => <Shot src={S("p2_05")} t={t} d={d} /> },
  { from: 25.02, to: 27.3, el: (t, d) => <Shot src={S1("p1_02")} t={t} d={d} z0={1.06} z1={1.1} /> },
  { from: 27.3, to: 31.5, el: (t, d) => <Shot src={S("p2_06")} t={t} d={d} /> },
  { from: 31.5, to: 35.14, el: (t, d) => <Shot src={S("p2_07")} t={t} d={d} z0={1.0} z1={1.05} /> },
  // CAM 4 on the screen: FULL of water
  { from: 35.14, to: 38.36, el: (t, d) => <CCTV src={S("p2_cc4")} t={t} d={d} cam="CAM 04  POOL / DEEP END" date={DATE} clock={T307 + 31} alert={t < 1.2 ? 1 : 0} z0={1.0} z1={1.05} /> },
  { from: 38.36, to: 44.08, el: (t, d) => <Shot src={S("p2_08")} t={t} d={d} /> },
  { from: 44.08, to: 62.54, el: (t, d) => <CCTV src={S("p2_cc4")} t={t} d={d} at={8.94} cam="CAM 04  POOL / DEEP END" date={DATE} clock={T307 + 40} glitch={t < 0.35 ? 1 : 0}
      z0={1.0} z1={1.0} fx={0.55} fy={0.5} /> },
  { from: 62.54, to: 63.0, el: (t) => <Static t={t} /> },
  { from: 63.0, to: 67.48, el: (t, d) => <CCTV src={J("p2_cc2_empty")} still t={t} d={d} cam="CAM 02  HALLWAY" date={DATE} clock={T307 + 59} z0={1.0} z1={1.04} /> },
  { from: 67.48, to: 73.4, el: (t, d) => <Shot src={S("p2_09")} t={t} d={d} /> },
  { from: 73.4, to: 84.36, el: (t, d) => <Shot src={S("p2_10")} t={t} d={d} z0={1.0} z1={1.06} fy={0.55} /> },
  { from: 84.36, to: 86.06, el: (t, d) => <Shot src={S("p2_11")} t={t} d={d} /> },
  { from: 86.06, to: 89.12, el: (t, d) => <Shot src={S("p2_12")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 89.12, to: 95.92, el: (t, d) => <Shot src={S("p2_13")} t={t} d={d} z0={1.0} z1={1.08} /> },
  { from: 95.92, to: 101.12, el: (t, d) => <Shot src={S("p2_14")} t={t} d={d} /> },
  { from: 101.12, to: 103.28, el: (t, d) => <Shot src={S("p2_15")} t={t} d={d} /> },
  // CAM 2: she stands outside his locked door
  { from: 103.28, to: 122.52, el: (t, d) => <CCTV src={S("p2_cc2")} t={t} d={d} cam="CAM 02  HALLWAY" date={DATE} clock={T307 + 2 * 60 + 18}
      z0={1.0} z1={1.0 + 0.55 * ease((t - 6) / 7) + 0.35 * ease((t - 14) / 4)} fx={0.62} fy={0.48} /> },
  // the door glass: handprints on our side, SLAM (132.80), crack (133.04)
  { from: 122.52, to: 134.6, el: (t, d) => <AbsoluteFill><Shot src={S("p2_16")} t={t} d={d} shake={t > 10.28 && t < 10.9 ? 10 : 0} /><Flash t={t} at={10.28} dur={0.1} o={0.3} /></AbsoluteFill> },
  { from: 134.6, to: 136.1, el: (t, d) => <Shot src={S("p2_17")} t={t} d={d} /> },
  // FINAL SCARE: in the black glass, her face beside his
  { from: 136.1, to: 137.45, el: (t, d) => <BlackMonitor t={t} d={d} /> },
  { from: 137.45, to: P2_END, el: () => <Black /> },
];

export const Pool2: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Timeline cues={cues} />
    <Grain o={0.1} />
    {audio ? <Audio src={staticFile("audio/p2_mix.wav")} /> : null}
  </AbsoluteFill>
);
