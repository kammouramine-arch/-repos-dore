import React from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import tokens from "../data/long.tokens.json";
import { makeCues } from "../lib/cues";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, keys, lerp, ramp } from "../lib/anim";
import { Shot, useShot } from "../components/Shot";
import { FilmLook } from "../components/FilmLook";
import { Kicker, Reveal, Stat, IllustrationTag, Credit, useU } from "../components/Type";
import { GeoMap, MONOUN, NYOS } from "../components/GeoMap";
import { CrossSection, LAKE as XL } from "../components/CrossSection";
import { Village } from "../components/Village";
import { PhotoFull, PhotoPrint } from "../components/Photo";
import { Chapter, DotField, FileSeal } from "../components/Brand";
import { TerrainShot, villageP, LAKE_P } from "../components/TerrainShot";
import { Bottle, CO2Scale, Definition, Hypotheses, Questions } from "../components/Science";
import { CaseNotes, Concept, Density, Postcard, ScaleTimeline, Statement, Steps, Verdict } from "../components/LongParts";
import { Cam } from "../three/Terrain";
import { LAKE, CRATER_LAKE } from "../three/terrainData";

const { end, seq: at } = makeCues(tokens);
export const LONG_DURATION = 600.0;
const [LX, LZ] = LAKE;
const [CX, CZ] = CRATER_LAKE;
const cam7 = (v: number[]): Cam => ({ pos: [v[0], v[1], v[2]], target: [v[3], v[4], v[5]], fov: v[6] });

const T = {
  // ch1
  noFire: at("No fire"), noWar: at("no war"), noVisible: at("no visible disaster"), silence: at("just an eerie"),
  nowImagine: at("Now imagine discovering"), aLake: at("was a lake"), horror: at("This might sound"), august: at("but on August"),
  cameroon: at("happened in Cameroon"), released: at("A lake released"), toll: at("More than 1,700"), animals: at("thousands of animals"),
  howCould: at("But how could"), again: at("could it happen again"), story: at("This is the story"), file1: at("File One"),
  // ch2
  begins: at("Our story begins"), africa: at("in central Africa"), surrounded: at("Surrounded by beautiful"), lakeNyos: at("as Lake Nyos"),
  above: at("From above"), postcard: at("out of a postcard"), calm: at("Calm water"), nothing: at("Nothing about its"),
  generations: at("For generations, people"), fertile: at("The land was fertile"), deepBeneath: at("But deep beneath the lake"),
  co2geo: at("Carbon dioxide from geological"), yearAfter: at("year after year"), nowCO2: at("Now, carbon dioxide itself"),
  breathe: at("every time we breathe"), atmosphere: at("present in the atmosphere"), highConc: at("But in very high"),
  storing: at("and Lake Nyos was storing"), toUnderstand: at("To understand what happened"), deeper: at("The deeper you go"),
  underPressure: at("and under that pressure"), bottle: at("Think of a sealed"), closed: at("When the bottle is closed"),
  open: at("But when you open"), bubbles: at("bubbles begin escaping"), similar: at("Now imagine something similar"),
  reservoir: at("massive reservoir"), forYears: at("For years, Lake Nyos"), evening: at("until one evening"),
  // ch3
  aug21: at("On August 21st"), routines: at("People were going"), stillThere: at("The lake was still there"), deepUnder: at("But deep underwater"),
  thatEvening: at("That evening"), gasRich: at("Gas-rich water had moved"), releaseCreated: at("The release created"),
  denser: at("And because carbon dioxide is denser"), flowDownhill: at("concentrated gas could flow"), moved: at("It moved through"),
  imagine: at("Imagine the danger"), cannotSee: at("You cannot see"), cannotEscape: at("You cannot escape"), whenConc: at("And when the concentration"),
  inVillages: at("In the villages below"), someLost: at("Some people lost"), many: at("Many never recovered"), livestock: at("Thousands of livestock"),
  byTheTime: at("By the time the scale"), more1700: at("more than 1,700 human"), surviving: at("and surviving families"),
  // ch4
  atFirst: at("But at first"), determine: at("Scientists needed to determine"), q1: at("Was this a volcanic"), q2: at("Had something toxic"),
  q3: at("Was there a previously"), traveled: at("Investigators traveled"), studied: at("They studied the water"), samples: at("They collected samples"),
  examined: at("They examined the effects"), gradually: at("And gradually"), lakeReleased: at("The lake had released"), accumulated: at("The gas had accumulated"),
  suddenRelease: at("Then, during a sudden"), limnic: at("Researchers came to understand"), unsettling: at("And this explanation revealed"),
  dangerBuilding: at("The danger had been building"), question: at("But one major question"), why: at("Why had the gas"),
  // ch5
  examinedPossible: at("Scientists examined several"), landslide: at("Some researchers considered"), mixing: at("Others investigated"),
  understood: at("What scientists understood"), waterRose: at("As the water rose"), dissolvedEscaped: at("Dissolved carbon dioxide escaped"),
  thoseBubbles: at("Those bubbles could"), releasingMore: at("releasing even more gas"), exactTrigger: at("But the exact initial"),
  distinction: at("And that's an important"), strongExpl: at("Scientists developed a strong"), identifying: at("but identifying precisely"),
  // ch6
  however: at("However, there was"), firstWarning: at("Because Lake Nyos wasn't"), twoYears: at("Two years earlier"), monoun: at("Its name was Lake Monoun"),
  aug15: at("On August 15"), n37: at("37 people died"), investigating: at("Scientists investigating Lake Monoun"), unusual: at("It was an unusual"),
  thenTwo: at("Then, two years later"), transformed: at("The events transformed"), notEnough: at("But understanding what happened"),
  urgent: at("There was another urgent"),
  // ch7
  ifCO2: at("If carbon dioxide could slowly"), prevent: at("what would prevent"), continued: at("Scientists continued investigating"),
  stillEntering: at("that carbon dioxide was still"), hadnt: at("The disaster hadn't"), overTime: at("Over time, gas"), needed: at("Researchers needed to find"),
  solution: at("The solution they developed"), pipes: at("Pipes."), special: at("Specially designed pipes"), broughtUp: at("When deep water was brought"),
  controlled: at("This allowed dissolved"), insteadOf: at("Instead of waiting"), gradual: at("engineers could gradually"), y2001: at("In 2001"),
  y2011: at("Additional pipes"), reduce: at("The system helped"), remarkable: at("It was a remarkable"),
  // ch8
  doesntEnd: at("But the story doesn't end"), bigger: at("Because Lake Nyos teaches"), notEvery: at("not every natural"), slowly: at("Some of the most dangerous"),
  sometimes1: at("And sometimes, a place"), today: at("Today, photographs"), green: at("Green mountains"), stillWater: at("Still water"),
  peaceful: at("A peaceful crater"), ifYou: at("If you didn't know"), more1700b: at("More than 1,700 people lost"), families: at("Families and communities"),
  once: at("And a disaster that"), lakeStill: at("The lake is still there"), hillsStill: at("The hills are still"), butNow: at("But now, the world"),
  greatest: at("Sometimes, the greatest"), building: at("It's something that's been"), thisWas: at("This was File One"), end: end("The Unknown File", 590),
};

