import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Shot } from "../components/Shot";
import { useT } from "../lib/time";
import { FilmLook } from "../components/FilmLook";
import { View, GRADE, Cam } from "../components/View";
import { SkipCut } from "../components/SkipFx";
import { Emph, Stamp, TitleCard, Fade } from "../components/Type";
import * as B from "../scenes/beats";
import * as B2 from "../scenes/beats2";
import { Cafe, HouseFront, Street } from "../scenes/env";
import { PhoneInsert, AppBg, SkipButton, SKIP_BTN, padOn, thumbPress, CallScreen, MessageScreen, LockScreen, SkipPlayScreen, PLAY_BTN, SKIP2_BTN, THUMB_REST } from "../phone/Phone";
import { GalleryScreen, galleryHeight, PhotoViewer, PhotoTile } from "../phone/Gallery";
import { GALLERY, LAST_MOM, MOM_MESSAGES, YEAR0, YEAR10 } from "../story";
import { clamp, easeInOut, easeOut, keys, ramp } from "../lib/anim";
import { Person, KID } from "../rig/Person";
import { walkPose, walkDist } from "../rig/motion";
import { stand } from "../rig/poses";
import { QC } from "../rig/math";
import type { V } from "../rig/math";

/** THE SKIP BUTTON — full YouTube film (3840×2160, 24 fps). Own compositions, keyed to the long narration. */
export const LONG_DURATION = 522.6;

type Sh = { from: number; to: number; c: React.FC; inT?: "fade" | "cut" | "dip" | "blur"; outT?: "fade" | "cut" | "dip" | "blur"; fi?: number; fo?: number };
const mk = (from: number, to: number, render: (t: number, d: number) => React.ReactNode, o: Partial<Sh> = {}): Sh => ({
  from, to, c: () => { const t = useT(); return <>{render(t, to - from)}</>; }, ...o,
});
const Press: React.FC<{ t: number; at: number | null; target?: V; screen: (press: number) => React.ReactNode; bg?: React.ReactNode; zoom?: number; offset?: V; hover?: boolean }> = ({ t, at, target = padOn(SKIP_BTN, 0.9), screen, bg, zoom, offset }) => {
  const p = at === null ? { tip: THUMB_REST, press: 0 } : thumbPress(t, at, target);
  return <PhoneInsert t={t} bg={bg} screen={screen(p.press)} thumb={p.tip} zoom={zoom} offset={offset ?? [0.2, 0]} dip={p.press * 6} />;
};
const cafeBg = (t: number) => <View cam={{ cx: 600, cy: -1100, w: 4200 }}><Cafe t={t} minutes={492} /></View>;
const skipApp = (press: number, appear = 1) => <g><AppBg /><SkipButton pressed={press} appear={appear} /></g>;
const galH = galleryHeight(GALLERY);
const lc = (abs: number, shotStart: number) => abs - shotStart;

/** Morning walk to the café (tracking). */
const MorningWalk: React.FC<{ t: number; dur: number }> = ({ t, dur }) => {
  const total = 430 * (dur + 6);
  const d = walkDist(t + 2.5, 0, total, 430, 0.4);
  const me = walkPose(d, { x0: 0, dir: 1, total, energy: 0.7 }, { expr: "neutral" });
  return (
    <View cam={{ cx: me.root[0] + 300, cy: -1150, w: 5200 }} style={{ filter: GRADE.warm }}>
      <Street t={t} mood="day" x0={-6000} x1={total + 6000} lamps={0} />
      <Person pose={me} look={KID} t={t} seed={1} />
    </View>
  );
};

/** He leaves the café, coffee in hand, smiling (walk out of frame). */
const LeaveCafe: React.FC<{ t: number }> = ({ t }) => {
  const total = 2600;
  const d = walkDist(t, 0.6, total, 430);
  const me = walkPose(d, { x0: -380, dir: 1, total }, { expr: "smirk" });
  me.L = { at: [me.root[0] + 120, me.root[1] - 160], kind: "cup", obj: "mug", front: true };
  return (
    <View cam={{ cx: 600, cy: -1000, w: 5600 }} style={{ filter: GRADE.warm }}>
      <Cafe t={t} minutes={499} layer="back" />
      <Cafe t={t} minutes={499} layer="front" />
      <Person pose={me} look={KID} t={t} seed={1} />
    </View>
  );
};

