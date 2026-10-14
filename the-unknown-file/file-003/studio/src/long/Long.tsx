import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useVideoConfig } from "remotion";
import tokens from "../data/long.tokens.json";
import { makeCues } from "../lib/cues";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { size } from "../lib/assets";
import { useT } from "../lib/time";
import { Shot } from "../components/Shot";
import { FilmLook } from "../components/FilmLook";
import { Chapter, FileSeal } from "../components/Brand";
import { Rule } from "../components/Type";
import { CreditLine, Emph, InjuryCard, Shade, StrikeCounter, Tag, YearCard, BoltIcon } from "../components/UI";
import { Plate } from "../components/Storm";
import { Strike1 } from "../scenes/Strike1";
import { Strike2, Strike3, Strike4, Strike5, Strike6, Strike7, Vid } from "../scenes/Strikes";
import { AfterStorm, NPS_CREDIT, OpenStorm, RangerSilhouette, RoyPhoto, SevenReveal, Timeline7, VirginiaToPark, YearsPass } from "../scenes/Story";
import { BodyEffects, Factors, Mechanisms, Odds, StormPhysics, SurvivalStat, VehicleShell } from "../scenes/Science";

const { seq } = makeCues(tokens);
export const LONG_DURATION = 566.4;

const T = {
  struck0: seq("struck by lightning"), most: seq("For most people"), nowImagine: seq("Now imagine surviving"), again1: seq("happen again"), again2: seq("And again"),
  again3: seq("And again"), until: seq("Until one day"), seven: seq("Seven lightning strikes"), oneMan: seq("One man"), name: seq("His name was"),
  roy: seq("Roy Sullivan"), story: seq("and his story"), guinness: seq("Guinness World Records"), fileThree: seq("This is File 3"),
  begins: seq("Our story begins"), here: seq("Here, surrounded"), shen: seq("Shenandoah National Park"), forYears: seq("For years"),
  hisJob: seq("His job kept him"), roads: seq("remote roads"), weather: seq("and sometimes, dangerous weather"), y1942: seq("But in 1942"),
  thatDay: seq("That day"), turned: seq("The weather had turned"), struckTower: seq("Lightning struck the tower"), fled: seq("Roy fled"),
  struck1: seq("lightning struck him"), boltLeg: seq("The bolt hit"), toe: seq("big toe"), imagineShock: seq("Imagine the shock"),
  violent: seq("A violent electrical"), yet: seq("Yet somehow"), after: seq("And after that"), years: seq("Years passed"), y5: seq("5 years"),
  y10: seq("10 years"), y20: seq("20 years"), for27: seq("For 27 years"), perhaps: seq("Perhaps the first"), came69: seq("But then came 1969"),
  driving: seq("Roy was driving"), hit2: seq("hit him"), consequences: seq("This time, the consequences"), lost: seq("He lost consciousness"),
  eyebrows: seq("His eyebrows"), wrist: seq("wristwatch was destroyed"), second: seq("A second lightning"), interesting: seq("Now here's something"),
  windows: seq("windows are closed"), differentWays: seq("But lightning can injure"), accounts: seq("And accounts of"), noEvidence: seq("There is no reliable"),
  outdoors: seq("He was a man who"), remarkable: seq("But the number"), in1970: seq("Because in 1970"), garden: seq("Roy was in his garden"),
  struck3: seq("lightning struck. This"), shoulder: seq("left shoulder"), three: seq("Three strikes"), beginning: seq("And somehow, the story"),
  april: seq("On April 16th"), guard: seq("inside a guardhouse"), developed: seq("A storm developed"), fourth: seq("And lightning struck him for a fourth"),
  frightening: seq("But this incident"), hair4: seq("His hair caught fire"), imagineHair: seq("Imagine realizing"), extinguish: seq("Roy managed to extinguish"),
  repeated: seq("But repeated experiences"), fearful: seq("Roy reportedly became"), precautions: seq("According to accounts"), water: seq("He even started keeping water"),
  relevant: seq("And incredibly"), aug: seq("Because on August"), fifth: seq("lightning struck Roy Sullivan for the fifth"), account: seq("According to his account"),
  following: seq("He later described"), perception: seq("But that was his perception"), safe: seq("When Roy thought"), struck5: seq("lightning struck again"),
  legs: seq("His legs were injured"), hair5: seq("his hair caught fire. Five"), five: seq("Five strikes"), byNow: seq("By now"), names: seq("People began calling"),
  rod: seq("Human Lightning Rod"), spark: seq("Spark Ranger"), butForRoy: seq("But for Roy"), suffered: seq("He had suffered"), next: seq("The next incident"),
  walking: seq("Roy was walking outdoors"), struck6: seq("lightning struck him again"), ankle: seq("his ankle was injured"), hair6: seq("His hair was also"),
  number6: seq("It was strike number six"), obvious: seq("By this point"), alive: seq("How is this man"), harmless: seq("Because lightning isn't"),
  discharge: seq("It is an enormous"), nervous: seq("It can damage the nervous"), heart: seq("It can disrupt"), kill: seq("And in some circumstances"),
  dontKnow: seq("But here's something many"), nws: seq("According to the United States"), survive: seq("most people struck"), notSafe: seq("That doesn't mean"),
  survivors: seq("Survivors can experience"), depend: seq("The consequences depend"), direct: seq("through a direct strike"), ground: seq("spreads through the ground"),
  nearby: seq("jumps from a nearby object"), medical: seq("We do not have enough"), possible: seq("But surviving lightning is possible"),
  sevenRec: seq("Surviving seven recorded"), final: seq("And now we arrive"), june25: seq("June 25, 1977"), fishing: seq("Roy Sullivan was out fishing"),
  byThen: seq("By then"), yetDay: seq("And yet, on this"), struck7: seq("Lightning struck Roy for the seventh"), chest: seq("His chest and stomach"),
  another: seq("Another terrifying"), survival7: seq("And incredibly, another survival"), sevenTimes: seq("Seven times over"), fromTower: seq("From a fire lookout"),
  toTruck: seq("to a truck"), fromGarden: seq("From his garden"), guardhouse2: seq("a guardhouse"), walks: seq("From mountain walks"), fishingTrip: seq("a fishing trip"),
  several: seq("Lightning had struck Roy in several"), lived: seq("And he had lived"), whyHim: seq("But why him"), body: seq("Was there something unusual"),
  attracting: seq("Was he somehow attracting"), evidence: seq("The available evidence"), noBasis: seq("There is no scientific basis"), physical: seq("Lightning behaves according"),
  atmos: seq("Atmospheric electricity"), landscape: seq("The surrounding landscape"), objects: seq("Nearby objects"), paths: seq("And the paths"),
  outdoorWork: seq("Roy's outdoor work"), cannotCalc: seq("But we cannot calculate"), cannotProve: seq("And we cannot prove"), weKnow: seq("What we do know"),
  famous: seq("Roy Sullivan became internationally"), documented: seq("His story was documented"), recordNot: seq("The record was not"), personal: seq("It was for something far more"),
  mostStrikes: seq("The most lightning strikes"), seven2: seq("7. Roy's final"), never: seq("He was never recorded"), died: seq("He died in 1983"),
  remains: seq("And his extraordinary record"), maybe: seq("But maybe the most remarkable"), reminder: seq("It's the fact that"), worked: seq("He worked among"),
  spent: seq("He spent years"), sevenTimes2: seq("And seven times, those skies"), chosen: seq("The story almost sounds"), choose: seq("But nature doesn't need"),
  truth: seq("Sometimes, the truth"), outro: seq("7 lightning strikes. 35 years"), survivor: seq("One extraordinary survivor"), royEnd: seq("Roy Sullivan. This"), wasFile: seq("This was file 3"),
};

