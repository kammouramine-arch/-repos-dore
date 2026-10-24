import React from "react";
import { AbsoluteFill, Audio, Freeze, staticFile } from "remotion";
import { Timeline, Cue, Shot, Still, ScreenFill, Feed, Black, Grain, Flash, ease, clamp } from "./kit";
import { OrderScreen, TrackScreen, ChatScreen, Banner, DoorbellScreen, DeliveredScreen, PhotoViewer } from "../ui/Phone";

/** NIGHT 1 — THE WRONG DRIVER. Times are narration seconds (no intro: frame 0 is the story). */
export const N1_END = 128.3;
const S = (n: string) => `shots/n1/${n}.mp4`;
const J = (n: string) => `shots/n1/${n}.jpg`;
const P = (n: string) => `photos/n1_${n}.jpg`;

const cues: Cue[] = [
  { from: 0.0, to: 2.0, el: (t, d) => <Shot src={S("n1_01")} t={t} d={d} z0={1.0} z1={1.05} /> },
  { from: 2.0, to: 3.94, el: (t, d) => <Shot src={S("n1_02")} t={t} d={d} z0={1.02} z1={1.06} /> },
  { from: 3.94, to: 8.72, el: (t, d) => <Shot src={S("n1_03")} t={t} d={d} z0={1.0} z1={1.04} /> },
  { from: 8.72, to: 10.98, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.05} fy={0.62}><OrderScreen t={t} tapAt={1.2} time="3:13" /></ScreenFill> },
  { from: 10.98, to: 14.0, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.12} fy={0.72}><TrackScreen t={t} time="3:13" /></ScreenFill> },
  { from: 14.0, to: 17.6, el: (t, d) => <Shot src={S("n1_04")} t={t} d={d} hand={0.3} /> },
  { from: 17.6, to: 18.94, el: (t, d) => <Still src={J("n1_05")} t={t} d={d} z0={1.0} z1={1.08} fy={0.6} /> },
  { from: 18.94, to: 23.34, el: (t, d) => <ScreenFill t={t} d={d} z0={1.08} z1={1.22} fy={0.74}><TrackScreen t={t + 8} time="3:13" /></ScreenFill> },
  { from: 23.34, to: 30.8, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.07} fy={0.3}><ChatScreen t={t} time="3:14" typingAt={[1.0, 3.65]} msgs={[{ at: 2.14, text: "I'M NOT AT YOUR BUILDING YET." }, { at: 4.72, text: "PLEASE DON'T OPEN THE DOOR." }]} /></ScreenFill> },
  { from: 30.8, to: 32.2, el: (t, d) => <Shot src={S("n1_06")} t={t} d={d} z0={1.0} z1={1.03} /> },
  { from: 32.2, to: 37.0, el: (t, d) => <Shot src={S("n1_07")} t={t} d={d} z0={1.0} z1={1.06} fy={0.55} /> },
  { from: 37.0, to: 38.16, el: (t, d) => <Shot src={S("n1_08")} t={t} d={d} at={0.6} /> },
  // ---- doorbell camera
  { from: 38.16, to: 53.6, el: (t, d) => {
    const z = 1 + 0.18 * ease((t - 2.3) / 6) + 0.12 * ease((t - 6.5) / 4);
    return <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><DoorbellScreen t={t} time="3:14" clock={`03:14:${String(2 + Math.floor(t)).padStart(2, "0")}`} talk={t > 10.3 && t < 13.6 ? 1 : 0}
      feed={<Feed src={S("db_01")} t={t} z={z} fy={0.42} />} /></ScreenFill>;
  } },
  { from: 53.6, to: 65.86, el: (t, d) => (
    <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5} buzz={t > 7.06 && t < 7.9 ? 1 : 0}>
      <DoorbellScreen t={t} time="3:14" clock={`03:14:${String(17 + Math.floor(t)).padStart(2, "0")}`} feed={<Feed src={S("db_02")} t={t} z={1.18 + 0.16 * ease(t / 10)} fy={0.36} />} />
      <Banner t={t} at={8.1} app="MESSAGE · MARCUS (DRIVER)" title="It's me, your real driver." body={t < 10.62 ? "THAT ISN'T ME." : "THAT ISN'T ME. GET AWAY FROM THE DOOR."} red />
    </ScreenFill>) },
  { from: 65.86, to: 67.28, el: (t, d) => <Shot src={S("n1_09")} t={t} d={d} hand={0.6} /> },
  { from: 67.28, to: 69.2, el: (t, d) => (
    <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}>
      <DoorbellScreen t={t} time="3:14" clock="03:14:31" feed={<Feed src={S("db_03")} t={t} z={1.34} fy={0.36} glitch={t > 1.3 ? 1 : 0} />} />
    </ScreenFill>) },
  { from: 69.2, to: 70.9, el: (t, d) => (
    <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.3}>
      <DoorbellScreen t={t} time="3:14" clock="03:14:33" feed={<Freeze frame={56}><Feed src={S("db_03")} t={t} z={1.34} fy={0.36} glitch={0.7} /></Freeze>} />
    </ScreenFill>) },
  { from: 70.9, to: 72.4, el: (t, d) => <ScreenFill t={t} d={d} hand={0.9}><DoorbellScreen t={t} time="3:14" lost={1} /></ScreenFill> },
  { from: 72.4, to: 74.4, el: (t, d) => <Shot src={S("n1_10")} t={t} d={d} at={1.4} hand={0.8} /> },
  { from: 74.4, to: 78.74, el: (t, d) => <ScreenFill t={t} d={d} hand={0.6} buzz={t > 2.2 && t < 2.8 ? 1 : 0}><DoorbellScreen t={t} time="3:15" lost={1} /><Banner t={t} at={2.25} app="DELIVERY · ORDER #4471" title="Delivered" body="YOUR ORDER HAS BEEN DELIVERED." /></ScreenFill> },
  { from: 78.74, to: 81.84, el: (t, d) => <Still src={J("n1_11")} t={t} d={d} z0={1.0} z1={1.07} /> },
  { from: 81.84, to: 87.12, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.05} fy={0.35}><DeliveredScreen t={t} time="3:15" photo={P("photo_a")} photoAt={0.2} title="Delivered" caption={t < 2.8 ? "Order #4471" : "Proof of delivery — tap to view"} /></ScreenFill> },
  { from: 87.12, to: 97.58, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><PhotoViewer src={P("photo_a")} time="3:15" stamp="03:15 AM" zoom={1 + 0.35 * ease(t / 5.5) + 0.55 * ease((t - 5.6) / 4.5)} fx={0.43} fy={0.36} /></ScreenFill> },
  { from: 97.58, to: 100.38, el: (t, d) => <Shot src={S("n1_12")} t={t} d={d} hand={0.4} /> },
  { from: 100.38, to: 105.48, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.5}><PhotoViewer src={P("photo_b")} time="3:15" stamp="03:15 AM" zoom={1.25 + 0.65 * ease((t - 2.5) / 2.4)} fx={0.43} fy={0.38} /></ScreenFill> },
  { from: 105.48, to: 110.92, el: (t, d) => <ScreenFill t={t} d={d} z0={1.0} z1={1.06} fy={0.6}><DeliveredScreen t={t} time="3:16" photo={P("photo_b")} confirmAt={3.4} title="Delivered" /></ScreenFill> },
  { from: 110.92, to: 115.92, el: (t, d) => <AbsoluteFill><Shot src={S("n1_13")} t={t} d={d} z0={1.0} z1={1.04} /><Flash t={t} at={2.4} dur={0.3} o={0.55} /></AbsoluteFill> },
  { from: 115.92, to: 118.22, el: (t, d) => <Still src={J("n1_14")} t={t} d={d} z0={1.0} z1={1.06} fy={0.6} /> },
  { from: 118.22, to: 124.46, el: (t, d) => <ScreenFill t={t} d={d} z0={1} z1={1} hand={0.4}>{t < 1.05 ? <DeliveredScreen t={t} time="3:16" title="New photo" caption="Loading…" /> : <PhotoViewer src={P("photo_c")} time="3:16" stamp="03:16 AM" zoom={1 + 0.45 * ease((t - 1.5) / 4.5)} fx={0.58} fy={0.25} />}</ScreenFill> },
  { from: 124.46, to: 127.7, el: (t, d) => <Shot src={S("n1_15")} t={t} d={d} z0={1.0} z1={1.07} fy={0.35} /> },
  { from: 127.7, to: N1_END, el: () => <Black /> },
];

export const Night1: React.FC<{ audio?: boolean }> = ({ audio = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Timeline cues={cues} />
    <Grain o={0.1} />
    {audio ? <Audio src={staticFile("audio/n1_mix.wav")} /> : null}
  </AbsoluteFill>
);
