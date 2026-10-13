import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import tokens from "../data/short.tokens.json";
import { makeCues } from "../lib/cues";
import { C } from "../theme";
import { clamp, easeInOut, easeOut, keys, lerp, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { Shot } from "../components/Shot";
import { FilmLook, Preload } from "../components/FilmLook";
import { FileSeal } from "../components/Brand";
import { Bedroom } from "../scenes/Bedroom";
import { Town, Observatory } from "../scenes/Town";
import { Grunion } from "../scenes/Grunion";
import { TideChart } from "../scenes/Tides";
import { Harbor, Haul, Market } from "../scenes/Fishing";
import { Wild } from "../scenes/Wild";
import { Reef, ReefState } from "../three/Reef";
import { Globe } from "../three/Globe";
import { Counter, Headline, KnowTag, Knowledge, Marker, PhoneClip, SimBadge, SpawnCalendar } from "../components/Overlays";

const { seq } = makeCues(tokens);
export const SHORT_DURATION = 117.5;

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

const L: React.FC<{ from: number; render: (t: number, a: number) => React.ReactNode }> = ({ from, render }) => {
  const t = useT();
  return <>{render(t, t + from)}</>;
};
const Tag: React.FC<{ kind: Knowledge; extra?: string }> = ({ kind, extra }) => { const t = useT(); return <KnowTag t={t} kind={kind} extra={extra} />; };

const reef = (o: Partial<ReefState> & { cam: ReefState["cam"]; time: number }): ReefState => ({ night: 0, fish: 1, juveniles: 1, health: 1, ...o });

const SHOTS: S[] = [
  // ── the night it disappeared
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
  { from: 9.0, to: 11.1, el: (f) => <L from={f} render={(t, a) => <Town t={a} cam={{ x: 1150, y: 980, w: 1000 }} moon={0} gather={lerp(0.3, 1, clamp(t / 2))} />} /> },
  { from: 11.0, to: 13.1, el: (f) => <L from={f} render={(t, a) => <Observatory t={a} cam={{ x: 1020, y: 720, w: 860 }} slew={clamp(t / 1.8)} />} /> },
  { from: 13.0, to: 18.2, tag: "fact", tagExtra: "THE SEA STILL MOVES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Grunion t={a} cam={{ x: 760, y: lerp(380, 740, easeInOut(ramp(a, T.danger + 0.6, T.downHere + 0.3))), w: 900 }} moonless day={8} xsec={0} />
        <Headline t={a} top={0.14} lines={[{ text: "DOWN HERE", at: T.downHere - 0.1, size: 120 }]} />
      </>
    )} />
  ) },
  // ── the grunion
  { from: 18.1, to: 24.5, tag: "fact", tagExtra: "CALIFORNIA GRUNION", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Grunion t={a} cam={{ x: lerp(950, 1060, easeInOut(ramp(a, T.thousands - 0.4, T.thousands + 2))), y: lerp(780, 800, ramp(a, T.thousands, T.thousands + 2)), w: lerp(1000, 640, easeInOut(ramp(a, T.thousands - 0.4, T.thousands + 2))) }}
          moonless day={10} xsec={ramp(a, T.thousands - 0.6, T.thousands + 0.6)} />
        <Marker t={a} at={T.tenDays} text="10 days later" sub="CALIFORNIA COAST" dur={3.0} top />
        <Headline t={a} top={0.14} lines={[{ text: "WAITING", at: T.thousands + 1.4, size: 100 }, { text: "TO BE BORN", at: T.thousands + 1.7, size: 74 }]} />
      </>
    )} />
  ) },
  { from: 24.4, to: 26.7, tag: "fact", tagExtra: "SPAWNING RUN", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Grunion t={a} cam={{ x: 1060, y: 730, w: 520 }} moonless={false} day={0} spawn={lerp(0.35, 1, clamp(t / 2.3))} xsec={0} sky={0} />
        <Headline t={a} top={0.14} kicker="10 DAYS EARLIER · EGGS LAID IN WET SAND" kAt={0.1 + f} lines={[]} />
      </>
    )} />
  ) },
  { from: 26.6, to: 32.1, tag: "fact", tagExtra: "NORMAL TIDES", el: (f) => (
    <L from={f} render={(t, a) => {
      const day = lerp(10, 13.4, easeInOut(clamp(t / 5.2)));
      return (
        <>
          <Grunion t={a} cam={{ x: 1000, y: 780, w: 820 }} moonless={false} day={day} xsec={1} labels={1} sky={0} />
          <Counter t={a} at={f + 0.2} label="DAY" value={day} note="WITH THE MOON" />
        </>
      );
    }} />
  ) },
  { from: 32.0, to: 36.7, tag: "fact", tagExtra: "ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #16202c 0%, #07090c 78%)" }}>
        <TideChart t={t} reveal={clamp(t / 1.2)} moonless={ramp(a, T.weaker - 0.6, T.weaker + 1.2)} />
        <Headline t={a} top={0.14} lines={[{ text: "WEAKER TIDES", at: T.weaker, size: 92 }]} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 36.6, to: 44.3, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => {
      const day = lerp(12, 30, easeInOut(clamp(t / 7.4)));
      return (
        <>
          <Grunion t={a} cam={{ x: 1000, y: 780, w: 820 }} moonless day={day} xsec={1} labels={1} />
          <Counter t={a} at={f + 0.2} label="DAY" value={day} note="WITHOUT THE MOON · ILLUSTRATIVE" />
        </>
      );
    }} />
  ) },
  // ── the reef
  { from: 44.2, to: 50.0, inT: "blur", tag: "fact", tagExtra: "CORALS ARE ANIMALS", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Reef res={0.75} s={reef({ time: a, cam: { pos: [lerp(1.5, 0.6, easeInOut(clamp(t / 5.8))), lerp(2.8, 2.0, clamp(t / 5.8)), lerp(7.5, 5.2, easeInOut(clamp(t / 5.8)))], target: [0, 0.9, -1], fov: 48 } })} />
        <Headline t={a} top={0.14} kicker="TROPICAL REEF" kAt={T.reefs} lines={[]} />
      </>
    )} />
  ) },
  { from: 49.9, to: 55.1, tag: "fact", tagExtra: "SOME SPECIES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Reef res={0.75} s={reef({ time: a, night: 1, moonlight: 1, torch: 1, fish: 0, cam: { pos: [lerp(0.9, 0.5, clamp(t / 5.2)), 1.8, lerp(4.4, 3.6, clamp(t / 5.2))], target: [0, 1.4, -0.5], fov: 50 }, spawn: { p: lerp(0.15, 0.7, clamp(t / 5.2)), frac: 0.9 } })} />
        <Headline t={a} top={0.14} kicker="SYNCHRONISED SPAWNING" kAt={T.many + 0.2} lines={[{ text: "ALL AT ONCE", at: T.sameTime - 0.4, size: 90 }]} />
      </>
    )} />
  ) },
  { from: 55.0, to: 60.5, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Reef res={0.75} s={reef({ time: a, night: 1, moonlight: 0, torch: 1, fish: 0, cam: { pos: [0.5, 1.8, 3.6], target: [0, 1.4, -0.5], fov: 50 }, spawn: { p: lerp(0.3, 0.75, clamp(t / 5.4)), frac: 0.14, seed: 9 } })} />
        <SpawnCalendar t={t} reveal={ramp(a, T.signals, T.signals + 0.6)} scatter={ramp(a, T.signals + 0.6, T.signals + 2.4)} />
        <Headline t={a} top={0.14} lines={[{ text: "OUT OF SYNC", at: T.signals + 0.4, size: 90 }]} />
      </>
    )} />
  ) },
  { from: 60.4, to: 67.9, tag: "plausible", tagExtra: "ONE POSSIBLE FUTURE", el: (f) => (
    <L from={f} render={(t, a) => {
      const yr = lerp(1, 10, easeInOut(ramp(a, T.years, T.places + 0.6)));
      const h = lerp(1, 0.32, easeInOut(ramp(a, T.years, T.places + 0.6)));
      return (
        <>
          <Reef res={0.75} s={reef({ time: a, health: h, fish: lerp(0.35, 1, (h - 0.32) / 0.68), juveniles: 1, cam: { pos: [lerp(-1.5, 1.2, clamp(t / 7.5)), 2.3, 5.4], target: [0, 1.0, -1], fov: 50 } })} />
          <Counter t={a} at={T.years} label="YEAR" value={yr} note="ILLUSTRATIVE" />
        </>
      );
    }} />
  ) },
  // ── the fishing family
  { from: 67.8, to: 71.5, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <><Harbor t={a} cam={{ x: lerp(800, 900, clamp(t / 3.7)), y: 850, w: 1000 }} depart={clamp(t / 3.7) * 0.4} /><Marker t={a} at={f + 0.2} text="One possible future" sub="WHAT IF? · TIMELINE" dur={3.2} top /></>} /> },
  { from: 71.4, to: 75.0, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Haul t={a} cam={{ x: 1600, y: 820, w: 900 }} haul={clamp(t / 2.6)} catchK={0.18} />} /> },
  { from: 74.9, to: 78.8, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Market t={a} cam={{ x: 1250, y: 850, w: 1050 }} abundance={0.25} customers={0.6} />} /> },
  // ── nights on land
  { from: 78.7, to: 84.6, tag: "plausible", tagExtra: "DEPENDS ON THE SPECIES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Wild t={a} cam={{ x: lerp(1600, 1450, clamp(t / 5.9)), y: 960, w: 760 }} moon={0} fox={clamp(t / 5.9)} forage={clamp(t / 4)} />
        <Headline t={a} top={0.14} kicker="DARKER NIGHTS" kAt={T.land + 0.3} lines={[]} />
      </>
    )} />
  ) },
  { from: 84.5, to: 88.9, tag: "plausible", el: (f) => <L from={f} render={(t, a) => <Wild t={a} cam={{ x: 1300, y: 960, w: 760 }} moon={1 - ramp(a, T.other + 1.2, T.other + 2.4)} fox={0.6} forage={0.5} />} /> },
  // ── the distant future
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
  { from: 100.0, to: 103.2, tag: "plausible", el: (f) => <L from={f} render={(t, a) => <Grunion t={a} cam={{ x: 1160, y: 750, w: 560 }} moonless day={34} xsec={1} />} /> },
  { from: 103.1, to: 106.8, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Reef res={0.75} s={reef({ time: a, night: 1, moonlight: 0, torch: 1, fish: 0, cam: { pos: [0.3, 1.6, lerp(3.0, 2.4, clamp(t / 3.7))], target: [0, 1.2, -0.6], fov: 48 }, spawn: { p: 0.6, frac: 0.1, seed: 13 } })} />
        <Headline t={a} top={0.14} lines={[{ text: "NEVER BORN", at: T.generations + 1.2, size: 100 }]} />
      </>
    )} />
  ) },
  // ── ending
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

export const Short: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Audio src={staticFile("audio/short.mp3")} />
    <Preload srcs={["moon/moon_disc.png"]} />
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
