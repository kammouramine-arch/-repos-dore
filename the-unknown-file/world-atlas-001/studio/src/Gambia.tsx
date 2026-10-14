import React from "react";
import { AbsoluteFill, Audio, getInputProps, staticFile, useVideoConfig } from "remotion";
const OFF: string[] = ((getInputProps() as any).off ?? []) as string[];
const on = (n: string) => !OFF.includes(n);
import tokens from "./data/tokens.json";
import fields from "./data/fields.json";
import { makeCues } from "./lib/cues";
import { C, F } from "./theme";
import { clamp, easeInOut, easeOut, lerp, ramp } from "./lib/anim";
import { useT } from "./lib/time";
import { FilmLook, Preload } from "./components/FilmLook";
import { MapView, Fill, Line, Label, Pin, Arrow, Graticule, geo, P, merc, camAt, Cam, useMap } from "./map/engine";
import { ArchiveCard, Caption, EraChip, GambiaFlag, OldPaper, RED, SAFE, Scrim, SeriesChip, Stamp, Title, useU } from "./ui";

/*
 * THE UNKNOWN FILE — WORLD ATLAS #001 · THE GAMBIA (vertical short)
 * Every event is keyed to the narration (word timestamps from data/tokens.json).
 */
const { at, end } = makeCues(tokens as any);
export const DURATION = 133.6;

const T = {
  africa: at("map of Africa"), zoom: at("Now zoom in"), tiny: at("See this tiny country"), why: at("Why does it look"),
  river: at("took a river"), drew: at("drew a border"), thisIs: at("This is the Gambia"), smallest: at("one of the smallest"),
  shape: at("its shape has"), closely: at("Look closely"), strip: at("long narrow strip"), surrounded: at("almost completely surrounded"),
  except: at("except for one opening"), atlantic: at("Atlantic Ocean", 20), how: at("So how did this happen"), back: at("go back more than"),
  longBefore: at("Long before these"), communities: at("communities lived"), connected: at("The river connected"), european: at("European empires"),
  britain: at("Britain established"), meanwhile: at("Meanwhile, France"), problem: at("But there was a problem"), both: at("Both empires"),
  neither: at("neither wanted"), in1889: at("in 1889"), reached: at("reached an agreement"), follow: at("territory would follow"),
  tenKm: at("roughly 10 kilometers"), lookNow: at("Look at the map now"), surrounding: at("The surrounding territory remained"),
  corridor: at("this narrow corridor"), outline: at("the outline of a future"), interesting: at("here's something interesting"),
  story: at("an old story"), fired: at("fired cannonballs"), crazy: at("Sounds crazy"), noEvidence: at("no reliable evidence"),
  negotiated: at("borders were negotiated"), surveyed: at("and surveyed"), feb: at("February 18th"), y1965: at("1965"),
  independence: at("gained its independence"), remained: at("largely remained"), nextTime: at("the next time you look"),
  storyOf: at("tells the story"), ofRiver: at("of a river"), empires: at("two competing empires"), nation: at("and a nation"),
  worldAtlas: at("World Atlas"), country1: at("Country number one"), gambia: at("The Gambia", 129), unknown: at("The unknown file", 130),
};
void end;

// palette
const GMB = "#e0574e", SEN = "#d9b56a", BRIT = "#d34a52", FRA = "#4a76c0", RIVER = "#8fd0e6", PAPER = "#ece6da";

const CAM: [number, Cam][] = [
  [0, { lon: 17, lat: 2, z: 4.5, tilt: 34 }],
  [T.zoom - 0.1, { lon: 14, lat: 4, z: 4.62, tilt: 32 }],
  [T.tiny, { lon: -12.5, lat: 13.2, z: 6.2, tilt: 26 }],
  [T.why, { lon: -15.25, lat: 13.45, z: 7.85, tilt: 22 }],
  [T.thisIs, { lon: -15.25, lat: 13.45, z: 8.15, tilt: 16 }],
  [T.closely, { lon: -15.15, lat: 13.45, z: 8.35, tilt: 12 }],
  [T.strip, { lon: -16.05, lat: 13.45, z: 9.35, tilt: 0 }],
  [T.surrounded - 0.1, { lon: -14.45, lat: 13.45, z: 9.35, tilt: 0 }],
  [T.except - 0.3, { lon: -15.2, lat: 13.6, z: 8.2, tilt: 0 }],
  [T.how - 0.4, { lon: -16.3, lat: 13.5, z: 8.95, tilt: 0 }],
  [T.longBefore - 0.6, { lon: -15.3, lat: 13.55, z: 8.05, tilt: 14 }],
  [T.connected, { lon: -15.0, lat: 13.5, z: 8.25, tilt: 18 }],
  [T.european + 0.4, { lon: -16.1, lat: 13.45, z: 8.55, tilt: 18 }],
  [T.britain + 1.6, { lon: -16.0, lat: 13.42, z: 8.9, tilt: 14 }],
  [T.meanwhile - 0.2, { lon: -15.5, lat: 13.45, z: 8.6, tilt: 12 }],
  [T.meanwhile + 1.6, { lon: -14.8, lat: 14.4, z: 6.75, tilt: 16 }],
  [T.problem, { lon: -14.9, lat: 14.2, z: 6.9, tilt: 14 }],
  [T.neither + 1.2, { lon: -15.2, lat: 13.7, z: 7.6, tilt: 10 }],
  [T.in1889 + 1.2, { lon: -15.2, lat: 13.5, z: 8.2, tilt: 0 }],
  [T.tenKm + 0.2, { lon: -14.75, lat: 13.55, z: 9.25, tilt: 0 }],
  [T.lookNow - 0.3, { lon: -14.6, lat: 13.55, z: 9.25, tilt: 0 }],
  [T.lookNow + 1.2, { lon: -15.25, lat: 13.48, z: 8.3, tilt: 0 }],
  [T.corridor, { lon: -15.25, lat: 13.48, z: 8.25, tilt: 6 }],
  [T.interesting - 0.4, { lon: -15.25, lat: 13.45, z: 8.35, tilt: 30 }],
  [T.story + 0.3, { lon: -15.55, lat: 13.5, z: 9.75, tilt: 34 }],
  [T.noEvidence, { lon: -15.45, lat: 13.5, z: 9.6, tilt: 30 }],
  [T.negotiated - 0.2, { lon: -15.2, lat: 13.48, z: 8.5, tilt: 4 }],
  [T.feb, { lon: -15.2, lat: 13.75, z: 8.3, tilt: 6 }],
  [T.remained + 0.5, { lon: -15.25, lat: 13.7, z: 8.2, tilt: 18 }],
  [T.nextTime + 0.6, { lon: -14.6, lat: 13.6, z: 6.9, tilt: 26 }],
  [T.empires + 0.4, { lon: -14.2, lat: 13.8, z: 6.5, tilt: 26 }],
  [T.worldAtlas, { lon: 4, lat: 6, z: 4.65, tilt: 30 }],
  [DURATION, { lon: 8, lat: 5, z: 4.55, tilt: 32 }],
];