export const Long: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Audio src={staticFile("audio/UNKNOWN_FILE_LONG.mp3")} />

    {/* ============ CHAPTER 1 — THE IMPOSSIBLE DISASTER ============ */}
    <Shot from={0} to={T.nowImagine + 0.4} fadeIn={1.2} fadeOut={0.6} name="dawn-village"><DawnVillage /></Shot>
    <Shot from={T.nowImagine} to={T.horror + 0.4} fadeIn={0.7} fadeOut={0.5} name="crater-reveal"><CraterReveal /></Shot>
    <Shot from={T.horror} to={T.released + 0.3} fadeIn={0.5} fadeOut={0.4} name="globe-date"><GlobeDate /></Shot>
    <Shot from={T.released} to={T.toll + 0.2} fadeIn={0.4} fadeOut={0.4} name="gas-preview"><GasPreview /></Shot>
    <Shot from={T.toll - 0.05} to={T.animals + 0.25} fadeIn={0.3} fadeOut={0.4} name="toll-1"><TollIntro /></Shot>
    <Shot from={T.animals} to={T.howCould + 0.3} fadeIn={0.5} fadeOut={0.5} name="photo-1986"><Photo1986 /></Shot>
    <Shot from={T.howCould} to={T.story + 0.3} fadeIn={0.5} fadeOut={0.5} name="question"><QuestionLake /></Shot>
    <Shot from={T.story} to={T.begins + 0.2} fadeIn={0.5} fadeOut={0.5} name="title-seal"><TitleSeal /></Shot>

    {/* ============ CHAPTER 2 — THE LAKE ============ */}
    <Shot from={T.begins} to={T.above + 0.3} fadeIn={0.6} fadeOut={0.5} name="geo-dive"><GeoDive /></Shot>
    <Shot from={T.above} to={T.nothing + 0.3} fadeIn={0.5} fadeOut={0.5} name="postcard"><PostcardShot /></Shot>
    <Shot from={T.nothing} to={T.generations + 0.3} fadeIn={0.5} fadeOut={0.5} outT="dip" name="surface-dip"><SurfaceDip /></Shot>
    <Shot from={T.generations} to={T.fertile + 0.3} fadeIn={0.5} fadeOut={0.5} name="village-dusk"><VillageDusk /></Shot>
    <Shot from={T.fertile} to={T.deepBeneath + 0.3} fadeIn={0.5} fadeOut={0.5} name="villages-map"><VillagesMap /></Shot>
    <Shot from={T.deepBeneath} to={T.nowCO2 + 0.3} fadeIn={0.5} fadeOut={0.5} name="xs-accum"><XSAccum /></Shot>
    <Shot from={T.nowCO2} to={T.storing + 0.3} fadeIn={0.5} fadeOut={0.5} name="co2-scale"><CO2Explainer /></Shot>
    <Shot from={T.storing} to={T.bottle + 0.3} fadeIn={0.5} fadeOut={0.5} name="xs-pressure"><XSPressure /></Shot>
    <Shot from={T.bottle} to={T.similar + 0.3} fadeIn={0.5} fadeOut={0.5} name="bottle"><BottleShot /></Shot>
    <Shot from={T.similar} to={T.forYears + 0.3} fadeIn={0.5} fadeOut={0.5} name="bottle-vs-lake"><BottleVsLake /></Shot>
    <Shot from={T.forYears} to={T.aug21 + 0.3} fadeIn={0.5} fadeOut={0.6} name="dusk-to-night"><DuskToNight /></Shot>

    {/* ============ CHAPTER 3 — THE NIGHT EVERYTHING CHANGED ============ */}
    <Shot from={T.aug21} to={T.stillThere + 0.3} fadeIn={0.6} fadeOut={0.5} name="evening-village"><EveningVillage /></Shot>
    <Shot from={T.stillThere} to={T.deepUnder + 0.3} fadeIn={0.5} fadeOut={0.5} name="moonlit-lake"><MoonlitLake /></Shot>
    <Shot from={T.deepUnder} to={T.releaseCreated + 0.3} fadeIn={0.5} fadeOut={0.4} name="xs-eruption"><XSEruption /></Shot>
    <Shot from={T.releaseCreated} to={T.denser + 0.3} fadeIn={0.4} fadeOut={0.4} name="xs-spill"><XSSpill /></Shot>
    <Shot from={T.denser} to={T.flowDownhill + 0.3} fadeIn={0.4} fadeOut={0.4} name="density"><DensityShot /></Shot>
    <Shot from={T.flowDownhill} to={T.imagine + 0.3} fadeIn={0.4} fadeOut={0.5} name="valleys-3d"><Valleys3D /></Shot>
    <Shot from={T.imagine} to={T.inVillages + 0.3} fadeIn={0.5} fadeOut={0.5} name="lights-out"><LightsOutLong /></Shot>
    <Shot from={T.inVillages} to={T.livestock + 0.3} fadeIn={0.5} fadeOut={0.6} name="affected-map"><AffectedMap /></Shot>
    <Shot from={T.livestock} to={T.more1700 + 0.2} fadeIn={0.5} fadeOut={0.5} name="livestock"><Livestock /></Shot>
    <Shot from={T.more1700 - 0.1} to={T.surviving + 0.3} fadeIn={0.5} fadeOut={0.6} name="toll-field"><TollField /></Shot>
    <Shot from={T.surviving} to={T.atFirst + 0.3} fadeIn={0.6} fadeOut={0.6} name="aftermath-print"><AftermathPrint /></Shot>

    {/* ============ CHAPTER 4 — A MYSTERY BENEATH THE WATER ============ */}
    <Shot from={T.atFirst} to={T.traveled + 0.3} fadeIn={0.6} fadeOut={0.5} name="questions"><QuestionsShot /></Shot>
    <Shot from={T.traveled} to={T.studied + 0.3} fadeIn={0.5} fadeOut={0.4} name="travel"><Travel /></Shot>
    <Shot from={T.studied} to={T.examined + 0.3} fadeIn={0.4} fadeOut={0.4} name="probe"><Probe /></Shot>
    <Shot from={T.examined} to={T.gradually + 0.3} fadeIn={0.4} fadeOut={0.5} name="evidence"><Evidence /></Shot>
    <Shot from={T.gradually} to={T.lakeReleased + 0.4} fadeIn={0.5} fadeOut={0.4} name="verdicts"><Verdicts /></Shot>
    <Shot from={T.lakeReleased} to={T.limnic + 0.3} fadeIn={0.4} fadeOut={0.5} name="xs-recap"><XSRecap /></Shot>
    <Shot from={T.limnic} to={T.unsettling + 0.3} fadeIn={0.5} fadeOut={0.5} name="definition"><LimnicDef /></Shot>
    <Shot from={T.unsettling} to={T.why + 0.2} fadeIn={0.5} fadeOut={0.4} name="calm-crater"><CalmCrater /></Shot>
    <Shot from={T.why - 0.1} to={T.examinedPossible + 0.3} fadeIn={0.4} fadeOut={0.5} name="why-night"><WhyNight /></Shot>

    {/* ============ CHAPTER 5 — THE MISSING ANSWER ============ */}
    <Shot from={T.examinedPossible} to={T.understood + 0.3} fadeIn={0.5} fadeOut={0.5} name="hypotheses"><HypothesesShot /></Shot>
    <Shot from={T.understood} to={T.exactTrigger + 0.3} fadeIn={0.5} fadeOut={0.5} name="chain"><Chain /></Shot>
    <Shot from={T.exactTrigger} to={T.distinction + 0.3} fadeIn={0.5} fadeOut={0.4} name="not-confirmed"><NotConfirmed /></Shot>
    <Shot from={T.distinction} to={T.however + 0.3} fadeIn={0.4} fadeOut={0.5} name="verdict"><VerdictShot /></Shot>

    {/* ============ CHAPTER 6 — THE WARNING TWO YEARS EARLIER ============ */}
    <Shot from={T.however} to={T.investigating + 0.3} fadeIn={0.5} fadeOut={0.5} name="monoun-map"><MonounMap /></Shot>
    <Shot from={T.investigating} to={T.thenTwo + 0.3} fadeIn={0.5} fadeOut={0.5} name="case-notes"><MonounNotes /></Shot>
    <Shot from={T.thenTwo} to={T.notEnough + 0.3} fadeIn={0.5} fadeOut={0.5} name="scale"><ScaleShot /></Shot>
    <Shot from={T.notEnough} to={T.ifCO2 + 0.3} fadeIn={0.5} fadeOut={0.5} name="urgent"><Urgent /></Shot>

    {/* ============ CHAPTER 7 — HOW SCIENTISTS RESPONDED ============ */}
    <Shot from={T.ifCO2} to={T.needed + 0.3} fadeIn={0.5} fadeOut={0.5} name="refill"><Refill /></Shot>
    <Shot from={T.needed} to={T.pipes + 0.05} fadeIn={0.5} fadeOut={0.3} name="concept"><ConceptShot /></Shot>
    <Shot from={T.pipes} to={T.y2001 + 0.3} fadeIn={0.25} fadeOut={0.5} name="pipe-engineering"><PipeEngineering /></Shot>
    <Shot from={T.y2001} to={T.y2011 + 0.2} fadeIn={0.5} fadeOut={0.4} name="photo-2001"><Photo2001 /></Shot>
    <Shot from={T.y2011} to={T.remarkable + 0.3} fadeIn={0.4} fadeOut={0.5} name="three-pipes"><ThreePipes /></Shot>
    <Shot from={T.remarkable} to={T.doesntEnd + 0.3} fadeIn={0.5} fadeOut={0.6} name="crater-day"><CraterDay /></Shot>

    {/* ============ CHAPTER 8 — CLOSING THE FILE ============ */}
    <Shot from={T.doesntEnd} to={T.slowly + 0.3} fadeIn={0.6} fadeOut={0.5} name="region-night"><RegionNight /></Shot>
    <Shot from={T.slowly} to={T.today + 0.3} fadeIn={0.5} fadeOut={0.6} name="deep-slow"><DeepSlow /></Shot>
    <Shot from={T.today} to={T.green + 0.3} fadeIn={0.6} fadeOut={0.5} name="landsat"><Landsat /></Shot>
    <Shot from={T.green} to={T.more1700b + 0.3} fadeIn={0.5} fadeOut={0.6} name="today-orbit"><TodayOrbit /></Shot>
    <Shot from={T.more1700b} to={T.once + 0.3} fadeIn={0.6} fadeOut={0.6} name="memorial"><Memorial /></Shot>
    <Shot from={T.once} to={T.lakeStill + 0.3} fadeIn={0.6} fadeOut={0.6} name="globe-out"><GlobeOut /></Shot>
    <Shot from={T.lakeStill} to={T.greatest + 0.6} fadeIn={0.6} fadeOut={0.8} name="final-crater"><FinalCrater /></Shot>
    <Shot from={T.greatest + 0.3} to={T.thisWas + 0.2} fadeIn={0.8} fadeOut={0.8} outT="dip" name="final-beneath"><FinalBeneath /></Shot>
    <Shot from={T.thisWas - 0.3} to={LONG_DURATION} fadeIn={0.7} fadeOut={1.0} name="closed"><Closed /></Shot>

    {/* chapter markers */}
    {([[T.begins + 0.3, 2, "The Lake"], [T.aug21 + 0.4, 3, "The Night Everything Changed"], [T.atFirst + 0.4, 4, "A Mystery Beneath the Water"],
      [T.examinedPossible + 0.3, 5, "The Missing Answer"], [T.however + 0.4, 6, "The Warning Two Years Earlier"], [T.ifCO2 + 0.4, 7, "How Scientists Responded"],
      [T.doesntEnd + 0.4, 8, "Closing the File"]] as [number, number, string][]).map(([s, n, title]) => (
      <Shot key={n} from={s} to={s + 4.6} fadeIn={0} fadeOut={0} z={50} name={`chapter-${n}`}>
        <ChapterMark n={n} title={title} />
      </Shot>
    ))}
    <FilmLook grain={0.07} />
  </AbsoluteFill>
);

