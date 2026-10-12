import React from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import tokens from "../data/long.tokens.json";
import { makeCues } from "../lib/cues";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, keys, lerp, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { Shot } from "../components/Shot";
import { FilmLook, Preload } from "../components/FilmLook";
import { IllustrationTag, Kicker, Reveal, Stat, useU } from "../components/Type";
import { PhotoFull, PhotoPrint } from "../components/Photo";
import { Chapter, FileSeal } from "../components/Brand";
import { SpaceShot } from "../components/SpaceShot";
import { Helmet, GravityCompare, S as HS, helmetPoint } from "../components/Helmet";
import { SuitSystem, EvaClock, N } from "../components/SuitSystem";
import { Comms, Repress, WaterVision, WaterBackdrop, WarningTimeline, Fixes } from "../components/Parts";
import { V3, SpaceState } from "../three/Space";

const { at } = makeCues(tokens);
export const LONG_DURATION = 677.0;

// ── cue points (seconds into the joined narration: Part 1 + 0.75 s + Part 2) ──────────────
const T = {
  imagine: at("Imagine floating"), below: at("Below you"), around: at("Around you"), wearing: at("You're wearing a spacesuit"),
  suddenly: at("And suddenly"), backOfHead: at("touching the back of your head"), harmless: at("At first, it seems harmless"),
  sweat0: at("Maybe it's sweat"), bag0: at("Maybe your drinking bag"), spread0: at("the water begins to spread"),
  ears0: at("It reaches your ears"), eyes0: at("your eyes", 28), nose0: at("your nose", 28), barely0: at("you can barely see"),
  contact: at("You try to contact"), failing0: at("communication system is failing"), outside0: at("and you're still outside"),
  scifi: at("This isn't a science fiction"), july: at("On July 16th"), faced: at("an astronaut faced"), iss0: at("aboard the International Space Station"),
  name: at("His name was Luca"), ocean: at("you don't need an ocean"), fileTwo: at("This is File Two"),
  begins: at("Our story begins"), issOrbit: at("The International Space Station was orbiting"), countries: at("carrying astronauts"),
  among: at("Among them was Luca"), italian: at("an Italian astronaut"), before: at("Before becoming an astronaut"), pilot: at("military test pilot"),
  trained: at("He was highly trained"), nothing: at("but nothing could have"), thatDay: at("That day, Luca and NASA"), mission: at("The mission involved"),
  installing: at("installing and routing"), challenging: at("Spacewalks are among"), noAir: at("there is no breathable atmosphere"),
  temperature: at("The temperature environment"), movement: at("every movement must"), notClothing: at("A spacesuit isn't simply"),
  lifeSupport: at("self-contained life support"), oxygen: at("It supplies oxygen"), pressure: at("maintains pressure"), co2: at("removes carbon dioxide"),
  regulate: at("helps regulate"), minor: at("Even something that seems minor"),
  began: at("But as Luca began"), moved: at("He moved along the exterior"), progress: at("He was making excellent progress"), ahead: at("running ahead of schedule"),
  m44: at("approximately 44 minutes"), reported: at("Luca reported something"), feelWater: at("He could feel water"), insideHelmet: at("inside his helmet", 160),
  nobody: at("nobody understood"), bag: at("One possibility was his drinking bag"), hydrated: at("Astronauts carry water"), leaked: at("Maybe a small amount"),
  sweat: at("Another possibility was sweat"), neither0: at("Neither explanation"), cold: at("The water felt unusually cold"), increasing: at("it appeared to be increasing"),
  mcc1: at("Luca continued communicating"), cassidy: at("His fellow astronaut, Chris Cassidy"), serious: at("But the situation was gradually"),
  collecting: at("Water was collecting"), weightless: at("And in weightlessness"), onEarth: at("On Earth, spilled water"), noDown: at("there is no familiar downward"),
  cling: at("Water can cling"), masses: at("form floating masses"), sealed: at("once water begins collecting inside a sealed"), think: at("Think about that"),
  cannotRemove: at("You're wearing a helmet that you cannot"), vacuum: at("You're surrounded by the vacuum"), cantTake: at("You can't simply take"),
  cantReach: at("you can't reach inside"), fresh: at("fresh air"),
  accumulating: at("As the water continued accumulating"), endEarly: at("decided to end the spacewalk early"), instructed: at("Luca was instructed"),
  solution: at("That should have been the solution"), nightmare: at("But getting back was about"), startedMoving: at("As Luca started moving"),
  shifted: at("the water shifted"), coverEyes: at("It began covering his eyes"), blurred: at("His vision became increasingly blurred"),
  ears: at("Then, water reached his ears"), commProblems: at("communication system began experiencing"), faintly: at("but increasingly faintly"),
  hearHim: at("They also had difficulty"), navigate: at("Now imagine trying to navigate"), walkBack: at("You cannot simply walk back"),
  handholds: at("Every movement involves handholds"), worse: at("Then, something happened"), nightSide: at("The station moved into the night side"),
  sunlight: at("The sunlight disappeared"), surrounded: at("Luca was now surrounded by darkness"), visor: at("The water across his visor"),
  orbitalNight: at("With the station in orbital night"), nose: at("the water moved over his nose"), firstTime: at("For the first time, Luca faced"),
  getBack: at("He needed to get back"), another: at("But there was another problem"), direction: at("which direction"), eyesUseless: at("His eyes were almost useless"),
  stillOutside: at("and he was still outside the station"), moment: at("This was the moment"), panicking: at("Instead of panicking"),
  tether: at("He remembered his safety tether"), line: at("The line that kept him"), guide: at("He began using it as a guide"), slowly: at("moving slowly"),
  breathing: at("trying to keep his breathing"), towardAirlock: at("carefully making his way toward the airlock"), lastResort: at("At one point, he considered"),
  vent: at("could he partially vent"), risks: at("would introduce enormous risks"), hoped: at("It was an option he hoped"), continued: at("So he continued moving"),
  finally: at("Finally, through the water"), entrance: at("part of the airlock entrance"), close: at("He was close"), movedInside: at("Luca moved inside"),
  notOver: at("But the danger wasn't completely over"), cassidyReturn: at("Chris Cassidy still needed"), closed: at("The airlock had to be closed"),
  pressurized: at("the chamber had to be pressurized"), hearing: at("Inside his helmet,", 420), unreliable: at("His communication became increasingly unreliable"),
  lostAudio: at("he lost audio contact"), waited: at("So he waited"), safePressure: at("the airlock reached a safe pressure"), innerHatch: at("The inner hatch opened"),
  crewmates: at("His crewmates moved quickly"), removed: at("They removed his helmet"), free: at("Luca was free of the water"), survived: at("He had survived"),
  m100: at("Approximately 100 minutes"), question: at("NASA faced another question"), how: at("How could a spacesuit"), engineers: at("Engineers began investigating"),
  examined: at("They examined the helmet"), uncovered: at("eventually uncovered the problem"), coolingSys: at("The spacesuit contained a cooling system"),
  separated: at("Normally, that water should remain"), blocked: at("But a component responsible for separating"), blockedWord: at("had become blocked"),
  silica: at("silica and silicate"), separator: at("tiny openings in a separator"), result: at("As a result, cooling water"), carried: at("the ventilation system carried"),
  endIncident: at("By the end of the incident"), liters: at("one and a half liters"), startling: at("That's a startling amount"),
  somethingElse: at("revealed something else"), troubling: at("even more troubling"), earlier: at("There had been an earlier warning"), previous: at("During a previous spacewalk"),
  atTheTime: at("At the time, the crew"), replaced: at("So the drinking bag was replaced"), possibility: at("The possibility of a more serious"),
  neither: at("neither drinking bag had been leaking"), pointed: at("The warning had pointed"), findings: at("NASA's investigation identified"),
  shortcomings: at("but also shortcomings"), smallAmounts: at("Small amounts of water"), familiarity: at("That familiarity"), anticipated: at("had not anticipated"),
  corrective: at("The incident led to extensive"), improved: at("improved procedures"), himself: at("is Luca himself"), imaginePressure: at("Imagine the physical"),
  outsideStation: at("You're outside the space station"), barelySee: at("You can barely see", 600), hearingFail: at("Your hearing and communication"),
  filling: at("Your helmet is filling"), calm: at("you have no choice but to stay calm"), training: at("You need to remember your training"),
  trust: at("Trust your equipment"), exactly: at("Luca did exactly that"), years: at("Years of preparation"), groundTeam: at("and the response of the ground team"),
  closeCall: at("NASA would later classify"), reminder: at("And it serves as a powerful"), sometimes: at("Sometimes the greatest threat"),
  meteorite: at("isn't a meteorite"), explosion: at("or a spacecraft explosion"), endless: at("or the endless vacuum"), water: at("Sometimes it's water"),
  veryThing: at("The very thing that makes life"), nearly: at("nearly took an astronaut's life"), wasFile: at("This was file two"),
};

