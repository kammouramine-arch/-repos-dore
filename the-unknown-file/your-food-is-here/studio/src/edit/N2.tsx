import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Timeline, Cue, Shot, Still, ScreenFill, Black, Grain, Flash, ease, clamp } from "./kit";
import { LockScreen, PhotoViewer, Banner, CallScreen, FinalScreen, Gallery, ChatScreen } from "../ui/Phone";

/** NIGHT 2 — THE DELIVERY PHOTO. Times are narration seconds (frame 0 = "You survived the first night."). */
export const N2_END = 136.3;
const S = (n: string) => `shots/n2/${n}.mp4`;
const J = (n: string) => `shots/n2/${n}.jpg`;
const P = (n: string) => `photos/n2_${n}.jpg`;
const N1 = { at: 0, title: "Order #4471", body: "YOUR DELIVERY IS WAITING." };

const cues: Cue[] = [
  { from: 0.0, to: 4.38, el: (t, d) => <Still src={J("n2_01")} t={t} d={d} z0={1.0} z1={1.06} fx={0.45} fy={0.6} /> },
  { from: 4.38, to: 7.78, el: (t, d) => <Still src={J("n2_01")} t={t} d={d} z0={1.55} z1={1.68} fx={0.4} fy={0.58} hand={0.4} /> },
  { from: 7.78, to: 10.88, el: (t, d) => <Still src={J("n2_03")} t={t} d={d} z0={1.0} z1={1.08} /> },
  { from: 10.88, to: 14.78, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.04}><Gallery time="7:42" /></ScreenFill> },
  { from: 14.78, to: 17.42, el: (t, d) => <Still src={J("n2_04")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 17.42, to: 21.96, el: (t, d) => <Shot src={S("n2_05")} t={t} d={d} z0={1.0} z1={1.08} /> },
  { from: 21.96, to: 24.78, el: (t, d) => <Still src={J("n2_06")} t={t} d={d} z0={1.0} z1={1.1} fy={0.7} /> },
  { from: 24.78, to: 27.1, el: (t, d) => <Still src={J("n2_07b")} t={t} d={d} z0={1.0} z1={1.03} hand={0.3} /> },
  { from: 27.1, to: 28.62, el: (t, d) => <Still src={J("n2_07")} t={t} d={d} z0={1.03} z1={1.05} hand={0.3} /> },
  { from: 28.62, to: 30.4, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.03}><LockScreen t={t + 0.2} time="3:13" notes={[{ ...N1, at: 0.6 }]} /></ScreenFill> },
  { from: 30.4, to: 31.9, el: (t, d) => <Still src={J("n2_07c")} t={t} d={d} z0={1.0} z1={1.04} hand={0.2} /> },
  { from: 31.9, to: 35.94, el: (t, d) => <ScreenFill t={t} d={d} z0={1.03} z1={1.08} fy={0.45}><LockScreen t={t + 5} time="3:13" notes={[{ ...N1, at: 0 }, { at: 7.1, title: "Order #4471", body: "PLEASE CONFIRM YOUR ORDER." }]} /></ScreenFill> },
  { from: 35.94, to: 46.24, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><PhotoViewer src={P("photo_d")} time="3:13" stamp="03:14 AM" zoom={1 + 0.25 * ease((t - 2) / 4) + 0.35 * ease((t - 5) / 5)} fx={0.48} fy={0.42} /></ScreenFill> },
  { from: 46.24, to: 48.84, el: (t, d) => <Shot src={S("n2_08")} t={t} d={d} hand={0.3} /> },
  { from: 48.84, to: 50.86, el: (t, d) => <Still src={J("n2_09")} t={t} d={d} z0={1.0} z1={1.12} fy={0.4} hand={0.4} /> },
  { from: 50.86, to: 57.28, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><PhotoViewer src={P("photo_d")} time="3:13" stamp="03:14 AM" stampHi={ease((t - 1.9) / 0.6)} zoom={1.2} fx={0.48} fy={0.42} /></ScreenFill> },
  { from: 57.28, to: 60.78, el: (t, d) => <Shot src={S("n2_05")} t={t} d={d} at={1.0} z0={1.05} z1={1.15} /> },
  { from: 60.78, to: 64.18, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.0} hand={0.4}><PhotoViewer src={P("photo_d")} time="3:13" stamp="03:14 AM" stampHi={1} zoom={1.2} fx={0.48} fy={0.42} /></ScreenFill> },
  { from: 64.18, to: 67.44, el: (t, d) => <ScreenFill t={t} d={d} hand={0.5} buzz={t > 0.4 && t < 1.0 ? 1 : 0}><PhotoViewer src={P("photo_d")} time="3:13" stamp="03:14 AM" zoom={1.2} fx={0.48} fy={0.42} /><Banner t={t} at={0.45} app="DELIVERY · ORDER #4471" title="Proof of delivery" body="NEW PHOTO" /></ScreenFill> },
  { from: 67.44, to: 73.82, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><PhotoViewer src={P("photo_e")} time="3:13" stamp="03:14 AM" zoom={1 + 0.5 * ease((t - 2.8) / 3)} fx={0.4} fy={0.42} /></ScreenFill> },
  { from: 73.82, to: 75.76, el: (t, d) => <Shot src={S("n2_11")} t={t} d={d} hand={0.6} /> },
  { from: 75.76, to: 79.2, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><PhotoViewer src={P("photo_f")} time="3:13" stamp="03:14 AM" zoom={1 + 0.2 * ease(t / 3.4)} fx={0.3} fy={0.42} /></ScreenFill> },
  { from: 79.2, to: 83.92, el: (t, d) => <Shot src={S("n2_12")} t={t} d={d} hand={0.3} /> },
  { from: 83.92, to: 88.9, el: (t, d) => <Still src={J("n2_13")} t={t} d={d} z0={1.0} z1={1.1} fy={0.4} hand={0.3} /> },
  { from: 88.9, to: 93.32, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.08} fy={0.7}><FinalScreen t={t} time="3:13" photo={P("photo_f")} small={0} title="PLEASE CONFIRM YOUR ORDER." /></ScreenFill> },
  { from: 93.32, to: 97.16, el: (t, d) => <Shot src={S("n2_14")} t={t} d={d} z0={1.0} z1={1.1} /> },
  { from: 97.16, to: 104.58, el: (t, d) => <Shot src={S("n2_15")} t={t} d={d} z0={1.0} z1={1.07} fy={0.42} /> },
  { from: 104.58, to: 109.26, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.05} buzz={(t % 1.6) < 0.7 ? 0.7 : 0}><CallScreen t={t} name="DELIVERY DRIVER" state="incoming" /></ScreenFill> },
  { from: 109.26, to: 117.42, el: (t, d) => <Shot src={S("n2_16")} t={t} d={d} z0={1.0} z1={1.08} hand={0.2} /> },
  { from: 117.42, to: 118.6, el: (t, d) => <ScreenFill t={t} d={d}><CallScreen t={t} name="DELIVERY DRIVER" state="ended" /></ScreenFill> },
  { from: 118.6, to: 126.34, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.4}><PhotoViewer src={P("photo_g")} time="3:15" stamp="03:15 AM" zoom={1 + 0.2 * ease(t / 4) + 0.25 * ease((t - 4.4) / 3)} fx={0.5} fy={0.42} /></ScreenFill> },
  { from: 126.34, to: 131.58, el: (t, d) => (
    <AbsoluteFill>
      <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.4}><PhotoViewer src={S("n2_17")} video time="3:15" stamp="03:15 AM" zoom={1.45 + (t > 4.25 ? 0.25 : 0)} fx={0.5} fy={0.42} /></ScreenFill>
      <Flash t={t} at={4.25} dur={0.12} o={0.35} />
    </AbsoluteFill>) },
  { from: 131.58, to: 135.8, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.05} fy={0.35}><ChatScreen t={t} time="3:15" title="Delivery driver" msgs={[{ at: 1.58, text: "TOMORROW NIGHT. FINAL ATTEMPT." }]} typingAt={[0.4]} /></ScreenFill> },
  { from: 135.8, to: N2_END, el: () => <Black /> },
];

export const Night2: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Timeline cues={cues} />
    <Grain o={0.1} />
    {audio ? <Audio src={staticFile("audio/n2_mix.wav")} /> : null}
  </AbsoluteFill>
);
