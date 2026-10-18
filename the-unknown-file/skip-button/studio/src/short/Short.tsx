import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Shot } from "../components/Shot";
import { useT } from "../lib/time";
import { FilmLook } from "../components/FilmLook";
import { View, GRADE } from "../components/View";
import { SkipCut } from "../components/SkipFx";
import { Emph, Stamp, TitleCard, Fade } from "../components/Type";
import * as B from "../scenes/beats";
import { Cafe, Clock, HouseFront, Apartment, Glow } from "../scenes/env";
import { PhoneInsert, AppBg, SkipButton, SKIP_BTN, padOn, thumbPress, CallScreen, MessageScreen, LockScreen, SkipPlayScreen, PLAY_BTN, SKIP2_BTN, THUMB_REST } from "../phone/Phone";
import { GalleryScreen, galleryHeight, PhotoViewer } from "../phone/Gallery";
import { GALLERY, LAST_MOM, YEAR0, YEAR10 } from "../story";
import { clamp, easeInOut, easeOut, keys, ramp } from "../lib/anim";
import { Person, KID_OLDER } from "../rig/Person";
import { QC } from "../rig/math";
import type { V } from "../rig/math";

/** THE SKIP BUTTON — vertical short (1080×1920, 30 fps). Every shot is keyed to the narration. */
export const SHORT_DURATION = 124.2;

type Sh = { from: number; to: number; c: React.FC; inT?: "fade" | "cut" | "dip" | "blur"; outT?: "fade" | "cut" | "dip" | "blur"; fi?: number; fo?: number };
const mk = (from: number, to: number, render: (t: number, d: number) => React.ReactNode, o: Partial<Sh> = {}): Sh => ({
  from, to, c: () => { const t = useT(); return <>{render(t, to - from)}</>; }, ...o,
});

/** Phone close-up with the thumb pressing `target` at local time `at` (null = no press). */
const Press: React.FC<{ t: number; at: number | null; target?: V; screen: (press: number) => React.ReactNode; bg?: React.ReactNode; zoom?: number; offset?: V }> = ({ t, at, target = padOn(SKIP_BTN, 0.9), screen, bg, zoom, offset }) => {
  const p = at === null ? { tip: THUMB_REST, press: 0 } : thumbPress(t, at, target);
  return <PhoneInsert t={t} bg={bg} screen={screen(p.press)} thumb={p.tip} zoom={zoom} offset={offset} dip={p.press * 6} />;
};
const cafeBg = (t: number) => <View cam={{ cx: 600, cy: -1100, w: 2600 }}><Cafe t={t} minutes={492} /></View>;
const skipApp = (press: number, appear = 1) => <g><AppBg /><SkipButton pressed={press} appear={appear} /></g>;
const galH = galleryHeight(GALLERY);

