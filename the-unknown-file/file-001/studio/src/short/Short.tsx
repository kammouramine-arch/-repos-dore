import React from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import tokens from "../data/short.tokens.json";
import subs from "../data/short.subs.json";
import { makeCues } from "../lib/cues";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, keys, lerp, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { Shot, useShot } from "../components/Shot";
import { FilmLook } from "../components/FilmLook";
import { Kicker, Reveal, Stat, IllustrationTag, useU } from "../components/Type";
import { GeoMap, MONOUN, NYOS } from "../components/GeoMap";
import { CrossSection, LAKE as XL } from "../components/CrossSection";
import { Village } from "../components/Village";
import { PhotoFull, PhotoPrint } from "../components/Photo";
import { DotField, FileSeal } from "../components/Brand";
import { TerrainShot, villageP, LAKE_P } from "../components/TerrainShot";
import { Subtitles } from "../components/Subtitles";
import { Cam } from "../three/Terrain";
import { LAKE, CRATER_LAKE } from "../three/terrainData";
const [CX, CZ] = CRATER_LAKE;

const { at, end } = makeCues(tokens);
export const SHORT_DURATION = 106.6;

const [LX, LZ] = LAKE;
const cam7 = (v: number[]): Cam => ({ pos: [v[0], v[1], v[2]], target: [v[3], v[4], v[5]], fov: v[6] });

// cue points (seconds, from the narration itself)
const T = {
  n1700: at("1,700"),
  water: at("and almost none"),
  august: at("August"),
  cameroon: at("Cameroon"),
  families: at("Families"),
  lakeNyos: at("called Lake Nyos") + 0.45,
  thatNight: at("But that night"),
  cloud: at("An enormous invisible cloud"),
  villages: at("flowing down"),
  collapsed: at("People suddenly"),
  morning: at("and by morning"),
  devastated: at("entire communities"),
  strange: at("But here's the strange"),
  noFire: at("no fire"),
  noLava: at("no lava"),
  noSign: at("no visible sign"),
  whatHappened: at("So what actually"),
  scientists: at("Scientists eventually"),
  deep: at("Deep beneath"),
  co2: at("carbon dioxide"),
  years: at("had been building"),
  escaped: at("And on that night"),
  suddenly: at("suddenly escaped"),
  deadlyCloud: at("A deadly cloud"),
  filling: at("filling the air"),
  toll: at("More than 1,700", 60),
  disturbing: at("But here's what makes"),
  twoYears: at("Just two years"),
  another: at("another lake in Cameroon"),
  n37: at("37"),
  worse: at("that something far worse"),
  after: at("After the disaster"),
  release: at("to release the trapped"),
  today: at("Today, Lake Nyos"),
  peaceful: at("Its waters"),
  beautiful: at("Its surroundings"),
  underneath: at("But underneath"),
  history: at("in modern history"),
  file: at("File One"),
  fileEnd: end("The Unknown File"),
};