const ChapterMark: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const { t } = useShot();
  return <Chapter t={t} n={n} title={title} dur={4.6} />;
};

/* helpers */
const useA = (from: number) => {
  const { t, dur } = useShot();
  return { t, dur, a: (x: number) => x - from };
};
const Title: React.FC<{ children: React.ReactNode; x?: number; y?: number; align?: "left" | "center" }> = ({ children, x = 120, y = 120, align = "left" }) => {
  const u = useU();
  return <div style={{ position: "absolute", left: align === "center" ? 0 : x * u, right: align === "center" ? 0 : undefined, top: y * u, textAlign: align }}>{children}</div>;
};
const H1: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 110, color = C.paper }) => {
  const u = useU();
  return <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size * u, color, lineHeight: 1.02, letterSpacing: "-0.015em" }}>{children}</div>;
};
const Shade: React.FC<{ top?: number; bottom?: number; left?: number }> = ({ top = 0.5, bottom = 0.3, left = 0 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(7,9,12,${top}) 0%, rgba(7,9,12,0) 32%, rgba(7,9,12,0) 68%, rgba(7,9,12,${bottom}) 100%)${left ? `, linear-gradient(90deg, rgba(7,9,12,${left}) 0%, rgba(7,9,12,0) 45%)` : ""}` }} />
);

/* ======================= CHAPTER 1 ======================= */

const DawnVillage: React.FC = () => {
  const { t, dur, a } = useA(0);
  const u = useU();
  return (
    <AbsoluteFill>
      <Village t={t + 40} pan={0.2 + (t / dur) * 0.5} cam={{ x: 960, y: 560, zoom: lerp(1.0, 1.1, t / dur) }} dawn={1} lights={0} moon={0} />
      <AbsoluteFill style={{ background: C.ink, opacity: 0.45 * ramp(t, a(T.noFire) - 0.3, a(T.noFire) + 0.4) }} />
      <IllustrationTag t={t} text="ILLUSTRATION" style={{ right: 70 * u, top: 60 * u }} />
      <Title x={140} y={330}>
        <div style={{ opacity: 1 - ramp(t, a(T.silence) + 0.6, a(T.silence) + 1.6) }}>
          <H1 size={120}><Reveal text="NO FIRE." t={t} at={a(T.noFire)} /></H1>
          <H1 size={120}><Reveal text="NO WAR." t={t} at={a(T.noWar)} /></H1>
          <H1 size={120} color="rgba(236,230,218,0.55)"><Reveal text="NO VISIBLE DISASTER." t={t} at={a(T.noVisible)} stagger={0.1} /></H1>
        </div>
      </Title>
    </AbsoluteFill>
  );
};

const CraterReveal: React.FC = () => {
  const { t, dur, a } = useA(T.nowImagine);
  const c = keys(t, [
    [0, [CX + 0.1, 6.0, CZ + 2.6, CX, 1.0, CZ - 0.2, 40]],
    [a(T.aLake) + 0.4, [CX + 0.6, 3.6, CZ + 2.3, CX - 0.05, 1.0, CZ - 0.3, 40]],
    [dur, [CX + 1.4, 2.5, CZ + 1.8, CX - 0.2, 0.95, CZ - 0.6, 42]],
  ], easeInOut);
  return (
    <TerrainShot ds="crater" sky="dusk" cam={() => cam7(c)} state={() => ({ night: 0.12, gas: 0, gasAmt: 0, lights: 0, haze: 0.045, hazeColor: "#3c3f49", exposure: 1.1 })}>
      <Shade top={0.35} bottom={0.4} />
      <Title x={140} y={760}>
        <Kicker text="LAKE NYOS · NORTHWESTERN CAMEROON" t={t} at={a(T.aLake) + 0.3} size={22} color={C.paper} />
      </Title>
    </TerrainShot>
  );
};

const GlobeDate: React.FC = () => {
  const { t, dur, a } = useA(T.horror);
  const u = useU();
  const v = keys(t, [[0, [-20, 25, 0.9]], [a(T.august), [5, 12, 1.05]], [dur, [12, 5, 1.6]]], easeInOut);
  return (
    <AbsoluteFill>
      <GeoMap t={t} view={{ lon: v[0], lat: v[1], zoom: v[2], cx: 0.62 }} cameroon={ramp(t, a(T.cameroon) - 0.3, a(T.cameroon) + 0.5)} pins={[{ lon: NYOS[0], lat: NYOS[1], at: a(T.cameroon) + 0.3 }]}
        labels={[{ lon: 12.6, lat: 5.0, text: "Cameroon", at: a(T.cameroon), kind: "country" }]} />
      <Title x={120} y={380}>
        <Kicker text="DATE OF EVENT" t={t} at={a(T.august) - 0.2} size={22} style={{ marginBottom: 20 * u }} />
        <H1 size={110}><Reveal text="AUGUST 21," t={t} at={a(T.august)} stagger={0.12} /></H1>
        <H1 size={180} color={C.burgundyHi}><Reveal text="1986" t={t} at={a(T.august) + 0.9} /></H1>
      </Title>
    </AbsoluteFill>
  );
};

const GasPreview: React.FC = () => {
  const { t, dur } = useShot();
  const c = keys(t, [[0, [LX + 0.8, 5.6, LZ + 7.5, LX - 1.0, 0.9, LZ - 6, 42]], [dur, [LX + 0.4, 5.0, LZ + 6.2, LX - 1.3, 0.85, LZ - 7, 42]]], easeInOut);
  return (
    <TerrainShot cam={() => cam7(c)} state={() => ({ night: 1, gas: lerp(0.05, 0.3, t / dur), gasAmt: 1, lights: 1, haze: 0.03, hazeColor: "#0b1420" })}>
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
    </TerrainShot>
  );
};

const TollIntro: React.FC = () => {
  const { t } = useShot();
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center" }}>
      <Stat t={t} at={0.15} value="1,700+" label="PEOPLE LOST THEIR LIVES" kicker="21–22 AUGUST 1986" size={240} />
    </AbsoluteFill>
  );
};

const Photo1986: React.FC = () => {
  const { t, dur } = useShot();
  const u = useU();
  return (
    <AbsoluteFill>
      <PhotoFull src="photos/usgs_lockwood_1986_lake_nyos.jpg" t={t} dur={dur} from={[1.04, 30, 50]} to={[1.16, 55, 45]} credit="LAKE NYOS · 1986 · PHOTO J. LOCKWOOD / USGS · PUBLIC DOMAIN" />
      <Title x={120} y={110}><Kicker text="ARCHIVE · DAYS AFTER THE DISASTER" t={t} at={0.6} size={22} color={C.paper} /></Title>
    </AbsoluteFill>
  );
};

const QuestionLake: React.FC = () => {
  const { t, dur, a } = useA(T.howCould);
  const c = keys(t, [[0, [CX - 1.6, 2.2, CZ + 1.2, CX, 1.0, CZ - 0.2, 40]], [dur, [CX - 1.2, 1.8, CZ + 0.4, CX + 0.2, 1.02, CZ - 0.4, 40]]], easeInOut);
  return (
    <TerrainShot ds="crater" sky="dusk" cam={() => cam7(c)} state={() => ({ night: 0.45 + 0.3 * (t / dur), gas: 0, gasAmt: 0, lights: 0, haze: 0.05, hazeColor: "#2a2e38", exposure: 0.95 })}>
      <Shade top={0.55} bottom={0.4} />
      <Title align="center" y={170}>
        <Kicker text="THE QUESTION" t={t} at={0.4} size={22} style={{ marginBottom: 26 * useU() }} />
        <H1 size={96}><Reveal text="COULD IT" t={t} at={a(T.again)} /> <Reveal text="HAPPEN AGAIN?" t={t} at={a(T.again) + 0.25} wordStyle={(i) => (i === 1 ? { color: C.burgundyHi } : undefined)} /></H1>
      </Title>
    </TerrainShot>
  );
};

const TitleSeal: React.FC = () => {
  const { t, dur } = useShot();
  return <FileSeal t={t} dur={dur} mode="open" />;
};

/* ======================= CHAPTER 2 ======================= */

const GeoDive: React.FC = () => {
  const { t, dur, a } = useA(T.begins);
  const v = keys(t, [
    [0, [15, 8, 1.0]],
    [a(T.africa) + 0.6, [15, 3, 1.5]],
    [a(T.surrounded) - 0.6, [11.5, 6, 8]],
    [a(T.lakeNyos) - 0.2, [10.3, 6.44, 600]],
    [dur, [10.3, 6.445, 700]],
  ], easeInOut);
  const lz = Math.log10(v[2]);
  return (
    <GeoMap t={t} view={{ lon: v[0], lat: v[1], zoom: v[2] }}
      cameroon={ramp(t, a(T.africa) + 1.2, a(T.africa) + 2)} nw={ramp(lz, 0.6, 0.9) * (1 - ramp(lz, 2.0, 2.4))} relief={ramp(lz, 0.85, 1.25)} local={ramp(lz, 1.9, 2.5)} lakes={ramp(lz, 1.4, 1.8)}
      borders={1 - ramp(lz, 1.2, 1.6)}
      labels={[
        { lon: 22, lat: 2, text: "Africa", at: a(T.africa), out: a(T.africa) + 1.4, kind: "country", dx: -60, dy: 0 },
        { lon: 12.6, lat: 5.0, text: "Cameroon", at: a(T.africa) + 1.5, out: a(T.surrounded) + 0.2, kind: "country" },
        { lon: 10.55, lat: 6.35, text: "Northwest Region", at: a(T.surrounded) + 0.6, out: a(T.lakeNyos) - 0.8, kind: "region" },
        { lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", sub: "VOLCANIC CRATER LAKE · 6.44°N 10.30°E", at: a(T.lakeNyos) - 0.1, kind: "lake", dx: 40, dy: -50 },
      ]}
      pins={[{ lon: NYOS[0], lat: NYOS[1], at: 1.5 }]}
    />
  );
};

const PostcardShot: React.FC = () => {
  const { t, dur, a } = useA(T.above);
  const ang = lerp(-0.35, 0.25, t / dur);
  const c: Cam = { pos: [CX + Math.sin(ang) * 2.6, 2.5, CZ + Math.cos(ang) * 2.6], target: [CX, 1.0, CZ], fov: 40 };
  return (
    <TerrainShot ds="crater" sky="day" cam={() => c} state={() => ({ night: 0, gas: 0, gasAmt: 0, lights: 0, haze: 0.04, hazeColor: "#8d969c", exposure: 1.12 })}>
      <Postcard t={t} at={a(T.postcard) - 0.2} caption="Lake Nyos, Cameroon" />
      <IllustrationTag t={t} text="3D RECONSTRUCTION · SENTINEL-2 + SRTM" style={{ right: 70 * useU(), bottom: 60 * useU() }} />
    </TerrainShot>
  );
};

const SurfaceDip: React.FC = () => {
  const { t, dur } = useShot();
  const c = keys(t, [[0, [CX + 0.3, 2.0, CZ + 1.6, CX, 1.0, CZ - 0.3, 40]], [dur, [CX + 0.05, 1.25, CZ + 0.3, CX - 0.05, 1.03, CZ - 0.6, 40]]], easeInOut);
  return (
    <TerrainShot ds="crater" sky="dusk" cam={() => cam7(c)} state={() => ({ night: 0.35, gas: 0, gasAmt: 0, lights: 0, haze: 0.05, hazeColor: "#2f333d", exposure: 1.0 })}>
      <Shade top={0.4} bottom={0.5} />
    </TerrainShot>
  );
};

const VillageDusk: React.FC = () => {
  const { t, dur } = useShot();
  return (
    <AbsoluteFill>
      <Village t={t} pan={(t / dur) * 0.6} dusk={1} lights={0.8} cam={{ x: 960, y: 560, zoom: 1.02 }} />
      <IllustrationTag t={t} text="ILLUSTRATION" style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const VillagesMap: React.FC = () => {
  const { t, dur } = useShot();
  const z = lerp(520, 600, t / dur);
  return (
    <GeoMap t={t} view={{ lon: 10.29, lat: 6.5, zoom: z }} local={1} relief={1} lakes={1}
      labels={[
        { lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", at: 0.2, kind: "lake", dx: 30, dy: 10 },
        { lon: 10.2291, lat: 6.47797, text: "Cha", at: 0.6, kind: "village" },
        { lon: 10.361, lat: 6.51041, text: "Subum", at: 0.9, kind: "village" },
        { lon: 10.2801, lat: 6.54922, text: "Fang", at: 1.2, kind: "village" },
        { lon: 10.267, lat: 6.60074, text: "Mashi", at: 1.5, kind: "village" },
      ]}
      pins={[[10.2291, 6.47797], [10.361, 6.51041], [10.2801, 6.54922], [10.267, 6.60074]].map(([lo, la], i) => ({ lon: lo, lat: la, at: 0.6 + i * 0.3, color: C.amber }))}
    />
  );
};

const XSAccum: React.FC = () => {
  const { t, dur, a } = useA(T.deepBeneath);
  const cam = keys(t, [[0, [XL.mid, XL.surf - 140, 1.5]], [a(T.co2geo), [XL.mid, XL.surf + 120, 1.15]], [dur, [XL.mid, XL.surf + 150, 1.1]]], easeInOut);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: cam[0], y: cam[1], zoom: cam[2] }} accum={lerp(0.03, 0.75, ramp(t, a(T.co2geo), dur, (x) => x))} source={ramp(t, a(T.co2geo) - 0.5, a(T.co2geo) + 1)} layers={ramp(t, 1, 2.5)}
        labels={[
          { text: "CO₂ FROM GEOLOGICAL SOURCES", x: XL.mid + 120, y: XL.bottom + 170, at: a(T.co2geo) + 0.5, ax: XL.mid + 28, ay: XL.bottom + 110 },
          { text: "ACCUMULATING IN THE DEEPEST WATER", x: XL.n + 40, y: XL.bottom - 40, at: a(T.yearAfter), ax: XL.mid + 200, ay: XL.bottom - 30 },
        ]} />
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
      <Title x={120} y={110}><Kicker text="YEAR AFTER YEAR" t={t} at={a(T.yearAfter)} size={24} color={C.paper} /></Title>
    </AbsoluteFill>
  );
};

const CO2Explainer: React.FC = () => {
  const { t, a } = useA(T.nowCO2);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 45%, #17202c 0%, ${C.ink} 78%)` }}>
      <CO2Scale t={t} marks={[{ at: a(T.atmosphere) }, { at: a(T.breathe) }, { at: a(T.highConc) + 0.8 }]} />
      <Credit t={t} text="TYPICAL VALUES · SOURCES: NOAA (ATMOSPHERIC CO₂), NIOSH / CDC (EXPOSURE EFFECTS)" style={{ left: 120 * useU(), bottom: 50 * useU() }} />
    </AbsoluteFill>
  );
};