const PH = (f: string) => `photos/${f}.jpg`;
const PHOTOS = [
  "iss036e016704", "iss036e020862", "jsc2013e007948", "iss036e014792", "iss036e016630", "nasa_eva_23_1_cassidy_parmitano_equipment_lock_pre_eva_iss036e020200",
  "iss036e016610", "iss036e020926", "nasa_eva_23_6_cassidy_inspecting_parmitano_as_he_finishes_drink_bag_pet_55_min", "jsc2013e066455", "jsc2013e066476",
  "nasa_eva_23_5_parmitano_doing_reach_test_from_cassidy_helmet_cam", "iss036e017389", "nasa_eva_23_7_parmitano_back_at_airlock_from_helmet_cam",
  "nasa_eva_23_8_parmitano_helmet_cam_about_to_enter_crew_lock", "nasa_eva_23_9_parmitano_external_camera_view_entering_crew_lock", "iss036e019885",
  "iss036e019889", "nasa_eva_23_11_parmitano_assisted_by_nyberg_yurchikhin_post_eva_iss036e019630", "iss036e037249", "iss036e037243",
  "nasa_eva_23_13_vent_port_post_eva_iss036e019737", "nasa_eva_23_14_particulate_in_fan_pump_sep", "iss036e016853", "mib_report_cover", "iss036e019886",
  "iss036e019555", "jsc2013e066479", "nasa_eva_23_12_water_drops_in_helmet_iss036e019744",
].map(PH);

// ── 3D staging (same station layout as the short) ───────────────────────────────────────
const A: V3 = [24.5, 5.2, -9];
const AROT: V3 = [0.2, -2.214, 0.15];
const AC: V3 = [A[0], A[1] + 0.95, A[2]];
const CAS: V3 = [27.2, 4.9, -14.5]; // Chris Cassidy, further along the truss
const CASROT: V3 = [0.1, -1.6, -0.1];
const issAt = { pos: [0, 0, 0] as V3, rot: [0, 0, 0] as V3 };
const earth = (t: number) => 1.2 + t * 0.00116;
const addV = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mixV = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
const logDolly = (target: V3, dir: V3, d0: number, d1: number, p: number): V3 => {
  const n = Math.hypot(...dir);
  const d = Math.exp(lerp(Math.log(d0), Math.log(d1), p));
  return [target[0] + (dir[0] / n) * d, target[1] + (dir[1] / n) * d, target[2] + (dir[2] / n) * d];
};
const crew = (time: number, lamps = 0, lucaPos: V3 = A, withCassidy = true): SpaceState["astro"] => {
  const bob = Math.sin(time * 0.6) * 0.04;
  const list: NonNullable<SpaceState["astro"]> = [{ pos: [lucaPos[0], lucaPos[1] + bob, lucaPos[2]], rot: [AROT[0], AROT[1] + Math.sin(time * 0.2) * 0.04, AROT[2]], lamps }];
  if (withCassidy) list.push({ pos: [CAS[0], CAS[1] - bob, CAS[2]], rot: CASROT, lamps });
  return list;
};
// tether: Luca's waist to a handrail on the truss toward the airlock side
const TETHER_TO: V3 = [25.4, 4.6, -2.5];
const tetherFrom = (p: V3): V3 => addV(p, [0.1, 0.95, 0.05]);

// ── typography ─────────────────────────────────────────────────────────────────────────
type Line = { text: string; at: number; color?: string; size?: number };
const Headline: React.FC<{ t: number; kicker?: string; kAt?: number; lines: Line[]; top?: number; out?: number; align?: "center" | "left"; x?: number }> = ({
  t, kicker, kAt = 0, lines, top = 0.12, out, align = "center", x,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.5) : 1;
  const style: React.CSSProperties = align === "center"
    ? { left: 120 * u, right: 120 * u, textAlign: "center" }
    : { left: (x ?? 0.07) * W, width: W * 0.42, textAlign: "left" };
  return (
    <div style={{ position: "absolute", top: H * top, opacity: o, ...style }}>
      {kicker && <Kicker text={kicker} t={t} at={kAt} size={24} color={C.paper} style={{ marginBottom: 22 * u, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }} />}
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (l.size ?? 96) * u, lineHeight: 1.02, color: l.color ?? C.paper, letterSpacing: "-0.01em", textShadow: "0 6px 40px rgba(0,0,0,0.75)" }}>
          <Reveal text={l.text} t={t} at={l.at} />
        </div>
      ))}
    </div>
  );
};
/** small factual notes stacked on the left, each typed on at its cue */
const Notes: React.FC<{ t: number; items: { text: string; at: number; color?: string }[]; x?: number; y?: number; size?: number; out?: number }> = ({ t, items, x = 0.07, y = 0.3, size = 30, out }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.5) : 1;
  return (
    <div style={{ position: "absolute", left: W * x, top: H * y, opacity: o }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 * u, marginBottom: 26 * u, opacity: ramp(t, it.at, it.at + 0.4) }}>
          <div style={{ width: 10 * u, height: 10 * u, background: it.color ?? C.burgundyHi }} />
          <Kicker text={it.text} t={t} at={it.at} size={size} color={C.paper} style={{ textShadow: "0 2px 14px rgba(0,0,0,0.9)" }} />
        </div>
      ))}
    </div>
  );
};
const Tag: React.FC<{ t: number; text: string }> = ({ t, text }) => {
  const u = useU();
  return <IllustrationTag t={t} text={text} style={{ right: 70 * u, top: 64 * u }} />;
};
const useAbs = (from: number) => {
  const t = useT();
  return { t, abs: t + from };
};

// ── reusable shot kinds ────────────────────────────────────────────────────────────────
type Fn = (abs: number) => React.ReactNode;
const Space3D: React.FC<{ from: number; state: (abs: number, tt: number) => Omit<SpaceState, "time">; labels?: { p: V3; text: string; sub?: string; at: number; out?: number }[]; tag?: string; over?: Fn; res?: number }> = ({
  from, state, labels = [], tag = "3D RECREATION", over, res = 0.5,
}) => {
  const { t, abs } = useAbs(from);
  return (
    <SpaceShot res={res} state={(tt) => state(tt + from, tt)} labels={labels.map((l) => ({ ...l, at: l.at - from, out: l.out !== undefined ? l.out - from : undefined }))}>
      {over?.(abs)}
      <Tag t={t} text={tag} />
    </SpaceShot>
  );
};
const Photo: React.FC<{ from: number; dur: number; src: string; credit: string; kb?: [[number, number, number], [number, number, number]]; over?: Fn; grade?: number }> = ({ from, dur, src, credit, kb, over, grade }) => {
  const { t, abs } = useAbs(from);
  return (
    <AbsoluteFill>
      <PhotoFull src={PH(src)} t={t} dur={dur} from={kb?.[0]} to={kb?.[1]} credit={credit} grade={grade} />
      {over?.(abs)}
    </AbsoluteFill>
  );
};
const Print: React.FC<{ from: number; dur: number; src: string; credit: string; aspect: number; w?: number; rot?: number; x?: number; tag?: string; over?: Fn }> = ({ from, dur, src, credit, aspect, w = 1200, rot = -1.5, x = 0.5, tag = "ARCHIVE", over }) => {
  const { t, abs } = useAbs(from);
  return (
    <AbsoluteFill>
      <PhotoPrint src={PH(src)} t={t} dur={dur} credit={credit} aspect={aspect} w={w} rot={rot} x={x} tag={tag} />
      {over?.(abs)}
    </AbsoluteFill>
  );
};
const HelmetShot: React.FC<{ from: number; render: (abs: number, t: number) => React.ReactNode; over?: Fn; tag?: string }> = ({ from, render, over, tag = "ILLUSTRATION" }) => {
  const { t, abs } = useAbs(from);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {render(abs, t)}
      {over?.(abs)}
      <Tag t={t} text={tag} />
    </AbsoluteFill>
  );
};
const Dark: React.FC<{ from: number; over: Fn; water?: boolean }> = ({ from, over, water }) => {
  const { t, abs } = useAbs(from);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #16202c 0%, ${C.ink} 78%)` }}>
      {water && <AbsoluteFill style={{ opacity: 0.45 }}><WaterBackdrop t={t} /></AbsoluteFill>}
      {over(abs)}
    </AbsoluteFill>
  );
};
const ChapterAt: React.FC<{ from: number; n: number; title: string; top?: boolean }> = ({ from, n, title, top }) => {
  const { t } = useAbs(from);
  return <Chapter t={t} n={n} title={title} dur={5} top={top} />;
};
const Local: React.FC<{ from: number; render: (t: number, abs: number) => React.ReactNode }> = ({ from, render }) => {
  const { t, abs } = useAbs(from);
  return <>{render(t, abs)}</>;
};

// helmet placed in the right half of a 16:9 frame (text lives on the left)
const HX = 300;
const ear = helmetPoint(HS.ear, 70), eye = helmetPoint(HS.eyes, 40), noseP = helmetPoint(HS.nose, 30), mouthP = helmetPoint(HS.mouth, 30);
const VENT_LABEL = { text: "VENTILATION INLET", x: 60, y: 250, ax: 300, ay: 360 };