export const Short: React.FC<{ subtitles?: boolean }> = ({ subtitles = true }) => {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile("audio/UNKNOWN_FILE_SHORT.mp3")} />

      {/* 1 — HOOK: the lake from above, 1,700 */}
      <Shot from={0} to={T.august + 0.25} fadeIn={0} fadeOut={0.5} outT="blur" name="hook-lake">
        <HookLake />
      </Shot>
      {/* 3 — globe → Cameroon → Lake Nyos */}
      <Shot from={T.august - 0.2} to={T.thatNight + 0.25} fadeIn={0.5} fadeOut={0.45} name="geo-zoom">
        <GeoZoom />
      </Shot>
      {/* 4 — that night: village */}
      <Shot from={T.thatNight} to={T.cloud + 0.3} fadeIn={0.45} fadeOut={0.4} name="village-night">
        <VillageNight />
      </Shot>
      {/* 5 — the cloud spreads on real terrain */}
      <Shot from={T.cloud} to={T.collapsed + 0.3} fadeIn={0.4} fadeOut={0.45} name="gas-terrain">
        <GasTerrain />
      </Shot>
      {/* 6 — lights go out */}
      <Shot from={T.collapsed} to={T.morning + 0.9} fadeIn={0.4} fadeOut={0.9} name="lights-out">
        <LightsOut />
      </Shot>
      {/* 7 — morning: archival 1986 photograph */}
      <Shot from={T.morning + 0.2} to={T.noFire - 0.1} fadeIn={0.9} fadeOut={0.6} name="aftermath-photo">
        <Aftermath />
      </Shot>
      {/* 8 — no fire, no lava */}
      <Shot from={T.noFire - 0.4} to={T.scientists + 0.1} fadeIn={0.3} fadeOut={0.4} name="no-fire">
        <NoFire />
      </Shot>
      {/* 9 — investigation */}
      <Shot from={T.scientists - 0.1} to={T.deep + 0.3} fadeIn={0.4} fadeOut={0.45} name="investigation">
        <Investigation />
      </Shot>
      {/* 10 — cross-section: CO2 builds up */}
      <Shot from={T.deep} to={T.escaped + 0.05} fadeIn={0.45} fadeOut={0} outT="cut" name="xs-build">
        <XSBuild />
      </Shot>
      {/* 11 — the release */}
      <Shot from={T.escaped} to={T.filling + 0.3} fadeIn={0} inT="cut" fadeOut={0.45} name="xs-release">
        <XSRelease />
      </Shot>
      {/* 12 — cloud through the valleys */}
      <Shot from={T.filling} to={T.toll + 0.2} fadeIn={0.45} fadeOut={0.5} name="valleys">
        <Valleys />
      </Shot>
      {/* 13 — 1,700 lives */}
      <Shot from={T.toll - 0.1} to={T.disturbing + 0.2} fadeIn={0.5} fadeOut={0.5} name="toll">
        <Toll />
      </Shot>
      {/* 14 — 1984: Lake Monoun */}
      <Shot from={T.disturbing} to={T.after + 0.3} fadeIn={0.5} fadeOut={0.45} name="monoun">
        <Monoun />
      </Shot>
      {/* 15 — degassing pipes */}
      <Shot from={T.after} to={T.release + 1.3} fadeIn={0.45} fadeOut={0.4} name="pipes">
        <Pipes />
      </Shot>
      <Shot from={T.release + 1.1} to={T.today + 0.3} fadeIn={0.4} fadeOut={0.45} name="pipe-photo">
        <PipePhoto />
      </Shot>
      {/* 16 — today */}
      <Shot from={T.today} to={T.underneath + 0.5} fadeIn={0.45} fadeOut={0.7} name="today">
        <Today />
      </Shot>
      {/* 17 — underneath */}
      <Shot from={T.underneath + 0.1} to={T.file + 0.1} fadeIn={0.7} fadeOut={0.7} outT="dip" name="beneath">
        <Beneath />
      </Shot>
      {/* 18 — FILE #001 */}
      <Shot from={T.file - 0.5} to={SHORT_DURATION} fadeIn={0.6} fadeOut={0.6} name="seal">
        <Seal />
      </Shot>

      {subtitles && <Subtitles subs={subs} />}
      <FilmLook />
    </AbsoluteFill>
  );
};

/* ================================================================= shots */

const Top: React.FC<{ children: React.ReactNode; y?: number }> = ({ children, y = 300 }) => {
  const u = useU();
  return <div style={{ position: "absolute", left: 70 * u, right: 70 * u, top: y * u, textAlign: "center" }}>{children}</div>;
};

const HookLake: React.FC = () => {
  const { t, dur } = useShot();
  const tw = T.water;
  // top-down on the crater, slow descent; then tilt up and look out over the north rim to the valleys
  const c = keys(t, [
    [0, [CX + 0.05, 6.6, CZ + 1.1, CX, 1.0, CZ - 0.05, 44]],
    [tw - 0.2, [CX + 0.04, 4.3, CZ + 0.85, CX, 1.0, CZ - 0.1, 42]],
    [dur, [CX + 0.2, 3.2, CZ + 2.1, CX - 0.3, 0.9, CZ - 1.5, 46]],
  ], easeInOut);
  const tilt = ramp(t, tw - 0.2, dur);
  const tt = T.n1700;
  return (
    <TerrainShot ds="crater" res={1} sky="dusk" cam={() => cam7(c)} state={() => ({ night: 0.15 + 0.35 * tilt, gas: 0, gasAmt: 0, lights: 0, haze: 0.02 + 0.06 * tilt, hazeColor: "#3c3f49", exposure: 1.08 - 0.18 * tilt })}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(7,9,12,0.55) 0%, rgba(7,9,12,0) 38%, rgba(7,9,12,0) 70%, rgba(7,9,12,0.45) 100%)" }} />
      <Top y={300}>
        <div style={{ opacity: 1 - ramp(t, tw + 0.4, tw + 1.1) }}>
          <Kicker text="ONE NIGHT · ONE LAKE" t={t} at={0.15} size={24} color={C.paperDim} style={{ marginBottom: 30 }} />
          <Stat t={t} at={tt - 0.15} value="1,700" label="PEOPLE" size={250} />
        </div>
      </Top>
    </TerrainShot>
  );
};