const XSPressure: React.FC = () => {
  const { t, dur, a } = useA(T.storing);
  const u = useU();
  const dimText = 1 - ramp(t, a(T.deeper) - 0.4, a(T.deeper));
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: XL.mid - 60, y: XL.surf + 150, zoom: lerp(1.05, 1.15, t / dur) }} accum={0.8} layers={1} pressure={ramp(t, a(T.deeper), a(T.deeper) + 1)}
        dim={0.55 * ramp(t, a(T.toUnderstand) - 0.3, a(T.toUnderstand) + 0.3) * dimText}
        labels={[{ text: "UNDER PRESSURE, CO₂ STAYS DISSOLVED", x: XL.n + 30, y: XL.bottom - 120, at: a(T.underPressure) + 0.5, ax: XL.mid + 160, ay: XL.bottom - 90 }]} />
      <Title align="center" y={430}>
        <div style={{ opacity: ramp(t, a(T.toUnderstand), a(T.toUnderstand) + 0.5) * dimText }}>
          <Kicker text="ONE SCIENTIFIC DETAIL" t={t} at={a(T.toUnderstand)} size={24} color={C.paper} style={{ marginBottom: 24 * u }} />
          <H1 size={120}><Reveal text="PRESSURE" t={t} at={a(T.toUnderstand) + 1.6} /></H1>
        </div>
      </Title>
      <IllustrationTag t={t} style={{ right: 70 * u, top: 60 * u }} />
    </AbsoluteFill>
  );
};

