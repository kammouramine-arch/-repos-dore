import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { C } from "../theme";
import { clamp, easeInOut, easeOut, keys, lerp, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { Shot } from "../components/Shot";
import { FilmLook, Preload } from "../components/FilmLook";
import { FileSeal } from "../components/Brand";
import { Bedroom } from "../scenes/Bedroom";
import { Town, NewsTV, Observatory } from "../scenes/Town";
import { Grunion } from "../scenes/Grunion";
import { TideChart, TideCoast } from "../scenes/Tides";
import { Harbor, Haul, Market, Kitchen } from "../scenes/Fishing";
import { Wild } from "../scenes/Wild";
import { Reef, ReefState } from "../three/Reef";
import { Footage, FootageLabel, Split } from "../components/Footage";
import { SpawnGrid } from "../components/SpawnGrid";
import { TideBeach } from "../scenes/TideBeach";
import { Globe, GlobeState } from "../three/Globe";
import { Clock, Counter, Headline, KnowTag, Knowledge, Marker, MoonPhases, Notes, ObliquityChart, PhoneClip, SimBadge, SpawnCalendar } from "../components/Overlays";

import { LONG_DURATION } from "./Long";

/* All times are seconds in the supplied narration (WHAT_IF_001_LONG.mp3), from the word-level transcript. */

type S = { from: number; to: number; inT?: "fade" | "blur" | "push" | "cut" | "dip"; fadeIn?: number; fadeOut?: number; tag?: Knowledge; tagExtra?: string; el: (f: number, to: number) => React.ReactNode };
const L: React.FC<{ from: number; render: (t: number, a: number) => React.ReactNode }> = ({ from, render }) => { const t = useT(); return <>{render(t, t + from)}</>; };
const Tag: React.FC<{ kind: Knowledge; extra?: string }> = ({ kind, extra }) => { const t = useT(); return <KnowTag t={t} kind={kind} extra={extra} />; };
const reef = (o: Partial<ReefState> & { cam: ReefState["cam"]; time: number }): ReefState => ({ night: 0, fish: 1, juveniles: 1, health: 1, ...o });
const globe = (o: Partial<GlobeState> & { time: number; cam: GlobeState["cam"] }): GlobeState => ({ tilt: 23.4, spin: o.time * 0.12, sun: [1, 0.18, 0.6], ...o });
const P = (t: number, d: number) => clamp(t / d); // progress within a shot
const RES = 0.5; // 3D canvas at half of 4K, scaled up
const Lift: React.FC<{ k?: number; children: React.ReactNode }> = ({ k = 1.8, children }) => <AbsoluteFill style={{ filter: `brightness(${k}) contrast(1.08)` }}>{children}</AbsoluteFill>;
/** illustrative local-population bar (fish icons dimming season by season) */
const PopBar: React.FC<{ n: number; left: number; t: number; at: number }> = ({ n, left, t, at }) => {
  const o = ramp(t, at, at + 0.8);
  return (
    <div style={{ position: "absolute", left: "6%", bottom: "9%", opacity: o, display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ fontFamily: "IBM Plex Mono", fontSize: 54, letterSpacing: "0.2em", color: "#ece6da" }}>LOCAL POPULATION · ILLUSTRATIVE</div>
      <div style={{ display: "flex", gap: 18 }}>
        {Array.from({ length: n }, (_, i) => <div key={i} style={{ width: 96, height: 32, borderRadius: 16, background: i < left ? "#dfe8f2" : "rgba(223,232,242,0.15)", transition: "none" }} />)}
      </div>
    </div>
  );
};

const SHOTS: S[] = [
  { from: 0, to: 5.6, fadeIn: 0.8, tag: "fiction", el: (f, to) => (
    <L from={f} render={(t, a) => (
      <>
        <Bedroom t={a} cam={{ x: lerp(1250, 1380, easeInOut(P(t, 5.6))), y: 820, w: lerp(2300, 1900, easeInOut(P(t, 5.6))) }} moon={1} mother={1} />
        <Clock t={a} at={0.3} />
        <Marker t={a} at={1.4} text="The night it disappeared" dur={4} />
      </>
    )} />
  ) },
  { from: 5.5, to: 9.2, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Bedroom t={a} cam={{ x: 1720, y: lerp(560, 600, P(t, 3.7)), w: lerp(1000, 880, easeInOut(P(t, 3.7))) }} moon={1} mother={1} />} /> },
  { from: 9.1, to: 12.6, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Bedroom t={a} cam={{ x: 1700, y: 600, w: 920 }} moon={1 - ramp(a, 11.1, 11.25)} mother={1} />
        <Headline t={a} top={0.78} kicker="NO EXPLOSION · NO DEBRIS · NO WARNING" kAt={11.8} lines={[]} />
      </>
    )} />
  ) },
  { from: 12.5, to: 16.8, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Bedroom t={a} cam={{ x: 1380, y: 780, w: lerp(1400, 1250, P(t, 4.3)) }} moon={0} react={ramp(a, 12.6, 14.0)} mother={1} />} /> },
  { from: 16.7, to: 19.3, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Bedroom t={a} cam={{ x: 1260, y: 760, w: 1100 }} moon={0} react={1} mother={1} touch={ramp(a, 17.0, 18.2)} />} /> },
  { from: 19.2, to: 23.1, tag: "fiction", tagExtra: "FICTIONAL CLIPS", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #121a26 0%, #050608 78%)" }}>
        {[0, 1, 2].map((i) => {
          const p = easeOut(ramp(t, 0.1 + i * 0.6, 1.0 + i * 0.6));
          return <PhoneClip key={i} t={a} idx={i} s={2.6} x={(0.16 + i * 0.26) * 3840 + (1 - p) * 200} y={420 + (i === 1 ? -80 : 60)} rot={[-6, 2, 7][i]} />;
        })}
        <Headline t={a} top={0.82} kicker="WITHIN MINUTES" kAt={19.4} lines={[]} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 23.0, to: 25.0, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Town t={a} cam={{ x: 1300, y: 920, w: 2400 }} moon={0} gather={lerp(0.5, 1, P(t, 2))} />} /> },
  { from: 24.9, to: 27.5, tag: "fiction", tagExtra: "FICTIONAL BROADCAST", el: (f) => <L from={f} render={(t, a) => <NewsTV t={a} cam={{ x: 1450, y: 650, w: lerp(2000, 1800, P(t, 2.6)) }} on={1} />} /> },
  { from: 27.4, to: 29.6, tag: "fiction", el: () => <Footage id="eso_domes2" start={1} kind="archive" fx={0.5} move={{ s0: 1.04, s1: 1.1 }} /> },
  { from: 29.5, to: 31.8, inT: "cut", fadeIn: 0.2, tag: "fiction", el: () => <Footage id="mayall_scope" start={19} kind="archive" fx={0.5} move={{ s0: 1.04, s1: 1.1 }} /> },
  { from: 31.7, to: 37.9, tag: "fiction", tagExtra: "THE PREMISE", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, cam: { pos: [1.2, 2.2, 8.5], target: [0.8, 0, 0], fov: 40 }, moon: 1 - ramp(a, 35.8, 36.3), moonAng: 0.5, moonDist: 3.6, orbit: ramp(a, 35.8, 36.8) * 0.7 })} />
        <Notes t={a} x={0.06} y={0.62} items={[{ text: "NOT EXPLODED", at: 32.4 }, { text: "NOT HIDDEN BEHIND A PLANET", at: 34.0 }, { text: "SIMPLY GONE", at: 36.0, color: C.paper }]} />
      </>
    )} />
  ) },
  { from: 37.8, to: 42.8, el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, cam: { pos: [1.4, 2.6, lerp(9, 13, easeOut(P(t, 5)))], target: [0.8, 0, 0], fov: 40 }, orbit: 0.7, moonDist: 3.6 })} />
        <Headline t={a} top={0.72} lines={[{ text: "EARTH HAS NO MOON", at: 40.3, size: 96 }]} />
      </>
    )} />
  ) },
  { from: 42.7, to: 50.0, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="ca_pacific" start={0} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} />
        <Headline t={a} top={0.12} kicker="WHAT NOBODY REALIZES YET" kAt={43.0} lines={[]} />
      </>
    )} />
  ) },
  { from: 49.9, to: 58.0, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="spawn_setting" start={1} fx={0.5} move={{ s0: 1.04, s1: 1.14 }} what="CORAL READY TO SPAWN" />
        <Headline t={a} top={0.12} kicker="ANIMALS THAT DEPEND ON THE MOON" kAt={53.2} lines={[]} />
      </>
    )} />
  ) },
  { from: 57.9, to: 62.0, fadeOut: 0.7, el: (f, to) => <L from={f} render={(t) => <FileSeal t={t} dur={to - f} mode="open" stampText="BONUS #001" />} /> },

  // ═════ THE FIRST MORNING ═════
  { from: 61.9, to: 67.6, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Town t={a} cam={{ x: lerp(1100, 1500, P(t, 5.7)), y: 900, w: 2400 }} moon={0} gather={1} dawn={1} commute />
        <Marker t={a} at={62.1} text="The first morning" dur={4.6} />
      </>
    )} />
  ) },
  { from: 67.5, to: 73.7, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Town t={a} cam={{ x: 1300, y: 1000, w: 1500 }} moon={0} gather={1} dawn={1} commute />
        <Headline t={a} top={0.12} kicker="THE WORLD HASN'T ENDED" kAt={71.8} lines={[]} />
      </>
    )} />
  ) },
  { from: 73.6, to: 77.7, tag: "fiction", tagExtra: "SCIENTISTS AT WORK", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="ship_lab" start={4} kind="archive" fx={0.5} move={{ s0: 1.04, s1: 1.12 }} />
        <Headline t={a} top={0.12} kicker="MONITORING SOMETHING UNUSUAL" kAt={74.6} lines={[]} />
      </>
    )} />
  ) },
  { from: 77.6, to: 79.8, tag: "fact", tagExtra: "TIDE GAUGE", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="tide_gauge" kind="photo" fx={0.5} fy={0.45} move={{ s0: 1.05, s1: 1.2 }} />
        <Marker t={a} at={77.7} text="The changing oceans" dur={2.0} top />
      </>
    )} />
  ) },
  { from: 79.7, to: 84.9, tag: "fact", tagExtra: "THE MOON HELPS RAISE THE TIDES", el: (f) => <L from={f} render={() => <Footage id="swash_fan" start={0} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} />} /> },
  { from: 84.8, to: 90.3, tag: "fact", tagExtra: "TWICE A DAY IN MANY PLACES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="ca_lowtide" start={0} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} what="LOW TIDE · SANTA BARBARA COAST" />
        <Headline t={a} top={0.12} align="left" kicker="THE SEA RISES AND FALLS" kAt={86.0} lines={[]} />
      </>
    )} />
  ) },
  { from: 90.2, to: 97.7, tag: "fact", tagExtra: "ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #16202c 0%, #07090c 78%)" }}>
        <TideChart t={t} reveal={P(t, 3)} moonless={ramp(a, 95.2, 97.4)} />
        <Headline t={a} top={0.06} kicker="SPRING AND NEAP TIDES" kAt={90.4} lines={[]} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 97.6, to: 105.0, tag: "fact", tagExtra: "THE SUN STILL MAKES TIDES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Split
          a={<TideBeach t={a} day={13.4} moonless={false} start={2} legend={false} />}
          b={<TideBeach t={a} day={13.4} moonless start={2} legend={false} reach={lerp(1.6, 1, ramp(a, 101.5, 103.5))} />}
          capA="WITH THE MOON" subA="SPRING TIDES · ILLUSTRATIVE" capB="WITHOUT THE MOON" subB="SMALLER SUN-ONLY TIDES · THE OCEAN STILL MOVES" />
        <FootageLabel id="beach_tripod" what="SAME REAL BEACH · TIDE LINES ILLUSTRATIVE" />
      </>
    )} />
  ) },
  { from: 104.9, to: 111.2, tag: "fact", tagExtra: "SOUTHERN CALIFORNIA", el: (f) => <L from={f} render={() => <Footage id="ca_sunset" start={0} fx={0.55} move={{ s0: 1.03, s1: 1.12 }} />} /> },
  { from: 111.1, to: 115.6, tag: "fact", tagExtra: "EGGS BENEATH THE SAND", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_eggs_sand" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.05, s1: 1.2 }} />
        <Headline t={a} top={0.12} align="left" kicker="THOUSANDS OF TINY EGGS" kAt={111.9} lines={[]} />
      </>
    )} />
  ) },
  { from: 115.5, to: 119.1, tag: "fact", tagExtra: "CALIFORNIA GRUNION", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_run_surf" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.05, s1: 1.18 }} />
        <Headline t={a} top={0.12} align="left" kicker="LEURESTHES TENUIS" kAt={116.0} lines={[{ text: "CALIFORNIA GRUNION", at: 116.4, size: 72 }]} />
      </>
    )} />
  ) },
  { from: 119.0, to: 123.9, tag: "fact", tagExtra: "THE SPAWNING RUN", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_run_night" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.04, s1: 1.16 }} />
        <Marker t={a} at={119.4} text="Before the disappearance" sub="FLASHBACK" dur={4.2} top />
      </>
    )} />
  ) },
  { from: 123.8, to: 130.1, tag: "fact", tagExtra: "RUNS AFTER THE HIGHEST TIDES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_mass" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.04, s1: 1.18 }} />
        <Notes t={a} x={0.06} y={0.7} items={[{ text: "OUT OF THE OCEAN, ONTO THE BEACH", at: 125.8 }]} />
      </>
    )} />
  ) },
  { from: 130.0, to: 133.0, tag: "fact", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_female_digging" kind="photo" fx={0.42} fy={0.45} move={{ s0: 1.06, s1: 1.2 }} />
        <Notes t={a} x={0.06} y={0.7} items={[{ text: "FEMALES DIG IN, TAIL FIRST", at: 130.2 }]} />
      </>
    )} />
  ) },
  { from: 132.9, to: 135.0, tag: "fact", el: (f) => <L from={f} render={() => <Footage id="beach_night_waves" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.04, s1: 1.14 }} what="BACK TO THE SEA · NIGHT SURF, DANA POINT" />} /> },
  { from: 134.9, to: 138.0, tag: "fact", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_egg_clump" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.06, s1: 1.22 }} />
        <Notes t={a} x={0.06} y={0.7} items={[{ text: "THE EGGS STAY IN THE SAND", at: 135.0, color: "#e6a35a" }]} />
      </>
    )} />
  ) },
  { from: 137.9, to: 146.2, tag: "fact", tagExtra: "NORMAL TIDES · ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => {
      const day = keys(a, [[137.9, 1], [139.3, 9], [142.6, 11.8], [146, 13.4]]);
      return (
        <>
          <TideBeach t={a} day={day} moonless={false} start={3} />
          <FootageLabel id="beach_tripod" what="REAL BEACH · TIDE LINES ILLUSTRATIVE" />
          <Counter t={a} at={138.1} label="DAY" value={day} note="WITH THE MOON" />
        </>
      );
    }} />
  ) },
  { from: 146.1, to: 149.1, tag: "fact", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="gr_underwater" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.04, s1: 1.16 }} />
        <Headline t={a} top={0.12} align="left" kicker="A NEW GENERATION ENTERS THE OCEAN" kAt={146.3} lines={[]} />
      </>
    )} />
  ) },
  { from: 149.0, to: 157.1, tag: "fact", tagExtra: "SUN-ONLY TIDES · ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #16202c 0%, #07090c 78%)" }}>
        <TideChart t={t + 3} reveal={1} moonless={ramp(a, 152.8, 155.6)} />
        <Headline t={a} top={0.06} kicker="A WORLD WITHOUT THE MOON" kAt={149.3} lines={[]} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 157.0, to: 173.8, tag: "plausible", tagExtra: "SOME NESTS", el: (f) => (
    <L from={f} render={(t, a) => {
      const day = keys(a, [[157, 10], [162.2, 14], [164.9, 16.5], [166.4, 21], [170.4, 25], [173.8, 34]]);
      return (
        <>
          <TideBeach t={a} day={day} moonless start={8} />
          <FootageLabel id="beach_tripod" what="REAL BEACH · TIDE LINES ILLUSTRATIVE" />
          <Counter t={a} at={157.2} label="DAY" value={day} note="WITHOUT THE MOON · ILLUSTRATIVE" />
          <Marker t={a} at={157.4} text="The next high tides" dur={4} top={false} />
        </>
      );
    }} />
  ) },
  { from: 173.7, to: 183.2, tag: "plausible", tagExtra: "REPEATED SEASONS", el: (f) => (
    <L from={f} render={(t, a) => {
      const season = lerp(1, 5, P(t, 9.5));
      const left = Math.round(lerp(20, 8, ramp(a, 175, 182)));
      return (
        <>
          <Footage id="gr_run_waterline" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.04, s1: 1.16 }} grade={{ b: lerp(1, 0.75, P(t, 9.5)) }} />
          <Counter t={a} at={173.9} label="SPAWNING SEASON" value={season} note="ILLUSTRATIVE" />
          <PopBar n={20} left={left} t={a} at={175} />
        </>
      );
    }} />
  ) },
  { from: 183.1, to: 193.6, tag: "fact", tagExtra: "A RHYTHM THE MOON HELPS CREATE", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #16202c 0%, #07090c 78%)" }}>
        <TideChart t={t + 3} reveal={1} moonless={ramp(a, 188.3, 191.5)} />
        <Headline t={a} top={0.06} lines={[{ text: "REMOVE THE RHYTHM", at: 188.4, size: 80 }]} />
      </AbsoluteFill>
    )} />
  ) },
  // ═════ THE CORAL REEFS ═════
  { from: 193.5, to: 201.5, el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, spin: 2.2 + a * 0.05, cam: { pos: [0.4, 0.3, lerp(4.2, 3.0, easeInOut(P(t, 8)))], target: [0, 0, 0], fov: 38 }, sun: [0.6, 0.1, 1] })} />
        <Headline t={a} top={0.12} kicker="FAR AWAY · TROPICAL OCEANS" kAt={197.6} lines={[]} />
      </>
    )} />
  ) },
  { from: 201.4, to: 213.3, inT: "blur", tag: "fact", tagExtra: "AMONG THE MOST DIVERSE ECOSYSTEMS", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_open" start={0} fx={0.5} move={{ s0: 1.03, s1: 1.12 }} />
        <Marker t={a} at={205.2} text="Coral reefs" sub="WHAT IF? · TROPICAL OCEANS" dur={4.5} />
      </>
    )} />
  ) },
  { from: 213.2, to: 219.5, tag: "fact", tagExtra: "CORALS ARE ANIMALS", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_polyps" start={0} fx={0.5} move={{ s0: 1.05, s1: 1.16 }} />
        <Headline t={a} top={0.12} align="left" lines={[{ text: "LIVING ANIMALS", at: 213.6, size: 80 }]} />
      </>
    )} />
  ) },
  { from: 219.4, to: 224.4, tag: "fact", tagExtra: "SOME SPECIES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="spawn_setting" start={8} fx={0.5} move={{ s0: 1.04, s1: 1.14 }} />
        <Headline t={a} top={0.12} kicker="SYNCHRONISED SPAWNING" kAt={219.6} lines={[]} />
      </>
    )} />
  ) },
  { from: 224.3, to: 229.4, tag: "fact", tagExtra: "SOME SPECIES", el: () => <Footage id="fgb_plume" start={1} fx={0.5} move={{ s0: 1.04, s1: 1.14 }} /> },
  { from: 229.3, to: 234.0, tag: "fact", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="spawn_cloud" start={2} fx={0.5} move={{ s0: 1.04, s1: 1.14 }} />
        <Headline t={a} top={0.12} align="left" kicker="EGGS + SPERM IN EACH BUNDLE" kAt={229.5} lines={[{ text: "THEY MUST MEET", at: 230.6, size: 72 }]} />
      </>
    )} />
  ) },
  { from: 233.9, to: 241.4, tag: "fact", tagExtra: "ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => <SpawnGrid t={t} night={lerp(0.6, 8.6, P(t, 7.2))} scatter={0} caption="TIMING IS CRITICAL" sub="WITH A LUNAR CUE · COLONIES RELEASE TOGETHER" />} />
  ) },
  { from: 241.3, to: 253.4, tag: "fact", tagExtra: "SOME SPECIES", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #121a26 0%, #050608 78%)" }}>
        <MoonPhases t={t} reveal={1} window={ramp(a, 246.0, 247.5)} />
        <Headline t={a} top={0.12} kicker="MOONLIGHT AS A SIGNAL" kAt={244.8} lines={[]} />
        <Notes t={a} x={0.14} y={0.74} size={24} items={[{ text: "WATER TEMPERATURE SETS THE SEASON", at: 248.6, color: "#9fd4b8" }, { text: "THE LUNAR CYCLE HELPS SET THE NIGHT", at: 250.0, color: "#9fd4b8" }]} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 253.3, to: 257.5, tag: "fiction", tagExtra: "MARINE BIOLOGIST", el: () => <Footage id="divers_survey" start={0} kind="archive" fx={0.5} move={{ s0: 1.04, s1: 1.12 }} /> },
  { from: 257.4, to: 263.0, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="fgb_brain" start={3} fx={0.5} move={{ s0: 1.04, s1: 1.12 }} grade={{ b: 0.85 }} />
        <Marker t={a} at={257.8} text="The following spawning seasons" dur={4.8} />
      </>
    )} />
  ) },
  { from: 262.9, to: 275.0, tag: "plausible", tagExtra: "ILLUSTRATIVE", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <SpawnGrid t={t} night={lerp(0.6, 8.6, P(t, 11.8))} scatter={1} caption="SCATTERED NIGHTS" sub="SOME MAY FOLLOW OTHER CUES · OTHERS MAY DRIFT OUT OF STEP · ILLUSTRATIVE" />
      </>
    )} />
  ) },
  { from: 274.9, to: 288.1, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="fgb_cloud" start={6} fx={0.5} move={{ s0: 1.04, s1: 1.14 }} grade={{ b: lerp(1, 0.7, P(t, 13)) }} />
        <Notes t={a} x={0.06} y={0.18} items={[{ text: "FEWER FERTILISED EGGS", at: 279.6 }, { text: "FEWER LARVAE", at: 282.8 }, { text: "FEWER NEW COLONIES", at: 283.9 }]} />
      </>
    )} />
  ) },
  { from: 288.0, to: 296.0, tag: "plausible", tagExtra: "ONE POSSIBLE FUTURE", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_pacific" start={0} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} />
        <Marker t={a} at={288.3} text="The first years" dur={4} />
        <Counter t={a} at={290.6} label="YEAR" value={lerp(1, 6, easeInOut(ramp(a, 290.5, 296)))} note="ILLUSTRATIVE" />
      </>
    )} />
  ) },
  { from: 295.9, to: 308.7, tag: "plausible", tagExtra: "ONE POSSIBLE FUTURE", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_bleached" start={0} fx={0.5} move={{ s0: 1.03, s1: 1.12 }} what="A DAMAGED, BLEACHED REEF · AMERICAN SAMOA" />
        <Counter t={a} at={296.0} label="YEAR" value={lerp(6, 15, easeInOut(ramp(a, 296, 305)))} note="ILLUSTRATIVE" />
        <Notes t={a} x={0.06} y={0.66} size={24} items={[{ text: "ALREADY UNDER PRESSURE:", at: 296.4, color: C.paperDim }, { text: "POLLUTION · WARMING SEAS", at: 297.4, color: C.paperDim }]} />
      </>
    )} />
  ) },
  { from: 308.6, to: 313.9, tag: "fact", tagExtra: "SHELTER · FOOD · NURSERY", el: () => <Footage id="reef_ledge" start={0} fx={0.5} move={{ s0: 1.03, s1: 1.12 }} /> },
  { from: 313.8, to: 319.1, tag: "fact", tagExtra: "SHELTER · FOOD · NURSERY", el: () => <Footage id="reef_tangs" start={4} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} /> },
  { from: 319.0, to: 327.9, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_sparse" start={2} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} />
        <Headline t={a} top={0.12} align="left" lines={[{ text: "FEWER PLACES TO GROW UP", at: 319.4, size: 64 }]} />
      </>
    )} />
  ) },
  { from: 327.8, to: 337.5, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Harbor t={a} cam={{ x: lerp(900, 1100, P(t, 9.7)), y: 860, w: lerp(2400, 2000, P(t, 9.7)) }} depart={0} />
        <Headline t={a} top={0.12} kicker="A FISHING COMMUNITY" kAt={331.8} lines={[]} />
      </>
    )} />
  ) },
  { from: 337.4, to: 342.0, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Harbor t={a} cam={{ x: 1250, y: 860, w: 2000 }} depart={P(t, 4.6) * 0.8} />} /> },
  { from: 341.9, to: 346.1, tag: "fiction", tagExtra: "THE PAST", el: (f) => <L from={f} render={(t, a) => <Haul t={a} cam={{ x: 1450, y: 820, w: 1900 }} haul={P(t, 3.2)} catchK={1} />} /> },
  { from: 346.0, to: 355.0, tag: "fiction", tagExtra: "ONE POSSIBLE FUTURE", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Haul t={a} cam={{ x: 1500, y: 820, w: 1800 }} haul={P(t, 5)} catchK={0.2} />
        <Marker t={a} at={346.2} text="The following decades" dur={4} top />
      </>
    )} />
  ) },
  { from: 354.9, to: 360.1, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Market t={a} cam={{ x: 1300, y: 850, w: 2400 }} abundance={0.28} customers={0.6} />} /> },
  { from: 360.0, to: 369.4, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Kitchen t={a} cam={{ x: 1180, y: 720, w: lerp(2300, 2000, P(t, 9.4)) }} talk={1} />} /> },
  { from: 369.3, to: 376.7, tag: "uncertain", tagExtra: "NOT EVERY REEF", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="reef_carib" start={8} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} />
        <Notes t={a} x={0.06} y={0.62} items={[{ text: "NOT EVERY REEF RESPONDS THE SAME", at: 369.6, color: "#c9a3e6" }, { text: "NOT EVERY POPULATION COLLAPSES", at: 371.3, color: "#c9a3e6" }, { text: "SOME SPECIES MIGHT ADAPT", at: 374.6, color: "#9fd4b8" }]} />
      </>
    )} />
  ) },
  { from: 376.6, to: 387.4, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, spin: 1 + a * 0.06, cam: { pos: [0.5, 0.8, lerp(4.6, 5.4, P(t, 10.8))], target: [0, 0, 0], fov: 40 }, sun: [1, 0.25, 0.3] })} />
        <Headline t={a} top={0.74} lines={[{ text: "NOT DISTRIBUTED EQUALLY", at: 383.4, size: 72 }]} />
      </>
    )} />
  ) },
  // ═════ NIGHTS ON LAND ═════
  { from: 387.3, to: 396.9, tag: "fact", tagExtra: "DARKER NIGHTS", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Lift><Wild t={a} cam={{ x: lerp(1000, 1500, P(t, 9.6)), y: 760, w: 2500 }} moon={0} fox={0} forage={0} /></Lift>
        <Marker t={a} at={387.6} text="Back on land" dur={4} top />
      </>
    )} />
  ) },
  { from: 396.8, to: 407.4, tag: "fact", tagExtra: "BEFORE · MOONLIT NIGHT", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Lift><Wild t={a} cam={{ x: 1300, y: 760, w: 2500 }} moon={1} fox={P(t, 10.6) * 0.5} forage={P(t, 6)} /></Lift>
        <Notes t={a} x={0.6} y={0.18} size={24} items={[{ text: "WHEN THEY HUNT", at: 401.5, color: "#9fd4b8" }, { text: "WHERE THEY TRAVEL", at: 402.7, color: "#9fd4b8" }, { text: "HOW THEY SPOT DANGER", at: 404.3, color: "#9fd4b8" }]} />
      </>
    )} />
  ) },
  { from: 407.3, to: 419.7, tag: "fact", tagExtra: "IT DEPENDS ON THE SPECIES", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Lift><Wild t={a} cam={{ x: lerp(1500, 1350, P(t, 12.4)), y: 960, w: 1400 }} moon={1} fox={lerp(0.3, 0.7, P(t, 12.4))} forage={lerp(0.3, 0.6, P(t, 6))} /></Lift>
        <Notes t={a} x={0.06} y={0.18} size={24} items={[{ text: "MOONLIGHT HELPS THE PREDATOR SEE", at: 411.0 }, { text: "…AND HELPS THE PREY SEE IT COMING", at: 415.2, color: "#9fd4b8" }]} />
      </>
    )} />
  ) },
  { from: 419.6, to: 428.9, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => <Lift><Wild t={a} cam={{ x: lerp(1600, 1450, P(t, 9.3)), y: 900, w: 1700 }} moon={1 - ramp(a, 423.2, 425.2)} fox={lerp(0.2, 0.6, P(t, 9.3))} forage={lerp(0, 0.6, P(t, 9.3))} /></Lift>} />
  ) },
  { from: 428.8, to: 431.6, inT: "cut", fadeIn: 0.2, tag: "plausible", tagExtra: "SOME PREDATORS", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="night_predator" start={0.3} fx={0.5} move={{ s0: 1.05, s1: 1.12 }} grade={{ c: 1.1 }} />
        <Notes t={a} x={0.06} y={0.16} size={24} items={[{ text: "SOME PREDATORS: NEW OPPORTUNITIES", at: 428.9 }]} />
      </>
    )} />
  ) },
  { from: 431.5, to: 438.3, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Lift><Wild t={a} cam={{ x: lerp(1450, 1300, P(t, 6.8)), y: 900, w: 1700 }} moon={0} fox={lerp(0.6, 1, P(t, 6.8))} forage={lerp(0.6, 1, P(t, 6.8))} /></Lift>
        <Notes t={a} x={0.06} y={0.16} size={24} items={[{ text: "SOME PREY: MORE VULNERABLE", at: 431.6 }, { text: "OTHERS: BETTER OFF IN THE DARK", at: 434.1, color: "#9fd4b8" }]} />
      </>
    )} />
  ) },
  { from: 438.2, to: 443.3, tag: "plausible", el: (f) => <L from={f} render={(t, a) => <Lift><Wild t={a} cam={{ x: 1300, y: lerp(760, 560, P(t, 5)), w: lerp(2000, 2600, P(t, 5)) }} moon={0} fox={1} forage={1} /></Lift>} /> },
  // ═════ THE DISTANT FUTURE ═════
  { from: 443.2, to: 455.5, tag: "fact", tagExtra: "THE MOON STEADIES EARTH'S TILT", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, cam: { pos: [1.2, 1.6, lerp(10, 8, P(t, 12.3))], target: [0.6, 0, 0], fov: 40 }, moon: ramp(a, 447.4, 449) * (1 - ramp(a, 452.5, 454)), moonAng: 0.7 + a * 0.02, moonDist: 3.6, orbit: 0.6, axis: ramp(a, 451.2, 452.5) })} />
        <Marker t={a} at={447.4} text="The distant future" dur={4.5} />
      </>
    )} />
  ) },
  { from: 455.4, to: 467.9, tag: "fact", tagExtra: "TILT ≈ 23.4°", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, cam: { pos: [0.2, 0.4, lerp(4.6, 4.0, P(t, 12.5))], target: [0, 0, 0], fov: 40 }, axis: 1, sun: [1, 0.05, 0.1] })} />
        <Headline t={a} top={0.12} align="left" kicker="THE TILT GIVES US SEASONS" kAt={457.2} lines={[{ text: "23.4°", at: 456.2, size: 110 }]} />
      </>
    )} />
  ) },
  { from: 467.8, to: 473.5, tag: "uncertain", tagExtra: "COMPUTER SIMULATIONS", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="jsc_screens" start={2} kind="archive" fx={0.5} move={{ s0: 1.04, s1: 1.12 }} />
        <Headline t={a} top={0.12} align="left" kicker="HYPOTHETICAL MOONLESS EARTHS" kAt={468.6} lines={[]} />
      </>
    )} />
  ) },
  { from: 473.4, to: 482.2, tag: "uncertain", tagExtra: "MODELS DISAGREE", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 40% 45%, #141a26 0%, #050608 78%)" }}>
        <ObliquityChart t={t + 5.6} reveal={P(t, 1.2)} models={ramp(a, 473.6, 475)} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 482.1, to: 486.6, tag: "uncertain", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #141a26 0%, #050608 78%)" }}>
        <Headline t={a} top={0.4} kicker="WHAT WE CAN'T HONESTLY PREDICT" kAt={482.2} lines={[{ text: "NO SUDDEN CLIMATE COLLAPSE", at: 483.0, size: 84 }]} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 486.5, to: 505.7, tag: "uncertain", tagExtra: "HUNDREDS OF THOUSANDS OF YEARS +", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, cam: { pos: [0.5, 1.2, lerp(5, 6.2, P(t, 19))], target: [0, 0.2, 0], fov: 40 }, axis: 1, cone: ramp(a, 493.4, 496), coneDeg: 22, tilt: 23.4 + Math.sin(t * 0.35) * 8 * ramp(a, 493.4, 497), sun: [1, 0.1, 0.4] })} />
        <Notes t={a} x={0.06} y={0.66} size={24} items={[{ text: "HOW SUNLIGHT IS SHARED OUT", at: 497.0, color: "#c9a3e6" }, { text: "THE CHARACTER OF THE SEASONS", at: 501.0, color: "#c9a3e6" }]} />
      </>
    )} />
  ) },
  // ═════ DECADES LATER ═════
  { from: 505.6, to: 516.1, tag: "fiction", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Bedroom t={a} cam={{ x: lerp(1250, 1350, P(t, 10.5)), y: 800, w: lerp(2300, 1800, easeInOut(P(t, 10.5))) }} moon={0} adult lamp={0.45} />
        <Marker t={a} at={508.9} text="Decades later" dur={5} />
      </>
    )} />
  ) },
  { from: 516.0, to: 520.4, tag: "fiction", tagExtra: "MEMORY", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ filter: "grayscale(0.7) contrast(1.05) brightness(0.85)" }}>
        <Town t={a + 30} cam={{ x: 1300, y: 920, w: 2400 }} moon={0} gather={1} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 520.3, to: 525.7, tag: "fiction", tagExtra: "MEMORY", el: (f) => (
    <L from={f} render={(t, a) => (
      <AbsoluteFill style={{ filter: "grayscale(0.7) contrast(1.05) brightness(0.85)" }}>
        <Bedroom t={a} cam={{ x: 1700, y: 600, w: 920 }} moon={1 - ramp(a, 522.5, 522.65)} mother={1} />
      </AbsoluteFill>
    )} />
  ) },
  { from: 525.6, to: 530.4, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Town t={a} cam={{ x: 1300, y: 900, w: 2300 }} moon={0} gather={1} dawn={1} commute />} /> },
  { from: 530.3, to: 532.2, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Harbor t={a} cam={{ x: 1100, y: 860, w: 2200 }} depart={lerp(0.2, 0.3, P(t, 1.9))} />} /> },
  { from: 532.1, to: 534.4, tag: "fiction", el: () => <Footage id="jsc_headset" start={1} kind="archive" fx={0.5} move={{ s0: 1.04, s1: 1.1 }} /> },
  { from: 534.3, to: 536.4, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Harbor t={a} cam={{ x: 1100, y: 860, w: 2200 }} depart={lerp(0.4, 0.6, P(t, 2.1))} />} /> },
  { from: 536.3, to: 543.7, tag: "plausible", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Footage id="ca_lowtide" start={4} fx={0.5} move={{ s0: 1.03, s1: 1.1 }} />
        <Headline t={a} top={0.12} kicker="A PLANET WITH DIFFERENT RHYTHMS" kAt={536.6} lines={[]} />
      </>
    )} />
  ) },
  { from: 543.6, to: 545.7, tag: "plausible", el: () => <Footage id="reef_bleached" start={18} fx={0.5} move={{ s0: 1.04, s1: 1.1 }} /> },
  { from: 545.6, to: 549.2, el: (f) => <L from={f} render={(t, a) => <Lift><Wild t={a} cam={{ x: 1300, y: 520, w: 2600 }} moon={0} fox={1} forage={1} /></Lift>} /> },
  { from: 549.1, to: 554.5, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Bedroom t={a} cam={{ x: lerp(1500, 1600, P(t, 5.4)), y: 700, w: lerp(1300, 1150, P(t, 5.4)) }} moon={0} adult lamp={0.35} planets={ramp(a, 551.7, 552.8)} />} /> },
  { from: 554.4, to: 560.1, tag: "plausible", el: (f) => <L from={f} render={(t) => <Footage id="fgb_cloud" start={20} fx={0.5} move={{ s0: 1.04, s1: 1.12 }} grade={{ b: 0.85 }} />} /> },
  { from: 560.0, to: 567.9, el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, cam: { pos: [1, 1.6, lerp(7, 11, easeOut(P(t, 7.9)))], target: [0.5, 0, 0], fov: 40 }, orbit: 0.6, moonDist: 3.6 })} />
        <Headline t={a} top={0.72} kicker="NOT DESTROYED" kAt={561} lines={[{ text: "CHANGED", at: 563, size: 96 }]} />
      </>
    )} />
  ) },
  { from: 567.8, to: 573.6, tag: "plausible", el: (f) => <L from={f} render={(t) => <Footage id="gr_run_pier" kind="photo" fx={0.5} fy={0.5} move={{ s0: 1.04, s1: 1.14 }} grade={{ b: 0.9 }} />} /> },
  { from: 573.5, to: 576.4, tag: "plausible", el: (f) => <L from={f} render={(t) => <Footage id="spawn_cloud" start={12} fx={0.5} move={{ s0: 1.04, s1: 1.1 }} grade={{ b: lerp(0.9, 0.55, P(t, 2.9)) }} />} /> },
  { from: 576.3, to: 579.9, tag: "fiction", el: (f) => <L from={f} render={(t, a) => <Kitchen t={a} cam={{ x: 1180, y: 720, w: 2000 }} talk={0.4} />} /> },
  { from: 579.8, to: 592.5, inT: "dip", el: (f) => (
    <L from={f} render={(t, a) => (
      <>
        <Globe res={RES} s={globe({ time: a, cam: { pos: [lerp(6.5, 4.8, easeInOut(P(t, 12.7))), 0.25, 0.6], target: [2.8, 0, 2.2], fov: 30 }, moon: 1, moonAng: 0.66, moonDist: 3.6, sun: [0.4, 0.15, 1] })} />
        <Headline t={a} top={0.74} lines={[{ text: "THE RHYTHMS OF LIFE", at: 586.8, size: 80 }]} />
      </>
    )} />
  ) },
  { from: 592.4, to: LONG_DURATION, fadeOut: 0.01, el: (f, to) => <L from={f} render={(t) => <FileSeal t={t} dur={to - f} mode="close" stampText="BONUS #001" />} /> },
];

export const LongV2: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Audio src={staticFile("audio/long.mp3")} />
    <Preload srcs={["moon/moon_disc.png"]} />
    {SHOTS.map((s, i) => (
      <Shot key={i} from={s.from} to={s.to} inT={s.inT} fadeIn={s.fadeIn ?? 0.45} fadeOut={s.fadeOut ?? 0.45}>
        {s.el(s.from, s.to)}
        {s.tag && <Tag kind={s.tag} extra={s.tagExtra} />}
      </Shot>
    ))}
    <LongBadgeV2 />
    <FilmLook grain={0.06} />
  </AbsoluteFill>
);
const LongBadgeV2: React.FC = () => {
  const t = useT();
  const show = ramp(t, 1.0, 2.0) * (1 - ramp(t, 57.8, 58.2)) + ramp(t, 62.2, 63) * (1 - ramp(t, LONG_DURATION - 5.2, LONG_DURATION - 4.8));
  return <SimBadge opacity={Math.min(1, show)} />;
};
