import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import tokens from "../data/short.tokens.json";
import { makeCues } from "../lib/cues";
import { C } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { Shot } from "../components/Shot";
import { FilmLook, Preload } from "../components/FilmLook";
import { FileSeal } from "../components/Brand";
import { Bedroom } from "../scenes/Bedroom";
import { Town } from "../scenes/Town";
import { Harbor, Haul, Market } from "../scenes/Fishing";
import { Wild } from "../scenes/Wild";
import { Globe } from "../three/Globe";
import { TideBeach } from "../scenes/TideBeach";
import { Footage, FootageLabel, FootageLayer, Split } from "../components/Footage";
import { SpawnGrid } from "../components/SpawnGrid";
import { Counter, Headline, KnowTag, Knowledge, Marker, SimBadge } from "../components/Overlays";
import { SHORT_DURATION } from "./Short";

/*
 * WHAT IF? #001 — vertical short, V2.
 * Same narration, timing, brand and preserved scenes as V1 (Bedroom, Town, fishing family, Earth/axis, ending).
 * Replaced: research scenes → real observatory / control-room footage (labelled DRAMATIZED);
 * beach & tides → real California beach footage + annotated BEFORE/AFTER tide reach on real footage;
 * grunion → real photographs of spawning females and egg clutches; coral → real NOAA reef & spawning footage.
 */
const { seq } = makeCues(tokens);
const T = {
  disappears: seq("the moon disappears"), noExpl: seq("No explosion"), oneMoment: seq("One moment"), gone: seq("it's gone"),
  rush: seq("People rush outside"), scientists: seq("Scientists search"), danger: seq("But the real danger"), downHere: seq("down here"),
  tenDays: seq("10 days later"), california: seq("California"), thousands: seq("thousands of tiny fish"), buried: seq("They're buried"),
  normally: seq("Normally"), highTides: seq("high tides"), hatch: seq("to hatch"), without: seq("But without the moon"), weaker: seq("weaker"),
  someEggs: seq("Some eggs might never"), generation: seq("A generation"), beginning: seq("And that's just the beginning"),
  reefs: seq("Across tropical reefs"), many: seq("Many depend on lunar cycles"), sameTime: seq("at the same time"), signals: seq("Without those signals"),
  fewerEggs: seq("Fewer eggs"), fewerYoung: seq("Fewer young corals"), years: seq("over the years"), places: seq("fewer places to live"),
  fishermen: seq("Now imagine the fishermen"), emptyNets: seq("empty nets"), communities: seq("entire coastal communities"), land: seq("Even on land"),
  predators: seq("Some nighttime predators"), other: seq("Other animals"), future: seq("And far into the future"), seasons: seq("seasons"),
  terrifying: seq("The terrifying part"), humanity: seq("Humanity might survive"), species: seq("some species could struggle"),
  generations: seq("some future generations"), lighting: seq("The moon wasn't just"), rhythm: seq("in rhythm"), whatIf: seq("What if"),
};

type S = { from: number; to: number; inT?: "fade" | "blur" | "push" | "cut" | "dip"; fadeIn?: number; fadeOut?: number; tag?: Knowledge; tagExtra?: string; el: (f: number, to: number) => React.ReactNode };
const L: React.FC<{ from: number; render: (t: number, a: number) => React.ReactNode }> = ({ from, render }) => { const t = useT(); return <>{render(t, t + from)}</>; };
const Tag: React.FC<{ kind: Knowledge; extra?: string }> = ({ kind, extra }) => { const t = useT(); return <KnowTag t={t} kind={kind} extra={extra} />; };
const Lift: React.FC<{ k?: number; children: React.ReactNode }> = ({ k = 1.9, children }) => <AbsoluteFill style={{ filter: `brightness(${k}) contrast(1.08)` }}>{children}</AbsoluteFill>;