const BottleShot: React.FC = () => {
  const { t, a } = useA(T.bottle);
  const { width: W, height: H } = useVideoConfig();
  const open = ramp(t, a(T.open), a(T.open) + 0.9, easeInOut);
  const fizz = ramp(t, a(T.open) + 0.4, a(T.bubbles) + 0.8, (x) => x);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 45% 45%, #1a2431 0%, ${C.ink} 78%)` }}>
      <Bottle t={t} open={open} fizz={fizz} x={W * 0.42} y={H * 0.5} scale={0.85} />
      <Title x={1200} y={300}>
        <Kicker text="THE ANALOGY" t={t} at={0.3} size={22} style={{ marginBottom: 20 * useU() }} />
        <H1 size={78}><Reveal text="SEALED:" t={t} at={a(T.closed)} /></H1>
        <div style={{ fontFamily: F.sans, fontSize: 40 * useU(), color: C.paperDim, marginBottom: 40 * useU() }}><Reveal text="gas stays dissolved" t={t} at={a(T.closed) + 0.4} /></div>
        <H1 size={78} color={C.burgundyHi}><Reveal text="OPENED:" t={t} at={a(T.open)} /></H1>
        <div style={{ fontFamily: F.sans, fontSize: 40 * useU(), color: C.paperDim }}><Reveal text="pressure drops, bubbles form" t={t} at={a(T.open) + 0.5} /></div>
      </Title>
    </AbsoluteFill>
  );
};

const BottleVsLake: React.FC = () => {
  const { t, dur, a } = useA(T.similar);
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const zoomIn = ramp(t, a(T.reservoir) - 0.6, dur, easeInOut);
  const zoom = lerp(1.15, 1.2, zoomIn);
  const off = (W * 0.25) / ((H / 1080) * zoom); // diagram units that put the lake at 3/4 of the frame width
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <CrossSection t={t} cam={{ x: XL.mid + 40 - off * (1 - zoomIn), y: XL.surf + 150, zoom }} accum={0.85} layers={0.6} />
      <div style={{ position: "absolute", left: 0, top: 0, width: W * 0.5, height: H, background: `radial-gradient(ellipse at 50% 45%, #1a2431 0%, ${C.ink} 80%)`, transform: `translateX(${-W * 0.5 * zoomIn}px)` }}>
        <Bottle t={t} open={0} fizz={0} x={W * 0.25} y={H * 0.48} scale={0.7} gauge={false} label={false} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 110 * u, textAlign: "center", fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.24em", color: C.paperDim }}>A BOTTLE · ABOUT 1 LITRE</div>
        <div style={{ position: "absolute", right: 0, top: H * 0.1, width: 2 * u, height: H * 0.8, background: "rgba(236,230,218,0.25)" }} />
      </div>
      <div style={{ position: "absolute", right: 110 * u, bottom: 110 * u, fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.24em", color: C.paperDim, opacity: 1 - zoomIn }}>A CRATER LAKE · ABOUT 200 M DEEP</div>
      <Title align="center" y={70}><div style={{ opacity: 1 - zoomIn }}><Kicker text="SAME PHYSICS · VASTLY DIFFERENT SCALE" t={t} at={0.5} size={24} color={C.paper} /></div></Title>
      <Title x={120} y={140}><div style={{ opacity: zoomIn }}><Kicker text="A MASSIVE RESERVOIR OF TRAPPED GAS" t={t} at={a(T.reservoir) + 0.4} size={24} color={C.paper} /></div></Title>
    </AbsoluteFill>
  );
};

const DuskToNight: React.FC = () => {
  const { t, dur, a } = useA(T.forYears);
  const n = ramp(t, 0.5, dur - 1);
  const c = keys(t, [[0, [CX - 2.0, 2.4, CZ - 0.6, CX, 1.0, CZ, 40]], [dur, [CX - 1.8, 2.0, CZ + 0.6, CX, 1.0, CZ - 0.1, 40]]], easeInOut);
  return (
    <TerrainShot ds="crater" sky={n > 0.5 ? "night" : "dusk"} cam={() => cam7(c)} state={() => ({ night: 0.2 + 0.8 * n, gas: 0, gasAmt: 0, lights: 0, haze: 0.05, hazeColor: n > 0.5 ? "#0b1420" : "#2f333d", exposure: 1 })}>
      <Shade top={0.5} bottom={0.4} left={0.5} />
      <Title x={120} y={600}>
        <Kicker text="THEN, ONE EVENING" t={t} at={a(T.evening)} size={22} style={{ marginBottom: 18 * useU() }} />
        <H1 size={96}><Reveal text="AUGUST 1986" t={t} at={a(T.evening) + 0.9} /></H1>
      </Title>
    </TerrainShot>
  );
};

/* ======================= CHAPTER 3 ======================= */

const EveningVillage: React.FC = () => {
  const { t, dur } = useShot();
  return (
    <AbsoluteFill>
      <Village t={t + 5} pan={(t / dur) * 0.7} dusk={1 - ramp(t, 0, dur)} lights={1} cam={{ x: 960, y: 560, zoom: lerp(1.0, 1.06, t / dur) }} />
      <IllustrationTag t={t} text="ILLUSTRATION" style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const MoonlitLake: React.FC = () => {
  const { t, dur } = useShot();
  const c = keys(t, [[0, [CX + 1.6, 1.9, CZ + 1.6, CX, 1.02, CZ - 0.2, 40]], [dur, [CX + 1.2, 1.6, CZ + 1.0, CX, 1.02, CZ - 0.3, 40]]], easeInOut);
  return (
    <TerrainShot ds="crater" sky="night" cam={() => cam7(c)} state={() => ({ night: 1, gas: 0, gasAmt: 0, lights: 0, haze: 0.05, hazeColor: "#0b1420", exposure: 1.2 })}>
      <Shade top={0.3} bottom={0.4} />
    </TerrainShot>
  );
};

const XSEruption: React.FC = () => {
  const { t, dur, a } = useA(T.deepUnder);
  const rise = ramp(t, a(T.thatEvening), a(T.thatEvening) + 2.2, (x) => x);
  const erupt = ramp(t, a(T.thatEvening) + 1.5, a(T.thatEvening) + 3.2, easeOut) * (1 - 0.5 * ramp(t, a(T.gasRich), a(T.gasRich) + 1.5));
  const cam = keys(t, [[0, [XL.mid, XL.bottom - 60, 1.6]], [a(T.thatEvening), [XL.mid, XL.surf + 120, 1.05]], [dur, [XL.mid, XL.surf + 90, 1.0]]], easeInOut);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: cam[0], y: cam[1], zoom: cam[2] }} accum={0.9} rise={rise} erupt={erupt} source={1} layers={0.5}
        labels={[
          { text: "GAS-RICH WATER MOVES UPWARD", x: XL.n + 40, y: XL.bottom - 60, at: a(T.gasRich), ax: XL.mid + 120, ay: XL.bottom - 80 },
          { text: "PRESSURE DECREASES → GAS BREAKS FREE", x: XL.n + 40, y: XL.surf + 60, at: a(T.gasRich) + 2.4, ax: XL.mid + 140, ay: XL.surf + 50 },
        ]} />
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const XSSpill: React.FC = () => {
  const { t, dur } = useShot();
  const cam = keys(t, [[0, [XL.mid + 100, XL.surf + 60, 1.0]], [dur, [XL.mid + 520, XL.surf + 120, 0.95]]], easeInOut);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: cam[0], y: cam[1], zoom: cam[2] }} accum={0.5} erupt={0.45} flow={ramp(t, 0, dur, (x) => x)} source={1}
        labels={[{ text: "A DENSE CLOUD SPILLS OVER THE NORTHERN RIM", x: XL.n + 80, y: XL.surf - 200, at: 0.6 }]} />
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const DensityShot: React.FC = () => {
  const { t } = useShot();
  return <Density t={t} />;
};

const Valleys3D: React.FC = () => {
  const { t, dur, a } = useA(T.flowDownhill);
  const c = keys(t, [[0, [LX + 2.5, 7.5, LZ + 6, LX - 1.5, 0.8, LZ - 6, 44]], [dur, [LX + 1.0, 6.2, LZ + 1.0, LX - 2.8, 0.7, LZ - 9.5, 44]]], easeInOut);
  return (
    <TerrainShot cam={() => cam7(c)} state={() => ({ night: 1, gas: lerp(0.1, 0.95, ramp(t, 0, dur, (x) => x)), gasAmt: 1, lights: 1, haze: 0.025, hazeColor: "#0b1420" })}
      labels={[
        { p: LAKE_P, text: "Lake Nyos", at: 0.3, out: 3, kind: "lake" },
        { p: villageP("Cha"), text: "Cha", at: a(T.moved), kind: "village" },
        { p: villageP("Subum"), text: "Subum", at: a(T.moved) + 0.4, kind: "village" },
        { p: villageP("Fang"), text: "Fang", at: a(T.moved) + 0.8, kind: "village" },
        { p: villageP("Mashi"), text: "Mashi", at: a(T.moved) + 1.4, kind: "village" },
      ]}>
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
      <Title x={120} y={110}><Kicker text="THE CLOUD FOLLOWS THE VALLEYS NORTH · MODELLED FROM REAL TERRAIN" t={t} at={0.5} size={20} color={C.paper} /></Title>
    </TerrainShot>
  );
};

const LightsOutLong: React.FC = () => {
  const { t, dur, a } = useA(T.imagine);
  return (
    <AbsoluteFill>
      <Village t={t + 60} pan={0.3 + (t / dur) * 0.5} gas={ramp(t, 0.5, dur - 1, (x) => x)} gasRange={[-200, 2100]} lights={1} moon={0.8} cam={{ x: 960, y: 580, zoom: 1.06 }} />
      <IllustrationTag t={t} text="ILLUSTRATION · CO₂ ITSELF IS INVISIBLE" style={{ right: 70 * useU(), top: 60 * useU() }} />
      <Title x={120} y={110}><Kicker text="INVISIBLE" t={t} at={a(T.cannotSee)} size={26} color={C.paper} out={a(T.whenConc)} /></Title>
    </AbsoluteFill>
  );
};

const AffectedMap: React.FC = () => {
  const { t, dur, a } = useA(T.inVillages);
  return (
    <AbsoluteFill>
      <GeoMap t={t} view={{ lon: 10.29, lat: 6.5, zoom: lerp(560, 600, t / dur) }} local={1} relief={1} lakes={1} gasOverlay={ramp(t, 0.3, 2.0)}
        labels={[
          { lon: 10.2291, lat: 6.47797, text: "Cha", at: 0.5, kind: "village" },
          { lon: 10.361, lat: 6.51041, text: "Subum", at: 0.7, kind: "village" },
          { lon: 10.2801, lat: 6.54922, text: "Fang", at: 0.9, kind: "village" },
          { lon: 10.267, lat: 6.60074, text: "Mashi", at: 1.1, kind: "village" },
          { lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", at: 0.3, kind: "lake", dx: 30, dy: 10 },
        ]} />
      <AbsoluteFill style={{ background: C.ink, opacity: 0.6 * ramp(t, a(T.someLost), a(T.many) + 1.2) }} />
      <IllustrationTag t={t} text="MODELLED EXTENT · ILLUSTRATIVE" style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const Livestock: React.FC = () => {
  const { t, a } = useA(T.livestock);
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: 1 - ramp(t, a(T.byTheTime) + 0.6, a(T.byTheTime) + 1.4) }}>
        <Stat t={t} at={0.2} value="≈ 3,500" label="LIVESTOCK KILLED" kicker="SOURCE · NASA EARTH OBSERVATORY / USGS" size={190} />
      </div>
    </AbsoluteFill>
  );
};

const TollField: React.FC = () => {
  const { t } = useShot();
  const { height: H } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <DotField t={t} area={{ x: 0.12, y: 0.1, w: 0.76, h: 0.52 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.68, display: "flex", justifyContent: "center" }}>
        <Stat t={t} at={0.6} value="1,700+" label="HUMAN LIVES" size={140} />
      </div>
    </AbsoluteFill>
  );
};

