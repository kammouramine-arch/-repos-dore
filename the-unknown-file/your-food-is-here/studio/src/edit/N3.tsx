import React from "react";
import { AbsoluteFill, Audio, Freeze, Img, staticFile } from "remotion";
import { Timeline, Cue, Shot, Still, ScreenFill, Feed, Black, Grain, Flash, ease, clamp } from "./kit";
import { LockScreen, PhotoViewer, FinalScreen, DoorbellScreen, CanceledScreen } from "../ui/Phone";

/** NIGHT 3 — DO NOT CONFIRM. Cue times are written in ORIGINAL narration seconds; the episode audio starts
 *  at 1.50 s (the spoken "Night three," is cut), so every cue is shifted by OFF. Frame 0 = "You haven't slept." */
const OFF = 1.5;
export const N3_END = 157.5 - OFF;
const S = (n: string) => `shots/n3/${n}.mp4`;
const J = (n: string) => `shots/n3/${n}.jpg`;
const PH = "photos/n3_photo_n3.jpg";
const MEM = ["photos/n1_photo_a.jpg", "photos/n1_photo_b.jpg", "photos/n2_photo_d.jpg", "photos/n2_photo_e.jpg", "photos/n1_photo_c.jpg", "photos/n2_photo_f.jpg"];

const raw: Cue[] = [
  { from: 1.5, to: 5.94, el: (t, d) => <Shot src={S("n3_01")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 5.94, to: 7.4, el: (t, d) => <Still src={J("n3_02")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 7.4, to: 8.7, el: (t, d) => <Still src={J("n3_03")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 8.7, to: 13.52, el: (t, d) => <Still src={J("n3_04")} t={t} d={d} z0={1.0} z1={1.1} fy={0.5} hand={0.3} /> },
  { from: 13.52, to: 16.0, el: (t, d) => <Still src={J("n3_05")} t={t + 4.8} d={d + 4.8} z0={1.0} z1={1.13} fy={0.5} hand={0.3} /> },
  { from: 16.0, to: 19.36, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.04}><LockScreen t={t + 2} time="3:12" date="Monday 16 March" notes={[{ at: 0, title: "Order #4471", body: "FINAL DELIVERY ATTEMPT.", red: true }]} /></ScreenFill> },
  { from: 19.36, to: 28.82, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><PhotoViewer src={PH} time="3:12" stamp="03:13 AM" caption="Final delivery attempt" zoom={1 + 0.15 * ease(t / 4) + 0.45 * ease((t - 5.1) / 3.5)} fx={0.62} fy={0.45} /></ScreenFill> },
  { from: 28.82, to: 36.24, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.16} fy={0.72}><FinalScreen t={t} time="3:12" photo={PH} glow={ease((t - 2.2) / 1.0)} small={0} /></ScreenFill> },
  { from: 36.24, to: 42.52, el: (t, d) => <ScreenFill t={t} d={d} z0={1.16} z1={2.1} fy={0.86}><FinalScreen t={t + 8} time="3:12" photo={PH} small={ease((t - 0.3) / 1.2)} /></ScreenFill> },
  { from: 42.52, to: 45.48, el: (t, d) => <Still src={J("n3_06")} t={t} d={d} z0={1.0} z1={1.05} hand={0.3} /> },
  ...MEM.map((m, i): Cue => ({ from: 45.48 + i * 0.78, to: 45.48 + (i + 1) * 0.78, el: (t, d) => (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={staticFile(m)} style={{ position: "absolute", width: 1080 * (1.05 + 0.04 * t), left: -27 - 20 * t, top: 300, filter: "contrast(1.1) saturate(0.8)" }} />
      <Flash t={t} at={0} dur={0.18} o={0.6} />
    </AbsoluteFill>) })),
  { from: 50.16, to: 53.08, el: (t, d) => <Still src={J("n3_06")} t={t} d={d} z0={1.12} z1={1.22} fy={0.4} hand={0.3} /> },
  { from: 53.08, to: 59.28, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.12} fy={0.4}><FinalScreen t={t} time="3:12" photo={PH} /></ScreenFill> },
  { from: 59.28, to: 62.14, el: (t, d) => <Still src={J("n3_06")} t={t} d={d} z0={1.25} z1={1.35} fy={0.42} hand={0.3} /> },
  { from: 62.14, to: 66.98, el: (t, d) => <Shot src={S("n3_07")} t={t} d={d} z0={1.0} z1={1.08} /> },
  { from: 66.98, to: 72.94, el: (t, d) => <Shot src={S("n3_08")} t={t} d={d} z0={1.0} z1={1.06} fy={0.75} /> },
  { from: 72.94, to: 75.46, el: (t, d) => <Shot src={S("n3_09")} t={t} d={d} at={0} z0={1.0} z1={1.04} /> },
  { from: 75.46, to: 83.26, el: (t, d) => <Still src={J("n3_10")} t={t} d={d} z0={1.0} z1={1.14} fy={0.35} hand={0.35} /> },
  { from: 83.26, to: 85.0, el: (t, d) => <Shot src={S("n3_11")} t={t} d={d} /> },
  { from: 85.0, to: 89.4, el: (t, d) => <Shot src={S("n3_12")} t={t} d={d} z0={1.0} z1={1.0} shake={t < 4.2 ? 4 : 0} /> },
  { from: 89.4, to: 92.92, el: (t, d) => <Freeze frame={128}><Shot src={S("n3_12")} t={4.3} d={d} /></Freeze> },
  { from: 92.92, to: 98.44, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1.06} hand={0.5}><DoorbellScreen t={t} time="3:13" clock={`03:13:${String(40 + Math.floor(t)).padStart(2, "0")}`} feed={<Feed src={S("db_n3a")} t={t} z={1 + 0.3 * ease((t - 3.2) / 2.3)} fy={0.45} />} /></ScreenFill> },
  { from: 98.44, to: 104.68, el: (t, d) => <ScreenFill t={t} d={d} z0={1.06} z1={1.06} hand={0.8} buzz={t > 3.6 ? 1 : 0}><DoorbellScreen t={t} time="3:13" clock={`03:13:${String(46 + Math.floor(t)).padStart(2, "0")}`} feed={<Feed src={S("db_n3b")} t={t} z={1.1} fy={0.45} glitch={t < 0.25 || t > 3.6 ? 1 : 0} />} /></ScreenFill> },
  { from: 104.68, to: 105.88, el: (t, d) => <Shot src={S("n3_14")} t={t} d={d} /> },
  { from: 105.88, to: 110.46, el: (t, d) => <Still src={J("n3_15")} t={t} d={d} z0={1.0} z1={1.1} hand={0.3} /> },
  { from: 110.46, to: 116.48, el: (t, d) => <Shot src={S("n3_16")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 116.48, to: 118.42, el: (t, d) => <Still src={J("n3_15b")} t={t} d={d} z0={1.1} z1={1.12} hand={0.2} /> },
  { from: 118.42, to: 120.0, el: (t, d) => <Still src={J("n3_18on")} t={t} d={d} z0={1.0} z1={1.02} hand={0.2} /> },
  { from: 120.0, to: 120.9, el: (t, d) => <Still src={J("n3_18")} t={t} d={d} z0={1.02} z1={1.03} hand={0.2} /> },
  { from: 120.9, to: 125.28, el: (t, d) => <Still src={J("n3_19")} t={t} d={d} z0={1.0} z1={1.08} hand={0.15} grade={`brightness(${0.75 + 0.35 * ease((t - 2.4) / 1.6)})`} /> },
  { from: 125.28, to: 127.26, el: () => <Black /> },
  { from: 127.26, to: 130.78, el: (t, d) => <AbsoluteFill><Still src={J("n3_20")} t={t} d={d} z0={1.0} z1={1.04} /><AbsoluteFill style={{ background: "#000", opacity: t < 0.08 ? 1 : t < 0.16 ? 0.2 : t < 0.24 ? 0.9 : 0 }} /></AbsoluteFill> },
  { from: 130.78, to: 132.7, el: (t, d) => <Still src={J("n3_21")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 132.7, to: 135.28, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.04}><CanceledScreen time="3:14" /></ScreenFill> },
  { from: 135.28, to: 136.86, el: (t, d) => <Still src={J("n3_22")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 136.86, to: 141.36, el: (t, d) => <Shot src={S("n3_23")} t={t} d={d} /> },
  { from: 141.36, to: 145.2, el: (t, d) => <Still src={J("n3_24")} t={t} d={d} z0={1.0} z1={1.12} fy={0.62} /> },
  { from: 145.2, to: 149.9, el: (t, d) => <Still src={J("n3_25")} t={t} d={d} z0={1.0} z1={1.35} fy={0.52} hand={0.3} /> },
  { from: 149.9, to: 157.0, el: (t, d) => <Shot src={S("n3_26")} t={t} d={d} z0={1.0} z1={1.1} fx={0.62} fy={0.5} /> },
  { from: 157.0, to: 157.5, el: () => <Black /> },
];
const cues: Cue[] = raw.map((c) => ({ ...c, from: Math.max(0, c.from - OFF), to: c.to - OFF }));

export const Night3: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Timeline cues={cues} />
    <Grain o={0.1} />
    {audio ? <Audio src={staticFile("audio/n3_mix.wav")} /> : null}
  </AbsoluteFill>
);