// ── the timeline ───────────────────────────────────────────────────────────────────────
type S = { from: number; to: number; inT?: "fade" | "blur" | "push" | "cut" | "dip"; outT?: "fade" | "blur" | "push" | "cut" | "dip"; fadeIn?: number; fadeOut?: number; el: (from: number, to: number) => React.ReactNode };

const SHOTS: S[] = [
  // ═════ COLD OPEN ═════
  { from: 0, to: 6.5, fadeIn: 1.2, el: (f) => (
    <Space3D from={f} state={(a, tt) => {
      const p = easeInOut(clamp(tt / 6.5));
      return { cam: { pos: addV(A, mixV([9, 3.2, 7.5], [6.5, 2.4, 5.6], p)), target: mixV(addV(AC, [0, 0.6, 0]), addV(AC, [0, -2.2, 0]), ramp(a, T.below - 0.3, T.below + 2.2)), fov: 34 },
        sun: 0.5, sunAz: 0.7, earthRot: earth(a), iss: issAt, astro: crew(a, 0, A, false) };
    }} />
  ) },
  { from: 6.4, to: 10.0, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: addV(A, [3.4, -0.6, 2.6]), target: addV(AC, [-0.4, 2.6 + tt * 0.15, -0.6]), fov: 40, roll: 0.05 }, sun: 0.35, sunAz: 2.4, earthRot: earth(a), iss: issAt, astro: crew(a, 0, A, false), stars: 1.3 })} />
  ) },
  { from: 9.9, to: 15.5, inT: "blur", el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e016704" credit="NASA · ISS036-E-016704 · LUCA PARMITANO, EVA 22 · JULY 9, 2013" kb={[[1.05, 50, 30], [1.18, 50, 26]]}
      over={(a) => <Headline t={a} align="left" top={0.62} lines={[{ text: "A SUIT BUILT FOR", at: T.wearing + 0.4, size: 64 }, { text: "THE VACUUM", at: T.wearing + 0.8, size: 64 }]} />} />
  ) },
  { from: 15.4, to: 25.3, el: (f) => (
    <HelmetShot from={f} render={(a) => (
      <Helmet t={a} water={keys(a, [[T.backOfHead, 0], [T.harmless, 0.1], [T.spread0, 0.18]])} vent={1} ventWater={ramp(a, T.suddenly, T.suddenly + 0.6)} drinkValve={ramp(a, T.bag0 - 0.2, T.bag0 + 0.3)}
        cam={{ x: HX, y: 560, zoom: lerp(1.0, 1.08, ramp(a, f, f + 10)) }}
        labels={[{ ...VENT_LABEL, at: T.backOfHead }, { text: "SWEAT?", x: 480, y: 300, at: T.sweat0, ax: 520, ay: 380 }, { text: "DRINK BAG?", x: 690, y: 880, at: T.bag0, ax: 716, ay: 718 }]} />
    )} over={(a) => <Headline t={a} align="left" top={0.3} kicker="INSIDE THE HELMET" kAt={T.suddenly} lines={[{ text: "WATER", at: T.suddenly + 0.5, size: 150, color: "#9fd4ea" }]} />} />
  ) },
  { from: 25.2, to: 32.0, el: (f) => (
    <HelmetShot from={f} render={(a) => (
      <Helmet t={a} water={keys(a, [[f, 0.2], [T.ears0, 0.5], [T.eyes0, 0.72], [T.nose0, 0.9], [32, 1]])} shift={keys(a, [[T.spread0, 0], [T.ears0 + 0.3, 0.2], [T.eyes0 + 0.3, 0.6], [T.nose0 + 0.3, 1]])}
        cam={{ x: HX + 40, y: 550, zoom: 1.12 }}
        labels={[{ text: "EARS", x: ear.x - 160, y: ear.y - 70, ax: ear.x, ay: ear.y, at: T.ears0 }, { text: "EYES", x: eye.x + 70, y: eye.y - 90, ax: eye.x, ay: eye.y, at: T.eyes0 }, { text: "NOSE", x: noseP.x + 80, y: noseP.y + 20, ax: noseP.x, ay: noseP.y, at: T.nose0 }]} />
    )} over={(a) => <Headline t={a} align="left" top={0.3} kicker="MICROGRAVITY" kAt={T.spread0} lines={[{ text: "IT SPREADS", at: T.spread0 + 0.4, size: 110 }]} />} />
  ) },
  { from: 31.9, to: 35.3, el: (f) => (
    <Space3D from={f} res={0.45} state={(a, tt) => ({ cam: { pos: addV(AC, [0.3, 0.75, 0.2]), target: [12 + tt * 0.6, 2, 3], fov: 50, roll: 0.05 * Math.sin(tt * 1.3) }, sun: 0.3, sunAz: 0.6, earthRot: earth(a), iss: issAt, astro: [] })}
      tag="3D RECREATION · POINT OF VIEW" over={(a) => <><WaterVision t={a} amount={lerp(0.6, 0.95, ramp(a, f, f + 2.5))} /><Headline t={a} top={0.42} lines={[{ text: "NO VISIBILITY", at: T.barely0 + 0.2, size: 120 }]} /></>} />
  ) },
  { from: 35.2, to: 40.4, el: (f) => <Local from={f} render={(t, a) => <Comms t={t} fail={keys(a, [[T.contact, 0.15], [T.failing0, 0.5], [40.4, 0.85]])} />} /> },
  { from: 40.3, to: 43.3, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: logDolly(AC, [0.8, 0.3, 0.6], 9, 26, easeOut(clamp(tt / 3))), target: AC, fov: 34 }, sun: 0.45, sunAz: 0.7, earthRot: earth(a), iss: issAt, astro: crew(a, 0, A, false) })}
      over={(a) => <Headline t={a} top={0.12} kicker="STILL OUTSIDE" kAt={T.outside0 + 0.4} lines={[]} />} />
  ) },
  { from: 43.2, to: 48.0, inT: "dip", el: (f) => (
    <Dark from={f} over={(a) => <Headline t={a} top={0.36} kicker="NOT SCIENCE FICTION" kAt={T.scifi + 0.3} lines={[{ text: "JULY 16, 2013", at: T.july, size: 150 }]} />} />
  ) },
  { from: 47.9, to: 53.1, inT: "blur", el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e020862" credit="NASA · ISS036-E-020862 · LUCA PARMITANO DURING EVA 23 · JULY 16, 2013" kb={[[1.04, 50, 50], [1.14, 55, 45]]}
      over={(a) => <Headline t={a} align="left" top={0.14} kicker="EVA 23" kAt={T.faced} lines={[{ text: "INTERNATIONAL", at: T.iss0 + 0.2, size: 80 }, { text: "SPACE STATION", at: T.iss0 + 0.5, size: 80 }]} />} />
  ) },
  { from: 53.0, to: 57.0, el: (f, to) => (
    <Photo from={f} dur={to - f} src="jsc2013e007948" credit="NASA / JAMES BLAIR · OFFICIAL PORTRAIT · JAN 2013" kb={[[1.05, 50, 30], [1.12, 50, 28]]}
      over={(a) => <Headline t={a} align="left" x={0.06} top={0.6} kicker="ESA ASTRONAUT · ITALY" kAt={T.name + 0.6} lines={[{ text: "LUCA PARMITANO", at: T.name + 0.2, size: 96 }]} />} />
  ) },
  { from: 56.9, to: 60.2, el: (f) => (
    <Dark from={f} water over={(a) => <Headline t={a} top={0.4} lines={[{ text: "NO OCEAN REQUIRED", at: T.ocean + 0.3, size: 110 }]} />} />
  ) },
  { from: 60.1, to: 64.2, fadeOut: 0.8, el: (f, to) => <Local from={f} render={(t) => <FileSeal t={t} dur={to - f} mode="open" />} /> },

  // ═════ CH.1 THE MISSION ═════
  { from: 64.1, to: 72.0, fadeIn: 1.0, el: (f) => (
    <Space3D from={f} state={(a, tt) => {
      const ang = 0.9 + tt * 0.025;
      return { cam: { pos: [18 + 150 * Math.cos(ang), 46, 150 * Math.sin(ang)], target: [18, -4, 0], fov: 34 }, sun: 0.55, sunAz: 0.5, earthRot: earth(a), iss: issAt, astro: [] };
    }} labels={[{ p: [18, 6, 0], text: "INTERNATIONAL SPACE STATION", sub: "ALTITUDE ≈ 420 KM", at: T.issOrbit }]}
      over={(a) => <ChapterAt from={64.1} n={1} title="The Mission" />} />
  ) },
  { from: 71.9, to: 76.9, inT: "blur", el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e014792" credit="NASA · ISS036-E-014792 · PARMITANO AND CASSIDY IN THE DESTINY LABORATORY · JULY 3, 2013" kb={[[1.04, 50, 50], [1.12, 45, 45]]}
      over={(a) => <Headline t={a} align="left" top={0.12} kicker="EXPEDITION 36" kAt={T.countries + 0.3} lines={[]} />} />
  ) },
  { from: 76.8, to: 83.2, el: (f, to) => (
    <Photo from={f} dur={to - f} src="jsc2013e007948" credit="NASA / JAMES BLAIR · OFFICIAL PORTRAIT · JAN 2013" kb={[[1.12, 50, 28], [1.22, 50, 24]]}
      over={(a) => <Headline t={a} align="left" x={0.06} top={0.6} kicker="EUROPEAN SPACE AGENCY · ITALY" kAt={T.italian + 0.3} lines={[{ text: "LUCA PARMITANO", at: T.among + 0.4, size: 96 }]} />} />
  ) },
  { from: 83.1, to: 96.9, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e016630" credit="NASA · ISS036-E-016630 · PARMITANO ON THE CANADARM2 FOOT RESTRAINT, EVA 22 · JULY 9, 2013" kb={[[1.05, 55, 50], [1.22, 60, 45]]} grade={1.2}
      over={(a) => <Notes t={a} x={0.06} y={0.22} items={[{ text: "MILITARY TEST PILOT", at: T.pilot }, { text: "HIGHLY TRAINED", at: T.trained + 0.2 }, { text: "USED TO DANGER", at: T.trained + 2.6 }]} out={T.nothing + 0.6} />} />
  ) },
  { from: 96.8, to: 102.8, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_1_cassidy_parmitano_equipment_lock_pre_eva_iss036e020200" aspect={654 / 985} w={1250} rot={-1.2} x={0.58}
      credit="NASA · ISS036-E-020200 · CASSIDY AND PARMITANO BEFORE EVA 23"
      over={(a) => <Notes t={a} x={0.05} y={0.36} size={26} items={[{ text: "CHRIS CASSIDY · NASA", at: T.thatDay + 1.0, color: C.amber }, { text: "LUCA PARMITANO · ESA", at: T.thatDay + 0.4 }]} />} />
  ) },
  { from: 102.7, to: 109.8, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: mixV([33, 9, -3], [31, 8.2, -5], easeInOut(clamp(tt / 7))), target: [25.8, 5.6, -12], fov: 36 }, sun: 0.5, sunAz: 0.7, earthRot: earth(a), iss: issAt, astro: crew(a) })}
      labels={[{ p: addV(A, [0, 2.1, 0]), text: "PARMITANO", sub: "EV2", at: T.mission + 0.5 }, { p: addV(CAS, [0, 2.1, 0]), text: "CASSIDY", sub: "EV1", at: T.mission + 1.0 }]}
      over={(a) => <Headline t={a} top={0.1} kicker="EVA 23 · INSTALLING AND ROUTING EQUIPMENT" kAt={T.installing} lines={[]} />} />
  ) },
  { from: 109.7, to: 123.3, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e016610" credit="NASA · ISS036-E-016610 · PARMITANO DURING EVA 22 · JULY 9, 2013" kb={[[1.04, 50, 50], [1.2, 40, 50]]}
      over={(a) => <Notes t={a} x={0.06} y={0.62} items={[{ text: "NO BREATHABLE ATMOSPHERE", at: T.noAir + 0.3 }, { text: "EXTREME TEMPERATURES", at: T.temperature + 0.3 }, { text: "EVERY MOVE CONTROLLED", at: T.movement + 0.3 }]} />} />
  ) },
  { from: 123.2, to: 142.1, el: (f) => (
    <HelmetShot from={f} tag="SCHEMATIC · AFTER NASA" render={(a) => (
      <SuitSystem t={a} vent={ramp(a, T.oxygen, T.oxygen + 1)} cool={ramp(a, T.regulate, T.regulate + 1)} fps={ramp(a, T.pressure, T.pressure + 1)} cam={{ x: 800, y: 540, zoom: lerp(0.92, 1.0, ramp(a, f, f + 19)) }}
        dim={ramp(a, T.minor + 0.5, T.minor + 3) * 0.55}
        labels={[{ text: "OXYGEN", x: N.helmet.x + 120, y: N.helmet.y - 120, ax: N.helmet.x + 70, ay: N.helmet.y - 40, at: T.oxygen + 0.2 },
          { text: "PRESSURE", x: N.suit.x - 220, y: N.suit.y - 40, ax: N.suit.x - 40, ay: N.suit.y, at: T.pressure + 0.2 },
          { text: "CO₂ REMOVAL", x: N.scrub.x - 140, y: N.scrub.y + 110, ax: N.scrub.x, ay: N.scrub.y + 30, at: T.co2 + 0.2 },
          { text: "TEMPERATURE CONTROL", x: N.lcvg.x - 200, y: N.lcvg.y + 110, ax: N.lcvg.x, ay: N.lcvg.y + 30, at: T.regulate + 0.3 }]} />
    )} over={(a) => <Headline t={a} top={0.05} kicker="EXTRAVEHICULAR MOBILITY UNIT" kAt={T.notClothing} lines={[{ text: "A LIFE SUPPORT SYSTEM", at: T.lifeSupport, size: 64 }]} />} />
  ) },

  // ═════ CH.2 WATER ═════
  { from: 142.0, to: 149.2, inT: "blur", el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e019555" credit="NASA · ISS036-E-019555 · PARMITANO DURING EVA 23 · JULY 16, 2013" kb={[[1.04, 50, 40], [1.14, 50, 34]]}
      over={(a) => <Headline t={a} align="left" top={0.14} kicker="EVA 23 · 16 JULY 2013" kAt={T.began + 0.2} lines={[{ text: "ALL NORMAL", at: T.began + 1.4, size: 80 }]} />} />
  ) },
  { from: 149.1, to: 156.9, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e020926" credit="NASA · ISS036-E-020926 · CHRIS CASSIDY DURING EVA 23 · JULY 16, 2013" kb={[[1.04, 50, 45], [1.16, 50, 40]]}
      over={(a) => <Headline t={a} align="left" top={0.14} kicker="PROGRESS" kAt={T.progress} lines={[{ text: "AHEAD OF SCHEDULE", at: T.ahead + 0.3, size: 72 }]} />} />
  ) },
  { from: 156.8, to: 163.2, el: (f) => <Local from={f} render={(t, a) => <AbsoluteFill style={{ background: C.ink }}><EvaClock t={t} minute={lerp(30, 44, ramp(a, f + 0.2, T.m44 + 2.6, easeOut))} highlight={a > T.reported ? 1 : undefined} /><ChapterAt from={f} n={2} title="Water" top /></AbsoluteFill>} /> },
  { from: 163.1, to: 171.3, el: (f) => (
    <HelmetShot from={f} render={(a) => (
      <Helmet t={a} water={keys(a, [[T.feelWater, 0.02], [171, 0.14]])} vent={1} ventWater={1} cam={{ x: HX, y: 560, zoom: 1.05 }} labels={[{ ...VENT_LABEL, at: T.feelWater + 0.6 }]} />
    )} over={(a) => <Headline t={a} align="left" top={0.3} kicker="44 MINUTES IN" kAt={T.feelWater} lines={[{ text: "BACK OF THE HEAD", at: T.feelWater + 0.8, size: 80 }, { text: "SOURCE UNKNOWN", at: T.nobody + 0.6, size: 56, color: C.burgundyHi }]} />} />
  ) },
  { from: 171.2, to: 185.9, el: (f) => (
    <HelmetShot from={f} render={(a) => (
      <Helmet t={a} water={keys(a, [[f, 0.14], [185.9, 0.24]])} vent={1} ventWater={1} drinkValve={ramp(a, T.bag, T.bag + 0.5) * (1 - ramp(a, T.sweat, T.sweat + 0.5))} cam={{ x: HX, y: 560, zoom: 1.05 }}
        labels={[{ text: "DRINK BAG VALVE", x: 690, y: 880, ax: 716, ay: 718, at: T.bag + 0.3, out: T.sweat }, { text: "SWEAT?", x: 480, y: 300, ax: 520, ay: 380, at: T.sweat + 0.3 }]} />
    )} over={(a) => <Notes t={a} x={0.06} y={0.3} size={30} items={[{ text: "THEORY 1 · DRINK BAG LEAK", at: T.bag + 0.2 }, { text: "THEORY 2 · SWEAT", at: T.sweat + 0.2 }, { text: "NEITHER CONVINCING", at: T.neither0 + 0.3, color: C.paperDim }]} />} />
  ) },
  { from: 185.8, to: 192.2, el: (f) => (
    <HelmetShot from={f} render={(a) => <Helmet t={a} water={keys(a, [[f, 0.24], [192.2, 0.36]])} vent={1} ventWater={1} cam={{ x: HX + 20, y: 560, zoom: 1.1 }} />}
      over={(a) => <Notes t={a} x={0.06} y={0.36} size={34} items={[{ text: "UNUSUALLY COLD", at: T.cold + 0.3, color: "#9fd4ea" }, { text: "INCREASING", at: T.increasing + 0.4 }]} />} />
  ) },
  { from: 192.1, to: 196.6, el: (f, to) => (
    <Photo from={f} dur={to - f} src="jsc2013e066455" credit="NASA / JAMES BLAIR · FLIGHT CONTROL ROOM, HOUSTON · DURING EVA 23" kb={[[1.04, 50, 50], [1.12, 45, 50]]}
      over={(a) => <Headline t={a} align="left" top={0.12} kicker="MISSION CONTROL · HOUSTON" kAt={T.mcc1 + 0.3} lines={[]} />} />
  ) },
  { from: 196.5, to: 204.6, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_6_cassidy_inspecting_parmitano_as_he_finishes_drink_bag_pet_55_min" aspect={639 / 846} w={1150} rot={1.4} x={0.6}
      credit="NASA · EVA 23 VIDEO · CASSIDY INSPECTS PARMITANO'S HELMET"
      over={(a) => <Notes t={a} x={0.05} y={0.4} size={26} items={[{ text: "CASSIDY CHECKS THE HELMET", at: T.cassidy + 0.4 }, { text: "GETTING WORSE", at: T.serious + 0.6 }]} />} />
  ) },
  { from: 204.5, to: 207.4, el: (f) => (
    <HelmetShot from={f} render={(a) => <Helmet t={a} water={keys(a, [[f, 0.36], [207.4, 0.45]])} vent={1} ventWater={1} cam={{ x: HX + 20, y: 560, zoom: 1.12 }} />} />
  ) },
  { from: 207.3, to: 221.5, el: (f) => (
    <Local from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #16202c 0%, ${C.ink} 78%)` }}>
        <GravityCompare t={t} at={T.onEarth - f + 0.4} />
        <Headline t={a} top={0.06} kicker="WEIGHTLESSNESS" kAt={T.weightless + 0.3} lines={[]} />
        <Tag t={t} text="ILLUSTRATION" />
      </AbsoluteFill>
    )} />
  ) },
  { from: 221.4, to: 233.8, el: (f) => (
    <HelmetShot from={f} render={(a) => (
      <Helmet t={a} water={keys(a, [[f, 0.45], [233.8, 0.6]])} shift={0.1} vent={1} ventWater={1} cam={{ x: HX + 30, y: 560, zoom: 1.12 }}
        labels={[{ text: "CLINGS TO SURFACES", x: 120, y: 200, ax: ear.x - 30, ay: ear.y - 10, at: T.cling + 0.3 }, { text: "FLOATING MASSES", x: 140, y: 860, ax: 420, ay: 700, at: T.masses + 0.2 }]} />
    )} over={(a) => <Headline t={a} align="left" top={0.34} kicker="A SEALED HELMET" kAt={T.sealed + 0.4} lines={[{ text: "NO WAY TO", at: T.sealed + 1.4, size: 80 }, { text: "GET IT OUT", at: T.sealed + 1.7, size: 80 }]} />} />
  ) },
  { from: 233.7, to: 246.4, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: addV(A, mixV([2.4, 2.3, 1.9], [1.5, 2.0, 1.2], easeInOut(clamp(tt / 12.7)))), target: addV(AC, [0, 0.72, 0]), fov: 32 }, sun: 0.4, sunAz: 0.7, earthRot: earth(a), iss: issAt, astro: crew(a, 0, A, false) })}
      over={(a) => <Headline t={a} top={0.1} kicker="SURROUNDED BY VACUUM" kAt={T.vacuum + 0.4} lines={[]} />} />
  ) },
  { from: 246.3, to: 253.6, el: (f) => (
    <HelmetShot from={f} render={(a) => <Helmet t={a} water={0.62} shift={0.2} vent={1} ventWater={1} cam={{ x: HX + 30, y: 560, zoom: 1.12 }} />}
      over={(a) => <Notes t={a} x={0.06} y={0.32} size={32} items={[{ text: "CAN'T TAKE THE HELMET OFF", at: T.cantTake + 0.3 }, { text: "CAN'T REACH INSIDE", at: T.cantReach + 0.2 }, { text: "NO FRESH AIR", at: T.fresh - 0.3 }]} />} />
  ) },

  // ═════ CH.3 THE WAY BACK ═════
  { from: 253.5, to: 259.1, inT: "blur", el: (f, to) => (
    <Photo from={f} dur={to - f} src="jsc2013e066476" credit="NASA / JAMES BLAIR · FLIGHT CONTROL ROOM, HOUSTON · DURING EVA 23" kb={[[1.04, 50, 45], [1.12, 50, 40]]}
      over={(a) => <Stamp t={a} at={T.endEarly + 0.8} text="TERMINATE" />} />
  ) },
  { from: 259.0, to: 264.0, el: (f) => <Local from={f} render={(t, a) => <AbsoluteFill style={{ background: C.ink }}><EvaClock t={t} minute={lerp(55, 62, ramp(a, f, f + 2, easeOut))} highlight={2} /><ChapterAt from={f} n={3} title="The Way Back" top /></AbsoluteFill>} /> },
  { from: 263.9, to: 267.6, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: addV(A, [5.5, 1.6, 4.6]), target: addV(AC, [0, 0.4, 0]), fov: 36 }, sun: 0.25, sunAz: 0.5, earthRot: earth(a), iss: issAt, astro: crew(a, 0, mixV(A, [24.9, 5.0, -7.6], easeInOut(clamp(tt / 3.7))), false) })}
      over={(a) => <Headline t={a} top={0.1} kicker="RETURN TO THE AIRLOCK" kAt={f + 0.2} lines={[]} />} />
  ) },
  { from: 267.5, to: 274.8, el: (f) => (
    <HelmetShot from={f} render={(a) => (
      <Helmet t={a} water={keys(a, [[f, 0.62], [274.8, 0.78]])} shift={keys(a, [[T.shifted, 0.2], [T.coverEyes + 0.6, 0.62]])} vent={1} ventWater={1} cam={{ x: HX + 60, y: 550, zoom: 1.15 }}
        labels={[{ text: "EYES", x: eye.x + 70, y: eye.y - 90, ax: eye.x, ay: eye.y, at: T.coverEyes + 0.2 }]} />
    )} over={(a) => <Headline t={a} align="left" top={0.34} kicker="THE WATER SHIFTS" kAt={T.shifted + 0.2} lines={[{ text: "OVER HIS EYES", at: T.coverEyes + 0.3, size: 80 }]} />} />
  ) },
  { from: 274.7, to: 277.5, el: (f) => (
    <Space3D from={f} res={0.45} tag="3D RECREATION · POINT OF VIEW" state={(a, tt) => ({ cam: { pos: addV(AC, [0.3, 0.75, 0.6]), target: [18 + tt, 3, 2], fov: 50, roll: 0.06 * Math.sin(tt * 1.1) }, sun: 0.2, sunAz: 0.5, earthRot: earth(a), iss: issAt, astro: [] })}
      over={(a) => <WaterVision t={a} amount={lerp(0.7, 0.9, clamp((a - f) / 2.5))} />} />
  ) },
  { from: 277.4, to: 291.1, el: (f) => <Local from={f} render={(t, a) => <Comms t={t} fail={keys(a, [[T.ears, 0.3], [T.commProblems, 0.6], [T.faintly, 0.75], [T.hearHim, 0.85]])} />} /> },
  { from: 291.0, to: 297.0, el: (f) => (
    <Space3D from={f} res={0.45} tag="3D RECREATION · POINT OF VIEW" state={(a, tt) => ({ cam: { pos: addV(mixV(A, [24.9, 5.0, -6.5], tt / 6), [0.3, 1.65, 0.4]), target: [25.6, 4.6, 6], fov: 52, roll: 0.04 * Math.sin(tt * 0.9) }, sun: 0.12, sunAz: 0.5, earthRot: earth(a), iss: issAt, astro: [] })}
      over={(a) => <WaterVision t={a} amount={0.6} />} />
  ) },
  { from: 296.9, to: 304.8, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_5_parmitano_doing_reach_test_from_cassidy_helmet_cam" aspect={629 / 798} w={1150} rot={-1.2} x={0.6}
      credit="NASA · EVA 23 · FROM CASSIDY'S HELMET CAMERA"
      over={(a) => <Notes t={a} x={0.05} y={0.36} size={26} items={[{ text: "HANDHOLDS", at: T.handholds + 0.3 }, { text: "PLANNED ROUTES", at: T.handholds + 1.6 }, { text: "SAFETY EQUIPMENT", at: T.handholds + 2.6 }]} />} />
  ) },
  { from: 304.7, to: 317.7, el: (f) => (
    <Space3D from={f} state={(a, tt) => {
      const sun = keys(a, [[f, 0.12], [T.nightSide + 0.5, -0.12], [T.sunlight + 0.3, -0.36], [T.surrounded + 1, -0.55]]);
      return { cam: { pos: addV(A, mixV([7.5, 2.4, 6.4], [6.0, 2.0, 5.0], easeInOut(clamp(tt / 13)))), target: addV(AC, [0, 0.3, 0]), fov: 36 }, sun, sunAz: 0.45, earthRot: earth(a),
        iss: issAt, astro: crew(a, ramp(a, T.sunlight, T.sunlight + 1.2), [24.9, 5.0, -7.6], false), fill: 0.3 * ramp(a, T.sunlight, T.surrounded + 1) };
    }} over={(a) => <Headline t={a} top={0.1} kicker="ORBITAL NIGHT" kAt={T.nightSide + 0.4} lines={[{ text: "DARKNESS", at: T.surrounded + 0.4, size: 120 }]} />} />
  ) },
  { from: 317.6, to: 327.2, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: addV(A, mixV([4.6, 2.0, 3.6], [3.4, 1.7, 2.6], easeInOut(clamp(tt / 9.6)))), target: addV(AC, [0, 0.5, 0]), fov: 36 }, sun: -0.6, sunAz: 0.45, earthRot: earth(a), iss: issAt, astro: crew(a, 1, [24.9, 5.0, -7.6], false), fill: 0.3, stars: 1.2 })}
      over={(a) => <><WaterVision t={a} amount={0.28 * ramp(a, T.visor, T.visor + 2)} /><Headline t={a} top={0.1} kicker="CAN BARELY SEE" kAt={T.orbitalNight + 1.4} lines={[]} /></>} />
  ) },
  { from: 327.1, to: 337.7, el: (f) => (
    <HelmetShot from={f} render={(a) => (
      <Helmet t={a} water={keys(a, [[f, 0.85], [337.7, 1]])} shift={keys(a, [[f, 0.75], [T.nose + 1.5, 1]])} dark={1} cam={{ x: HX + 90, y: 540, zoom: 1.25 }}
        labels={[{ text: "NOSE", x: noseP.x + 80, y: noseP.y + 20, ax: noseP.x, ay: noseP.y, at: T.nose + 0.8 }, { text: "MOUTH", x: mouthP.x + 80, y: mouthP.y + 40, ax: mouthP.x, ay: mouthP.y, at: T.firstTime + 1.2 }]} />
    )} over={(a) => <Headline t={a} align="left" top={0.34} kicker="ORBITAL NIGHT" kAt={f + 0.2} lines={[{ text: "OVER HIS NOSE", at: T.nose + 0.6, size: 84, color: "#9fd4ea" }]} />} />
  ) },
  { from: 337.6, to: 353.7, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: addV(A, [3.6 + Math.sin(tt * 0.15) * 0.8, 1.6, 3.0 + Math.cos(tt * 0.15) * 0.6]), target: addV(AC, [0, 0.4, 0]), fov: 38, roll: 0.12 * Math.sin(tt * 0.22) }, sun: -0.6, sunAz: 0.45, earthRot: earth(a), iss: issAt, astro: crew(a, 1, [24.9, 5.0, -7.6], false), fill: 0.3, stars: 1.2 })}
      over={(a) => <><WaterVision t={a} amount={0.3} /><Notes t={a} x={0.06} y={0.3} size={30} items={[{ text: "WHICH WAY?", at: T.direction - 0.2 }, { text: "EYES · ALMOST USELESS", at: T.eyesUseless + 0.2 }, { text: "COMMS · UNRELIABLE", at: T.eyesUseless + 2.0 }, { text: "STILL OUTSIDE", at: T.stillOutside + 0.5 }]} /></>} />
  ) },
  { from: 353.6, to: 362.2, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e017389" credit="NASA · ISS036-E-017389 · CASSIDY AND PARMITANO IN THE QUEST AIRLOCK BEFORE EVA 22 · JULY 8, 2013" kb={[[1.04, 60, 50], [1.14, 65, 45]]} grade={1.3}
      over={(a) => <Headline t={a} align="left" top={0.62} kicker="YEARS OF TRAINING" kAt={T.moment + 0.5} lines={[{ text: "NO PANIC", at: T.panicking + 0.3, size: 80 }]} />} />
  ) },
  { from: 362.1, to: 369.8, el: (f) => (
    <Space3D from={f} labels={[{ p: mixV(tetherFrom([24.9, 5.0, -7.6]), TETHER_TO, 0.3), text: "SAFETY TETHER", at: T.tether + 0.6 }]}
      state={(a, tt) => {
        const from = tetherFrom([24.9, 5.0, -7.6]);
        return { cam: { pos: mixV(addV(from, [4.6, 1.4, 3.6]), addV(from, [3.8, 1.2, 3.0]), easeInOut(clamp(tt / 7.7))), target: addV(mixV(from, TETHER_TO, 0.2), [0, 0.2, 0]), fov: 40 },
          sun: -0.6, sunAz: 0.45, earthRot: earth(a), iss: issAt, astro: crew(a, 1, [24.9, 5.0, -7.6], false), fill: 0.32, tether: { from, to: TETHER_TO, slack: 0.5 } };
      }} over={(a) => <Headline t={a} top={0.1} kicker="HIS LIFELINE" kAt={T.line + 0.5} lines={[]} />} />
  ) },
  { from: 369.7, to: 381.6, el: (f) => (
    <Space3D from={f} state={(a, tt) => {
      const p = easeInOut(clamp(tt / 11.9));
      const pos = mixV([24.9, 5.0, -7.6], [25.2, 4.9, -4.6], p);
      const from = tetherFrom(pos);
      return { cam: { pos: addV(pos, [5.2, 2.0, 1.4]), target: addV(pos, [0, 0.8, 1.4]), fov: 38 }, sun: -0.6, sunAz: 0.45, earthRot: earth(a), iss: issAt, astro: crew(a, 1, pos, false), fill: 0.32,
        tether: { from, to: TETHER_TO, slack: lerp(0.5, 0.2, p) } };
    }} over={(a) => <Notes t={a} x={0.06} y={0.62} size={28} items={[{ text: "HAND OVER HAND", at: T.slowly + 0.3 }, { text: "CONTROL THE BREATHING", at: T.breathing + 0.3 }, { text: "TOWARD THE AIRLOCK", at: T.towardAirlock + 0.6 }]} />} />
  ) },
  { from: 381.5, to: 400.1, el: (f) => (
    <HelmetShot from={f} render={(a) => <Helmet t={a} water={1} shift={1} dark={1} cam={{ x: HX + 90, y: 540, zoom: 1.2 }} />}
      over={(a) => <Notes t={a} x={0.06} y={0.3} size={30} items={[{ text: "LAST RESORT", at: T.lastResort + 0.8, color: C.amber }, { text: "VENT THE SUIT?", at: T.vent + 0.3 }, { text: "RISK · LOSS OF PRESSURE", at: T.risks - 0.6 }, { text: "AN OPTION HE NEVER USED", at: T.hoped + 0.6, color: C.paperDim }]} />} />
  ) },
  { from: 400.0, to: 407.7, el: (f) => (
    <Space3D from={f} state={(a, tt) => {
      const p = easeInOut(clamp(tt / 7.7));
      const pos = mixV([25.2, 4.9, -4.6], [25.3, 4.9, -3.2], p);
      return { cam: { pos: addV(pos, [4.8, 1.9, 2.6]), target: addV(pos, [0, 0.8, 1.6]), fov: 40 }, sun: -0.6, sunAz: 0.45, earthRot: earth(a), iss: issAt, astro: crew(a, 1, pos, false), fill: 0.32,
        tether: { from: tetherFrom(pos), to: TETHER_TO, slack: 0.2 } };
    }} over={(a) => <Headline t={a} top={0.1} kicker="FOLLOWING THE TETHER" kAt={T.continued + 0.4} lines={[]} />} />
  ) },
  { from: 407.6, to: 413.6, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_7_parmitano_back_at_airlock_from_helmet_cam" aspect={638 / 857} w={1150} rot={-1.2} x={0.6}
      credit="NASA · PARMITANO'S HELMET CAMERA · BACK AT THE AIRLOCK"
      over={(a) => <Notes t={a} x={0.05} y={0.4} size={28} items={[{ text: "THE AIRLOCK", at: T.entrance + 0.2 }]} />} />
  ) },
  { from: 413.5, to: 419.6, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_9_parmitano_external_camera_view_entering_crew_lock" aspect={635 / 833} w={1150} rot={1.2} x={0.6}
      credit="NASA · EXTERNAL CAMERA · PARMITANO ENTERING THE CREW LOCK"
      over={(a) => <><Notes t={a} x={0.05} y={0.4} size={28} items={[{ text: "INSIDE", at: T.movedInside + 0.3 }]} /><ChapterAt from={415.0} n={4} title="The Airlock" /></>} />
  ) },

  // ═════ CH.4 THE AIRLOCK ═════
  { from: 419.5, to: 422.3, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e019885" credit="NASA · ISS036-E-019885 · CASSIDY IN THE QUEST AIRLOCK AS EVA 23 ENDS" kb={[[1.04, 40, 50], [1.1, 40, 48]]} />
  ) },
  { from: 422.2, to: 429.7, el: (f) => <Local from={f} render={(t, a) => <Repress t={t} p={ramp(a, T.pressurized + 0.5, 449.5, easeInOut) * 0.25} hatch={ramp(a, T.closed + 0.6, T.closed + 1)} />} /> },
  { from: 429.6, to: 441.0, el: (f) => <Local from={f} render={(t, a) => <Comms t={t} fail={keys(a, [[f, 0.6], [T.unreliable, 0.85]])} lost={ramp(a, T.lostAudio + 0.4, T.lostAudio + 1.0)} label="COMMUNICATION FAILURE" />} /> },
  { from: 440.9, to: 448.8, el: (f) => (
    <HelmetShot from={f} render={(a) => <Helmet t={a} water={1} shift={0.9 + 0.05 * Math.sin(a * 0.7)} cam={{ x: HX + 90, y: 540, zoom: 1.2 }}
      labels={[{ text: "MOUTH", x: mouthP.x + 80, y: mouthP.y + 40, ax: mouthP.x, ay: mouthP.y, at: T.waited + 3.8 }, { text: "NOSE", x: noseP.x + 80, y: noseP.y + 20, ax: noseP.x, ay: noseP.y, at: T.waited + 4.4 }]} />}
      over={(a) => <Headline t={a} align="left" top={0.34} kicker="WAITING FOR PRESSURE" kAt={T.waited + 0.3} lines={[{ text: "DON'T MOVE", at: T.waited + 1.0, size: 84 }]} />} />
  ) },
  { from: 448.7, to: 451.8, el: (f) => <Local from={f} render={(t, a) => <Repress t={t + 2} p={lerp(0.6, 1, ramp(a, f, T.safePressure + 1.6, easeOut))} hatch={1} label="SAFE PRESSURE" />} /> },
  { from: 451.7, to: 456.2, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e019889" credit="NASA · ISS036-E-019889 · YURCHIKHIN AT THE QUEST HATCH WINDOW AS EVA 23 ENDS" kb={[[1.04, 50, 45], [1.12, 45, 45]]}
      over={(a) => <Headline t={a} align="left" top={0.12} kicker="INNER HATCH OPEN" kAt={T.innerHatch + 0.2} lines={[]} />} />
  ) },
  { from: 456.1, to: 462.5, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_11_parmitano_assisted_by_nyberg_yurchikhin_post_eva_iss036e019630" aspect={654 / 985} w={1300} rot={1.0} x={0.58}
      credit="NASA · ISS036-E-019630 · AFTER EVA 23, HELMET OFF"
      over={(a) => <Notes t={a} x={0.05} y={0.4} size={28} items={[{ text: "HELMET REMOVED", at: T.removed + 0.2 }]} />} />
  ) },
  { from: 462.4, to: 470.5, el: (f) => <Local from={f} render={(t, a) => <AbsoluteFill style={{ background: C.ink }}><EvaClock t={t} minute={lerp(62, 100, ramp(a, f, T.m100 + 2.2, easeInOut))} highlight={a > T.m100 + 1.5 ? 6 : undefined} /><Headline t={a} top={0.06} kicker="HE SURVIVED" kAt={T.survived} lines={[]} /></AbsoluteFill>} /> },

  // ═════ CH.5 THE INVESTIGATION ═════
  { from: 470.4, to: 478.9, inT: "blur", el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e037249" credit="NASA / KAREN NYBERG · ISS036-E-037249 · AUG 27, 2013 · THE SAME HELMET, LEAK REPRODUCED ON BOARD" kb={[[1.04, 50, 50], [1.14, 45, 50]]}
      over={(a) => <><ChapterAt from={f} n={5} title="The Investigation" /><Headline t={a} align="left" top={0.12} kicker="THE QUESTION" kAt={T.question + 0.4} lines={[{ text: "WHERE DID THE WATER COME FROM?", at: T.how + 0.3, size: 60 }]} /></>} />
  ) },
  { from: 478.8, to: 484.3, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e037243" credit="NASA · ISS036-E-037243 · CASSIDY TROUBLESHOOTING THE SUIT IN THE QUEST AIRLOCK · AUG 27, 2013" kb={[[1.04, 40, 50], [1.12, 40, 45]]}
      over={(a) => <Headline t={a} align="left" top={0.12} kicker="ENGINEERS INVESTIGATE" kAt={T.engineers + 0.2} lines={[]} />} />
  ) },
  { from: 484.2, to: 492.1, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_13_vent_port_post_eva_iss036e019737" aspect={654 / 985} w={1250} rot={-1.0} x={0.6}
      credit="NASA · ISS036-E-019737 · HELMET VENT PORT AFTER EVA 23"
      over={(a) => <Notes t={a} x={0.05} y={0.36} size={26} items={[{ text: "THE HELMET", at: T.examined + 0.4 }, { text: "THE VENTILATION SYSTEM", at: T.examined + 1.2 }, { text: "TEMPERATURE CONTROL", at: T.examined + 3.0 }]} />} />
  ) },
  { from: 492.0, to: 507.7, el: (f) => (
    <HelmetShot from={f} tag="SCHEMATIC · AFTER NASA" render={(a) => (
      <SuitSystem t={a} vent={1} cool={1} fps={1} drum={ramp(a, T.blocked, T.blocked + 0.8)} block={ramp(a, T.blockedWord, T.blockedWord + 1)}
        cam={{ x: keys(a, [[f, 800], [T.blocked, 800], [T.blockedWord + 0.5, N.sep.x + 60]]), y: keys(a, [[f, 540], [T.blocked, 540], [T.blockedWord + 0.5, N.sep.y + 40]]), zoom: keys(a, [[f, 0.95], [T.blocked, 0.95], [T.blockedWord + 0.5, 1.5]]) }}
        labels={[{ text: "COOLING WATER", x: N.pump.x - 380, y: N.pump.y + 150, ax: N.pump.x - 40, ay: N.pump.y + 20, at: T.coolingSys + 0.5, color: "#9fd4ea", out: T.blocked },
          { text: "VENTILATION AIR", x: N.helmet.x + 140, y: N.helmet.y - 110, ax: N.helmet.x + 80, ay: N.helmet.y - 40, at: T.separated + 1.2, out: T.blocked },
          { text: "WATER SEPARATOR · BLOCKED", x: N.sep.x - 140, y: N.sep.y - 110, ax: N.sep.x, ay: N.sep.y, at: T.blockedWord + 0.3, color: C.burgundyHi }]} />
    )} />
  ) },
  { from: 507.6, to: 514.4, el: (f, to) => (
    <Print from={f} dur={to - f} src="nasa_eva_23_14_particulate_in_fan_pump_sep" aspect={259 / 350} w={1000} rot={-1.4} x={0.62}
      credit="NASA MISHAP INVESTIGATION BOARD · PARTICULATE IN THE FAN/PUMP/SEPARATOR"
      over={(a) => <Notes t={a} x={0.05} y={0.36} size={28} items={[{ text: "SILICA · SILICATES", at: T.silica + 0.8 }, { text: "TINY OPENINGS OBSTRUCTED", at: T.separator }]} />} />
  ) },
  { from: 514.3, to: 522.2, el: (f) => (
    <HelmetShot from={f} tag="SCHEMATIC · AFTER NASA" render={(a) => (
      <SuitSystem t={a} vent={1} cool={1} fps={1} drum={1} block={1} spill={ramp(a, T.result + 0.4, T.carried + 1.8, easeInOut)} cam={{ x: 720, y: 520, zoom: 1.0 }}
        labels={[{ text: "WATER INTO THE AIRFLOW", x: N.fan.x + 40, y: N.fan.y + 150, ax: N.fan.x, ay: N.fan.y + 40, at: T.result + 1, color: "#9fd4ea" },
          { text: "INTO THE HELMET", x: N.helmet.x + 40, y: N.helmet.y - 100, ax: N.helmet.x + 80, ay: N.helmet.y - 30, at: T.carried + 1.0, color: "#9fd4ea" }]} />
    )} />
  ) },
  { from: 522.1, to: 534.6, el: (f) => (
    <Local from={f} render={(t, a) => (
      <AbsoluteFill style={{ background: C.ink }}>
        <AbsoluteFill style={{ opacity: 0.6 }}><Helmet t={a} water={1} shift={0.7} cam={{ x: 320, y: 540, zoom: lerp(1.0, 1.08, clamp(t / 12)) }} /></AbsoluteFill>
        <div style={{ position: "absolute", left: "7%", top: "26%" }}>
          <Stat t={a} at={T.liters - 0.2} value="1.5" label="LITERS" kicker="ESTIMATED WATER IN THE HELMET" size={250} align="left" color="#cfeaf5" />
        </div>
        <Tag t={t} text="ILLUSTRATION" />
      </AbsoluteFill>
    )} />
  ) },

  // ═════ CH.6 THE EARLIER WARNING ═════
  { from: 534.5, to: 540.6, inT: "dip", el: (f) => (
    <Dark from={f} over={(a) => <><Headline t={a} top={0.4} lines={[{ text: "SOMETHING ELSE", at: T.somethingElse + 0.6, size: 120 }]} /><ChapterAt from={f} n={6} title="The Earlier Warning" /></>} />
  ) },
  { from: 540.5, to: 561.2, el: (f) => <Local from={f} render={(t) => <WarningTimeline t={t + 0.1} bAt={T.possibility - f} noteAt={0.2} photo="photos/iss036e016853.jpg" />} /> },
  { from: 553.6, to: 561.2, fadeIn: 0.4, el: (f) => (
    <Local from={f} render={(t, a) => (
      <div style={{ position: "absolute", left: 0, right: 0, top: "26%", textAlign: "center" }}>
        <Kicker text="DRINK BAG REPLACED" t={a} at={T.replaced + 0.3} size={30} color={C.amber} />
      </div>
    )} />
  ) },
  { from: 561.1, to: 570.0, el: (f, to) => (
    <Photo from={f} dur={to - f} src="nasa_eva_23_12_water_drops_in_helmet_iss036e019744" credit="NASA · ISS036-E-019744 · WATER DROPS INSIDE THE HELMET AFTER EVA 23" kb={[[1.06, 50, 50], [1.16, 50, 50]]}
      over={(a) => <Headline t={a} align="left" top={0.14} kicker="LATER, INVESTIGATORS FOUND" kAt={T.neither - 1.2} lines={[{ text: "NEITHER BAG", at: T.neither + 0.3, size: 80 }, { text: "HAD LEAKED", at: T.neither + 0.7, size: 80, color: C.burgundyHi }]} />} />
  ) },
  { from: 569.9, to: 594.6, el: (f, to) => (
    <Print from={f} dur={to - f} src="mib_report_cover" aspect={1700 / 1870} w={1000} rot={-1.6} x={0.66} tag="NASA REPORT"
      credit="NASA MISHAP INVESTIGATION BOARD REPORT · DECEMBER 20, 2013"
      over={(a) => <Notes t={a} x={0.05} y={0.24} size={26} items={[{ text: "BLOCKED HARDWARE", at: T.findings + 1.6 }, { text: "MISREAD WARNING SIGNS", at: T.shortcomings + 0.8 }, { text: "'JUST SWEAT OR CONDENSATION'", at: T.smallAmounts + 1.8, color: C.paperDim }, { text: "A FAMILIAR SIGN, UNDERESTIMATED", at: T.familiarity + 0.6 }, { text: "THE DANGER WAS NOT ANTICIPATED", at: T.anticipated + 0.2 }]} />} />
  ) },
  { from: 594.5, to: 606.3, el: (f) => <Local from={f} render={(t, a) => <Fixes t={t} aAt={T.improved - f - 1.5} bAt={T.improved - f + 1.5} />} /> },

  // ═════ CH.7 CLOSING THE FILE ═════
  { from: 606.2, to: 614.3, inT: "blur", el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e019886" credit="NASA · ISS036-E-019886 · PARMITANO IN THE QUEST AIRLOCK AS EVA 23 ENDS · JULY 16, 2013" kb={[[1.04, 55, 45], [1.16, 60, 40]]}
      over={(a) => <><ChapterAt from={f} n={7} title="Closing the File" /><Headline t={a} align="left" top={0.12} kicker="LUCA PARMITANO" kAt={T.himself + 0.2} lines={[]} /></>} />
  ) },
  { from: 614.2, to: 626.0, el: (f) => (
    <Space3D from={f} state={(a, tt) => ({ cam: { pos: addV(A, mixV([5.0, 2.0, 4.0], [3.6, 1.7, 2.8], easeInOut(clamp(tt / 11.8)))), target: addV(AC, [0, 0.5, 0]), fov: 36 }, sun: -0.6, sunAz: 0.45, earthRot: earth(a), iss: issAt, astro: crew(a, 1, A, false), fill: 0.3, stars: 1.2 })}
      over={(a) => <Notes t={a} x={0.06} y={0.3} size={30} items={[{ text: "OUTSIDE THE STATION", at: T.outsideStation + 0.2 }, { text: "CAN BARELY SEE", at: T.barelySee + 0.1 }, { text: "CAN BARELY HEAR", at: T.hearingFail + 0.3 }, { text: "HELMET FILLING WITH WATER", at: T.filling + 0.2, color: "#9fd4ea" }, { text: "STAY CALM", at: T.calm + 1.0, color: C.amber }]} />} />
  ) },
  { from: 625.9, to: 633.8, el: (f, to) => (
    <Photo from={f} dur={to - f} src="iss036e020862" credit="NASA · ISS036-E-020862 · PARMITANO DURING EVA 23 · JULY 16, 2013" kb={[[1.1, 55, 45], [1.22, 58, 40]]}
      over={(a) => <Notes t={a} x={0.06} y={0.62} size={30} items={[{ text: "REMEMBER YOUR TRAINING", at: T.training + 0.2 }, { text: "TRUST YOUR EQUIPMENT", at: T.trust + 0.1 }, { text: "FIND YOUR WAY HOME", at: T.trust + 1.6 }]} />} />
  ) },
  { from: 633.7, to: 641.9, el: (f, to) => (
    <Photo from={f} dur={to - f} src="jsc2013e066479" credit="NASA / JAMES BLAIR · FLIGHT CONTROL ROOM, HOUSTON · DURING EVA 23" kb={[[1.04, 50, 50], [1.12, 55, 45]]}
      over={(a) => <Notes t={a} x={0.06} y={0.14} size={28} items={[{ text: "PREPARATION", at: T.years + 0.2 }, { text: "CREWMATES", at: T.years + 1.6 }, { text: "GROUND TEAM", at: T.groundTeam + 0.4 }]} />} />
  ) },
  { from: 641.8, to: 653.2, el: (f) => (
    <Space3D from={f} state={(a, tt) => {
      const ang = 2.2 + tt * 0.02;
      return { cam: { pos: [18 + 200 * Math.cos(ang), 70, 200 * Math.sin(ang)], target: [18, -10, 0], fov: 32 }, sun: 0.5, sunAz: 0.6, earthRot: earth(a), iss: issAt, astro: [] };
    }} over={(a) => <><Stamp t={a} at={T.closeCall + 1.4} text="HIGH VISIBILITY CLOSE CALL" small /><Headline t={a} top={0.1} kicker="NASA CLASSIFICATION" kAt={T.closeCall + 0.5} lines={[]} /></>} />
  ) },
  { from: 653.1, to: 663.5, el: (f) => (
    <Dark from={f} water={false} over={(a) => (
      <>
        <AbsoluteFill style={{ opacity: ramp(a, T.water - 0.3, T.water + 0.6) }}><WaterBackdrop t={a - f} /></AbsoluteFill>
        <Notes t={a} x={0.38} y={0.3} size={34} items={[{ text: "NOT A METEORITE", at: T.meteorite + 0.2, color: C.paperDim }, { text: "NOT AN EXPLOSION", at: T.explosion + 0.2, color: C.paperDim }, { text: "NOT THE VACUUM", at: T.endless + 0.4, color: C.paperDim }]} out={T.water - 0.5} />
        <Headline t={a} top={0.4} lines={[{ text: "WATER", at: T.water + 0.4, size: 190, color: "#cfeaf5" }]} />
      </>
    )} />
  ) },
  { from: 663.4, to: 671.0, el: (f) => (
    <Space3D from={f} state={(a, tt) => {
      const p = easeInOut(clamp(tt / 7.6));
      const target = mixV(addV(AC, [0, 0.4, 0]), [20, 0, 0], p);
      return { cam: { pos: logDolly(target, [0.8, 0.25, 0.6], 7, 3.0e5, p), target, fov: 40 }, sun: 0.42, sunAz: 0.75, earthRot: earth(a), iss: issAt, astro: crew(a, 0, A, false) };
    }} />
  ) },
  { from: 670.9, to: LONG_DURATION, fadeOut: 0.01, el: (f, to) => <Local from={f} render={(t) => <FileSeal t={t} dur={to - f} mode="close" />} /> },
];