const GeoZoom: React.FC = () => {
  const { t } = useShot();
  const t0 = T.august - 0.2; // shot start (abs)
  const a = (x: number) => x - t0; // abs → local
  const v = keys(t, [
    [0, [-8, 18, 0.95]],
    [a(T.cameroon) - 0.2, [12.0, 5.5, 2.0]],
    [a(T.families), [11.2, 6.0, 7]],
    [a(T.lakeNyos) - 0.6, [10.29, 6.47, 700]],
    [a(T.thatNight) + 0.3, [10.29, 6.475, 820]],
  ], easeInOut);
  const zoom = v[2];
  const lz = Math.log10(zoom);
  return (
    <AbsoluteFill>
      <GeoMap
        t={t}
        view={{ lon: v[0], lat: v[1], zoom, cy: 0.5 }}
        cameroon={ramp(t, a(T.cameroon) - 0.3, a(T.cameroon) + 0.4)}
        nw={ramp(lz, 0.9, 1.3) * (1 - ramp(lz, 2.1, 2.4))}
        relief={ramp(lz, 0.85, 1.25)}
        local={ramp(lz, 1.9, 2.4)}
        lakes={ramp(lz, 1.4, 1.8)}
        borders={1 - ramp(lz, 1.2, 1.6)}
        labels={[
          { lon: 12.4, lat: 5.6, text: "Cameroon", at: a(T.cameroon), out: a(T.families) + 0.4, kind: "country" },
          { lon: 10.5, lat: 6.3, text: "Northwest Region", at: a(T.families) - 0.1, out: a(T.lakeNyos) - 1.3, kind: "region" },
          { lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", sub: "6.44°N · 10.30°E", at: a(T.lakeNyos) - 0.25, kind: "lake", dx: 30, dy: -40 },
          { lon: 10.2291, lat: 6.47797, text: "Cha", at: a(T.lakeNyos) + 0.5, kind: "village" },
          { lon: 10.361, lat: 6.51041, text: "Subum", at: a(T.lakeNyos) + 0.65, kind: "village" },
          { lon: 10.2801, lat: 6.54922, text: "Fang", at: a(T.lakeNyos) + 0.8, kind: "village" },
        ]}
        pins={[{ lon: NYOS[0], lat: NYOS[1], at: a(T.cameroon) + 0.4 }]}
      />
      <Top y={250}>
        <div style={{ opacity: 1 - ramp(t, a(T.families) - 0.2, a(T.families) + 0.4) }}>
          <Kicker text="DATE OF EVENT" t={t} at={0.35} size={22} style={{ marginBottom: 18 }} />
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 96 * useU(), color: C.paper, letterSpacing: "-0.01em", lineHeight: 1 }}>
            <Reveal text="AUGUST 21," t={t} at={0.4} stagger={0.12} />
          </div>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 150 * useU(), color: C.burgundyHi, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            <Reveal text="1986" t={t} at={a(T.august) + 1.2} />
          </div>
        </div>
      </Top>
    </AbsoluteFill>
  );
};

const VillageNight: React.FC = () => {
  const { t, dur } = useShot();
  return (
    <AbsoluteFill>
      <Village t={t} pan={t / dur * 0.6} cam={{ x: 980, y: 560, zoom: lerp(1.0, 1.08, t / dur) }} lights={1} moon={1} />
      <IllustrationTag t={t} text="ILLUSTRATION" style={{ right: 60, top: 230 }} />
    </AbsoluteFill>
  );
};