const ILL = "ILLUSTRATIVE RECONSTRUCTION";
const ARCH36 = "U.S. DEPT. OF THE INTERIOR / NPS · \"THE SHENANDOAH NATIONAL PARK\" (1936) · NATIONAL ARCHIVES 12482 · PUBLIC DOMAIN";
const USFS54 = "U.S. DEPARTMENT OF AGRICULTURE · \"STORY OF A FOREST RANGER\" (1954) · PRELINGER ARCHIVES · PUBLIC DOMAIN";
const BEACH = "\"LIGHTNING\" · BEACHFRONT PRODUCTIONS / JEFFREY BEACH · CC BY 3.0";
const PRICE = "\"APPROACHING THUNDERSTORM\" (SOUTHWEST VIRGINIA) · C. E. PRICE · PUBLIC DOMAIN";
const NOAA = "NOAA PHOTO LIBRARY / NSSL · PUBLIC DOMAIN";

// ── reusable long-form shots ───────────────────────────────────────────────────────────────
const Archive: React.FC<{ src: string; start?: number; rate?: number; tag: string; sub?: string; credit: string; filter?: string; scale?: number; fx?: number; fy?: number }> = ({ src, start = 0, rate = 1, tag, sub, credit, filter = "contrast(1.12) brightness(0.92)", scale = 1.05, fx, fy }) => {
  const t = useT();
  return (
    <>
      <Vid src={src} start={start} rate={rate} filter={filter} scale={scale + 0.03 * ramp(t, 0, 8)} fx={fx} fy={fy} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(3,4,6,0.7) 100%)" }} />
      <Tag t={t} text={tag} sub={sub} />
      <CreditLine t={t} text={credit} />
    </>
  );
};
const PhotoKB: React.FC<{ src: string; tag?: string; sub?: string; credit?: string; from?: [number, number, number]; to?: [number, number, number]; look?: { exp?: number; sat?: number; con?: number; mono?: boolean }; tint?: string; dur: number }> = ({ src, tag, sub, credit, from = [0.5, 0.5, 1.04], to = [0.52, 0.5, 1.14], look = {}, tint, dur }) => {
  const t = useT();
  const p = easeInOut(clamp(t / dur));
  const [iw, ih] = size(src);
  return (
    <>
      <Plate src={src} iw={iw} ih={ih} cam={{ fx: lerp(from[0], to[0], p), fy: lerp(from[1], to[1], p), k: lerp(from[2], to[2], p) }} f={0} look={{ exp: look.exp ?? 0.82, sat: look.sat ?? 0.7, con: look.con ?? 1.08, mono: look.mono }} />
      {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light", opacity: 0.5 }} />}
      {tag && <Tag t={t} text={tag} sub={sub} />}
      {credit && <CreditLine t={t} text={credit} />}
    </>
  );
};
/** real lightning photographs flashed in over darkness, one per cue */
const PhotoFlashes: React.FC<{ items: { src: string; at: number; fx?: number }[] }> = ({ items }) => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: "#020305" }}>
      {items.map((it, i) => {
        const d = t - it.at;
        if (d < -0.05 || (items[i + 1] && t > items[i + 1].at)) return null;
        const fl = d < 0 ? 0 : Math.max(Math.exp(-d / 0.05), 0.55 * Math.exp(-d / 1.2)) + (d > 0.07 && d < 0.13 ? 0.5 : 0);
        const [iw, ih] = size(it.src);
        return <Plate key={i} src={it.src} iw={iw} ih={ih} cam={{ fx: it.fx ?? 0.5, fy: 0.5, k: 1.05 + 0.04 * d }} f={0} look={{ exp: 0.15 + 1.0 * clamp(fl), sat: 0.6, con: 1.1 }} />;
      })}
      <Tag t={t} text="REAL LIGHTNING PHOTOGRAPHS" sub="NOT FROM ROY SULLIVAN'S STORMS" />
      <CreditLine t={t} text={NOAA} />
    </AbsoluteFill>
  );
};
const Statement: React.FC<{ lines: string[]; at?: number[]; bg?: React.ReactNode; size?: number; sub?: string; subAt?: number }> = ({ lines, at = [0.3], bg, size: fs = 76, sub, subAt = 1.5 }) => {
  const t = useT();
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  return (
    <AbsoluteFill style={{ background: "#030405" }}>
      {bg}
      <Shade k={bg ? 0.75 : 0} side="full" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", padding: `0 ${160 * u}px` }}>
        {lines.map((l, i) => {
          const a = ramp(t, at[i] ?? at[0] + i * 0.6, (at[i] ?? at[0] + i * 0.6) + 0.7, easeOut);
          return <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: fs * u, color: "#fff", textAlign: "center", lineHeight: 1.12, opacity: a, transform: `translateY(${(1 - a) * 18 * u}px)`, filter: a < 1 ? `blur(${(1 - a) * 10 * u}px)` : undefined, marginBottom: 18 * u }}>{l}</div>;
        })}
        {sub && <><Rule t={t} at={subAt - 0.2} width={520} center style={{ margin: `${26 * u}px 0` }} /><div style={{ fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.22em", color: C.paperDim, opacity: ramp(t, subAt, subAt + 0.6), textAlign: "center" }}>{sub}</div></>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const Nicknames: React.FC<{ rodAt: number; sparkAt: number }> = ({ rodAt, sparkAt }) => {
  const t = useT();
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const card = (text: string, at: number, x: number, y: number, rot: number) => {
    const a = ramp(t, at, at + 0.5, easeOut);
    return (
      <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${1.15 - 0.15 * a})`, opacity: a, background: "#e9e3d6", padding: `${22 * u}px ${36 * u}px`, boxShadow: `0 ${20 * u}px ${60 * u}px rgba(0,0,0,0.6)` }}>
        <div style={{ fontFamily: F.mono, fontSize: 16 * u, letterSpacing: "0.2em", color: "#7a2a30" }}>NICKNAME</div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 88 * u, color: "#16130f", lineHeight: 1.05 }}>“{text}”</div>
      </div>
    );
  };
  return (
    <>
      <RoyPhoto t={t} dur={12} mode="full" label={false} grade={0.4} />
      <Shade k={0.5} side="right" />
      {card("The Human Lightning Rod", rodAt, W * 0.06, H * 0.2, -3)}
      {card("The Spark Ranger", sparkAt, W * 0.14, H * 0.55, 2)}
      <CreditLine t={t} text={NPS_CREDIT} />
    </>
  );
};
const RecordCard: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const a = ramp(t, at, at + 0.8, easeOut);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #18202b 0%, #050608 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ border: `${2 * u}px solid rgba(236,230,218,0.5)`, padding: `${60 * u}px ${110 * u}px`, textAlign: "center", opacity: a, transform: `scale(${1.04 - 0.04 * a})` }}>
        <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.32em", color: C.burgundyHi }}>GUINNESS WORLD RECORDS · RECORD TITLE</div>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 92 * u, color: "#fff", lineHeight: 1.05, marginTop: 30 * u }}>MOST LIGHTNING STRIKES<br />SURVIVED</div>
        <Rule t={t} at={at + 0.5} width={620} center style={{ margin: `${34 * u}px auto` }} />
        <div style={{ fontFamily: F.mono, fontSize: 30 * u, letterSpacing: "0.24em", color: C.paper, opacity: ramp(t, at + 0.8, at + 1.3) }}>ROY C. SULLIVAN (USA) · 7 STRIKES · 1942–1977</div>
      </div>
      <div style={{ position: "absolute", bottom: 46 * u, left: 72 * u, fontFamily: F.mono, fontSize: 12 * u, letterSpacing: "0.12em", color: "rgba(236,230,218,0.55)" }}>SOURCE: GUINNESS WORLD RECORDS · TEXT CARD (NO GUINNESS MATERIAL REPRODUCED)</div>
    </AbsoluteFill>
  );
};
const Memorial: React.FC = () => {
  const t = useT();
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  return (
    <>
      <RoyPhoto t={t} dur={8} mode="full" label={false} grade={0.6} />
      <Shade k={0.8} side="left" />
      <div style={{ position: "absolute", left: 110 * u, top: H * 0.4, opacity: ramp(t, 0.4, 1.2) }}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 84 * u, color: "#fff" }}>ROY C. SULLIVAN</div>
        <div style={{ fontFamily: F.mono, fontSize: 34 * u, letterSpacing: "0.3em", color: C.paper, marginTop: 14 * u }}>1912 – 1983</div>
        <div style={{ fontFamily: F.mono, fontSize: 18 * u, letterSpacing: "0.18em", color: C.paperDim, marginTop: 26 * u, opacity: ramp(t, 1.2, 1.8) }}>HE DIED AT 71, OF CAUSES UNRELATED TO LIGHTNING</div>
      </div>
      <CreditLine t={t} text={NPS_CREDIT} />
    </>
  );
};

// ── the edit ────────────────────────────────────────────────────────────────────────────────
type Sh = { from: number; to: number; c: React.FC; inT?: "fade" | "blur" | "cut" | "dip" | "push"; outT?: "fade" | "blur" | "cut" | "dip" | "push"; fi?: number; fo?: number };
const lc = (abs: number, from: number) => abs - from;
const mk = (from: number, to: number, render: (t: number, d: number) => React.ReactNode, o: Partial<Sh> = {}): Sh => ({
  from, to, c: () => { const t = useT(); return <>{render(t, to - from)}</>; }, ...o,
});
const counter = (n: number, at = 0) => <StrikeCounter t={useT()} n={n} at={at} />;

const SHOTS: Sh[] = [
  mk(0, T.most - 0.15, (t) => <><OpenStorm t={t} strikeAt={lc(T.struck0, 0) + 0.25} /><Tag t={t} text="VIRGINIA · BLUE RIDGE MOUNTAINS" sub="STORM: ILLUSTRATIVE" /></>, { fi: 0, outT: "cut" }),
  mk(T.most - 0.15, T.nowImagine - 0.2, (t) => <Archive src="bf_lightning" start={4} tag="REAL LIGHTNING FOOTAGE" sub="NOT FROM ROY SULLIVAN'S STORMS" credit={BEACH} filter="contrast(1.1) saturate(0.8)" />, { inT: "cut" }),
  mk(T.nowImagine - 0.2, T.again1 - 0.6, (t) => <><RangerSilhouette t={t} strikeAt={0.5} /><Tag t={t} text={ILL} /></>),
  mk(T.again1 - 0.6, T.until - 0.2, () => <PhotoFlashes items={[
    { src: "photos/bolt_noaa_clark.jpg", at: 0.6 }, { src: "photos/bolt_noaa_norman.jpg", at: lc(T.again2, T.again1 - 0.6) }, { src: "photos/noaa_night_thunderstorm_1978.jpg", at: lc(T.again3, T.again1 - 0.6) }]} />, { inT: "cut", outT: "cut" }),
  mk(T.until - 0.2, T.seven - 0.3, (t) => <Archive src="price_timelapse" start={8} rate={0.6} tag="REAL FOOTAGE · THUNDERSTORM OVER SW VIRGINIA" credit={PRICE} filter="grayscale(0.5) contrast(1.15) brightness(0.75)" />, { inT: "cut" }),
  mk(T.seven - 0.3, T.oneMan - 0.1, (t, d) => <SevenReveal t={t} at={0.15} dur={d - 0.6} />),
  mk(T.oneMan - 0.1, T.guinness - 1.0, (t, d) => <RoyPhoto t={t} dur={d} name years nameAt={lc(T.roy, T.oneMan - 0.1)} />, { fi: 0.8 }),
  mk(T.guinness - 1.0, T.fileThree - 0.2, (t) => <><RoyPhoto t={t} dur={4} mode="hat" /><Shade k={0.7} side="left" /><Emph t={t} text="GUINNESS WORLD RECORDS" at={0.7} y={0.42} size={84} /></>),
  mk(T.fileThree - 0.2, T.begins - 0.1, (t, d) => <FileSeal t={t} dur={d} mode="open" />, { inT: "dip" }),
  mk(T.begins - 0.1, T.forYears - 0.2, (t, d) => <><VirginiaToPark t={t} dur={d} zoomAt={lc(T.shen, T.begins - 0.1) - 0.8} /><Chapter t={t} n={1} title="The Ranger" top /></>),
  mk(T.forYears - 0.2, T.hisJob - 0.1, () => <Archive src="arch_entrance" start={0} tag="ARCHIVE FOOTAGE · SHENANDOAH NATIONAL PARK, 1936" sub="THORNTON GAP ENTRANCE · ROY BEGAN AS A RANGER IN THE 1930s" credit={ARCH36} />),
  mk(T.hisJob - 0.1, T.roads - 0.3, (t, d) => <PhotoKB src="photos/shen_foggy_forest.jpg" dur={d} tag="SHENANDOAH NATIONAL PARK · TODAY" credit="PHOTO: NPS / SHENANDOAH NATIONAL PARK · PUBLIC DOMAIN" from={[0.5, 0.5, 1.02]} to={[0.5, 0.42, 1.12]} />),
  mk(T.roads - 0.3, T.weather - 0.1, () => <Archive src="arch_tunnel" start={1} tag="ARCHIVE FOOTAGE · SKYLINE DRIVE, 1936" sub="MARYS ROCK TUNNEL" credit={ARCH36} />),
  mk(T.weather - 0.1, T.y1942 - 0.2, () => <Archive src="price_timelapse" start={20} rate={0.8} tag="REAL FOOTAGE · THUNDERSTORM OVER SW VIRGINIA" credit={PRICE} filter="grayscale(0.4) contrast(1.15) brightness(0.8)" />),
  mk(T.y1942 - 0.2, T.thatDay - 0.1, (t) => <><Strike1 t={t} shot="wide" strikeAt={50} /><YearCard t={t} year="1942" label="SHENANDOAH NATIONAL PARK" at={0.3} pos="center" /><Chapter t={t} n={2} title="The First Strike" top /></>),
  mk(T.thatDay - 0.1, T.turned - 0.3, () => <Archive src="usfs_lookout" start={1} tag="ARCHIVE FOOTAGE · A FIRE LOOKOUT CAB, 1954" sub="U.S. FOREST SERVICE FILM — NOT ROY SULLIVAN" credit={USFS54} />),
  mk(T.turned - 0.3, T.fled - 0.15, (t) => <><Strike1 t={t} shot="wide" strikeAt={lc(T.struckTower, T.turned - 0.3) + 0.15} /><Tag t={t} text={ILL} sub="NOT THE ACTUAL 1942 TOWER" />{counter(1, lc(T.struckTower, T.turned - 0.3))}</>),
  mk(T.fled - 0.15, T.boltLeg - 0.1, (t) => <><Strike1 t={t} shot="run" legAt={lc(T.struck1, T.fled - 0.15) + 0.6} /><Tag t={t} text={ILL} />{counter(1)}</>, { inT: "cut" }),
  mk(T.boltLeg - 0.1, T.imagineShock - 0.2, (t) => <><Strike1 t={t + 8} shot="wide" strikeAt={-10} /><Shade k={0.85} side="right" /><InjuryCard t={t} zones={["rightLeg", "bigToe"]} lines={["RIGHT LEG BURNED", "BIG TOENAIL LOST"]} year="APRIL 1942" strike={1} at={0.2} />{counter(1)}</>),
  mk(T.imagineShock - 0.2, T.yet - 0.2, () => <Archive src="bf_lightning" start={2} rate={0.8} tag="REAL LIGHTNING FOOTAGE" sub="NOT FROM ROY SULLIVAN'S STORMS" credit={BEACH} filter="brightness(1.5) contrast(1.1) saturate(0.7)" />),
  mk(T.yet - 0.2, T.after - 0.2, (t) => <Statement lines={["YET SOMEHOW,", "ROY SURVIVED."]} at={[0.2, 0.9]} bg={<Strike1 t={t + 9} shot="wide" strikeAt={-10} />} />),
  mk(T.after - 0.2, T.perhaps - 0.3, (t, d) => <><YearsPass t={t} from={1942} to={1969} dur={d} label="YEARS PASS" /><Chapter t={t} n={3} title="27 Years Later" top /></>),
  mk(T.perhaps - 0.3, T.came69 - 0.1, (t, d) => <RoyPhoto t={t} dur={d} mode="face" grade={0.2} />),
  mk(T.came69 - 0.1, T.consequences - 0.3, (t) => <><Strike2 t={t} shot="road" strikeAt={lc(T.hit2, T.came69 - 0.1) - 0.1} /><Tag t={t} text={ILL} sub="PERIOD PICKUP · NOT ROY'S TRUCK" /><YearCard t={t} year="1969" label="SECOND STRIKE" at={0.4} out={3.4} />{counter(2, lc(T.hit2, T.came69 - 0.1) - 0.2)}</>),
  mk(T.consequences - 0.3, T.eyebrows - 0.1, (t) => <><Strike2 t={t} shot="cab" strikeAt={lc(T.lost, T.consequences - 0.3) - 0.4} /><Tag t={t} text={ILL} />{counter(2)}</>, { inT: "cut" }),
  mk(T.eyebrows - 0.1, T.second - 0.2, (t) => <><AbsoluteFill style={{ transform: "translateX(-14%)" }}><Strike2 t={t} shot="watch" /></AbsoluteFill><InjuryCard t={t} zones={["eyebrows", "wrist"]} lines={["LOST CONSCIOUSNESS", "EYEBROWS BURNED", "WRISTWATCH DESTROYED"]} year="JULY 1969" strike={2} at={0.2} /><Tag t={t} text="ILLUSTRATIVE · PERIOD WATCH" />{counter(2)}</>, { fi: 0.6 }),
  mk(T.second - 0.2, T.interesting - 0.2, (t) => <Timeline7 t={t} at={0.3} step={0.3} highlight={1} title="27 YEARS APART" />),
  mk(T.interesting - 0.2, T.accounts - 0.2, (t) => <VehicleShell t={t} strikeAt={lc(T.windows, T.interesting - 0.2) - 1.5} noteAt={lc(T.differentWays, T.interesting - 0.2)} />),
  mk(T.accounts - 0.2, T.noEvidence - 0.2, (t) => <><Strike2 t={t + 4} shot="road" strikeAt={-3} drive={4} /><Tag t={t} text={ILL} sub="ACCOUNTS DIFFER ON THE DETAILS" /></>),
  mk(T.noEvidence - 0.2, T.outdoors - 0.1, () => <Statement lines={["NO RELIABLE EVIDENCE", "THAT LIGHTNING WAS ATTRACTED TO ROY"]} at={[0.2, 0.8]} size={70} bg={<Vid src="price_timelapse" start={30} filter="grayscale(0.7) brightness(0.6)" />} />),
  mk(T.outdoors - 0.1, T.remarkable - 0.1, () => <Archive src="usfs_trucks" start={4} tag="ARCHIVE FOOTAGE · RANGERS ON PATROL, 1954" sub="U.S. FOREST SERVICE FILM — NOT ROY SULLIVAN" credit={USFS54} />),
  mk(T.remarkable - 0.1, T.in1970 - 0.1, () => <Archive src="arch_road_curve" start={2} tag="ARCHIVE FOOTAGE · SKYLINE DRIVE, 1936" credit={ARCH36} />),
  mk(T.in1970 - 0.1, T.beginning - 0.1, (t) => { const at = lc(T.struck3, T.in1970 - 0.1) + 0.2; return <><Strike3 t={t} strikeAt={at} /><Tag t={t} text={ILL} sub="STRIKE HIT A NEARBY TRANSFORMER (REPORTED)" /><YearCard t={t} year="1970" label="THIRD STRIKE" at={0.3} out={at - 0.4} />{counter(3, at - 0.3)}<InjuryCard t={t} zones={["leftShoulder"]} lines={["LEFT SHOULDER", "BURNED"]} year="JULY 1970" strike={3} at={lc(T.shoulder, T.in1970 - 0.1) - 0.4} scale={0.8} /><Emph t={t} text="THREE STRIKES. THREE SURVIVALS." at={lc(T.three, T.in1970 - 0.1)} y={0.8} size={60} /><Chapter t={t} n={4} title="It Happened Again" top /></>; }, { fi: 0.5 }),
  mk(T.beginning - 0.1, T.april - 0.15, (t) => <Archive src="arch_trees" start={3} tag="ARCHIVE FOOTAGE · SHENANDOAH, 1936" credit={ARCH36} />),
  mk(T.april - 0.15, T.frightening - 0.1, (t) => { const at = lc(T.fourth, T.april - 0.15) + 0.6; return <><Strike4 t={t} strikeAt={at} outAt={99} /><Tag t={t} text={ILL} sub="INSIDE A GUARDHOUSE" /><YearCard t={t} year="1972" label="16 APRIL" kicker="FOURTH STRIKE" at={0.4} out={at - 0.6} pos="center" />{counter(4, at - 0.3)}</>; }),
  mk(T.frightening - 0.1, T.extinguish - 0.1, (t) => <><Strike4 t={t + 4} strikeAt={-1} outAt={99} tight /><Tag t={t} text={ILL} /><Emph t={t} text="HIS HAIR CAUGHT FIRE" at={lc(T.hair4, T.frightening - 0.1)} y={0.8} size={72} />{counter(4)}</>, { inT: "cut" }),
  mk(T.extinguish - 0.1, T.repeated - 0.1, (t, d) => <><Strike4 t={t + 8} strikeAt={-1} outAt={9.5} /><Tag t={t} text={ILL} /><Emph t={t} text="HE PUT OUT THE FLAMES — AND SURVIVED" at={0.6} y={0.82} size={56} />{counter(4)}</>, { inT: "cut" }),
  mk(T.repeated - 0.1, T.precautions - 0.2, (t, d) => <RoyPhoto t={t} dur={d} mode="face" grade={0.35} />, { fi: 0.6 }),
  mk(T.precautions - 0.2, T.relevant - 0.2, () => <><Archive src="carport_window" start={3} tag="REAL FOOTAGE · A NIGHT STORM THROUGH A WINDOW" sub="ILLUSTRATIVE — NOT ROY'S HOME" credit={"\"THUNDERSTORM\" · THE CARPORT THEATRE · CC BY 4.0"} filter="brightness(2.4) contrast(1.05)" /><Emph t={useT()} text="HE KEPT WATER NEARBY" at={lc(T.water, T.precautions - 0.2) + 0.2} y={0.7} size={70} /></>),
  mk(T.relevant - 0.2, T.account - 0.2, (t) => <><Strike5 t={t} shot="cloud" /><YearCard t={t} year="1973" label="7 AUGUST" kicker="FIFTH STRIKE" at={lc(T.aug, T.relevant - 0.2) + 0.3} pos="center" /><CreditLine t={t} text={PRICE} /></>),
  mk(T.account - 0.2, T.safe - 0.2, (t) => <><Strike5 t={t + 1} shot="cloud" /><Tag t={t} text="REAL FOOTAGE · TIME-LAPSE" /><Emph t={t} text="“A STORM CLOUD SEEMED TO BE FOLLOWING HIM”" at={lc(T.following, T.account - 0.2) + 0.6} y={0.3} size={54} serif /><Emph t={t} text="HIS PERCEPTION — NOT EVIDENCE OF ANYTHING SUPERNATURAL" at={lc(T.perception, T.account - 0.2)} y={0.72} size={40} color={C.paper} /><CreditLine t={t} text={PRICE} /></>),
  mk(T.safe - 0.2, T.byNow - 0.2, (t) => { const at = lc(T.struck5, T.safe - 0.2) + 0.4; return <><Strike5 t={t} shot="strike" strikeAt={at} /><Tag t={t} text={ILL} sub="ON PATROL · SHENANDOAH" />{counter(5, at - 0.3)}<Emph t={t} text="HAIR ON FIRE — AGAIN" at={lc(T.hair5, T.safe - 0.2) - 0.5} y={0.8} size={72} color="#ffd9a8" /><InjuryCard t={t} zones={["legs", "hair"]} lines={["LEGS INJURED", "HAIR ON FIRE AGAIN"]} year="7 AUGUST 1973" strike={5} at={lc(T.legs, T.safe - 0.2) - 0.3} scale={0.8} out={lc(T.hair5, T.safe - 0.2) - 0.6} /><Emph t={t} text="FIVE STRIKES. THE SAME MAN." at={lc(T.five, T.safe - 0.2)} y={0.12} size={56} /></>; }),
  mk(T.byNow - 0.2, T.next - 0.2, (t) => <Nicknames rodAt={lc(T.rod, T.byNow - 0.2) - 0.3} sparkAt={lc(T.spark, T.byNow - 0.2) - 0.3} />),
  mk(T.next - 0.2, T.obvious - 0.2, (t) => { const at = lc(T.struck6, T.next - 0.2) + 0.2; return <><Strike6 t={t} strikeAt={at} /><Tag t={t} text={ILL} sub="WALKING OUTDOORS" /><YearCard t={t} year="1976" label="SIXTH STRIKE" at={0.4} out={at - 0.4} pos="center" />{counter(6, at - 0.3)}<InjuryCard t={t} zones={["ankle", "hair"]} lines={["ANKLE INJURED", "HAIR BURNED AGAIN (REPORTED)"]} year="JUNE 1976" strike={6} at={lc(T.ankle, T.next - 0.2) - 0.3} scale={0.8} /></>; }),
  mk(T.obvious - 0.2, T.discharge - 0.2, (t) => <><StormPhysics t={t} leaderAt={1.5} strokeAt={lc(T.harmless, T.obvious - 0.2) + 1.2} /><Chapter t={t} n={5} title="How Is He Still Alive?" top /></>, { inT: "dip" }),
  mk(T.discharge - 0.2, T.dontKnow - 0.2, (t) => <BodyEffects t={t} nerveAt={lc(T.nervous, T.discharge - 0.2)} heartAt={lc(T.heart, T.discharge - 0.2)} killAt={lc(T.kill, T.discharge - 0.2)} />),
  mk(T.dontKnow - 0.2, T.direct - 1.2, (t) => <SurvivalStat t={t} at={lc(T.survive, T.dontKnow - 0.2) - 0.8} caveatAt={lc(T.survivors, T.dontKnow - 0.2)} />),
  mk(T.direct - 1.2, T.medical - 0.2, (t) => <Mechanisms t={t} at={[lc(T.direct, T.direct - 1.2) - 0.6, lc(T.ground, T.direct - 1.2) - 0.8, lc(T.nearby, T.direct - 1.2) - 1.3]} />),
  mk(T.medical - 0.2, T.final - 0.2, () => <Statement lines={["WHY ROY SURVIVED EACH STRIKE", "CANNOT BE EXPLAINED PRECISELY"]} at={[0.3, 0.9]} size={64} sub="SURVIVING LIGHTNING IS POSSIBLE · SURVIVING SEVEN RECORDED STRIKES IS EXTRAORDINARY" subAt={lc(T.possible, T.medical - 0.2)} bg={<Vid src="bf_lightning" start={30} filter="brightness(0.6) grayscale(0.4)" />} />),
  mk(T.final - 0.2, T.struck7 - 0.1 + 6, (t) => { const at = lc(T.struck7, T.final - 0.2) + 0.4; return <><Strike7 t={t} strikeAt={at} /><Tag t={t} text={ILL} sub="FISHING · EXACT LOCATION NOT RECORDED" /><YearCard t={t} year="1977" label="25 JUNE" kicker="THE SEVENTH STRIKE" at={lc(T.june25, T.final - 0.2)} out={lc(T.byThen, T.final - 0.2)} pos="center" /><Emph t={t} text="SIX STRIKES IN 34 YEARS" at={lc(T.byThen, T.final - 0.2) + 0.5} out={lc(T.yetDay, T.final - 0.2) + 1.2} y={0.15} size={50} /><StrikeCounter t={t} n={7} at={at - 0.3} big /><Chapter t={t} n={6} title="The Final Encounter" top /></>; }, { fi: 0.6, outT: "cut" }),
  mk(T.struck7 - 0.1 + 6, T.sevenTimes - 0.3, (t) => <><AbsoluteFill style={{ opacity: ramp(t, 0, 1) }}><Strike7 t={t + 12} strikeAt={-5} /></AbsoluteFill><Shade k={0.85} side="right" /><InjuryCard t={t} zones={["chest", "stomach"]} lines={["CHEST BURNED", "STOMACH BURNED", "HE SURVIVED"]} year="25 JUNE 1977" strike={7} at={0.2} /><StrikeCounter t={t} n={7} big /></>, { inT: "cut" }),
  mk(T.sevenTimes - 0.3, T.whyHim - 0.2, (t) => {
    const hl = t < lc(T.toTruck, T.sevenTimes - 0.3) ? 0 : t < lc(T.fromGarden, T.sevenTimes - 0.3) ? 1 : t < lc(T.guardhouse2, T.sevenTimes - 0.3) ? 2 : t < lc(T.walks, T.sevenTimes - 0.3) ? 3 : t < lc(T.fishingTrip, T.sevenTimes - 0.3) ? 5 : t < lc(T.several, T.sevenTimes - 0.3) ? 6 : -1;
    return <Timeline7 t={t} at={0.3} step={0.25} highlight={hl} title="SEVEN TIMES · 35 YEARS" sub="HE LIVED THROUGH EVERY RECORDED ENCOUNTER" />;
  }),
  mk(T.whyHim - 0.2, T.physical - 0.2, (t) => <><RoyPhoto t={t} dur={15} mode="face" grade={0.4} /><Shade k={0.6} side="left" /><Emph t={t} text="WHY HIM?" at={0.2} out={lc(T.evidence, T.whyHim - 0.2) - 0.3} y={0.4} size={120} /><Emph t={t} text="NO SCIENTIFIC BASIS FOR “TARGETING”" at={lc(T.noBasis, T.whyHim - 0.2)} y={0.45} size={64} /><Chapter t={t} n={7} title="Why Him?" top /></>),
  mk(T.physical - 0.2, T.outdoorWork - 0.2, (t) => <Factors t={t} at={[lc(T.atmos, T.physical - 0.2) - 0.2, lc(T.landscape, T.physical - 0.2) - 0.2, lc(T.objects, T.physical - 0.2) - 0.2, lc(T.paths, T.physical - 0.2) - 0.2]} />),
  mk(T.outdoorWork - 0.2, T.weKnow - 0.2, (t) => <Odds t={t} />),
  mk(T.weKnow - 0.2, T.recordNot - 0.2, (t, d) => <><RoyPhoto t={t} dur={d} mode="hat" /><Shade k={0.7} side="left" /><Emph t={t} text="RECOGNIZED BY GUINNESS WORLD RECORDS" at={lc(T.documented, T.weKnow - 0.2) + 0.5} y={0.42} size={64} /><Chapter t={t} n={8} title="The Record" top /></>),
  mk(T.recordNot - 0.2, T.seven2 - 0.3, (t) => <RecordCard at={lc(T.mostStrikes, T.recordNot - 0.2) - 0.6} />),
  mk(T.seven2 - 0.3, T.died - 0.2, (t, d) => <><SevenReveal t={t} at={0.1} dur={1.2} /><Emph t={t} text="NEVER RECORDED BEING STRUCK AGAIN" at={lc(T.never, T.seven2 - 0.3)} y={0.8} size={52} /></>),
  mk(T.died - 0.2, T.remains - 0.1, () => <Memorial />, { fi: 0.8 }),
  mk(T.remains - 0.1, T.reminder - 0.2, (t, d) => <AfterStorm t={t} src="photos/shen_fog_ocean.jpg" />, { fi: 0.8 }),
  mk(T.reminder - 0.2, T.worked - 0.2, () => <Archive src="arch_valley" tag="ARCHIVE FOOTAGE · SHENANDOAH VALLEY, 1936" credit={ARCH36} />),
  mk(T.worked - 0.2, T.spent - 0.2, (t, d) => <PhotoKB src="photos/shen_old_rag_summit.jpg" dur={d} tag="SHENANDOAH NATIONAL PARK · TODAY" credit="PHOTO: NPS / SHENANDOAH NATIONAL PARK · PUBLIC DOMAIN" />),
  mk(T.spent - 0.2, T.sevenTimes2 - 0.2, (t, d) => <PhotoKB src="photos/shen_range_view.jpg" dur={d} credit="PHOTO: NPS / SHENANDOAH NATIONAL PARK · PUBLIC DOMAIN" from={[0.4, 0.5, 1.12]} to={[0.6, 0.5, 1.04]} />),
  mk(T.sevenTimes2 - 0.2, T.chosen - 0.2, (t) => <><OpenStorm t={t} strikeAt={2.3} /><Tag t={t} text="STORM: ILLUSTRATIVE" /></>),
  mk(T.chosen - 0.2, T.truth - 0.2, (t) => <><RangerSilhouette t={t} strikeAt={3} /><Tag t={t} text={ILL} /></>),
  mk(T.truth - 0.2, T.outro - 0.2, (t, d) => <><AfterStorm t={t} src="photos/shen_sun_clouds.jpg" /><Emph t={t} text="SOMETIMES, THE TRUTH IS STRANGE ENOUGH ON ITS OWN." at={0.4} y={0.72} size={54} serif /></>, { fi: 0.8 }),
  mk(T.outro - 0.2, T.wasFile - 0.2, (t, d) => <RoyPhoto t={t} dur={d} name years nameAt={lc(T.royEnd, T.outro - 0.2) - 0.3} />, { fi: 0.6 }),
  mk(T.wasFile - 0.2, LONG_DURATION, (t, d) => <FileSeal t={t} dur={d} mode="close" />, { fo: 0 }),
];

export const Long: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Audio src={staticFile("audio/long.mp3")} />
    {SHOTS.map((s, i) => (
      <Shot key={i} from={s.from} to={s.to} inT={s.inT ?? "fade"} outT={s.outT ?? "fade"} fadeIn={s.fi ?? 0.45} fadeOut={s.fo ?? 0.45}><s.c /></Shot>
    ))}
    <FilmLook />
  </AbsoluteFill>
);

export const SHOT_LIST = SHOTS.map((s) => [s.from, s.to]);
export { Img, staticFile, BoltIcon, easeOut };