const AftermathPrint: React.FC = () => {
  const { t, dur } = useShot();
  return <PhotoPrint src="photos/usgs_lockwood_nyos_lake.jpg" t={t} dur={dur} credit="LAKE NYOS · 1986 · J. LOCKWOOD / USGS · PUBLIC DOMAIN" tag="1986" w={1250} aspect={0.669} rot={-1.6} />;
};

/* ======================= CHAPTER 4 ======================= */

const QuestionsShot: React.FC = () => {
  const { t, a } = useA(T.atFirst);
  return <Questions t={t} items={[{ q: "A volcanic eruption?", at: a(T.q1) }, { q: "Something toxic from the ground?", at: a(T.q2) }, { q: "An unknown natural phenomenon?", at: a(T.q3) }]} />;
};

const Travel: React.FC = () => {
  const { t } = useShot();
  const from: [number, number][] = [[-77, 39], [2.3, 48.8], [-0.1, 51.5], [139.7, 35.7], [13.4, 52.5], [11.5, 3.9]];
  return (
    <GeoMap t={t} view={{ lon: 12, lat: 18, zoom: 1.05 }} cameroon={1}
      arcs={from.map((f, i) => ({ from: f, to: NYOS, p: ramp(t, 0.2 + i * 0.25, 1.6 + i * 0.25, easeInOut) }))}
      pins={[{ lon: NYOS[0], lat: NYOS[1], at: 0.1 }]} labels={[{ lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", at: 0.3, kind: "lake", dx: 30, dy: 10 }]} />
  );
};

const Probe: React.FC = () => {
  const { t, dur, a } = useA(T.studied);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: XL.mid - 120, y: XL.surf + 130, zoom: 1.25 }} accum={0.55} layers={1} probe={ramp(t, 0.3, dur, (x) => x)} ruler={1}
        labels={[{ text: "WATER SAMPLES AT DEPTH", x: XL.mid + 60, y: XL.surf - 60, at: a(T.samples) - 0.3 }]} />
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const Evidence: React.FC = () => {
  const { t, dur } = useShot();
  return <PhotoPrint src="photos/usgs_lockwood_1986_lake_nyos.jpg" t={t} dur={dur} credit="LAKE NYOS · 1986 · J. LOCKWOOD / USGS" tag="EVIDENCE 001-B" w={1300} aspect={0.673} rot={1.5} />;
};

const Verdicts: React.FC = () => {
  const { t, a } = useA(T.gradually);
  return (
    <Questions t={t} title="FINDINGS"
      items={[{ q: "A volcanic eruption?", at: 0, verdict: "x", vAt: 0.6 }, { q: "Something toxic from the ground?", at: 0, verdict: "x", vAt: 0.9 },
        { q: "Carbon dioxide released by the lake", at: 1.4, verdict: "check", vAt: a(T.lakeReleased) - 0.6 }]} />
  );
};

const XSRecap: React.FC = () => {
  const { t, dur, a } = useA(T.lakeReleased);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: XL.mid + 60, y: XL.surf + 80, zoom: 1.0 }} accum={0.85} source={0.6} rise={ramp(t, a(T.suddenRelease) - 0.5, a(T.suddenRelease) + 1.5)} erupt={ramp(t, a(T.suddenRelease) + 0.4, a(T.suddenRelease) + 2.0)}
        labels={[{ text: "1 · ACCUMULATED DEEP UNDERWATER", x: XL.n + 40, y: XL.bottom - 50, at: a(T.accumulated) }, { text: "2 · SUDDEN RELEASE", x: XL.n + 40, y: XL.surf - 80, at: a(T.suddenRelease) + 0.3 }]} />
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const LimnicDef: React.FC = () => {
  const { t } = useShot();
  return <Definition t={t} term="limnic eruption" def="A rare event in which gas dissolved in a deep lake — mostly carbon dioxide — is suddenly released. From the Greek limnē, “lake”." at={0.8} />;
};

const CalmCrater: React.FC = () => {
  const { t, dur } = useShot();
  const ang = lerp(0.6, 1.1, t / dur);
  const c: Cam = { pos: [CX + Math.sin(ang) * 2.9, 2.2, CZ + Math.cos(ang) * 2.9], target: [CX, 1.0, CZ], fov: 40 };
  return (
    <TerrainShot ds="crater" sky="dusk" cam={() => c} state={() => ({ night: 0.4, gas: 0, gasAmt: 0, lights: 0, haze: 0.05, hazeColor: "#2f333d", exposure: 1.0 })}>
      <Shade top={0.3} bottom={0.4} />
    </TerrainShot>
  );
};

const WhyNight: React.FC = () => {
  const { t } = useShot();
  return <Statement t={t} kicker="THE REMAINING QUESTION" lines={[{ text: "WHY", at: 0.4 }, { text: "THAT NIGHT?", at: 0.75, color: C.burgundyHi }]} size={150} />;
};

/* ======================= CHAPTER 5 ======================= */

const HypothesesShot: React.FC = () => {
  const { t, a } = useA(T.examinedPossible);
  return <Hypotheses t={t} a={a(T.landslide)} b={a(T.mixing)} verdict={999} />;
};

const Chain: React.FC = () => {
  const { t, dur, a } = useA(T.understood);
  const rise = ramp(t, a(T.waterRose) - 1, a(T.thoseBubbles), (x) => x);
  const erupt = ramp(t, a(T.releasingMore) - 0.5, a(T.releasingMore) + 1.5, easeOut);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: XL.mid - 260, y: XL.surf + 120, zoom: 1.05 }} accum={0.9} rise={rise} erupt={erupt} source={0.5} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(7,9,12,0.85) 0%, rgba(7,9,12,0.4) 32%, rgba(7,9,12,0) 50%)" }} />
      <Steps t={t} steps={[
        { text: "Deep, gas-rich water moves up", at: 0.6 },
        { text: "Pressure drops", at: a(T.waterRose) + 0.6 },
        { text: "CO₂ forms bubbles", at: a(T.dissolvedEscaped) },
        { text: "Bubbles lift more water", at: a(T.thoseBubbles) },
        { text: "Runaway release", at: a(T.releasingMore) + 0.4 },
      ]} />
      <Title x={120} y={100}><Kicker text="THE CHAIN REACTION" t={t} at={0.2} size={24} color={C.burgundyHi} /></Title>
      <IllustrationTag t={t} style={{ right: 70 * useU(), top: 60 * useU() }} />
    </AbsoluteFill>
  );
};