const GasTerrain: React.FC = () => {
  const { t, dur } = useShot();
  const g = ramp(t, 0.4, dur - 0.2, (x) => x);
  const c = keys(t, [
    [0, [LX + 0.6, 6.4, LZ + 8.5, LX - 0.8, 0.9, LZ - 6, 50]],
    [dur, [LX + 0.2, 5.0, LZ + 5.6, LX - 1.5, 0.8, LZ - 8, 50]],
  ], easeInOut);
  const lv = T.villages - T.cloud;
  return (
    <TerrainShot
      cam={() => cam7(c)}
      state={() => ({ night: 1, gas: lerp(0.02, 0.5, g), gasAmt: 1, lights: 1, haze: 0.03, hazeColor: "#0b1420" })}
      labels={[
        { p: LAKE_P, text: "Lake Nyos", at: 0.2, out: lv - 0.3, kind: "lake" },
        { p: villageP("Cha"), text: "Cha", at: lv + 0.1, kind: "village" },
        { p: villageP("Subum"), text: "Subum", at: lv + 0.4, kind: "village" },
        { p: villageP("Fang"), text: "Fang", at: lv + 0.7, kind: "village" },
      ]}
    >
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,8,13,0.7) 0%, rgba(5,8,13,0) 40%)" }} />
      <Top y={250}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 86 * useU(), color: C.paper, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
          <Reveal text="AN INVISIBLE" t={t} at={0.5} />
          <br />
          <Reveal text="CLOUD" t={t} at={0.75} wordStyle={() => ({ color: C.gas })} />
        </div>
      </Top>
      <IllustrationTag t={t} style={{ right: 60, top: 560 }} />
    </TerrainShot>
  );
};

const LightsOut: React.FC = () => {
  const { t, dur } = useShot();
  const gas = ramp(t, 0.1, T.morning - T.collapsed + 0.6, (x) => x);
  return (
    <AbsoluteFill>
      <Village t={t + 20} pan={0.6 + (t / dur) * 0.35} cam={{ x: 1000, y: 600, zoom: 1.12 }} gas={gas} gasRange={[620, 1700]} lights={1} moon={0.8} />
      <IllustrationTag t={t} text="ILLUSTRATION" style={{ right: 60, top: 230 }} />
    </AbsoluteFill>
  );
};