/** stamped verdict over a photograph */
const Stamp: React.FC<{ t: number; at: number; text: string; small?: boolean }> = ({ t, at, text, small }) => {
  const { height: H } = useVideoConfig();
  const u = useU();
  const st = ramp(t, at, at + 0.35, easeOut);
  return (
    <div style={{
      position: "absolute", left: "50%", top: H * (small ? 0.7 : 0.38), transform: `translateX(-50%) rotate(-5deg) scale(${1.6 - 0.6 * st})`, opacity: st * 0.95,
      border: `${6 * u}px solid ${C.burgundyHi}`, color: C.burgundyHi, padding: `${12 * u}px ${30 * u}px`, fontFamily: F.mono, fontWeight: 500, fontSize: (small ? 56 : 96) * u,
      letterSpacing: "0.16em", background: "rgba(7,9,12,0.45)", whiteSpace: "nowrap",
    }}>
      {text}
    </div>
  );
};

export const Long: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Audio src={staticFile("audio/long.mp3")} />
    <Preload srcs={PHOTOS} />
    {SHOTS.map((s, i) => (
      <Shot key={i} from={s.from} to={s.to} inT={s.inT} outT={s.outT} fadeIn={s.fadeIn ?? 0.5} fadeOut={s.fadeOut ?? 0.5}>
        {s.el(s.from, s.to)}
      </Shot>
    ))}
    <FilmLook grain={0.07} />
  </AbsoluteFill>
);
