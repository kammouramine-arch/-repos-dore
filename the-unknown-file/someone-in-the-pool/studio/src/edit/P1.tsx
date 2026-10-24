import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Timeline, Cue, Shot, Still, Black, Grain, Flash, CCTV, Static, ease, clamp } from "./kit";

/** NIGHT 1 — SOMEONE IS UNDER THE POOL. Times are narration seconds (no intro: frame 0 is the first sentence). */
export const P1_END = 126.0;
const S = (n: string) => `shots/p1/${n}.mp4`;
const J = (n: string) => `shots/p1/${n}.jpg`;
const DATE = "2026-10-20";
const T307 = 3 * 3600 + 7 * 60;            // 03:07:00

const cues: Cue[] = [
  { from: 0.0, to: 4.04, el: (t, d) => <Shot src={S("p1_01")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 4.04, to: 5.9, el: (t, d) => <Shot src={S("p1_02")} t={t} d={d} z0={1.02} z1={1.06} /> },
  { from: 5.9, to: 11.42, el: (t, d) => <Shot src={S("p1_03")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 11.42, to: 16.0, el: (t, d) => <Shot src={S("p1_04")} t={t} d={d} hand={0.3} /> },
  // motion alarm on CAM 04 (the water is dark, she is hard to see yet)
  { from: 16.0, to: 19.54, el: (t, d) => <CCTV src={S("p1_cc4")} t={t} d={d} cam="CAM 04  POOL / DEEP END" date={DATE} clock={T307 + 19} alert={t < 3.2 ? 1 : 0} dark={0.35} z0={1.2} z1={1.24} fy={0.42} /> },
  { from: 19.54, to: 21.44, el: (t, d) => <Shot src={S("p1_05")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 21.44, to: 30.7, el: (t, d) => <CCTV src={S("p1_cc4")} t={t} d={d} cam="CAM 04  POOL / DEEP END" date={DATE} clock={T307 + 24} z0={1.0} z1={1.45} fx={0.45} fy={0.52} /> },
  { from: 30.7, to: 32.66, el: (t, d) => <Shot src={S("p1_05")} t={t} d={d} at={2.0} z0={1.15} z1={1.25} fy={0.4} /> },
  { from: 32.66, to: 38.98, el: (t, d) => <CCTV src={S("p1_cc4")} t={t} d={d} at={11.2} cam="CAM 04  POOL / DEEP END" date={DATE} clock={T307 + 35} z0={1.55} z1={1.9} fx={0.45} fy={0.52} /> },
  // PTZ zoom: she raises her head and stares into the lens — SCARE 1 (feed tears at 44.3)
  { from: 38.98, to: 45.24, el: (t, d) => <CCTV src={S("p1_cc4z")} t={t} d={d} cam="CAM 04  POOL / DEEP END" date={DATE} clock={T307 + 41} zoomLabel="PTZ 6.0x" z0={1.0} z1={1.12 + 0.5 * ease((t - 4.6) / 0.5)} fx={0.5} fy={0.42} glitch={t > 5.3 ? 1 : 0} /> },
  { from: 45.24, to: 47.9, el: (t, d) => <Shot src={S("p1_06")} t={t} d={d} hand={0.6} /> },
  { from: 47.9, to: 49.68, el: (t, d) => <Shot src={S("p1_07")} t={t} d={d} /> },
  { from: 49.68, to: 53.76, el: (t, d) => <Shot src={S("p1_08")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 53.76, to: 56.76, el: (t, d) => <Shot src={S("p1_09")} t={t} d={d} hand={0.3} /> },
  { from: 56.76, to: 61.88, el: (t, d) => <Shot src={S("p1_10")} t={t} d={d} z0={1.0} z1={1.06} /> },
  { from: 61.88, to: 66.24, el: (t, d) => <Shot src={S("p1_11")} t={t} d={d} /> },
  { from: 66.24, to: 68.68, el: (t, d) => <Shot src={S("p1_12")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 68.68, to: 72.56, el: (t, d) => <Shot src={S("p1_13")} t={t} d={d} z0={1.0} z1={1.08} /> },
  { from: 72.56, to: 78.2, el: (t, d) => <Shot src={S("p1_14")} t={t} d={d} z0={1.0} z1={1.1} fy={0.5} /> },
  { from: 78.2, to: 83.76, el: (t, d) => <Shot src={S("p1_15")} t={t} d={d} z0={1.0} z1={1.06} /> },
  { from: 83.76, to: 87.46, el: (t, d) => <Shot src={S("p1_16")} t={t} d={d} /> },
  { from: 87.46, to: 91.38, el: (t, d) => <CCTV src={S("p1_cc4_gone")} t={t} d={d} cam="CAM 04  POOL / DEEP END" date={DATE} clock={T307 + 7 * 60 + 2} z0={1.2} z1={1.35} fx={0.45} fy={0.52} /> },
  { from: 91.38, to: 93.24, el: (t, d) => <Shot src={S("p1_17")} t={t} d={d} z0={1.0} z1={1.03} /> },
  { from: 93.24, to: 95.32, el: (t, d) => <Shot src={S("p1_18")} t={t} d={d} /> },
  // CAM 1: the office — she is standing right behind him
  { from: 95.32, to: 105.64, el: (t, d) => <CCTV src={S("p1_cc1")} t={t} d={d} cam="CAM 01  SECURITY OFFICE" date={DATE} clock={T307 + 7 * 60 + 9} z0={1.0} z1={1.0 + 0.9 * ease((t - 5.6) / 4.2)} fx={0.5} fy={0.55} /> },
  { from: 105.64, to: 107.24, el: (t, d) => <Shot src={S("p1_19")} t={t} d={d} /> },
  { from: 107.24, to: 108.22, el: (t, d) => <Still src={J("p1_20")} t={t} d={d} z0={1.0} z1={1.02} hand={1.2} /> },
  { from: 108.22, to: 110.06, el: (t, d) => <Shot src={S("p1_19_rev")} t={t} d={d} /> },
  { from: 110.06, to: 111.48, el: (t, d) => <CCTV src={S("p1_cc1b")} t={t} d={d} cam="CAM 01  SECURITY OFFICE" date={DATE} clock={T307 + 7 * 60 + 24} z0={1.5} z1={1.6} fx={0.5} fy={0.55} glitch={t < 0.25 ? 0.8 : 0} /> },
  { from: 111.48, to: 114.72, el: (t, d) => <CCTV src={S("p1_cc1z")} t={t} d={d} cam="CAM 01  SECURITY OFFICE" date={DATE} clock={T307 + 7 * 60 + 26} zoomLabel="PTZ 3.2x" z0={1.0} z1={1.1} /> },
  { from: 114.72, to: 118.78, el: (t, d) => <Shot src={S("p1_21")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 118.78, to: 122.54, el: (t, d) => <Shot src={S("p1_22")} t={t} d={d} /> },
  // FINAL SCARE: her face out of the hole above him; hard cut to black at 125.8
  { from: 122.54, to: 125.8, el: (t, d) => <AbsoluteFill><Shot src={S("p1_23")} t={t} d={d} z0={1.0} z1={1.0 + 0.25 * ease((t - 2.75) / 0.3)} fy={0.4} /><Flash t={t} at={2.78} dur={0.12} o={0.25} /></AbsoluteFill> },
  { from: 125.8, to: P1_END, el: () => <Black /> },
];

export const Pool1: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Timeline cues={cues} />
    <Grain o={0.1} />
    {audio ? <Audio src={staticFile("audio/p1_mix.wav")} /> : null}
  </AbsoluteFill>
);