const Aftermath: React.FC = () => {
  const { t, dur } = useShot();
  const dawnEnd = 1.6;
  return (
    <AbsoluteFill>
      <Village t={t + 30} pan={1} cam={{ x: 1000, y: 600, zoom: 1.12 }} dawn={ramp(t, 0, 1.2)} lights={0} moon={0} />
      <AbsoluteFill style={{ opacity: ramp(t, dawnEnd, dawnEnd + 0.9) }}>
        <PhotoFull src="photos/usgs_lockwood_1986_lake_nyos.jpg" t={t} dur={dur} from={[1.05, 40, 50]} to={[1.18, 52, 46]} credit="LAKE NYOS · 1986 · PHOTO J. LOCKWOOD / USGS · PUBLIC DOMAIN" />
        <Top y={300}>
          <Kicker text="THE MORNING AFTER" t={t} at={dawnEnd + 0.6} size={24} color={C.paper} />
        </Top>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const NoFire: React.FC = () => {
  const { t } = useShot();
  const u = useU();
  const t0 = T.noFire - 0.4;
  const a = (x: number) => x - t0;
  const big: React.CSSProperties = { fontFamily: F.sans, fontWeight: 800, fontSize: 120 * u, color: C.paper, lineHeight: 1.04, letterSpacing: "-0.015em" };
  const q = a(T.whatHappened);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #121a24 0%, ${C.ink} 75%)` }}>
      <div style={{ position: "absolute", left: 80 * u, right: 80 * u, top: 420 * u, textAlign: "left", opacity: 1 - ramp(t, q - 0.3, q + 0.1) }}>
        <div style={big}><Reveal text="NO FIRE." t={t} at={a(T.noFire)} /></div>
        <div style={big}><Reveal text="NO LAVA." t={t} at={a(T.noLava)} /></div>
        <div style={{ ...big, color: "rgba(236,230,218,0.55)" }}><Reveal text="NO VISIBLE" t={t} at={a(T.noSign)} /><br /><Reveal text="SIGN." t={t} at={a(T.noSign) + 0.3} /></div>
      </div>
      <div style={{ position: "absolute", left: 80 * u, right: 80 * u, top: 560 * u, textAlign: "center", opacity: ramp(t, q, q + 0.4) }}>
        <Kicker text="THE QUESTION" t={t} at={q} size={22} style={{ marginBottom: 24 * u }} />
        <div style={{ ...big, fontSize: 140 * u }}>
          <Reveal text="WHAT" t={t} at={q + 0.1} /><br />
          <Reveal text="HAPPENED?" t={t} at={q + 0.35} wordStyle={() => ({ color: C.burgundyHi })} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Investigation: React.FC = () => {
  const { t, dur } = useShot();
  return (
    <AbsoluteFill>
      <PhotoPrint src="photos/usgs_lockwood_nyos_lake.jpg" t={t} dur={dur} credit="LAKE NYOS · 1986 · J. LOCKWOOD / USGS" tag="EVIDENCE 001-A" w={900} aspect={0.669} rot={-2.5} y={0.42} />
      <Top y={230}>
        <Kicker text="THE INVESTIGATION" t={t} at={0.3} size={24} color={C.paper} />
      </Top>
    </AbsoluteFill>
  );
};

const XSBuild: React.FC = () => {
  const { t, dur } = useShot();
  const u = useU();
  const t0 = T.deep;
  const a = (x: number) => x - t0;
  const cam = keys(t, [
    [0, [XL.mid, XL.surf - 120, 1.35]],
    [1.6, [XL.mid, XL.surf + 110, 1.05]],
    [dur, [XL.mid + 20, XL.surf + 140, 1.0]],
  ], easeInOut);
  const acc = ramp(t, a(T.co2) - 0.5, a(T.escaped) - 0.3, (x) => x);
  return (
    <AbsoluteFill>
      <CrossSection
        t={t}
        cam={{ x: cam[0], y: cam[1], zoom: cam[2] }}
        accum={0.05 + 0.85 * acc}
        source={ramp(t, 0.6, 1.8)}
        layers={ramp(t, 0.8, 1.8)}
        ruler={ramp(t, 1.4, 2.4)}
        labels={[
          { text: "CO₂ SEEPS IN FROM BELOW", x: XL.mid - 250, y: XL.bottom + 150, at: 1.0, ax: XL.mid + 26, ay: XL.bottom + 90 },
        ]}
      />
      <Top y={250}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 104 * u, color: C.paper, lineHeight: 1, letterSpacing: "-0.01em" }}>
          <Reveal text="CARBON" t={t} at={a(T.co2)} /><br /><Reveal text="DIOXIDE" t={t} at={a(T.co2) + 0.15} />
        </div>
        <Kicker text="BUILDING UP · YEAR AFTER YEAR" t={t} at={a(T.years)} size={22} style={{ marginTop: 26 * u }} />
      </Top>
      <IllustrationTag t={t} style={{ right: 60, top: 1180 }} />
    </AbsoluteFill>
  );
};

const XSRelease: React.FC = () => {
  const { t, dur } = useShot();
  const u = useU();
  const t0 = T.escaped;
  const a = (x: number) => x - t0;
  const rise = ramp(t, 0.2, a(T.suddenly) + 0.3, (x) => x);
  const erupt = ramp(t, a(T.suddenly), a(T.suddenly) + 1.2, easeOut);
  const flow = ramp(t, a(T.deadlyCloud) - 0.2, dur, (x) => x);
  const cam = keys(t, [
    [0, [XL.mid + 20, XL.surf + 140, 1.0]],
    [a(T.suddenly), [XL.mid, XL.surf + 40, 0.92]],
    [a(T.deadlyCloud), [XL.mid + 150, XL.surf + 20, 0.85]],
    [dur, [XL.mid + 520, XL.surf + 120, 0.82]],
  ], easeInOut);
  return (
    <AbsoluteFill>
      <CrossSection t={t} cam={{ x: cam[0], y: cam[1], zoom: cam[2] }} accum={0.9 * (1 - erupt * 0.5)} rise={rise} erupt={erupt * (1 - ramp(t, a(T.deadlyCloud) + 1, dur) * 0.6)} flow={flow} source={1}
        labels={[
          { text: "PRESSURE DROPS", x: XL.mid + 230, y: XL.surf + 120, at: 0.5, out: a(T.suddenly) + 0.6, ax: XL.mid + 60, ay: XL.surf + 150 },
          { text: "GAS BURSTS FREE", x: XL.mid + 240, y: XL.surf - 150, at: a(T.suddenly) + 0.3, out: a(T.deadlyCloud) + 0.3 },
          { text: "DENSE CO₂ FLOWS DOWNHILL →", x: XL.n + 60, y: XL.surf - 170, at: a(T.deadlyCloud) + 0.4 },
        ]}
      />
      <IllustrationTag t={t} style={{ right: 60, top: 1180 }} />
      <Top y={250}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 80 * u, color: C.paper, lineHeight: 1.05, opacity: 1 - ramp(t, a(T.deadlyCloud) - 0.3, a(T.deadlyCloud)) }}>
          <Reveal text="THE GAS" t={t} at={a(T.suddenly) - 0.2} /><br /><Reveal text="ESCAPED" t={t} at={a(T.suddenly) + 0.05} wordStyle={() => ({ color: C.gas })} />
        </div>
      </Top>
    </AbsoluteFill>
  );
};