const SHOTS: S[] = [
  // ── the night it disappeared (kept)
  { from: 0, to: 5.5, fadeIn: 0, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Bedroom t={a} cam={{ x: lerp(1560, 1500, clamp(t / 5.5)), y: 720, w: lerp(860, 780, easeInOut(clamp(t / 5.5))) }} moon={1 - ramp(a, T.disappears + 0.45, T.disappears + 0.6)} react={ramp(a, T.disappears + 0.9, T.noExpl + 1.4)} />
        <Headline t={a} top={0.1} kicker="NO EXPLOSION · NO WARNING" kAt={T.noExpl + 0.1} lines={[]} />
      </>
    )} />
  ) },
  { from: 5.4, to: 9.1, el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Town t={a} cam={{ x: 1850, y: lerp(560, 620, clamp(t / 3.7)), w: 900 }} moon={1 - ramp(a, T.gone + 0.15, T.gone + 0.3)} gather={0} />
        <Headline t={a} top={0.62} lines={[{ text: "THERE", at: T.oneMoment + 0.4, size: 110 }]} out={T.gone - 0.2} />
        <Headline t={a} top={0.62} lines={[{ text: "GONE", at: T.gone + 0.2, size: 140, color: C.burgundyHi }]} />
      </>
    )} />
  ) },
  { from: 9.0, to: 11.1, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Lift k={1.6}><Town t={a} cam={{ x: 1150, y: 980, w: 1000 }} moon={0} gather={lerp(0.3, 1, clamp(t / 2))} /></Lift>} /> },
  // ── scientists search the sky: observatory at night → astronomer at the telescope → researcher at a monitor
  { from: 11.0, to: 12.2, tag: "fiction", el: () => <Footage id="eso_domes" start={0.6} kind="archive" fx={0.55} move={{ s0: 1.05, s1: 1.12 }} grade={{ b: 1.05 }} /> },
  { from: 12.1, to: 13.6, inT: "cut", fadeIn: 0.15, tag: "fiction", el: () => <Footage id="mayall_operator" start={3} kind="archive" fx={0.62} move={{ s0: 1.08, s1: 1.14 }} /> },
  { from: 13.5, to: 16.0, inT: "cut", fadeIn: 0.15, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="blanco_monitors" start={4} kind="archive" fx={0.66} move={{ s0: 1.06, s1: 1.16 }} />
        <Headline t={a} top={0.14} kicker="BUT THE REAL DANGER…" kAt={T.danger + 0.1} lines={[]} />
      </>
    )} />
  ) },
  { from: 15.9, to: 18.2, tag: "fact", tagExtra: "THE SEA STILL MOVES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="ca_pacific" start={5.6} fx={0.5} move={{ s0: 1.04, s1: 1.1, y0: -0.02, y1: 0.02 }} />
        <Headline t={a} top={0.14} lines={[{ text: "DOWN HERE", at: T.downHere - 0.1, size: 120 }]} />
      </>
    )} />
  ) },
  // ── the grunion
  { from: 18.1, to: 21.3, tag: "fact", tagExtra: "CALIFORNIA COAST", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="ca_sunset" start={2} fx={0.55} move={{ s0: 1.04, s1: 1.12 }} />
        <Marker t={a} at={T.tenDays} text="10 days later" sub="A BEACH IN CALIFORNIA" dur={3.0} top />
      </>
    )} />
  ) },
  { from: 21.2, to: 24.5, tag: "fact", tagExtra: "CALIFORNIA GRUNION", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_eggs_closeup" kind="photo" fx={0.5} fy={0.45} move={{ s0: 1.05, s1: 1.25 }} />
        <Headline t={a} top={0.14} lines={[{ text: "WAITING", at: T.thousands + 1.4, size: 100 }, { text: "TO BE BORN", at: T.thousands + 1.7, size: 74 }]} />
      </>
    )} />
  ) },
  { from: 24.4, to: 26.7, tag: "fact", tagExtra: "SPAWNING ON THE BEACH", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_female_digging" kind="photo" fx={0.42} fy={0.45} move={{ s0: 1.1, s1: 1.22 }} />
        <Headline t={a} top={0.14} kicker="10 DAYS EARLIER · EGGS BURIED IN WET SAND" kAt={f + 0.1} lines={[]} />
      </>
    )} />
  ) },
  // ── normal tides: the next high tides reach the nests (real beach, illustrative overlay)
  { from: 26.6, to: 32.1, tag: "fact", tagExtra: "NORMAL TIDES · ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => {
      const day = lerp(10, 13.4, easeInOut(clamp(t / 5.2)));
      return (
        <>
          <TideBeach t={a} day={day} moonless={false} start={1} />
          <FootageLabel id="beach_tripod" what="REAL BEACH · TIDE LINES ILLUSTRATIVE" />
          <Counter t={a} at={f + 0.2} label="DAY" value={day} note="WITH THE MOON" />
          <Headline t={a} top={0.62} kicker="THE WATER REACHES THE EGGS" kAt={T.hatch - 0.6} lines={[]} />
        </>
      );
    }} />
  ) },
  // ── BEFORE / AFTER: same beach, same day, with and without the Moon
  { from: 32.0, to: 36.7, tag: "fact", tagExtra: "THE SUN STILL MAKES TIDES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
      <Split
        a={<TideBeach t={a} day={13.4} moonless={false} start={6} labels={0.95} legend={false} />}
        b={<TideBeach t={a} day={13.4} moonless start={6} labels={0.95} legend={false} reach={lerp(1.6, 1, ramp(a, T.weaker - 0.4, T.weaker + 1))} />}
        capA="WITH THE MOON" subA="SPRING TIDES · ILLUSTRATIVE" capB="WITHOUT THE MOON" subB="SMALLER SUN-ONLY TIDES · ILLUSTRATIVE" />
      <FootageLabel id="beach_tripod" what="SAME REAL BEACH · TIDE LINES ILLUSTRATIVE" />
      </>
    )} />
  ) },
  { from: 36.6, to: 44.3, tag: "plausible", tagExtra: "SOME NESTS", el: (f) => (
    <L from={f} render={(t, a) => {
      const day = lerp(12, 30, easeInOut(clamp(t / 7.4)));
      return (
        <>
          <TideBeach t={a} day={day} moonless start={12} />
          <FootageLabel id="beach_tripod" what="REAL BEACH · TIDE LINES ILLUSTRATIVE" />
          <Counter t={a} at={f + 0.2} label="DAY" value={day} note="WITHOUT THE MOON · ILLUSTRATIVE" />
        </>
      );
    }} />
  ) },
  // ── the reef (real NOAA footage)
  { from: 44.2, to: 50.0, inT: "blur", tag: "fact", tagExtra: "CORALS ARE ANIMALS", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_school" start={2} fx={0.5} move={{ s0: 1.04, s1: 1.14 }} />
        <Headline t={a} top={0.14} kicker="TROPICAL REEF" kAt={T.reefs} lines={[]} />
      </>
    )} />
  ) },
  { from: 49.9, to: 52.1, tag: "fact", tagExtra: "SOME SPECIES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="spawn_setting" start={4} fx={0.55} move={{ s0: 1.08, s1: 1.16 }} />
        <Headline t={a} top={0.14} kicker="TIMED BY THE LUNAR CYCLE" kAt={T.many + 0.2} lines={[]} />
      </>
    )} />
  ) },
  { from: 52.0, to: 55.1, tag: "fact", tagExtra: "SYNCHRONISED SPAWNING", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="fgb_plume" start={2} fx={0.5} move={{ s0: 1.05, s1: 1.15 }} />
        <Headline t={a} top={0.14} lines={[{ text: "ALL AT ONCE", at: T.sameTime - 0.4, size: 90 }]} />
      </>
    )} />
  ) },
  { from: 55.0, to: 60.5, tag: "plausible", tagExtra: "ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => <SpawnGrid t={t} night={lerp(0.6, 8.6, clamp(t / 5.3))} scatter={1} caption="OUT OF SYNC" sub="WITHOUT A LUNAR CUE · ILLUSTRATIVE" />} />
  ) },
  { from: 60.4, to: 64.6, tag: "plausible", tagExtra: "ONE POSSIBLE FUTURE", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_bleached" start={1} fx={0.5} move={{ s0: 1.04, s1: 1.12 }} what="A DAMAGED, BLEACHED REEF · AMERICAN SAMOA" />
        <Counter t={a} at={T.years} label="YEAR" value={lerp(1, 10, easeInOut(ramp(a, T.years, T.places + 0.6)))} note="ILLUSTRATIVE" />
      </>
    )} />
  ) },
  { from: 64.5, to: 67.9, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_ledge" start={1} fx={0.5} move={{ s0: 1.04, s1: 1.12 }} grade={{ s: lerp(0.95, 0.55, clamp(t / 3.4)), b: lerp(1, 0.85, clamp(t / 3.4)) }} what="FISH SHELTERING IN A REEF" />
        <Headline t={a} top={0.14} lines={[{ text: "FEWER PLACES", at: T.places - 0.2, size: 84 }, { text: "TO LIVE", at: T.places + 0.1, size: 84 }]} />
      </>
    )} />
  ) },
  // ── the fishing family (kept)
  { from: 67.8, to: 71.5, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <><Harbor t={a} cam={{ x: lerp(800, 900, clamp(t / 3.7)), y: 850, w: 1000 }} depart={clamp(t / 3.7) * 0.4} /><Marker t={a} at={f + 0.2} text="One possible future" sub="WHAT IF? · TIMELINE" dur={3.2} top /></>} /> },
  { from: 71.4, to: 75.0, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Haul t={a} cam={{ x: 1600, y: 820, w: 900 }} haul={clamp(t / 2.6)} catchK={0.18} />} /> },
  { from: 74.9, to: 78.8, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Market t={a} cam={{ x: 1250, y: 850, w: 1050 }} abundance={0.25} customers={0.6} />} /> },
  // ── nights on land (brightened; real night predator footage)
  { from: 78.7, to: 82.0, tag: "plausible", tagExtra: "DEPENDS ON THE SPECIES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Lift><Wild t={a} cam={{ x: lerp(1600, 1450, clamp(t / 3.3)), y: 960, w: 760 }} moon={0} fox={clamp(t / 3.3)} forage={clamp(t / 3)} /></Lift>
        <Headline t={a} top={0.14} kicker="DARKER NIGHTS" kAt={T.land + 0.3} lines={[]} />
      </>
    )} />
  ) },
  { from: 81.9, to: 84.6, inT: "cut", fadeIn: 0.15, tag: "plausible", tagExtra: "SOME PREDATORS", el: () => <Footage id="night_predator" start={0.3} fx={0.5} move={{ s0: 1.06, s1: 1.14 }} grade={{ c: 1.1 }} /> },
  { from: 84.5, to: 88.9, tag: "plausible", el: (f) => <L from={f} render={(t, a) => <Lift><Wild t={a} cam={{ x: 1300, y: 960, w: 760 }} moon={1 - ramp(a, T.other + 1.2, T.other + 2.4)} fox={0.6} forage={0.5} /></Lift>} /> },
  // ── the distant future (kept)
  { from: 88.8, to: 95.5, tag: "uncertain", tagExtra: "VERY LONG TIMESCALES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={0.75} s={{ time: a, cam: { pos: [0.3, 0.7, lerp(5.6, 4.6, clamp(t / 6.7))], target: [0, 0.1, 0], fov: 42 }, tilt: 23.4 + Math.sin(t * 0.6) * 4 * ramp(a, T.seasons, T.seasons + 2), spin: a * 0.15, sun: [1, 0.15, 0.7], axis: ramp(a, f + 0.5, f + 1.5), cone: ramp(a, T.seasons + 1, T.seasons + 2) }} />
        <Marker t={a} at={T.future} text="The distant future" sub="WHAT IF? · TIMELINE" dur={3.4} top />
      </>
    )} />
  ) },
  { from: 95.4, to: 100.1, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Town t={a} cam={{ x: 1300, y: 950, w: 1100 }} moon={0} gather={1} dawn={1} commute />
        <Headline t={a} top={0.14} kicker="HUMANITY MIGHT SURVIVE" kAt={T.humanity + 0.2} lines={[]} />
      </>
    )} />
  ) },
  { from: 100.0, to: 103.2, tag: "plausible", tagExtra: "SOME SPECIES", el: (f) => <L from={f} render={(t, a) => <Footage id="gr_run_night" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.08, s1: 1.2 }} grade={{ b: 0.95 }} />} /> },
  { from: 103.1, to: 106.8, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="spawn_cloud" start={4} fx={0.5} move={{ s0: 1.04, s1: 1.12 }} grade={{ b: lerp(1, 0.55, clamp(t / 3.7)) }} />
        <Headline t={a} top={0.14} lines={[{ text: "NEVER BORN", at: T.generations + 1.2, size: 100 }]} />
      </>
    )} />
  ) },
  // ── ending (kept)
  { from: 106.7, to: 110.6, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Bedroom t={a} cam={{ x: 1480, y: 760, w: 820 }} moon={0} react={1} mother={1} touch={1} />} /> },
  { from: 110.5, to: 113.6, el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={0.75} s={{ time: a, cam: { pos: [0.5, 1.6, lerp(6, 9, easeOut(clamp(t / 3.1)))], target: [0, 0, 0], fov: 42 }, tilt: 23.4, spin: a * 0.15, sun: [1, 0.2, 0.5], orbit: 0.7, moonDist: 3.6 }} />
        <Headline t={a} top={0.14} lines={[{ text: "RHYTHM", at: T.rhythm - 0.6, size: 110 }]} />
      </>
    )} />
  ) },
  { from: 113.5, to: SHORT_DURATION, fadeOut: 0.01, el: (f, to) => <L from={f} render={(t) => <FileSeal t={t} dur={to - f} mode="close" />} /> },
];
void FootageLayer;

export const ShortV2: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Audio src={staticFile("audio/short.mp3")} />
    <Preload srcs={["moon/moon_disc.png", "photos/gr_eggs_closeup.jpg", "photos/gr_female_digging.jpg", "photos/gr_run_night.jpg"]} />
    {SHOTS.map((s, i) => (
      <Shot key={i} from={s.from} to={s.to} inT={s.inT} fadeIn={s.fadeIn ?? 0.35} fadeOut={s.fadeOut ?? 0.35}>
        {s.el(s.from, s.to)}
        {s.tag && <Tag kind={s.tag} extra={s.tagExtra} />}
      </Shot>
    ))}
    <ShortBadge />
    <FilmLook grain={0.07} />
  </AbsoluteFill>
);

const ShortBadge: React.FC = () => {
  const t = useT();
  return <SimBadge opacity={ramp(t, 1.6, 2.4) * (1 - ramp(t, SHORT_DURATION - 4.2, SHORT_DURATION - 3.8))} />;
};