const SHOTS: Sh[] = [
  // 1 — cold open: his face lit by the phone; the button appears
  mk(0, 2.35, (t) => <B.PhoneFace t={t} expr="neutral" exprB="curious" mixAt={1.2} bg={cafeBg(t)} />, { fi: 0 }),
  mk(2.35, 4.3, (t) => <Press t={t} at={null} bg={cafeBg(t)} screen={() => skipApp(0, ramp(t, 0.15, 1.3))} />, { inT: "cut" }),
  mk(4.3, 6.05, (t) => <><Press t={t} at={null} bg={cafeBg(t)} zoom={1.9} offset={[0.02, -0.33]} screen={() => skipApp(0)} /><Emph t={t} text="SKIP" at={0.8} y={0.72} size={120} mono /></>, { inT: "cut" }),
  // 2 — the queue
  mk(6.05, 8.75, (t) => <><B.QueueScene t={t} phase="wait" minutes={8 * 60 + 12} him={B.impatient(1.2, 1.9)} /><Stamp t={t} text={`8:12 AM · ${YEAR0}`} /></>),
  mk(8.75, 12.3, (t) => (
    <SkipCut t={t} at={0.55} label="+7 MIN" mood="play"
      a={(tt) => <Press t={tt} at={0.4} bg={cafeBg(tt)} screen={(p) => skipApp(p)} />}
      b={(tt) => <B.QueueScene t={tt + 1} phase="front" minutes={8 * 60 + 19} />} />
  ), { inT: "cut" }),
  mk(12.3, 14.55, (t) => <><View cam={{ cx: -500, cy: -1560, w: 900 }} style={{ filter: GRADE.warm }}><Cafe t={t} minutes={8 * 60 + 12 + 7 * ramp(t, 0.1, 0.5)} layer="back" /></View><Emph t={t} text="7 MINUTES. GONE." at={0.3} y={0.68} size={86} /></>, { inT: "cut" }),
  // 3 — the awkward conversation
  mk(14.55, 17.55, (t) => <B.OfficeTalk t={t} phase={t < 2.4 ? "talk" : "lookdown"} />),
  mk(17.55, 20.45, (t) => (
    <SkipCut t={t} at={0.45} label="+12 MIN" mood="play"
      a={(tt) => <Press t={tt} at={0.3} bg={<B.OfficeTalk t={tt} phase="talk" />} screen={(p) => skipApp(p)} />}
      b={(tt) => <B.OfficeTalk t={tt + 0.3} phase="after" />} />
  ), { inT: "cut" }),
  mk(20.45, 22.25, (t) => <><B.PhoneFace t={t} expr="smirk" exprB="excited" mixAt={0.3} bg={<B.OfficeTalk t={t} phase="after" />} dark={0.3} /></>),
  // 4 — skipping everything
  mk(22.25, 24.9, (t) => <><Press t={t} at={0.8} bg={cafeBg(t)} screen={(p) => skipApp(p)} /><Press t={t} at={1.9} bg={cafeBg(t)} screen={(p) => skipApp(p)} /></>, { inT: "cut" }),
  mk(24.9, 25.8, (t) => <SkipCut t={t} at={0.35} mood="play" label="+48 MIN" a={(tt) => <B.BusRide t={tt} phase="stuck" />} b={(tt) => <B.BusRide t={tt} phase="arrive" />} />, { inT: "cut", outT: "cut" }),
  mk(25.8, 26.9, (t) => <SkipCut t={t} at={0.4} mood="play" label="+4 HRS" a={(tt) => <B.BoringDesk t={tt} minutes={14 * 60 + tt * 2} />} b={(tt) => <B.BoringDesk t={tt} minutes={18 * 60 + 5} after />} />, { inT: "cut", outT: "cut" }),
  mk(26.9, 28.1, (t) => <SkipCut t={t} at={0.45} mood="uneasy" label="+20 MIN" a={(tt) => <B.Argument t={tt} phase="argue" />} b={(tt) => <B.Argument t={tt} phase="after" />} />, { inT: "cut", outT: "cut" }),
  mk(28.1, 30.9, (t) => <><B.AptEvening t={t} mode="couch" night={0} calendar={{ month: "JUNE", year: YEAR0 }} /><Emph t={t} text="EVERY MOMENT." at={0.1} y={0.16} size={72} /></>, { inT: "cut" }),
  // 5 — time keeps moving
  mk(30.9, 39.6, (t) => <><B.TimeLapse t={t} speed={clamp(0.4 + t * 0.12, 0, 1.4)} /><Emph t={t} text="TIME WASN'T STOPPING." at={2.9} out={4.5} y={0.14} size={64} /><Emph t={t} text="HE JUST WASN'T REMEMBERING IT." at={6.6} y={0.14} size={58} /></>),
  // 6 — Mom calls
  mk(39.6, 41.75, (t) => <><B.MomCalls t={t} /><Stamp t={t} text="MOM" /></>),
  mk(41.75, 43.25, (t) => <><Press t={t} at={null} bg={<B.AptEvening t={t} mode="couch" />} screen={() => <g><CallScreen t={t} name="Mom" skip={1} /></g>} /><Emph t={t} text="“CAN YOU COME VISIT THIS WEEKEND?”" at={0.15} y={0.12} size={48} serif /></>, { inT: "cut" }),
  mk(43.25, 45.0, (t) => <B.AptEvening t={t} mode="tired" phoneUp={1} />, { inT: "cut" }),
  mk(45.0, 46.1, (t) => <Press t={t} at={0.42} bg={<B.AptEvening t={t} mode="couch" />} screen={(p) => <CallScreen t={t} name="Mom" pressed={p} />} />, { inT: "cut" }),
  mk(46.1, 47.75, (t) => <B.BoringDesk t={t} minutes={20 * 60 + 30} after />, { inT: "cut" }),
  mk(47.75, 52.2, (t) => (
    <SkipCut t={t} at={0.62} dur={3.4} label="+3650 DAYS" mood="cold"
      a={(tt) => <Press t={tt} at={0.55} bg={<B.BoringDesk t={tt} minutes={20 * 60 + 30} after />} screen={(p) => <CallScreen t={tt} name="Mom" pressed={p} />} />}
      b={(tt) => <B.AptEvening t={tt} mode="couch" years={10} night={0.8} older calendar={{ month: "OCTOBER", year: YEAR10 }} grade={GRADE.cold} />}
      ghosts={[(g) => <B.AptEvening t={g} mode="couch" years={3} night={0} calendar={{ month: "JANUARY", year: 2029 }} />, (g) => <B.TimeLapse t={g + 3} />, (g) => <B.AptEvening t={g} mode="couch" years={6} night={1} older calendar={{ month: "JULY", year: 2032 }} />, (g) => <B.MomCalls t={g} older />]} />
  ), { inT: "cut" }),
  // 7 — ten years later
  mk(52.2, 57.45, (t) => <><B.MirrorScene t={t} react={ramp(t, 3.2, 4.0)} /><Emph t={t} text="10 YEARS OLDER" at={3.6} y={0.1} size={80} /></>),
  // 8 — the gallery
  mk(57.45, 59.45, (t) => <Press t={t} at={null} screen={() => <GalleryScreen sections={GALLERY} scroll={0} />} />),
  mk(59.45, 65.75, (t) => <><Press t={t} at={null} screen={() => <GalleryScreen sections={GALLERY} scroll={keys(t, [[0, 0], [2.0, 420], [4.2, 1250], [6.3, 1720]], easeInOut)} />} /><Emph t={t} text="BIRTHDAYS HE COULDN'T REMEMBER" at={0.1} out={1.9} y={0.1} size={50} /><Emph t={t} text="FRIENDS HE BARELY RECOGNIZED" at={2.1} out={4.1} y={0.1} size={50} /><Emph t={t} text="HIS FATHER HAD GROWN OLD" at={4.3} y={0.1} size={50} /></>, { inT: "cut" }),
  mk(65.75, 69.75, (t) => <><Press t={t} at={null} zoom={keys(t, [[0, 1], [2.5, 1.06]])} screen={() => <PhotoViewer p={GALLERY[LAST_MOM[0]].photos[LAST_MOM[1]]} id="lastmom" />} /></>, { inT: "cut" }),
  // 9 — the call, the message
  mk(69.75, 71.1, (t) => <B.BedEdge t={t} mode="phone" />),
  mk(71.1, 72.55, (t) => <Press t={t} at={null} screen={() => <CallScreen t={t} name="Mom" state={t < 0.5 ? "calling" : "noanswer"} />} />, { inT: "cut" }),
  mk(72.55, 78.35, (t) => <Press t={t} at={null} screen={() => <MessageScreen name="Aunt Clara" hair="aunt" date={`OCTOBER 2033 · 11:42 PM`} msgs={[{ from: "them", text: "I'm so sorry. Mom passed away last night.", appear: ramp(t, 2.0, 2.6) }]} />} zoom={keys(t, [[0, 1], [5.8, 1.15]])} />, { inT: "cut" }),
  mk(78.35, 81.2, (t) => <><Press t={t} at={null} zoom={1.15} screen={() => <MessageScreen name="Aunt Clara" hair="aunt" date={`OCTOBER 2033 · 11:42 PM`} msgs={[{ from: "them", text: "I'm so sorry. Mom passed away last night.", highlight: 1 }]} />} /><Emph t={t} text="THREE YEARS AGO" at={1.0} y={0.1} size={70} /></>, { inT: "cut" }),
  mk(81.2, 85.45, (t) => <B.BedEdge t={t} mode="grief" />, { fi: 0.8 }),
  // 10 — no rewind
  mk(85.45, 89.2, (t) => <Press t={t} at={null} screen={() => <SkipPlayScreen appear={ramp(t, 1.8, 2.6)} search={"rewind".slice(0, Math.floor(clamp(t / 1.1) * 6))} searchResult={ramp(t, 1.3, 1.6)} />} />),
  mk(89.2, 91.45, (t) => <><Press t={t} at={null} zoom={1.25} offset={[0, -0.18]} screen={() => <SkipPlayScreen />} /><Emph t={t} text="SKIP · PLAY" at={0.1} y={0.82} size={70} mono /></>, { inT: "cut" }),
  mk(91.45, 94.9, (t) => <Press t={t} at={1.95} target={padOn(PLAY_BTN, 0.78)} screen={(p) => <SkipPlayScreen pressPlay={p} />} />, { inT: "cut" }),
  mk(94.9, 100.1, (t) => <><B.BedEdge t={t} mode="still" /><Emph t={t} text="NOTHING WENT BACKWARDS." at={0.2} out={1.4} y={0.12} size={58} /></>, { fi: 0.8 }),
  // 11 — his father
  mk(100.1, 103.2, (t) => <B.Arrival t={t} walkFrom={-2.6} doorAt={1.1} />, { fi: 0.8 }),
  mk(103.2, 104.55, (t) => <B.KitchenTogether t={t} mode="sitdown" k={ramp(t, 0, 1.2, easeInOut)} />),
  mk(104.55, 105.6, (t) => <B.KitchenTogether t={t} mode="talk" cam={{ cx: 450, cy: -1000, w: 1900 }} />, { inT: "cut" }),
  mk(105.6, 106.8, (t) => <B.KitchenTogether t={t} mode="laugh" cam={{ cx: -400, cy: -1000, w: 1900 }} />, { inT: "cut" }),
  mk(106.8, 111.2, (t) => <B.KitchenTogether t={t} mode="pocket" cam={{ cx: -350, cy: -700, w: 1900 }} />),
  // 12 — the good parts
  mk(111.2, 116.5, (t) => <B.KitchenTogether t={t} mode="quiet" cam={{ cx: 0, cy: -950, w: 2400 + t * 260 }} />),
  mk(116.5, 121.3, (t) => <><View cam={{ cx: 1300, cy: -1300, w: 2400 + t * 220 }} style={{ filter: "brightness(0.85)" }}><HouseFront t={t} door={0} mood="night" /></View><Fade o={1 - ramp(t, 0, 1.2)} /></>, { fi: 1.0 }),
  mk(121.3, SHORT_DURATION, (t, d) => <TitleCard t={t} dur={d} presents={false} />, { fi: 0.6, fo: 0 }),
];

export const Short: React.FC<{ qc?: boolean }> = ({ qc }) => {
  QC.on = !!qc;
  QC.frame = useCurrentFrame();
  return (
  <AbsoluteFill style={{ background: "#000" }}>
    <Audio src={staticFile("short.mp3")} />
    {SHOTS.map((s, i) => (
      <Shot key={i} from={s.from} to={s.to} inT={s.inT ?? (s.fi ? "fade" : "cut")} outT={s.outT ?? (s.fo ? "fade" : "cut")} fadeIn={s.fi ?? 0} fadeOut={s.fo ?? 0}><s.c /></Shot>
    ))}
    <FilmLook grain={0.05} vignette={0.4} />
  </AbsoluteFill>
  );
};
export const SHORT_SHOTS = SHOTS.map((s) => [s.from, s.to]);
export { Person, KID_OLDER, Glow, Clock, Apartment, LockScreen, easeOut, SKIP2_BTN };