const Valleys: React.FC = () => {
  const { t, dur } = useShot();
  const c = keys(t, [
    [0, [LX - 1.0, 7.5, LZ + 2.5, LX - 2.2, 0.7, LZ - 7, 52]],
    [dur, [LX - 1.8, 6.0, LZ - 1.2, LX - 3.2, 0.6, LZ - 10.5, 52]],
  ], easeInOut);
  return (
    <TerrainShot
      cam={() => cam7(c)}
      state={() => ({ night: 1, gas: lerp(0.45, 0.95, ramp(t, 0, dur, (x) => x)), gasAmt: 1, lights: 1, haze: 0.03, hazeColor: "#0b1420" })}
      labels={[
        { p: villageP("Cha"), text: "Cha", at: 0.2, kind: "village" },
        { p: villageP("Subum"), text: "Subum", at: 0.3, kind: "village" },
        { p: villageP("Fang"), text: "Fang", at: 0.5, kind: "village" },
        { p: villageP("Mashi"), text: "Mashi", at: 1.2, kind: "village" },
      ]}
    >
      <IllustrationTag t={t} style={{ right: 60, top: 240 }} />
      <Top y={330}>
        <Kicker text="CO₂ · DENSER THAN AIR · FOLLOWS THE VALLEYS" t={t} at={0.4} size={20} color={C.paper} />
      </Top>
    </TerrainShot>
  );
};

const Toll: React.FC = () => {
  const { t } = useShot();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <DotField t={t} area={{ x: 0.08, y: 0.12, w: 0.84, h: 0.38 }} dim={ramp(t, 3.0, 4.2)} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1040 * useU(), display: "flex", justifyContent: "center" }}>
        <Stat t={t} at={0.5} value="1,700+" label="LIVES LOST" size={170} />
      </div>
    </AbsoluteFill>
  );
};

const Monoun: React.FC = () => {
  const { t } = useShot();
  const u = useU();
  const t0 = T.disturbing;
  const a = (x: number) => x - t0;
  const v = keys(t, [
    [0, [10.36, 6.22, 95]],
    [a(T.another) - 0.3, [10.38, 6.15, 80]],
    [a(T.another) + 1.4, [10.47, 5.86, 82]],
    [a(T.worse) - 0.4, [10.47, 5.86, 84]],
    [a(T.worse) + 1.4, [10.44, 6.0, 66]],
  ], easeInOut);
  const roll = ramp(t, a(T.twoYears), a(T.twoYears) + 1.1, easeInOut);
  const year = roll < 0.5 ? "1986" : roll < 0.75 ? "1985" : "1984";
  return (
    <AbsoluteFill>
      <GeoMap
        t={t}
        view={{ lon: v[0], lat: v[1], zoom: v[2], cy: 0.56 }}
        relief={1}
        lakes={1}
        cameroon={1}
        borders={0}
        labels={[
          { lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", sub: "21 AUG 1986 · 1,700+ DEAD", at: 0.3, kind: "lake", dx: 30, dy: -40 },
          { lon: MONOUN[0], lat: MONOUN[1], text: "Lake Monoun", sub: "15 AUG 1984 · 37 DEAD", at: a(T.another) + 0.9, kind: "lake", dx: -330, dy: -120 },
        ]}
        pins={[{ lon: NYOS[0], lat: NYOS[1], at: 0.2 }, { lon: MONOUN[0], lat: MONOUN[1], at: a(T.another) + 0.6, color: C.amber }]}
        arc={{ from: MONOUN, to: NYOS, p: ramp(t, a(T.worse), a(T.worse) + 1.4, easeInOut), label: "≈ 100 KM" }}
      />
      <Top y={190}>
        <Kicker text="TWO YEARS EARLIER" t={t} at={a(T.twoYears)} size={24} color={C.paper} out={a(T.n37) - 0.3} />
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 150 * u, color: roll > 0.7 ? C.amber : C.paper, opacity: ramp(t, a(T.twoYears) - 0.2, a(T.twoYears) + 0.2) * (1 - ramp(t, a(T.n37) - 0.3, a(T.n37))), fontVariantNumeric: "tabular-nums", filter: roll > 0.05 && roll < 0.95 ? `blur(${3 * u}px)` : undefined }}>
          {year}
        </div>
      </Top>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170 * u, display: "flex", justifyContent: "center", opacity: 1 - ramp(t, a(T.worse) + 0.6, a(T.worse) + 1.1) }}>
        {t > a(T.n37) - 0.3 && <Stat t={t} at={a(T.n37) - 0.1} value="37" label="PEOPLE · LAKE MONOUN" size={190} color={C.paper} />}
      </div>
      <Top y={200}>
        <div style={{ opacity: ramp(t, a(T.worse) + 1.0, a(T.worse) + 1.6) }}>
          <Kicker text="1984 — THE FIRST WARNING" t={t} at={a(T.worse) + 1.0} size={26} color={C.paper} />
        </div>
      </Top>
    </AbsoluteFill>
  );
};