const NotConfirmed: React.FC = () => {
  const { t } = useShot();
  return <Hypotheses t={t + 20} a={-30} b={-30} verdict={20.6} />;
};

const VerdictShot: React.FC = () => {
  const { t, a } = useA(T.distinction);
  return <Verdict t={t} aAt={a(T.strongExpl)} bAt={a(T.identifying)} />;
};

/* ======================= CHAPTER 6 ======================= */

const MonounMap: React.FC = () => {
  const { t, dur, a } = useA(T.however);
  const u = useU();
  const v = keys(t, [
    [0, [10.3, 6.35, 150]],
    [a(T.twoYears) + 1.0, [10.36, 6.15, 95]],
    [a(T.monoun) + 0.8, [10.5, 5.75, 120]],
    [dur, [10.48, 5.9, 90]],
  ], easeInOut);
  const roll = ramp(t, a(T.twoYears), a(T.twoYears) + 1.1, easeInOut);
  const year = roll < 0.5 ? "1986" : roll < 0.75 ? "1985" : "1984";
  return (
    <AbsoluteFill>
      <GeoMap t={t} view={{ lon: v[0], lat: v[1], zoom: v[2], cx: 0.62 }} relief={1} lakes={1} cameroon={1} borders={0}
        labels={[
          { lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", sub: "21 AUG 1986", at: 0.4, kind: "lake", dx: 30, dy: -30 },
          { lon: MONOUN[0], lat: MONOUN[1], text: "Lake Monoun", sub: "15 AUG 1984 · 37 DEAD", at: a(T.monoun) + 0.2, kind: "lake", dx: 34, dy: -20 },
        ]}
        pins={[{ lon: NYOS[0], lat: NYOS[1], at: 0.3 }, { lon: MONOUN[0], lat: MONOUN[1], at: a(T.monoun), color: C.amber }]}
        arc={{ from: MONOUN, to: NYOS, p: ramp(t, a(T.n37) + 0.8, dur, easeInOut), label: "≈ 100 KM" }} />
      <Title x={120} y={170}>
        <Kicker text="THE FIRST WARNING" t={t} at={a(T.firstWarning)} size={24} color={C.paper} style={{ marginBottom: 14 * u }} />
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 200 * u, color: roll > 0.7 ? C.amber : C.paper, opacity: ramp(t, a(T.twoYears) - 0.4, a(T.twoYears)), fontVariantNumeric: "tabular-nums", filter: roll > 0.05 && roll < 0.95 ? `blur(${3 * u}px)` : undefined, lineHeight: 1 }}>{year}</div>
        <div style={{ marginTop: 40 * u, opacity: ramp(t, a(T.n37) - 0.2, a(T.n37) + 0.3) }}>
          <Stat t={t} at={a(T.n37) - 0.1} value="37" label="PEOPLE DIED" size={130} align="left" />
        </div>
      </Title>
    </AbsoluteFill>
  );
};

const MonounNotes: React.FC = () => {
  const { t, a } = useA(T.investigating);
  return (
    <CaseNotes t={t} header="CASE NOTES · LAKE MONOUN · 1984"
      lines={[
        { text: "EVENT:  sudden gas release, 15 Aug 1984", at: 0.5 },
        { text: "TOLL:   37 people", at: 1.9 },
        { text: "THEORY: CO₂ accumulated in deep water,", at: a(T.investigating) + 2.6 },
        { text: "        then escaped suddenly", at: a(T.investigating) + 4.1 },
        { text: "STATUS: poorly understood hazard", at: a(T.unusual) + 0.4, red: true },
      ]} />
  );
};

const ScaleShot: React.FC = () => {
  const { t, a } = useA(T.thenTwo);
  return <ScaleTimeline t={t} bAt={0.9} />;
};

const Urgent: React.FC = () => {
  const { t, a } = useA(T.notEnough);
  return <Statement t={t} kicker="BUT UNDERSTANDING WASN'T ENOUGH" lines={[{ text: "ANOTHER", at: a(T.urgent) }, { text: "URGENT PROBLEM", at: a(T.urgent) + 0.3, color: C.burgundyHi }]} size={130} />;
};

/* ======================= CHAPTER 7 ======================= */

const Refill: React.FC = () => {
  const { t, dur, a } = useA(T.ifCO2);
  const u = useU();
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: XL.mid + 40, y: XL.surf + 150, zoom: 1.12 }} accum={lerp(0.15, 0.7, ramp(t, a(T.stillEntering), dur, (x) => x))} source={ramp(t, a(T.continued), a(T.stillEntering) + 0.5)} layers={0.5}
        labels={[{ text: "CO₂ STILL SEEPING IN", x: XL.mid + 140, y: XL.bottom + 170, at: a(T.stillEntering) + 0.4, ax: XL.mid + 30, ay: XL.bottom + 110 },
          { text: "IT COULD BUILD UP AGAIN", x: XL.n + 40, y: XL.bottom - 40, at: a(T.overTime) }]} />
      <Title x={120} y={170}>
        <div style={{ opacity: 1 - ramp(t, a(T.continued) - 0.4, a(T.continued)) }}>
          <H1 size={96}><Reveal text="COULD IT" t={t} at={a(T.prevent)} /><br /><Reveal text="HAPPEN AGAIN?" t={t} at={a(T.prevent) + 0.25} wordStyle={(i) => (i === 1 ? { color: C.burgundyHi } : undefined)} /></H1>
        </div>
      </Title>
      <IllustrationTag t={t} style={{ right: 70 * u, top: 60 * u }} />
    </AbsoluteFill>
  );
};

const ConceptShot: React.FC = () => {
  const { t, a } = useA(T.needed);
  return <Concept t={t} bAt={a(T.solution) - 1.5} />;
};

const PipeEngineering: React.FC = () => {
  const { t, dur, a } = useA(T.pipes);
  const u = useU();
  const build = ramp(t, a(T.special) - 0.2, a(T.special) + 2.0, easeInOut);
  const flow = ramp(t, a(T.broughtUp), a(T.broughtUp) + 1.2);
  const zoomIn = ramp(t, a(T.broughtUp) + 0.5, a(T.controlled), easeInOut) * (1 - ramp(t, a(T.insteadOf), a(T.insteadOf) + 1.6, easeInOut));
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: lerp(XL.mid, XL.mid + 10, zoomIn), y: lerp(XL.surf + 120, XL.surf + 20, zoomIn), zoom: lerp(1.05, 2.1, zoomIn) }}
        accum={0.75} deplete={ramp(t, a(T.gradual), dur + 4, (x) => x) * 0.5} pipe={build} pipeFlow={flow} pipes={1}
        labels={[
          { text: "PIPE TO THE DEEP, GAS-RICH WATER", x: XL.mid + 60, y: XL.bottom - 10, at: a(T.special) + 1.0, out: a(T.broughtUp) + 0.4, ax: XL.mid + 14, ay: XL.bottom - 40 },
          { text: "PRESSURE FALLS AS WATER RISES", x: XL.mid + 40, y: XL.surf + 70, at: a(T.broughtUp) + 1.2, out: a(T.controlled) + 0.2, ax: XL.mid + 10, ay: XL.surf + 90 },
          { text: "BUBBLES KEEP THE FLOW GOING", x: XL.mid + 40, y: XL.surf + 70, at: a(T.controlled) + 0.8, out: a(T.insteadOf), ax: XL.mid + 10, ay: XL.surf + 60 },
          { text: "CONTROLLED RELEASE AT THE SURFACE", x: XL.mid + 60, y: XL.surf - 100, at: a(T.controlled), ax: XL.mid + 12, ay: XL.surf - 50 },
        ]} />
      <Title x={120} y={140}>
        <div style={{ opacity: 1 - ramp(t, a(T.special) + 1.2, a(T.special) + 1.8) }}><H1 size={150}><Reveal text="PIPES." t={t} at={0.05} /></H1></div>
      </Title>
      <IllustrationTag t={t} style={{ right: 70 * u, top: 60 * u }} />
    </AbsoluteFill>
  );
};