const SHOTS: Sh[] = [
  // ——— PROLOGUE ———
  mk(0, 5.4, (t) => <B2.VoidButton t={t} />, { fi: 0 }),
  mk(5.4, 7.6, (t) => <SkipCut t={t} at={1.6} mood="uneasy" a={(tt) => <B.BoringDesk t={tt} minutes={15 * 60 + tt * 3} />} b={() => <B2.VoidButton t={3} />} />, { inT: "cut" }),
  mk(7.6, 9.6, (t) => <SkipCut t={t} at={1.4} mood="uneasy" a={(tt) => <B.OfficeTalk t={tt} phase="talk" />} b={() => <B2.VoidButton t={3} />} />, { inT: "cut" }),
  mk(9.6, 11.8, (t) => <SkipCut t={t} at={1.5} mood="cold" a={(tt) => <B.AptEvening t={tt} mode="couch" night={1} grade={GRADE.grief} />} b={() => <B2.VoidButton t={3} />} />, { inT: "cut" }),
  mk(11.8, 15.9, (t) => <Press t={t} at={3.25} screen={(p) => skipApp(p)} />, { inT: "cut" }),
  mk(15.9, 19.7, (t) => <B.PhoneFace t={t} expr="smirk" exprB="excited" mixAt={1.0} bg={cafeBg(t)} dark={0.2} />, { inT: "cut" }),
  mk(19.7, 25.6, (t) => <B2.FadingPhoto t={t} p={{ kind: "momdad", date: "" }} fadeAt={2.2} dur={3.2} />, { fi: 0.5 }),
  mk(25.6, 34.6, (t) => <B2.AloneStage t={t} />, { fi: 0.6 }),
  mk(34.6, 39.4, (t, d) => <TitleCard t={t} dur={d} />, { inT: "dip", fi: 0.5 }),
  // ——— AN ORDINARY MORNING ———
  mk(39.4, 41.3, (t, d) => <><MorningWalk t={t} dur={d} /><Stamp t={t} text={`MONDAY · 8:04 AM · ${YEAR0}`} /></>, { fi: 0.6 }),
  mk(41.3, 44.7, (t) => <B.QueueScene t={t} phase="wait" minutes={8 * 60 + 12} him={B.impatient(99, 99)} />),
  mk(44.7, 48.6, (t) => <><Press t={t} at={null} bg={cafeBg(t)} screen={() => <LockScreen time="8:12" date={`Monday, March 2`} note={{ app: "REMINDER", title: "Leave for work", body: "8:19 AM" }} noteIn={ramp(t, 0.6, 1.2)} />} /><Emph t={t} text="7 MINUTES" at={1.8} y={0.78} size={64} mono /></>, { inT: "cut" }),
  mk(48.6, 51.0, (t) => <B.QueueScene t={t} phase="wait" minutes={8 * 60 + 13} him={B.impatient(0.4, 99)} cam={{ cx: 1500, cy: -950, w: 2400 }} />, { inT: "cut" }),
  mk(51.0, 53.5, (t) => <Press t={t} at={null} bg={cafeBg(t)} screen={() => <g><LockScreen time="8:13" date="Monday, March 2" />{(Math.floor(t * 14) % 3 === 0 || t > 1.4) && <SkipButton appear={ramp(t, 0.5, 1.6)} glow={1} />}</g>} />, { inT: "cut" }),
  mk(53.5, 57.6, (t) => <Press t={t} at={null} bg={cafeBg(t)} zoom={2.1} offset={[0.25, -0.38]} screen={() => skipApp(0, ramp(t, 0.3, 3.0))} />, { inT: "cut" }),
  mk(57.6, 62.9, (t) => <B.PhoneFace t={t} expr="curious" exprB="confused" mixAt={1.8} bg={cafeBg(t)} />, { inT: "cut" }),
  mk(62.9, 65.0, (t) => <Press t={t} at={null} bg={cafeBg(t)} screen={() => <B2.HomeScreen t={t} notif="empty" button={0} />} />, { inT: "cut" }),
  mk(65.0, 67.3, (t) => <Press t={t} at={null} bg={cafeBg(t)} screen={() => <B2.HomeScreen t={t} button={1} />} />, { inT: "cut" }),
  mk(67.3, 75.8, (t) => (
    <SkipCut t={t} at={1.2} label="+7 MIN" mood="play"
      a={(tt) => <Press t={tt} at={1.0} bg={cafeBg(tt)} screen={(p) => skipApp(p)} />}
      b={(tt) => <B.QueueScene t={tt + 0.2} phase="front" minutes={8 * 60 + 19} />} />
  ), { inT: "cut" }),
  mk(75.8, 79.6, (t) => <><View cam={{ cx: -500, cy: -1560, w: 1700 }} style={{ filter: GRADE.warm }}><Cafe t={t} minutes={8 * 60 + 12 + 7 * ramp(t, 0.8, 1.4)} layer="back" /></View><Emph t={t} text="8:19" at={1.4} y={0.74} size={110} mono /></>, { inT: "cut" }),
  mk(79.6, 82.0, (t) => <><Press t={t} at={null} bg={cafeBg(t)} screen={() => <LockScreen time="8:19" date="Monday, March 2" />} /><Emph t={t} text="NO TIME AT ALL" at={0.8} y={0.8} size={60} /></>, { inT: "cut" }),
  mk(82.0, 86.4, (t) => <B.PhoneFace t={t} expr="confused" exprB="smirk" mixAt={2.6} bg={cafeBg(t)} dark={0.25} />, { inT: "cut" }),
  mk(86.4, 88.4, (t) => <LeaveCafe t={t} />, { inT: "cut" }),
  // ——— THE CONVERSATION ———
  mk(88.4, 95.7, (t) => <><B.OfficeTalk t={t} phase="talk" /><Stamp t={t} text="2:20 PM" /></>, { fi: 0.5 }),
  mk(95.7, 97.6, (t) => <B.OfficeTalk t={t} phase="lookdown" cam={{ cx: -100, cy: -900, w: 2400 }} />, { inT: "cut" }),
  mk(97.6, 99.2, (t) => <Press t={t} at={null} bg={<B.OfficeTalk t={t} phase="talk" />} screen={() => skipApp(0)} />, { inT: "cut" }),
  mk(99.2, 106.6, (t) => (
    <SkipCut t={t} at={1.5} label="+12 MIN" mood="play"
      a={(tt) => <Press t={tt} at={1.35} bg={<B.OfficeTalk t={tt} phase="talk" />} screen={(p) => skipApp(p)} />}
      b={(tt) => <B.OfficeTalk t={tt + 0.2} phase="after" />} />
  ), { inT: "cut" }),
  mk(106.6, 112.2, (t) => <B.OfficeTalk t={t + 4} phase="after" cam={{ cx: -200, cy: -950, w: 1900 }} />, { inT: "cut" }),
  mk(112.2, 116.1, (t) => <><B.PhoneFace t={t} expr="relief" exprB="excited" mixAt={0.9} bg={<B.OfficeTalk t={t} phase="after" />} dark={0.2} /><Emph t={t} text="THIS WAS INCREDIBLE." at={2.4} y={0.82} size={70} /></>, { inT: "cut" }),
  // ——— SKIPPING EVERYTHING ———
  mk(116.1, 120.2, (t) => <><Press t={t} at={1.2} screen={(p) => skipApp(p)} bg={cafeBg(t)} /><Press t={t} at={2.9} screen={(p) => skipApp(p)} bg={cafeBg(t)} /></>, { inT: "cut" }),
  mk(120.2, 122.6, (t) => <><SkipCut t={t} at={1.3} label="+48 MIN" mood="play" a={(tt) => <B.BusRide t={tt} phase="stuck" />} b={(tt) => <B.BusRide t={tt} phase="arrive" />} /><Emph t={t} text="A TRAFFIC JAM?" at={0.1} out={1.1} y={0.12} size={60} /></>, { inT: "cut" }),
  mk(122.6, 125.0, (t) => <><SkipCut t={t} at={0.9} label="+1 HR" mood="play" a={(tt) => <B2.Meeting t={tt} />} b={(tt) => <B2.Meeting t={tt} after />} /><Emph t={t} text="A BORING MEETING?" at={0.1} out={0.8} y={0.12} size={60} /></>, { inT: "cut" }),
  mk(125.0, 127.2, (t) => <><SkipCut t={t} at={1.0} label="+4 HRS" mood="play" a={(tt) => <B.BoringDesk t={tt} minutes={14 * 60 + tt * 3} />} b={(tt) => <B.BoringDesk t={tt} minutes={18 * 60 + 5} after />} /><Emph t={t} text="AN EXHAUSTING AFTERNOON?" at={0.05} out={0.9} y={0.12} size={60} /></>, { inT: "cut" }),
  mk(127.2, 129.9, (t) => <><SkipCut t={t} at={1.5} label="+20 MIN" mood="uneasy" a={(tt) => <B.Argument t={tt} phase="argue" />} b={(tt) => <B.Argument t={tt} phase="after" />} /><Emph t={t} text="A DIFFICULT CONVERSATION?" at={0.1} out={1.3} y={0.12} size={60} /></>, { inT: "cut" }),
  mk(129.9, 137.4, (t) => <B.AptEvening t={t} mode="couch" night={0.3} calendar={{ month: "JULY", year: YEAR0 }} grade={GRADE.cool} cam={{ cx: 300, cy: -1000, w: 3800 - t * 120 }} />),
  // ——— LIFE KEEPS MOVING ———
  mk(137.4, 151.2, (t) => <><B.TimeLapse t={t} speed={0.5 + t * 0.05} cam={{ cx: 0, cy: -1150, w: 5600 - t * 60 }} /><Emph t={t} text="THEY LIVED." at={lc(147.6, 137.4)} y={0.12} size={64} /></>, { fi: 0.6 }),
  mk(151.2, 155.6, (t) => <B2.FilmStrip t={t} />, { fi: 0.4 }),
  mk(155.6, 161.6, (t) => <B.AptEvening t={t} mode="couch" night={0} calendar={{ month: "SEPTEMBER", year: YEAR0 }} grade={GRADE.warm} />, { fi: 0.5 }),
  // ——— LITTLE THINGS ———
  mk(161.6, 168.3, (t) => <B2.FriendMeet t={t} who="trip" />, { fi: 0.5 }),
  mk(168.3, 170.4, (t) => <PhoneInsert t={t} screen={<g><rect x={-350} y={-750} width={700} height={1500} fill="#000" /><PhotoTile p={{ kind: "beach", date: "" }} x={-350} y={-350} s={700} id="tripph" /></g>} thumb={null} tilt={6} offset={[0.1, 0]} bg={<B2.FriendMeet t={t} who="trip" />} />, { inT: "cut" }),
  mk(170.4, 175.8, (t) => <B2.FriendMeet t={t} who="thanks" />, { inT: "cut" }),
  mk(175.8, 186.4, (t) => <Press t={t} at={null} screen={() => <GalleryScreen sections={GALLERY} scroll={keys(t, [[0.8, 0], [10.6, 900]], easeInOut)} />} />, { fi: 0.4 }),
  mk(186.4, 191.4, (t) => <PhoneInsert t={t} thumb={null} zoom={keys(t, [[0, 1], [5, 1.08]])} offset={[0.2, 0]} screen={<PhotoViewer p={GALLERY[0].photos[t < 2.5 ? 1 : 0]} id="pv1" />} />, { inT: "cut" }),
  mk(191.4, 201.4, (t) => <B2.Highlights t={t} />, { fi: 0.5 }),
  mk(201.4, 214.6, (t) => <><B.AptEvening t={t} mode="tired" night={1} grade={GRADE.cool} cam={{ cx: 600, cy: -1000, w: 3000 - t * 40 }} /><Emph t={t} text="ALWAYS AN EASIER OPTION" at={lc(209.8, 201.4)} y={0.82} size={58} /></>, { fi: 0.5 }),
  // ——— YEARS ———
  mk(214.6, 218.0, (t) => (
    <SkipCut t={t} at={0.75} dur={2.0} label="+1 YEAR" mood="uneasy"
      a={(tt) => <Press t={tt} at={0.6} screen={(p) => skipApp(p)} />}
      b={(tt) => <B2.YearsPass t={tt} dur={14} />}
      ghosts={[(g) => <B.TimeLapse t={g + 2} />, (g) => <B.AptEvening t={g} mode="couch" night={1} />]} />
  ), { inT: "cut" }),
  mk(218.0, 231.2, (t, d) => <><B2.YearsPass t={t + 1.6} dur={d + 1.6} /><Emph t={t} text="FRIENDS MARRIED" at={lc(222.6, 218)} out={lc(224.2, 218)} y={0.12} size={56} /><Emph t={t} text="SOME HAD CHILDREN" at={lc(224.3, 218)} out={lc(226.1, 218)} y={0.12} size={56} /><Emph t={t} text="OTHERS MOVED AWAY" at={lc(226.2, 218)} out={lc(229, 218)} y={0.12} size={56} /></>, { inT: "cut" }),
  // ——— MOM ———
  mk(231.2, 234.4, (t) => <B.MomCalls t={t} />, { fi: 0.5 }),
  mk(234.4, 236.8, (t) => <><Press t={t} at={null} bg={<B.AptEvening t={t} mode="tired" night={1} />} screen={() => <CallScreen t={t} name="Mom" />} /><Emph t={t} text="“ARE YOU COMING OVER THIS WEEKEND?”" at={0.1} y={0.1} size={52} serif /></>, { inT: "cut" }),
  mk(236.8, 242.7, (t) => <B.AptEvening t={t} mode="tired" night={1} phoneUp={1} cam={{ cx: 600, cy: -1000, w: 2200 }} />, { inT: "cut" }),
  mk(242.7, 244.4, (t) => <Press t={t} at={0.55} bg={<B.AptEvening t={t} mode="tired" night={1} />} screen={(p) => <CallScreen t={t} name="Mom" pressed={p} />} />, { inT: "cut" }),
  mk(244.4, 247.0, (t) => <B.MomCalls t={t} lower={1.5} cam={{ cx: 1100, cy: -1050, w: 2600 }} />, { fi: 0.5 }),
  mk(247.0, 250.3, (t) => <PhoneInsert t={t} thumb={null} offset={[0.2, 0]} screen={<MessageScreen name="Mom" date="2029" msgs={[{ from: "them", text: "Just checking on you.", appear: ramp(t, 0.1, 0.5) }, { from: "them", text: "We haven't seen each other in a while.", appear: ramp(t, 1.4, 1.8) }]} />} />, { inT: "cut" }),
  mk(250.3, 254.5, (t) => <B.MomDinner t={t} />, { fi: 0.6, fo: 0.4 }),
  mk(254.5, 261.6, (t) => <><SkipCut t={t} at={0.6} mood="uneasy" label="+3 WEEKS" a={(tt) => <B.BoringDesk t={tt} minutes={21 * 60} after />} b={(tt) => <B.MomCalls t={tt} lower={0} older />} /></>, { inT: "cut" }),
  mk(261.6, 267.2, (t) => <SkipCut t={t} at={0.4} dur={2.4} mood="cold" label="+2 YEARS" a={(tt) => <Press t={tt} at={0.3} screen={(p) => <CallScreen t={tt} name="Mom" pressed={p} />} />} b={(tt) => <B.AptEvening t={tt} mode="couch" older years={8} night={1} grade={GRADE.cold} />} ghosts={[(g) => <B.MomDinner t={g} />, (g) => <B.TimeLapse t={g} />, (g) => <B2.YearsPass t={g + 9} dur={14} />]} />, { inT: "cut" }),
  mk(267.2, 272.8, (t) => <><B.AptEvening t={t} mode="couch" older years={9} night={1} grade={GRADE.grief} cam={{ cx: 700, cy: -900, w: 2600 + t * 260 }} /><Emph t={t} text="LESS LIFE." at={lc(271.4, 267.2)} y={0.8} size={80} /></>, { inT: "cut" }),
  // ——— TEN YEARS ———
  mk(272.8, 282.4, (t) => <B.MirrorScene t={t} react={ramp(t, 5.5, 7)} />, { fi: 1.0 }),
  mk(282.4, 285.4, (t) => <Press t={t} at={null} screen={() => <LockScreen time="7:41" date={`Tuesday, October 14, ${YEAR10}`} />} />, { inT: "cut" }),
  mk(285.4, 289.9, (t) => <><B.MirrorScene t={t + 8} react={1} /><Emph t={t} text="TEN YEARS" at={0.1} y={0.12} size={110} /></>, { inT: "cut" }),
  mk(289.9, 296.0, (t) => <B.BedEdge t={t} mode="sitdown" k={ramp(t, 0.2, 1.8, easeInOut)} />, { fi: 0.5 }),
  // ——— THE GALLERY ———
  mk(296.0, 311.9, (t) => <><Press t={t} at={null} screen={() => <GalleryScreen sections={GALLERY} scroll={keys(t, [[0.6, 0], [15.4, galH - 1350]], easeInOut)} />} /><Emph t={t} text="HIS FATHER LOOKED OLDER" at={lc(307.2, 296)} y={0.12} size={54} /></>),
  mk(311.9, 319.3, (t) => <Press t={t} at={null} screen={() => <GalleryScreen sections={GALLERY} scroll={keys(t, [[0, galH - 1350], [1.8, 1600], [3.4, 1950], [4.6, 1600], [6.4, 1820]], easeInOut)} hi={[LAST_MOM[0], LAST_MOM[1], ramp(t, 5.8, 6.4)]} />} />, { inT: "cut" }),
  mk(319.3, 326.4, (t) => <><PhoneInsert t={t} thumb={null} offset={[0.2, 0]} zoom={keys(t, [[0, 1], [7, 1.1]])} screen={<PhotoViewer p={GALLERY[LAST_MOM[0]].photos[LAST_MOM[1]]} id="lastmomL" />} /><Emph t={t} text="THREE YEARS AGO" at={lc(323.2, 319.3)} y={0.84} size={64} /></>, { inT: "cut" }),
  mk(326.4, 329.0, (t) => <B.BedEdge t={t} mode="still" cam={{ cx: -1650, cy: -1050, w: 1900 }} />, { inT: "cut" }),
  mk(329.0, 331.6, (t) => <Press t={t} at={0.4} target={[200, 600]} screen={() => <CallScreen t={t} name="Mom" state="calling" />} />, { inT: "cut" }),
  mk(331.6, 335.4, (t) => <Press t={t} at={null} screen={() => <CallScreen t={t} name="Mom" state={t < 0.6 ? "calling" : "out"} />} />, { inT: "cut" }),
  mk(335.4, 343.6, (t) => <Press t={t} at={null} screen={() => <MessageScreen name="Aunt Clara" hair="aunt" date="OCTOBER 2033 · 11:42 PM" msgs={[{ from: "them", text: "I'm so sorry. Mom passed away last night." }]} scroll={keys(t, [[0, -900], [5.5, 0]], easeOut)} />} />),
  mk(343.6, 349.3, (t) => <><Press t={t} at={null} zoom={1.15} screen={() => <MessageScreen name="Aunt Clara" hair="aunt" date="OCTOBER 2033 · 11:42 PM" msgs={[{ from: "them", text: "I'm so sorry. Mom passed away last night.", highlight: ramp(t, 2.5, 3) }]} />} /><Emph t={t} text="THREE YEARS AGO" at={lc(347.0, 343.6)} y={0.86} size={64} /></>, { inT: "cut" }),
  mk(349.3, 354.6, (t) => <B.BedEdge t={t} mode="still" />, { fi: 0.6 }),
  mk(354.6, 374.0, (t) => <Press t={t} at={null} screen={() => <MessageScreen name="Mom" date="2032 — 2033" unanswered={t > 13} msgs={MOM_MESSAGES.map((m, i) => ({ ...m, appear: ramp(t, [0.8, 2.6, 4.6, 11.6][i], [0.8, 2.6, 4.6, 11.6][i] + 0.5), highlight: i === 3 ? ramp(t, 14.5, 15) : 0 }))} />} zoom={keys(t, [[12, 1], [19, 1.12]])} />),
  mk(374.0, 391.6, (t) => <><B.BedEdge t={t} mode="grief" /><Emph t={t} text="THE ORDINARY MOMENTS" at={lc(384.0, 374)} y={0.12} size={58} /></>, { fi: 0.8 }),
  // ——— AFRAID ———
  mk(391.6, 399.6, (t) => <B.PhoneFace t={t} look={B.KID_OLDER} expr="fear" exprB="uneasy" mixAt={5} dark={0.6} bg={<B.BedEdge t={t} mode="still" />} />, { fi: 0.5 }),
  mk(399.6, 405.2, (t) => {
    const words = ["rewind", "undo", "go back", "anything"]; const starts = [0, 0.95, 1.9, 2.8];
    const i = starts.filter((s) => t >= s).length - 1; const w = words[Math.max(0, i)];
    const typed = w.slice(0, Math.floor(clamp((t - starts[Math.max(0, i)]) / 0.4) * w.length));
    return <Press t={t} at={null} screen={() => <SkipPlayScreen appear={ramp(t, 4.4, 5.2)} search={typed} searchResult={ramp(t - starts[Math.max(0, i)], 0.5, 0.7)} />} />;
  }, { inT: "cut" }),
  mk(405.2, 408.4, (t) => <><Press t={t} at={null} zoom={1.3} offset={[0.25, -0.15]} screen={() => <SkipPlayScreen />} /><Emph t={t} text="SKIP · PLAY" at={0.9} y={0.82} size={72} mono /></>, { inT: "cut" }),
  mk(408.4, 413.8, (t) => <Press t={t} at={0.55} target={padOn(PLAY_BTN, 0.78)} screen={(p) => <SkipPlayScreen pressPlay={p} />} />, { inT: "cut" }),
  mk(413.8, 421.4, (t) => <><Press t={t} at={null} screen={() => <LockScreen time="7:58" date={`Tuesday, October 14, ${YEAR10}`} />} /><Emph t={t} text="THE DATE REMAINED THE SAME." at={lc(416.8, 413.8)} y={0.12} size={54} /></>, { inT: "cut" }),
  mk(421.4, 427.4, (t) => <B.BedEdge t={t} mode="grief" cam={{ cx: -1500, cy: -1000, w: 2600 }} />, { fi: 0.6 }),
  mk(427.4, 437.2, (t) => {
    // his thumb drifts toward SKIP… hovers… never touches
    const tgt = padOn(SKIP2_BTN, 0.78);
    const k = ramp(t, 0.6, 3.5, easeInOut) * (1 - ramp(t, 8.8, 9.8, easeInOut));
    const tremble = Math.sin(t * 23) * 4 * k;
    const tip: V = [THUMB_REST[0] + (tgt[0] + 30 - THUMB_REST[0]) * k + tremble, THUMB_REST[1] + (tgt[1] + 70 - THUMB_REST[1]) * k];
    return <PhoneInsert t={t} thumb={tip} offset={[0.2, 0]} screen={<SkipPlayScreen />} />;
  }, { inT: "cut" }),
  mk(437.2, 440.4, (t) => <B.PhoneFace t={t} look={B.KID_OLDER} expr="regret" exprB="relief" mixAt={1.4} dark={0.55} bg={<B.BedEdge t={t} mode="still" />} />, { inT: "cut" }),
  // ——— THE ORDINARY THINGS (seen again, in real time) ———
  mk(440.4, 444.4, (t) => <B.QueueScene t={t} phase="wait" minutes={8 * 60 + 12} grade="saturate(0.8) sepia(0.15)" />, { fi: 0.8 }),
  mk(444.4, 446.6, (t) => <B.OfficeTalk t={t} phase="talk" grade="saturate(0.8) sepia(0.15)" />, { fi: 0.5 }),
  mk(446.6, 448.4, (t) => <B.BoringDesk t={t} minutes={15 * 60 + t * 4} />, { fi: 0.5 }),
  mk(448.4, 455.2, (t) => <B.MomDinner t={t} />, { fi: 0.6, fo: 0.6 }),
  mk(455.2, 458.6, (t) => <B.BedEdge t={t} mode="putdown" cam={{ cx: -2400, cy: -950, w: 3000 }} />, { fi: 0.5 }),
  // ——— HIS FATHER ———
  mk(458.6, 460.4, (t, d) => <B.WalkToFather t={t} dur={d + 1} />, { fi: 0.6 }),
  mk(460.4, 465.0, (t) => <B.Arrival t={t} walkFrom={-3.2} doorAt={0.2} cam={{ cx: -400, cy: -1100, w: 3800 }} />, { inT: "cut" }),
  mk(465.0, 467.6, (t) => <B.KitchenTogether t={t} mode="sitdown" k={ramp(t, 0.1, 1.6, easeInOut)} />, { fi: 0.6 }),
  mk(467.6, 474.0, (t) => <B.KitchenTogether t={t} mode="talk" cam={{ cx: 250, cy: -1000, w: 3000 }} />, { inT: "cut" }),
  mk(474.0, 476.5, (t) => <B.KitchenTogether t={t} mode="laugh" cam={{ cx: -100, cy: -1000, w: 2600 }} />, { inT: "cut" }),
  mk(476.5, 479.6, (t) => <B.KitchenTogether t={t} mode="quiet" cam={{ cx: 0, cy: -980, w: 3600 }} />, { inT: "cut" }),
  mk(479.6, 488.4, (t) => <B.KitchenTogether t={t} mode="pocket" cam={{ cx: -380, cy: -700, w: 2300 }} />, { inT: "cut" }),
  mk(488.4, 496.8, (t) => <B.KitchenTogether t={t} mode="listen" cam={{ cx: 300, cy: -980, w: 2700 }} />, { inT: "cut" }),
  mk(496.8, 508.6, (t) => <B.KitchenTogether t={t + 3} mode="talk" cam={{ cx: 0, cy: -980, w: 3600 + t * 120 }} />, { fi: 0.6 }),
  mk(508.6, 519.6, (t) => <><View cam={{ cx: 1300, cy: -1350, w: 3800 + t * 200 }} style={{ filter: "brightness(0.85)" }}><HouseFront t={t} door={0} /></View><Fade o={1 - ramp(t, 0, 1.5)} /></>, { fi: 1.2 }),
  mk(519.6, LONG_DURATION, (t, d) => <TitleCard t={t} dur={d} presents={false} />, { fi: 0.6, fo: 0 }),
];

export const Long: React.FC<{ qc?: boolean }> = ({ qc }) => {
  QC.on = !!qc;
  QC.frame = useCurrentFrame();
  return (
  <AbsoluteFill style={{ background: "#000" }}>
    <Audio src={staticFile("long.mp3")} />
    {SHOTS.map((s, i) => (
      <Shot key={i} from={s.from} to={s.to} inT={s.inT ?? (s.fi ? "fade" : "cut")} outT={s.outT ?? (s.fo ? "fade" : "cut")} fadeIn={s.fi ?? 0} fadeOut={s.fo ?? 0}><s.c /></Shot>
    ))}
    <FilmLook grain={0.05} vignette={0.4} />
  </AbsoluteFill>
  );
};
export const LONG_SHOTS = SHOTS.map((s) => [s.from, s.to]);