const Pipes: React.FC = () => {
  const { t, dur } = useShot();
  const t0 = T.after;
  const a = (x: number) => x - t0;
  return (
    <AbsoluteFill>
      <CrossSection
        t={t}
        cam={{ x: XL.mid, y: XL.surf + 90, zoom: lerp(0.95, 1.02, t / dur) }}
        accum={0.75}
        deplete={ramp(t, a(T.release), dur + 1, (x) => x) * 0.6}
        pipe={ramp(t, 0.4, 1.8, easeInOut)}
        pipeFlow={ramp(t, a(T.release) - 0.5, a(T.release) + 0.4)}
        pipes={1}
        labels={[
          { text: "DEGASSING PIPE", x: XL.mid + 60, y: XL.surf - 120, at: 1.2, ax: XL.mid + 14, ay: XL.surf - 20 },
          { text: "GAS-RICH DEEP WATER RISES", x: XL.mid + 40, y: XL.bottom + 50, at: a(T.release) - 0.2, ax: XL.mid + 10, ay: XL.bottom - 30 },
        ]}
      />
      <IllustrationTag t={t} style={{ right: 60, top: 1180 }} />
      <Top y={250}>
        <Kicker text="THE FIX · CONTROLLED DEGASSING" t={t} at={0.3} size={24} color={C.paper} />
      </Top>
    </AbsoluteFill>
  );
};

const PipePhoto: React.FC = () => {
  const { t, dur } = useShot();
  return (
    <AbsoluteFill>
      <PhotoPrint src="photos/usgs_evans_2001_degassing.jpg" t={t} dur={dur} credit="LAKE NYOS DEGASSING · 2001 · W. EVANS / USGS" tag="2001" w={920} aspect={0.756} rot={1.8} y={0.42} />
    </AbsoluteFill>
  );
};

const Today: React.FC = () => {
  const { t, dur } = useShot();
  const ang = lerp(-0.5, 0.35, t / dur);
  const r = 2.7;
  const c: Cam = { pos: [CX + Math.sin(ang) * r, 2.15, CZ + Math.cos(ang) * r], target: [CX, 1.0, CZ], fov: 46 };
  return (
    <TerrainShot ds="crater" res={0.75} sky="day" cam={() => c} state={() => ({ night: 0, gas: 0, gasAmt: 0, lights: 0, haze: 0.05, hazeColor: "#8d969c", exposure: 1.1 })}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(7,9,12,0.45) 0%, rgba(7,9,12,0) 35%, rgba(7,9,12,0) 70%, rgba(7,9,12,0.45) 100%)" }} />
      <Top y={300}>
        <Kicker text="LAKE NYOS · TODAY" t={t} at={0.4} size={26} color={C.paper} />
      </Top>
    </TerrainShot>
  );
};

const Beneath: React.FC = () => {
  const { t, dur } = useShot();
  const cam = keys(t, [
    [0, [XL.mid, XL.surf - 60, 1.6]],
    [dur, [XL.mid + 10, XL.bottom - 40, 1.9]],
  ], easeInOut);
  return <CrossSection t={t} cam={{ x: cam[0], y: cam[1], zoom: cam[2] }} accum={0.55} layers={0.6} dim={ramp(t, dur - 1.6, dur)} />;
};

const Seal: React.FC = () => {
  const { t, dur } = useShot();
  return <FileSeal t={t} dur={dur} mode="close" />;
};