const Photo2001: React.FC = () => {
  const { t, dur } = useShot();
  const u = useU();
  return (
    <AbsoluteFill>
      <PhotoPrint src="photos/usgs_evans_2001_degassing.jpg" t={t} dur={dur} credit="LAKE NYOS DEGASSING PLATFORM · 2001 · W. EVANS / USGS · PUBLIC DOMAIN" tag="2001" w={1100} aspect={0.756} rot={-1.4} x={0.63} />
      <Title x={120} y={380}><H1 size={170} color={C.amber}><Reveal text="2001" t={t} at={0.3} /></H1><Kicker text="FIRST PERMANENT DEGASSING PIPE" t={t} at={0.9} size={20} /></Title>
    </AbsoluteFill>
  );
};

const ThreePipes: React.FC = () => {
  const { t, dur, a } = useA(T.y2011);
  const u = useU();
  const dep = ramp(t, a(T.reduce), dur, (x) => x);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: XL.mid + 140, y: XL.surf + 110, zoom: 1.0 }} accum={0.75} deplete={0.5 + 0.45 * dep} pipe={0.34 + 0.66 * ramp(t, 0.3, 2.2, easeInOut)} pipes={3} pipeFlow={1}
        labels={[{ text: "+2 PIPES · 2011", x: XL.n + 50, y: XL.surf - 120, at: 0.8 }, { text: "STORED GAS REDUCED", x: XL.n + 50, y: XL.bottom - 40, at: a(T.reduce) + 0.6 }]} />
      <Title x={120} y={140}><H1 size={150} color={C.amber}><Reveal text="2011" t={t} at={0.2} /></H1></Title>
      <IllustrationTag t={t} style={{ right: 70 * u, top: 60 * u }} />
    </AbsoluteFill>
  );
};

const CraterDay: React.FC = () => {
  const { t, dur } = useShot();
  const ang = lerp(2.4, 2.9, t / dur);
  const c: Cam = { pos: [CX + Math.sin(ang) * 3.0, 2.7, CZ + Math.cos(ang) * 3.0], target: [CX, 1.0, CZ], fov: 40 };
  return (
    <TerrainShot ds="crater" sky="day" cam={() => c} state={() => ({ night: 0, gas: 0, gasAmt: 0, lights: 0, haze: 0.04, hazeColor: "#8d969c", exposure: 1.12 })}>
      <Shade top={0.2} bottom={0.3} />
    </TerrainShot>
  );
};

/* ======================= CHAPTER 8 ======================= */

const RegionNight: React.FC = () => {
  const { t, dur, a } = useA(T.doesntEnd);
  const c = keys(t, [[0, [LX - 6, 9, LZ + 10, LX, 0.8, LZ - 3, 44]], [dur, [LX - 3, 7.5, LZ + 9, LX + 0.5, 0.8, LZ - 4, 44]]], easeInOut);
  return (
    <TerrainShot cam={() => cam7(c)} state={() => ({ night: 1, gas: 0, gasAmt: 0, lights: 0.8, haze: 0.03, hazeColor: "#0b1420" })}>
      <Shade top={0.4} bottom={0.4} />
      <Title align="center" y={400}><H1 size={84}><Reveal text="NOT EVERY DISASTER" t={t} at={a(T.notEvery)} /><br /><Reveal text="COMES WITH A WARNING" t={t} at={a(T.notEvery) + 0.4} wordStyle={() => ({ color: C.gas })} /></H1></Title>
    </TerrainShot>
  );
};

const DeepSlow: React.FC = () => {
  const { t, dur, a } = useA(T.slowly);
  const cam = keys(t, [[0, [XL.mid, XL.bottom - 40, 2.2]], [dur, [XL.mid, XL.surf - 60, 1.15]]], easeInOut);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: cam[0], y: cam[1], zoom: cam[2] }} accum={lerp(0.1, 0.5, t / dur)} source={0.6} layers={0.6} />
      <Title x={120} y={160}><Kicker text="SLOWLY · SILENTLY · OUT OF SIGHT" t={t} at={a(T.slowly) + 2.0} size={24} color={C.paper} /></Title>
    </AbsoluteFill>
  );
};

const Landsat: React.FC = () => {
  const { t, dur } = useShot();
  return (
    <PhotoFull src="photos/nasa_landsat8_2014_lake_nyos_lrg.jpg" t={t} dur={dur} from={[2.4, 52, 46.5]} to={[3.6, 52, 46.5]} grade={0.6}
      credit="LAKE NYOS FROM ORBIT · 18 DEC 2014 · LANDSAT 8 OLI · NASA EARTH OBSERVATORY (J. ALLEN) / USGS · PUBLIC DOMAIN" />
  );
};

const TodayOrbit: React.FC = () => {
  const { t, dur } = useShot();
  const ang = lerp(-0.9, -0.2, t / dur);
  const c: Cam = { pos: [CX + Math.sin(ang) * 2.4, 1.9, CZ + Math.cos(ang) * 2.4], target: [CX, 1.0, CZ], fov: 40 };
  return (
    <TerrainShot ds="crater" sky="day" cam={() => c} state={() => ({ night: 0.05, gas: 0, gasAmt: 0, lights: 0, haze: 0.045, hazeColor: "#8d969c", exposure: 1.12 })}>
      <Shade top={0.3} bottom={0.3} />
      <Title x={120} y={110}><Kicker text="LAKE NYOS · TODAY" t={t} at={0.5} size={24} color={C.paper} /></Title>
    </TerrainShot>
  );
};

const Memorial: React.FC = () => {
  const { t, dur } = useShot();
  const { height: H } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <DotField t={t * 1.4} area={{ x: 0.12, y: 0.12, w: 0.76, h: 0.5 }} dim={ramp(t, dur - 3, dur)} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.68, display: "flex", justifyContent: "center" }}>
        <Stat t={t} at={0.4} value="1,700+" label="LIVES · 21 AUGUST 1986" size={130} />
      </div>
    </AbsoluteFill>
  );
};

const GlobeOut: React.FC = () => {
  const { t, dur } = useShot();
  const v = keys(t, [[0, [10.3, 6.4, 25]], [dur, [14, 8, 0.9]]], easeInOut);
  const lz = Math.log10(v[2]);
  return <GeoMap t={t} view={{ lon: v[0], lat: v[1], zoom: v[2] }} relief={ramp(lz, 0.9, 1.2)} cameroon={1} lakes={ramp(lz, 1.0, 1.3)} pins={[{ lon: NYOS[0], lat: NYOS[1], at: 0 }]} labels={[{ lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", at: 0.3, out: dur - 2.5, kind: "lake", dx: 30, dy: -30 }]} />;
};

const FinalCrater: React.FC = () => {
  const { t, dur, a } = useA(T.lakeStill);
  const c = keys(t, [[0, [CX + 2.0, 2.3, CZ + 2.2, CX, 1.0, CZ - 0.2, 40]], [dur, [CX + 0.3, 1.35, CZ + 0.6, CX - 0.1, 1.02, CZ - 0.5, 40]]], easeInOut);
  const n = ramp(t, 0, dur);
  return (
    <TerrainShot ds="crater" sky="dusk" cam={() => cam7(c)} state={() => ({ night: 0.2 + 0.6 * n, gas: 0, gasAmt: 0, lights: 0, haze: 0.05, hazeColor: "#2a2e38", exposure: 1.05 })}>
      <Shade top={0.4} bottom={0.4} />
      <Title x={120} y={700}>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 72 * useU(), color: C.paper }}>
          <Reveal text="The lake is still there." t={t} at={0.2} out={a(T.butNow) - 0.4} />
        </div>
      </Title>
    </TerrainShot>
  );
};

const FinalBeneath: React.FC = () => {
  const { t, dur, a } = useA(T.greatest + 0.3);
  const cam = keys(t, [[0, [XL.mid, XL.surf - 50, 1.5]], [dur, [XL.mid, XL.bottom - 80, 1.9]]], easeInOut);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: cam[0], y: cam[1], zoom: cam[2] }} accum={0.45} layers={0.5} dim={ramp(t, dur - 1.5, dur)} />
      <Title align="center" y={440}>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 80 * useU(), color: C.paper, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
          <Reveal text="building silently beneath the surface" t={t} at={a(T.building) + 0.8} stagger={0.12} dur={1.0} />
        </div>
      </Title>
    </AbsoluteFill>
  );
};

const Closed: React.FC = () => {
  const { t, dur } = useShot();
  return <FileSeal t={t} dur={dur} mode="close" />;
};