/** helpers */
const win = (t: number, a: number, b: number, i = 0.5, o = 0.5) => Math.min(ramp(t, a, a + i, easeOut), 1 - ramp(t, b - o, b, easeInOut));
const pt = (arr: number[][], f: number) => {
  const i = clamp(f) * (arr.length - 1);
  const a = arr[Math.floor(i)], b = arr[Math.min(arr.length - 1, Math.floor(i) + 1)];
  const k = i - Math.floor(i);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] as [number, number];
};
const RP = geo.river_pts as number[][];
const BP = geo.border_pts as number[][];

/** soft-edged colonial influence (pre-rendered; no crisp border invented) */
const FieldImg: React.FC<{ id: "fra_soft" | "fra_firm"; o: number }> = ({ id, o }) => {
  if (o <= 0) return null;
  const m = (fields as any)[id];
  return <image href={staticFile(`fields/${id}.png`)} x={m.x} y={m.y} width={m.w} height={m.h} opacity={o} preserveAspectRatio="none" />;
};

/** dimension marker "≈10 km" between river and offset line */
const Dim: React.FC<{ a: [number, number]; b: [number, number]; o: number; label: string }> = ({ a, b, o, label }) => {
  const { u } = useMap();
  if (o <= 0) return null;
  return (
    <g opacity={o}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={PAPER} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {[a, b].map((p, i) => <line key={i} x1={p[0] - 9 * u} y1={p[1]} x2={p[0] + 9 * u} y2={p[1]} stroke={PAPER} strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
      <Label at={[(a[0] + b[0]) / 2 + 14 * u, (a[1] + b[1]) / 2 + 9 * u]} text={label} size={34} anchor="start" font="mono" weight={500} spacing={0.06} />
    </g>
  );
};

/** illustrative river gunboat (side view), in screen-sized units */
const Gunboat: React.FC<{ at: [number, number]; s: number; o: number; t: number; fire: number }> = ({ at: [x, y], s, o, t, fire }) => {
  const { u } = useMap();
  if (o <= 0) return null;
  const k = s * u;
  const bob = Math.sin(t * 2.2) * 1.5 * k;
  return (
    <g opacity={o} transform={`translate(${x},${y + bob}) scale(${k})`}>
      <ellipse cx={0} cy={10} rx={70} ry={8} fill="#000" opacity={0.35} />
      <path d="M-62,0 L58,0 L70,-10 L-66,-10 Z" fill="#efe3c6" stroke="#1a140c" strokeWidth={2} />
      <rect x={-40} y={-24} width={50} height={14} fill="#d9caa6" stroke="#1a140c" strokeWidth={1.6} />
      <rect x={-10} y={-44} width={9} height={22} fill="#2a2016" />
      <path d="M-34,-24 L-34,-62 M20,-10 L20,-50" stroke="#1d1a16" strokeWidth={2.4} />
      <path d="M-34,-60 L-12,-44 L-34,-44 Z" fill="#cfc4ad" opacity={0.85} />
      <rect x={40} y={-16} width={22} height={4} fill="#14110e" transform="rotate(-8 40 -14)" />
      <rect x={-64} y={-16} width={20} height={4} fill="#14110e" transform="rotate(8 -44 -14)" />
      {/* funnel smoke */}
      {Array.from({ length: 5 }, (_, i) => <circle key={i} cx={-6 - i * 9 - ((t * 12) % 9)} cy={-50 - i * 7} r={4 + i * 2.2} fill="#e8e0cf" opacity={0.5 - i * 0.07} />)}
      {/* muzzle flash */}
      {fire > 0 && fire < 1 && <circle cx={66} cy={-18} r={14 * (1 - fire)} fill="#ffd38a" opacity={1 - fire} />}
      {fire > 0 && fire < 1 && <circle cx={-68} cy={-18} r={14 * (1 - fire)} fill="#ffd38a" opacity={1 - fire} />}
    </g>
  );
};

/** cannonball arc from a to b with a dust puff */
const Shot: React.FC<{ a: [number, number]; b: [number, number]; p: number; t: number }> = ({ a, b, p, t }) => {
  const { u } = useMap();
  if (p <= 0) return null;
  const k = clamp(p);
  const h = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.45;
  const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k) - Math.sin(Math.PI * k) * h;
  const puff = clamp((p - 1) / 0.8);
  return (
    <g>
      {k < 1 && <path d={`M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2 - h * 2} ${x},${y}`} stroke="#f3e2c0" strokeWidth={1.5} fill="none" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" opacity={0.6} />}
      {k < 1 && <circle cx={x} cy={y} r={5 * u} fill="#141210" stroke="#f3e2c0" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      {puff > 0 && puff < 1 && <circle cx={b[0]} cy={b[1]} r={(10 + 34 * puff) * u} fill="#cbb994" opacity={0.7 * (1 - puff)} />}
      {puff > 0 && <circle cx={b[0]} cy={b[1]} r={5 * u} fill="none" stroke="#f3e2c0" strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={0.6} />}
    </g>
  );
};

/** trade / ships: small boat glyph */
const Ship: React.FC<{ at: [number, number]; o: number; s?: number; dir?: 1 | -1 }> = ({ at: [x, y], o, s = 1, dir = 1 }) => {
  const { u } = useMap();
  if (o <= 0) return null;
  const k = s * u;
  return (
    <g opacity={o} transform={`translate(${x},${y}) scale(${k * dir},${k})`}>
      <path d="M-22,0 L22,0 L16,8 L-16,8 Z" fill="#1d1a16" />
      <path d="M0,-2 L0,-40 M-12,-4 L-12,-30" stroke="#1d1a16" strokeWidth={2} />
      <path d="M1,-38 Q18,-22 1,-6 Z M-11,-28 Q2,-18 -11,-6 Z" fill="#efe4cc" stroke="#1d1a16" strokeWidth={0.8} />
    </g>
  );
};

const Atlas: React.FC = () => {
  const t = useT();
  const u = useU();
  const { width: W, height: H } = useVideoConfig();
  const cam = camAt(t, CAM);

  // ── layer timings
  const old = ramp(t, T.back + 1.0, T.longBefore + 0.2) * (1 - ramp(t, T.feb - 0.6, T.feb + 0.8)); // period-map treatment
  const modern = 1 - old;
  const gmbOn = ramp(t, T.tiny + 0.4, T.tiny + 1.0) * (1 - ramp(t, T.back + 0.6, T.longBefore)) + ramp(t, T.independence, T.independence + 1.2);
  const senOn = ramp(t, T.surrounded + 0.2, T.surrounded + 1.0) * (1 - ramp(t, T.back + 0.6, T.longBefore)) + ramp(t, T.independence + 0.4, T.independence + 1.6) * 0.75;
  const borderLines = (1 - ramp(t, T.back + 0.4, T.longBefore - 0.2)) + ramp(t, T.independence, T.independence + 1);
  const riverTrace = ramp(t, T.river, T.river + 1.6, easeInOut);
  const ringTrace = ramp(t, T.drew, T.drew + 1.9, easeInOut);
  const riverTrace2 = ramp(t, T.ofRiver - 0.3, T.ofRiver + 1.4, easeInOut);
  // colonial
  const britPosts = ramp(t, T.britain, T.britain + 0.5) * (1 - ramp(t, T.in1889, T.in1889 + 0.8));
  const fraField = ramp(t, T.meanwhile + 0.3, T.meanwhile + 2.2) * (1 - ramp(t, T.in1889, T.in1889 + 0.8)) + ramp(t, T.surrounding, T.surrounding + 1.2) * (1 - ramp(t, T.feb - 0.4, T.feb + 0.6));
  const tension = win(t, T.problem, T.in1889 - 0.2, 0.6, 0.6);
  const schematic = win(t, T.tenKm - 0.2, T.lookNow + 2.2, 0.8, 0.8);
  const actual = ramp(t, T.lookNow, T.lookNow + 2.4, easeInOut) * (1 - ramp(t, T.independence, T.independence + 0.8));
  const britCorr = ramp(t, T.corridor, T.corridor + 1.0) * (1 - ramp(t, T.independence + 0.4, T.independence + 1.4));
  const lift = ramp(t, T.outline, T.outline + 1.5) * (1 - ramp(t, T.interesting - 0.2, T.interesting + 0.6)) + ramp(t, T.independence + 0.5, T.independence + 2) * (1 - ramp(t, T.nextTime, T.nextTime + 1)) * 0.8 + ramp(t, T.worldAtlas - 2, T.worldAtlas) * 0.6;
  const legend = win(t, T.story - 0.2, T.negotiated, 0.6, 0.6);
  const pillars = ramp(t, T.surveyed - 0.6, T.surveyed + 1.6) * (1 - ramp(t, T.independence + 1, T.independence + 2));
  const flash = win(t, T.empires, T.nation + 0.2, 0.3, 0.6);
  const settle = ramp(t, T.communities, T.communities + 1.2) * (1 - ramp(t, T.britain - 0.2, T.britain + 0.6));
  const flow = win(t, T.connected, T.european + 1.6, 0.5, 0.6);
  const ships = win(t, T.european, T.britain + 1.0, 0.6, 0.6);
  const labelsModern = (1 - ramp(t, T.back, T.longBefore - 0.4));

  // cannon timing
  const fireAt = T.fired;
  const boatF = clamp((t - T.story) / (T.noEvidence + 2 - T.story));
  const boat = pt(RP, lerp(0.17, 0.3, boatF));
  const shots = [0, 0.6, 1.2].map((d, i) => ({ p: (t - fireAt - d) / 0.9, side: i % 2 === 0 ? -1 : 1, i }));

  return (
    <AbsoluteFill>
      <MapView cam={cam} terrainStyle={on("tfilter") && old > 0.001 ? { filter: `sepia(${0.4 * old}) saturate(${1 - 0.15 * old}) contrast(${1 + 0.12 * old})` } : undefined}>
        {on("grat") && <Graticule step={cam.z < 6 ? 10 : 1} o={0.1 + 0.08 * old} />}
        {/* continent borders (modern) */}
        {on("cont") && Object.entries(geo.countries).map(([k, c]: any) => <Line key={k} d={c.d} color="#2b251d" w={1.1} o={0.75 * Math.min(1, (1 - ramp(cam.z, 6.2, 7.0)) * Math.max(labelsModern, ramp(t, T.worldAtlas - 3, T.worldAtlas)))} />)}
        {/* regional borders (modern) */}
        {on("region") && ["SEN", "GNB", "GIN", "MLI", "MRT"].map((k) => <Line key={k} d={geo.detail[k].d} color="#2b251d" w={1.4} o={0.7 * Math.min(1, ramp(cam.z, 6.0, 6.8) * borderLines)} />)}
        {/* modern Senegal tint */}
        {on("sen") && <Fill d={geo.detail.SEN.d} color={SEN} o={senOn * 0.55} />}
        {/* colonial: French influence (soft, no invented border) → after 1889 crisp along the Gambia boundary */}
        <FieldImg id="fra_soft" o={fraField * 0.62 * (1 - ramp(t, T.surrounding, T.surrounding + 1))} />
        <FieldImg id="fra_firm" o={fraField * 0.62 * ramp(t, T.surrounding, T.surrounding + 1)} />
        {/* modern Gambia */}
        {on("gmb") && <Fill d={geo.detail.GMB.d} color={GMB} o={gmbOn * modern} lift={lift * modern} edge={PAPER} edgeW={1.6} />}
        {/* British Gambia corridor (1889) */}
        <Fill d={geo.detail.GMB.d} color={BRIT} o={britCorr} lift={lift * old} edge="#ffe7d6" edgeW={1.6} />
        {/* river surface + river line */}
        {on("water") && <path d={geo.river_water} fill={old > 0.5 ? "#2a3b3e" : "#13222b"} />}
        <Line d={geo.river_up} color={RIVER} w={2} o={ramp(cam.z, 5.5, 6.5) * 0.8} />
        <Line d={geo.river} color={RIVER} w={2.2} o={0.75} />
        {/* bright trace of the river ("took a river") */}
        <Line d={geo.river} color="#d9f4ff" w={4} draw={riverTrace} o={1 - ramp(t, T.thisIs + 1.5, T.thisIs + 2.5)} glow={1} />
        <Line d={geo.river} color="#d9f4ff" w={4} draw={riverTrace2} o={1 - ramp(t, T.nation + 0.5, T.nation + 1.5)} glow={1} />
        {/* border drawn around it */}
        <Line d={geo.gmb_ring} color="#fff1dc" w={3.2} draw={ringTrace} o={1 - ramp(t, T.closely, T.closely + 1)} glow={0.8} />
        {/* Senegal–Gambia land border (modern) */}
        <Line d={geo.gmb_sen_border} color="#fff1dc" w={2} o={gmbOn * modern * ramp(cam.z, 7, 7.6) * 0.9} />
        {/* opening to the Atlantic */}
        <Line d={geo.gmb_coast} color="#9fe3ff" w={6} o={win(t, T.except + 0.2, T.how + 0.4)} glow={1} />

        {/* pre-colonial: river communities (generic markers — no invented names or borders) */}
        {settle > 0 && [0.05, 0.13, 0.22, 0.31, 0.4, 0.5, 0.58, 0.67, 0.76, 0.86, 0.95].map((f, i) => {
          const p = pt(RP, f);
          const side = i % 2 ? 1 : -1;
          return <Pin key={i} at={[p[0], p[1] + side * 900]} color="#fff3d6" r={8} o={settle * ramp(t, T.communities + i * 0.08, T.communities + 0.4 + i * 0.08)} />;
        })}
        {flow > 0 && Array.from({ length: 26 }, (_, i) => {
          const f = 1 - (((t - T.connected) * 0.09 + i / 26) % 1);
          const p = pt(RP, f);
          return <circle key={i} cx={p[0]} cy={p[1]} r={4.5 * (1 / (2 ** (cam.z - 12)))} fill="#f8e7c2" opacity={flow * 0.9 * Math.sin(Math.PI * f)} />;
        })}
        {ships > 0 && [0, 1, 2].map((i) => {
          const k = ramp(t, T.european + i * 0.5, T.european + 2.6 + i * 0.5, easeOut);
          const [mx, my] = P("Banjul");
          return <Ship key={i} at={[lerp(mx - 9000 - i * 1800, mx - 900 - i * 700, k), my + (i - 1) * 900]} o={ships} s={1.6} />;
        })}

        {/* British posts along the river */}
        <Pin at={P("Kunta Kinteh Island")} shape="fort" color={BRIT} r={8} o={britPosts * ramp(t, T.britain + 0.2, T.britain + 0.6)} />
        <Pin at={P("Banjul")} shape="square" color={BRIT} r={7} o={britPosts * ramp(t, T.britain + 0.6, T.britain + 1.0)} />
        <Pin at={P("Janjanbureh")} shape="square" color={BRIT} r={7} o={britPosts * ramp(t, T.britain + 1.2, T.britain + 1.6)} />
        <Label at={P("Kunta Kinteh Island")} dy={46} text="JAMES ISLAND · ENGLISH FROM 1661" size={29} font="mono" weight={500} spacing={0.06} o={ramp(cam.z, 7.7, 8.2) * britPosts * ramp(t, T.britain + 0.3, T.britain + 0.8) * ramp(cam.z, 7.2, 7.6)} />
        <Label at={P("Banjul")} dy={-26} text="BATHURST · 1816" size={31} font="mono" weight={500} spacing={0.06} o={ramp(cam.z, 7.7, 8.2) * britPosts * ramp(t, T.britain + 0.7, T.britain + 1.2)} />
        <Label at={P("Janjanbureh")} dy={-26} text="MACCARTHY ISLAND · 1823" size={29} font="mono" weight={500} spacing={0.06} o={ramp(cam.z, 7.7, 8.2) * britPosts * ramp(t, T.britain + 1.3, T.britain + 1.8)} />

        {/* French centres + expansion arrows */}
        <Pin at={P("Saint-Louis")} color={FRA} r={7} o={fraField} />
        <Pin at={P("Gorée")} color={FRA} r={6} o={fraField} />
        <Label at={P("Saint-Louis")} dy={-24} text="SAINT-LOUIS" size={31} font="mono" weight={500} o={fraField * (1 - ramp(t, T.in1889, T.in1889 + 0.5))} />
        <Label at={P("Gorée")} dy={-22} anchor="end" text="GORÉE  " size={29} font="mono" weight={500} o={fraField * (1 - ramp(t, T.in1889, T.in1889 + 0.5))} />
        <Arrow a={P("Saint-Louis")} b={merc(-12.6, 15.1)} bend={-0.18} color={FRA} w={5} draw={ramp(t, T.meanwhile + 0.5, T.meanwhile + 2.2)} o={1 - ramp(t, T.in1889, T.in1889 + 0.5)} head={26} />
        <Arrow a={P("Gorée")} b={merc(-14.6, 14.25)} bend={0.12} color={FRA} w={5} draw={ramp(t, T.meanwhile + 0.9, T.meanwhile + 2.6)} o={1 - ramp(t, T.in1889, T.in1889 + 0.5)} head={26} />
        <Arrow a={merc(-15.9, 12.4)} b={merc(-15.4, 13.05)} bend={-0.1} color={FRA} w={5} draw={ramp(t, T.both, T.both + 1.2)} o={tension} head={24} />
        <Arrow a={merc(-14.6, 14.6)} b={merc(-14.8, 13.85)} bend={0.1} color={FRA} w={5} draw={ramp(t, T.both + 0.3, T.both + 1.5)} o={tension} head={24} />
        <Arrow a={P("Banjul")} b={merc(-13.95, 13.4)} bend={-0.06} color={BRIT} w={6} draw={ramp(t, T.both + 0.6, T.both + 2.2)} o={tension} head={26} />
        {/* glow of British interest along the river before 1889 */}
        <Line d={geo.river} color={BRIT} w={10} o={(britPosts * 0.55 + tension * 0.3) * (1 - britCorr)} glow={0.8} />

        {/* 1889: schematic principle vs. actual delimited line */}
        <path d={geo.band_10km} fill={PAPER} opacity={schematic * 0.12} />
        <Line d={geo.off_n} color="#1a140c" w={6} o={schematic * 0.5} />
        <Line d={geo.off_s} color="#1a140c" w={6} o={schematic * 0.5} />
        <Line d={geo.off_n} color="#fff6e6" w={3.2} dash="12 9" o={schematic} />
        <Line d={geo.off_s} color="#fff6e6" w={3.2} dash="12 9" o={schematic} />
        <Line d={geo.river} color="#ffd2c8" w={5} o={win(t, T.follow, T.tenKm + 1.5)} glow={1} />
        {(() => {
          const r1 = pt(RP, 0.45), r2 = pt(RP, 0.55);
          const k10 = 10000 / (40075016.7 * Math.cos((13.5 * Math.PI) / 180) / (256 * 2 ** 12)); // 10 km in world px at 13.5°N
          return (
            <>
              <Dim a={r1} b={[r1[0], r1[1] - k10]} o={schematic * ramp(t, T.tenKm + 0.3, T.tenKm + 0.9)} label="≈10 KM" />
              <Dim a={r2} b={[r2[0], r2[1] + k10]} o={schematic * ramp(t, T.tenKm + 0.6, T.tenKm + 1.2)} label="≈10 KM" />
            </>
          );
        })()}
        <Line d={geo.gmb_ring} color="#fff1dc" w={3} draw={actual} o={actual > 0 ? 1 : 0} glow={0.6} />

        {/* survey pillars along the delimited land boundary */}
        {pillars > 0 && BP.filter((_, i) => i % 3 === 0).map((p, i, arr) => (
          <rect key={i} x={p[0] - 5 * (1 / 2 ** (cam.z - 12))} y={p[1] - 5 * (1 / 2 ** (cam.z - 12))} width={10 * (1 / 2 ** (cam.z - 12))} height={10 * (1 / 2 ** (cam.z - 12))} fill="#fff1dc" stroke="#1a1510" strokeWidth={1.2} vectorEffect="non-scaling-stroke"
            opacity={ramp(pillars, i / arr.length * 0.8, i / arr.length * 0.8 + 0.2)} />
        ))}

        {/* cannonball legend */}
        <Gunboat at={boat} s={2.0} o={legend} t={t} fire={shots.reduce((m, s) => (s.p > 0 && s.p < 0.25 ? s.p * 4 : m), 0)} />
        {legend > 0 && shots.map((s) => {
          const target = pt(BP, lerp(0.25, 0.42, (s.i + 0.5) / 3) + (s.side > 0 ? 0.5 : 0));
          return <Shot key={s.i} a={[boat[0] + s.side * 40, boat[1] - 20]} b={target} p={s.p} t={t} />;
        })}

        {/* map labels */}
        <Label at={merc(-15.35, 13.03)} text="THE GAMBIA" size={60} color="#fff" weight={800} spacing={0.08} o={win(t, T.thisIs - 0.1, T.back + 0.3) * modern + ramp(t, T.remained + 0.6, T.remained + 1.4) * (1 - ramp(t, T.nextTime, T.nextTime + 0.8))} />
        <Label at={merc(-15.0, 14.25)} text="SENEGAL" size={65} font="serif" weight={400} spacing={0.4} color={PAPER} o={win(t, T.surrounded + 0.3, T.back + 0.3) + ramp(t, T.remained + 0.8, T.remained + 1.6) * (1 - ramp(t, T.nextTime, T.nextTime + 0.8))} />
        <Label at={merc(-15.4, 12.72)} text="SENEGAL" size={52} font="serif" weight={400} spacing={0.4} color={PAPER} o={win(t, T.surrounded + 0.6, T.back + 0.3) * 0.9} />
        <Label at={merc(-17.15, 13.55)} text="ATLANTIC" size={52} font="serif" italic weight={400} spacing={0.25} color="#a9c3cf" o={win(t, T.except + 0.6, T.back + 0.3) + win(t, T.european, T.britain + 0.6)} />
        <Label at={merc(-17.15, 13.33)} text="OCEAN" size={52} font="serif" italic weight={400} spacing={0.25} color="#a9c3cf" o={win(t, T.except + 0.8, T.back + 0.3) + win(t, T.european, T.britain + 0.6)} />
        <Label at={merc(-15.75, 13.52)} text="GAMBIA RIVER" size={31} font="serif" italic weight={400} spacing={0.2} color="#c6ecf7" o={win(t, T.except + 1.2, T.back + 0.3) + win(t, T.longBefore + 0.6, T.connected + 3)} rot={-8} />
        <Label at={merc(-14.2, 15.75)} text="FRENCH SENEGAL" size={57} font="serif" weight={400} spacing={0.18} color="#dbe6ff" o={win(t, T.meanwhile + 1.6, T.in1889 + 0.3) + win(t, T.surrounding + 0.6, T.interesting) + win(t, T.negotiated, T.feb)} />
        <Label at={merc(-15.4, 12.68)} text="FRENCH SENEGAL" size={47} font="serif" weight={400} spacing={0.18} color="#dbe6ff" o={win(t, T.surrounding + 0.9, T.interesting) + win(t, T.negotiated, T.feb)} />
        <Label at={merc(-15.35, 13.03)} text="BRITISH GAMBIA" size={55} color="#fff" weight={800} spacing={0.06} o={win(t, T.corridor + 0.5, T.interesting)} />
        <Label at={merc(-15.35, 13.03)} text="BRITISH GAMBIA" size={55} color="#fff" weight={800} spacing={0.06} o={win(t, T.negotiated, T.independence - 0.1)} />
        <Label at={merc(-15.2, 13.95)} text="CONTESTED RIVER" size={39} font="mono" weight={500} spacing={0.16} color="#ffe2b8" o={tension * ramp(t, T.both + 1.2, T.both + 1.8)} />
        {/* east end: Yarbutenda arc */}
        <Label at={merc(-13.95, 13.88)} text="YARBUTENDA" size={29} font="mono" weight={500} spacing={0.1} o={win(t, T.lookNow + 1.6, T.corridor + 1.5)} />
        <Pin at={P("Koina")} r={5} o={win(t, T.lookNow + 1.6, T.corridor + 1.5)} color="#fff1dc" />
        {/* the Gambia at continent scale (opening + final) */}
        <Pin at={merc(-15.3, 13.45)} color={GMB} r={15} pulse={(t * 0.7) % 1} o={win(t, T.tiny - 0.2, T.why + 0.4) + ramp(t, T.worldAtlas - 1.5, T.worldAtlas)} />
      </MapView>

      {/* colonial flash at "two competing empires" */}
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${FRA}55, rgba(0,0,0,0) 45%, rgba(0,0,0,0) 55%, ${BRIT}55)`, opacity: flash, mixBlendMode: "screen" }} />
      <OldPaper o={old * 0.85} />
    </AbsoluteFill>
  );
};

const Overlay: React.FC = () => {
  const t = useT();
  const u = useU();
  const { width: W, height: H } = useVideoConfig();
  const era =
    t < T.back + 0.8 ? { s: "TODAY", c: C.paper } :
    t < T.britain ? { s: "BEFORE COLONIAL BORDERS", c: "#f3e2c0" } :
    t < T.in1889 ? { s: "1800s", c: "#f3e2c0" } :
    t < T.feb ? { s: "1889", c: "#ffd2c8" } :
    t < T.nextTime ? { s: "1965", c: "#ffd2c8" } : { s: "TODAY", c: C.paper };
  const eraO = ramp(t, 1.0, 1.6) * (1 - ramp(t, T.worldAtlas - 0.6, T.worldAtlas));
  // year counter for "go back more than a hundred years"
  const yk = ramp(t, T.back, T.longBefore, easeInOut);
  const year = Math.round(lerp(2026, 1880, yk));
  return (
    <AbsoluteFill>
      <Scrim o={1} full={win(t, T.in1889 - 0.1, T.reached + 1.4, 0.4, 0.6) * 0.55 + win(t, T.feb - 0.1, T.independence + 2.6, 0.4, 0.6) * 0.5 + ramp(t, T.worldAtlas - 0.3, T.worldAtlas + 0.8) * 0.45} />
      <SeriesChip o={ramp(t, 0.6, 1.4) * (1 - ramp(t, T.worldAtlas - 0.6, T.worldAtlas))} />
      <EraChip text={era.s} color={era.c} o={eraO} />

      {/* hook */}
      <Title t={t} at={T.africa - 0.1} out={T.zoom + 0.3} y={0.15} lines={[{ text: "AFRICA", size: 96, font: "serif", weight: 400, spacing: 0.35 }]} />
      <Title t={t} at={T.tiny + 0.3} out={T.why + 0.2} y={0.15} lines={[{ text: "SEE THIS", size: 50, font: "mono", weight: 500, spacing: 0.2, color: C.paperDim }, { text: "TINY COUNTRY?", size: 88 }]} />
      <Title t={t} at={T.why + 0.2} out={T.thisIs - 0.2} y={0.15} lines={[{ text: "A RIVER…", size: 84, color: "#c6ecf7" }, { text: "WITH A BORDER", size: 84 }, { text: "DRAWN AROUND IT?", size: 84, color: "#ffd9cf" }]} />
      <Title t={t} at={T.thisIs} out={T.closely - 0.3} y={0.15} lines={[{ text: "THIS IS", size: 46, font: "mono", weight: 500, spacing: 0.24, color: C.paperDim }, { text: "THE GAMBIA", size: 116, color: "#fff" }]} />
      <Caption t={t} at={T.smallest + 0.1} out={T.closely - 0.2} text="The smallest country on the African mainland" sub="≈ 11,300 KM² · SOURCE: CIA WORLD FACTBOOK" />
      {/* scene 2 */}
      <Title t={t} at={T.strip} out={T.surrounded - 0.1} y={0.15} lines={[{ text: "A LONG, NARROW", size: 70 }, { text: "STRIP OF LAND", size: 70, color: "#ffd9cf" }]} />
      <Caption t={t} at={T.surrounded + 0.2} out={T.except - 0.1} text="Almost completely surrounded by Senegal" />
      <Caption t={t} at={T.except + 0.1} out={T.how} text="…except for one opening to the Atlantic Ocean" color="#9fe3ff" />
      <Title t={t} at={T.how} out={T.back - 0.45} y={0.15} lines={[{ text: "SO HOW DID", size: 76 }, { text: "THIS HAPPEN?", size: 76, color: "#ffd9cf" }]} />
      {/* rewind counter */}
      {t > T.back - 0.2 && t < T.longBefore + 0.6 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.17, textAlign: "center", opacity: win(t, T.back - 0.2, T.longBefore + 0.6, 0.3, 0.5) }}>
          <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.3em", color: C.paperDim }}>REWINDING</div>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 150 * u, color: "#f3e2c0", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>{year}</div>
        </div>
      )}
      {/* scene 3: period map */}
      <ArchiveCard t={t} at={T.longBefore - 0.1} out={T.communities + 1.1} src="hist/janssonius_1674.jpg" full focus={[0.52, 0.45]} zoom={[1.15, 1.45]}
        caption="The Gambia River on a Dutch map of West Africa, 1674" credit="'GENEHOA, JALOFFI, ET SIERRALIONES REGNA' · JANSSONIUS HEIRS, AMSTERDAM · LIBRARY OF CONGRESS (PUBLIC DOMAIN)" />
      <Caption t={t} at={T.communities + 1.2} out={T.european - 0.1} text="Communities lived and traded along the river" sub="LONG BEFORE ANY COLONIAL BORDER · MARKERS ARE ILLUSTRATIVE" color="#f3e2c0" />
      <Caption t={t} at={T.european} out={T.britain - 0.1} text="European empires saw an opportunity" color="#f3e2c0" />
      {/* scene 4 */}
      <Caption t={t} at={T.britain + 0.2} out={T.meanwhile - 0.1} text="Britain: trading posts and settlements along the river" sub="JAMES ISLAND · BATHURST (TODAY BANJUL) · MACCARTHY ISLAND" color={BRIT} />
      <ArchiveCard t={t} at={T.britain + 1.4} out={T.meanwhile + 0.2} src="hist/bathurst_1895.jpg" y={0.2} h={0.24} focus={[0.6, 0.5]}
        caption="A steamship off Bathurst, c. 1895" credit="LIBRARY OF CONGRESS, PRINTS & PHOTOGRAPHS (PUBLIC DOMAIN)" />
      <Caption t={t} at={T.meanwhile + 0.3} out={T.problem - 0.1} text="France: expanding colonial control across Senegal" sub="SHADING IS APPROXIMATE — NO FIXED BORDER YET" color={FRA} />
      <ArchiveCard t={t} at={T.meanwhile + 1.2} out={T.problem + 0.6} src="hist/brossard_1861.jpg" y={0.19} h={0.25} focus={[0.45, 0.62]} zoom={[1.4, 1.7]}
        caption="French map of Senegal and the Gambia, 1861" credit="BROSSARD DE CORBIGNY, UNDER GOV. FAIDHERBE · LIBRARY OF CONGRESS (PUBLIC DOMAIN)" />
      <Caption t={t} at={T.problem + 0.6} out={T.in1889 - 0.2} text="Both empires wanted influence in the region" color="#ffe2b8" />
      {/* scene 5 */}
      <Title t={t} at={T.in1889 + 0.05} out={T.reached + 1.3} y={0.3} lines={[{ text: "1889", size: 210, color: "#fff" }, { text: "ANGLO-FRENCH", size: 70 }, { text: "AGREEMENT", size: 70 }, { text: "SIGNED IN PARIS · 10 AUGUST 1889", size: 26, font: "mono", weight: 500, spacing: 0.18, color: C.paperDim }]} />
      <Caption t={t} at={T.tenKm} out={T.lookNow - 0.1} text="Boundaries roughly 10 km from the river on either side" sub="THE PRINCIPLE · DASHED LINES ARE SCHEMATIC" color="#ffd2c8" />
      <Caption t={t} at={T.lookNow + 0.2} out={T.corridor - 0.1} text="The line as delimited" sub="STRAIGHT SEGMENTS IN THE WEST · ≈10 KM FROM THE RIVER INLAND · AN ARC AROUND YARBUTENDA IN THE EAST" color="#fff1dc" />
      <Caption t={t} at={T.corridor + 0.2} out={T.interesting - 0.2} text="A narrow corridor: British Gambia" sub="SURROUNDED BY FRENCH COLONIAL TERRITORY" color={BRIT} />
      {/* scene 6 */}
      <Stamp t={t} at={T.story + 0.3} out={T.noEvidence + 0.2} text="LEGEND" sub="NOT VERIFIED HISTORY" y={0.15} />
      <Stamp t={t} at={T.noEvidence + 0.1} out={T.negotiated - 0.1} text="NO RELIABLE EVIDENCE" y={0.15} color="#e8e0cf" rot={3} />
      <Caption t={t} at={T.story + 0.4} out={T.negotiated - 0.1} text="An old story: gunboats firing cannonballs to set the width" sub="ILLUSTRATION OF A LEGEND — NOT A HISTORICAL RECONSTRUCTION" color="#d9534c" />
      <Title t={t} at={T.negotiated - 0.1} out={T.feb - 0.3} y={0.15} lines={[{ text: "1889 AGREEMENT", size: 64, color: "#fff" }, { text: "+ SURVEYED BORDERS", size: 64, color: "#ffd2c8" }]} />
      <Caption t={t} at={T.negotiated + 0.2} out={T.feb - 0.2} text="Negotiated in Paris · delimited on the ground" sub="ANGLO-FRENCH COMMISSION 1890–91 · BOUNDARY PILLARS · FURTHER DEMARCATION 1911 & 1925" color="#fff1dc" />
      {/* scene 7 */}
      <Title t={t} at={T.feb + 0.1} out={T.independence + 2.6} y={0.13} lines={[{ text: "18 FEBRUARY 1965", size: 80, color: "#fff" }]} />
      {t > T.independence - 0.4 && t < T.remained + 1.2 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.3, display: "flex", flexDirection: "column", alignItems: "center", opacity: win(t, T.independence - 0.2, T.remained + 1.2, 0.8, 0.8), transform: `translateY(${(1 - ramp(t, T.independence - 0.2, T.independence + 0.8, easeOut)) * 40 * u}px)` }}>
          <div style={{ filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.7))" }}><GambiaFlag w={330 * u} t={t} /></div>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 52 * u, color: C.paper, marginTop: 26 * u, letterSpacing: "0.02em", textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>THE GAMBIA</div>
          <div style={{ fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.3em", color: RED, marginTop: 4 * u }}>INDEPENDENCE</div>
        </div>
      )}
      <Caption t={t} at={T.remained - 0.6} out={T.nextTime - 0.1} text="The colonial-era boundaries largely remained" sub="SENEGAL HAD BECOME INDEPENDENT IN 1960 · MINOR ADJUSTMENTS AGREED IN 1976" color="#fff1dc" />
      {/* scene 8 */}
      <Caption t={t} at={T.storyOf} out={T.worldAtlas - 0.4} text="Its shape tells the story of a river, two competing empires…" sub="…AND A NATION WHOSE HISTORY IS MUCH OLDER THAN ITS BORDERS" color={RED} />
      {/* end card */}
      {t > T.worldAtlas - 0.2 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.27, textAlign: "center" }}>
          <div style={{ fontFamily: F.mono, fontSize: 30 * u, letterSpacing: "0.42em", color: C.paperDim, opacity: ramp(t, T.worldAtlas, T.worldAtlas + 0.6) }}>WORLD ATLAS</div>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 150 * u, color: "#fff", lineHeight: 1, opacity: ramp(t, T.country1, T.country1 + 0.5), transform: `scale(${1.1 - 0.1 * ramp(t, T.country1, T.country1 + 0.6, easeOut)})` }}>#001</div>
          <div style={{ height: 4 * u, width: 300 * u * ramp(t, T.country1 + 0.3, T.country1 + 1.2, easeOut), background: RED, margin: `${26 * u}px auto` }} />
          <div style={{ fontFamily: F.serif, fontSize: 96 * u, color: C.paper, letterSpacing: "0.06em", opacity: ramp(t, T.gambia, T.gambia + 0.6) }}>The Gambia</div>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 54 * u, letterSpacing: "0.08em", color: C.paper, marginTop: 70 * u, opacity: ramp(t, T.unknown, T.unknown + 0.6), filter: `blur(${(1 - ramp(t, T.unknown, T.unknown + 0.6)) * 8 * u}px)` }}>THE UNKNOWN FILE</div>
          <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.3em", color: RED, marginTop: 10 * u, opacity: ramp(t, T.unknown + 0.4, T.unknown + 1.0) }}>WORLD ATLAS · COUNTRY No. 1</div>
        </div>
      )}
      <AbsoluteFill style={{ background: "#000", opacity: ramp(t, DURATION - 0.7, DURATION) }} />
    </AbsoluteFill>
  );
};

export const Gambia: React.FC = () => (
  <AbsoluteFill style={{ background: "#05070a" }}>
    <Audio src={staticFile("audio/narration.mp3")} />
    <Preload srcs={["terrain/africa.jpg", "terrain/westafrica.jpg", "terrain/senegambia.jpg", "terrain/gambia.jpg", "hist/janssonius_1674.jpg", "hist/brossard_1861.jpg", "hist/bathurst_1895.jpg", "tex/paper.jpg", "fields/fra_soft.png", "fields/fra_firm.png"]} />
    {on("atlas") && <Atlas />}
    {on("overlay") && <Overlay />}
    {on("film") && <FilmLook grain={0.06} vignette={0.5} />}
  </AbsoluteFill>
);
