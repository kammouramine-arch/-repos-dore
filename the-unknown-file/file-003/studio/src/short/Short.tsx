import React from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import tokens from "../data/short.tokens.json";
import { makeCues } from "../lib/cues";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { Shot } from "../components/Shot";
import { FilmLook } from "../components/FilmLook";
import { FileSeal } from "../components/Brand";
import { Emph, InjuryCard, Shade, StrikeCounter, Tag, YearCard, CreditLine } from "../components/UI";
import { Strike1 } from "../scenes/Strike1";
import { Strike2, Strike3, Strike4, Strike5, Strike6, Strike7 } from "../scenes/Strikes";
import { AfterStorm, OpenStorm, RangerSilhouette, RoyPhoto, SevenReveal, Timeline7, VirginiaToPark, YearsPass } from "../scenes/Story";

const { seq } = makeCues(tokens);
export const SHORT_DURATION = 102.4;

// cue points, looked up in narration order
const T = {
  struck0: seq("struck by lightning"), surviving: seq("surviving"), six: seq("happen six more times"), times: seq("times"),
  fiction: seq("This isn't fiction"), roy: seq("Roy Sullivan"), y1942: seq("1942"), ranger: seq("park ranger"), virginia: seq("Virginia"),
  tower: seq("lightning struck a lookout tower"), struck1: seq("struck a lookout"), fire: seq("The tower caught fire"), ran: seq("Roy ran"),
  bolt: seq("then a bolt"), struck1b: seq("struck his right leg"), survived1: seq("He survived but"), toe: seq("big toe"),
  later: seq("27 years later"), y1969: seq("1969"), struck2: seq("struck again"), driving: seq("driving his truck"), knocked: seq("It knocked"),
  eyebrows: seq("burned his eyebrows"), watch: seq("destroyed his watch"), then3: seq("Then, in"), y1970: seq("1970"), struck3: seq("struck him in his garden"),
  in72: seq("In 1972"), struck4: seq("struck him inside"), hair4: seq("set his hair on fire"), crazier: seq("But it gets even crazier"),
  in73: seq("In 1973"), struck5: seq("struck him for the fifth"), hair5: seq("his hair caught fire again"), afraid: seq("Roy had become so afraid"),
  water: seq("keeping water nearby"), justInCase: seq("just in case"), came: seq("Then came 1976"), number6: seq("strike number six"),
  ankle: seq("his ankle was injured"), june: seq("on June 25"), fishing: seq("Roy was out fishing"), struck7: seq("struck him for the seventh"),
  seventh: seq("seventh time"), chest: seq("It burned his chest"), somehow: seq("but somehow"), survived7: seq("survived. Again"), again: seq("Again"),
  seven: seq("Seven lightning strikes"), y35: seq("35 years"), oneMan: seq("One man"), story: seq("His story earned"), guinness: seq("Guinness World Records"),
  despite: seq("and despite all"), never: seq("Roy was never recorded"), file: seq("File 3"),
};

// shot boundaries (absolute seconds)
const B = {
  s1: [0, T.surviving - 0.45], s2: [T.surviving - 0.45, T.six - 0.25], s3: [T.six - 0.25, T.fiction - 0.15], s4: [T.fiction - 0.15, T.y1942 - 0.35],
  s5: [T.y1942 - 0.35, T.tower - 1.0], s6: [T.tower - 1.0, T.ran - 0.1], s7: [T.ran - 0.1, T.survived1 - 0.15], s8: [T.survived1 - 0.15, T.later - 0.2],
  s9: [T.later - 0.2, T.struck2 - 0.7], s10: [T.struck2 - 0.7, T.driving - 0.6], s11: [T.driving - 0.6, T.knocked + 0.15], s12: [T.knocked + 0.15, T.then3 - 0.05],
  s13: [T.then3 - 0.05, T.in72 - 0.1], s14: [T.in72 - 0.1, T.crazier - 0.1], s15: [T.crazier - 0.1, T.in73 - 0.1], s16: [T.in73 - 0.1, T.afraid - 0.2],
  s17: [T.afraid - 0.2, T.came - 0.15], s18: [T.came - 0.15, T.june - 0.2], s19: [T.june - 0.2, T.chest - 0.05], s20: [T.chest - 0.05, T.somehow + 0.9],
  s21: [T.somehow + 0.9, T.seven - 0.2], s22: [T.seven - 0.2, T.story - 0.2], s23: [T.story - 0.2, T.never - 0.25], s24: [T.never - 0.25, T.file - 0.35],
  s25: [T.file - 0.35, SHORT_DURATION],
};
const L = (k: keyof typeof B, abs: number) => abs - B[k][0]; // absolute cue -> shot-local time
const dur = (k: keyof typeof B) => B[k][1] - B[k][0];

const ILLUS = "ILLUSTRATIVE RECONSTRUCTION";

const S1: React.FC = () => { const t = useT(); return (
  <>
    <OpenStorm t={t} strikeAt={L("s1", T.struck0) + 0.2} />
    <Tag t={t} text="VIRGINIA · BLUE RIDGE MOUNTAINS" sub="STORM: ILLUSTRATIVE" at={0.4} />
  </>
); };
const S2: React.FC = () => { const t = useT(); return (
  <>
    <RangerSilhouette t={t} strikeAt={L("s2", T.surviving) + 0.05} />
    <Emph t={t} text="SURVIVING." at={L("s2", T.surviving)} y={0.66} />
    <Tag t={t} text={ILLUS} at={0.2} />
  </>
); };
const S3: React.FC = () => { const t = useT(); return (
  <>
    <SevenReveal t={t} at={L("s3", T.six) - 0.05} dur={T.times + 0.4 - T.six} />
    <Emph t={t} text="SIX MORE TIMES" at={L("s3", T.six)} y={0.72} size={64} />
  </>
); };
const S4: React.FC = () => { const t = useT(); return (
  <>
    <RoyPhoto t={t} dur={dur("s4")} name years nameAt={L("s4", T.roy)} />
    <Emph t={t} text="THIS ISN'T FICTION." at={L("s4", T.fiction)} out={L("s4", T.roy) - 0.5} y={0.18} size={58} />
  </>
); };
const S5: React.FC = () => { const t = useT(); return (
  <>
    <VirginiaToPark t={t} dur={dur("s5")} zoomAt={L("s5", T.ranger) + 0.2} />
  </>
); };
const S6: React.FC = () => { const t = useT(); const at = L("s6", T.struck1); return (
  <>
    <Strike1 t={t} shot="wide" strikeAt={at} />
    <Tag t={t} text={ILLUS} sub="NOT THE ACTUAL 1942 TOWER" />
    <StrikeCounter t={t} n={1} at={at - 0.1} />
    <YearCard t={t} year="1942" label="FIRST STRIKE" at={at + 0.15} />
  </>
); };
const S7: React.FC = () => { const t = useT(); return (
  <>
    <Strike1 t={t} shot="run" legAt={L("s7", T.struck1b) - 0.1} runFrom={0} />
    <Tag t={t} text={ILLUS} />
    <StrikeCounter t={t} n={1} at={0} />
  </>
); };
const S8: React.FC = () => { const t = useT(); return (
  <>
    <Strike1 t={t + 6} shot="wide" strikeAt={-10} />
    <Shade k={0.85} side="full" />
    <InjuryCard t={t} zones={["rightLeg", "bigToe"]} lines={["SURVIVED", "RIGHT LEG BURNED", "BIG TOENAIL LOST"]} year="APRIL 1942" strike={1} at={0.1} y={560} scale={1.3} />
    <StrikeCounter t={t} n={1} at={0} />
  </>
); };
const S9: React.FC = () => { const t = useT(); return <YearsPass t={t} from={1942} to={1969} dur={dur("s9")} />; };
const S10: React.FC = () => { const t = useT(); const at = L("s10", T.struck2); return (
  <>
    <Strike2 t={t} shot="road" strikeAt={at} />
    <Tag t={t} text={ILLUS} sub="PERIOD PICKUP · NOT ROY'S TRUCK" />
    <StrikeCounter t={t} n={2} at={at - 0.2} />
    <YearCard t={t} year="1969" label="SECOND STRIKE" at={at - 0.1} />
  </>
); };
const S11: React.FC = () => { const t = useT(); return (
  <>
    <Strike2 t={t} shot="cab" strikeAt={L("s11", T.knocked) - 0.35} />
    <Tag t={t} text={ILLUS} />
    <StrikeCounter t={t} n={2} at={0} />
  </>
); };
const S12: React.FC = () => { const t = useT(); const { height: H } = useVideoConfig(); return (
  <>
    <AbsoluteFill style={{ transform: "translateY(-14%)" }}><Strike2 t={t} shot="watch" /></AbsoluteFill>
    <Shade k={0.9} side="bottom" />
    <InjuryCard t={t} zones={["eyebrows", "wrist"]} lines={["KNOCKED UNCONSCIOUS", "EYEBROWS BURNED", "WATCH DESTROYED"]} year="JULY 1969" strike={2} at={0.3} y={H * 0.52} scale={1.2} />
    <Tag t={t} text="ILLUSTRATIVE · PERIOD WATCH" />
    <StrikeCounter t={t} n={2} at={0} />
  </>
); };
const S13: React.FC = () => { const t = useT(); const at = L("s13", T.struck3); return (
  <>
    <Strike3 t={t} strikeAt={at} />
    <Tag t={t} text={ILLUS} sub="LIGHTNING HIT A NEARBY TRANSFORMER" />
    <StrikeCounter t={t} n={3} at={at - 0.3} />
    <YearCard t={t} year="1970" label="IN HIS GARDEN" at={L("s13", T.y1970) - 0.05} out={at + 2.2} />
    <InjuryCard t={t} zones={["leftShoulder"]} lines={["LEFT SHOULDER", "SEARED"]} year="JULY 1970" strike={3} at={at + 0.9} scale={0.85} y={1180} />
  </>
); };
const S14: React.FC = () => { const t = useT(); const at = L("s14", T.struck4); return (
  <>
    <Strike4 t={t} strikeAt={at} outAt={dur("s14") + 2} />
    <Tag t={t} text={ILLUS} sub="INSIDE A GUARDHOUSE" />
    <StrikeCounter t={t} n={4} at={at - 0.3} />
    <YearCard t={t} year="1972" label="FOURTH STRIKE" at={L("s14", T.in72) + 0.1} out={at - 0.2} pos="center" />
    <Emph t={t} text="HIS HAIR CAUGHT FIRE" at={L("s14", T.hair4) - 0.4} y={0.74} size={70} />
  </>
); };
const S15: React.FC = () => { const t = useT(); return (
  <>
    <Strike5 t={t} shot="cloud" />
    <Emph t={t} text="IT GETS EVEN CRAZIER" at={0.2} y={0.45} size={78} />
    <CreditLine t={t} text="REAL FOOTAGE: APPROACHING THUNDERSTORM, SW VIRGINIA · C. E. PRICE · PUBLIC DOMAIN" />
  </>
); };
const S16: React.FC = () => { const t = useT(); const at = L("s16", T.struck5); return (
  <>
    <Strike5 t={t} shot="strike" strikeAt={at} />
    <Tag t={t} text={ILLUS} sub="ON PATROL · SHENANDOAH" />
    <StrikeCounter t={t} n={5} at={at - 0.3} />
    <YearCard t={t} year="1973" label="FIFTH STRIKE" at={L("s16", T.in73) + 0.1} out={at - 0.25} pos="center" />
    <Emph t={t} text="HAIR ON FIRE — AGAIN" at={L("s16", T.hair5) - 0.2} y={0.7} size={74} color="#ffd9a8" />
  </>
); };
const S17: React.FC = () => { const t = useT(); return (
  <>
    <RoyPhoto t={t} dur={dur("s17")} mode="face" />
    <Shade k={0.6} side="bottom" />
    <Emph t={t} text="HE KEPT WATER NEARBY" at={L("s17", T.water) - 0.3} y={0.6} size={70} />
    <Emph t={t} text="JUST IN CASE." at={L("s17", T.justInCase)} y={0.68} size={70} serif color={C.paper} />
  </>
); };
const S18: React.FC = () => { const t = useT(); const at = L("s18", T.number6); return (
  <>
    <Strike6 t={t} strikeAt={at - 0.1} />
    <Tag t={t} text={ILLUS} sub="WALKING OUTDOORS" />
    <StrikeCounter t={t} n={6} at={at - 0.3} />
    <YearCard t={t} year="1976" label="SIXTH STRIKE" at={L("s18", T.came) + 0.3} out={at - 0.3} pos="center" />
    <InjuryCard t={t} zones={["ankle"]} lines={["ANKLE INJURED"]} year="JUNE 1976" strike={6} at={L("s18", T.ankle) - 0.2} scale={0.85} y={1180} />
  </>
); };
const S19: React.FC = () => { const t = useT(); const at = L("s19", T.struck7); return (
  <>
    <Strike7 t={t} strikeAt={at} />
    <Tag t={t} text={ILLUS} sub="FISHING · EXACT LOCATION NOT RECORDED" />
    <YearCard t={t} year="1977" label="JUNE 25" kicker="THE SEVENTH" at={0.25} out={L("s19", T.fishing) + 0.6} pos="center" />
    <StrikeCounter t={t} n={7} at={L("s19", T.seventh) - 0.1} big />
  </>
); };
const S20: React.FC = () => { const t = useT(); const { height: H } = useVideoConfig(); return (
  <>
    <AbsoluteFill style={{ background: "#eef2ff", opacity: 1 - ramp(t, 0, 0.6) }} />
    <AbsoluteFill style={{ opacity: ramp(t, 0.2, 0.9) }}><Strike7 t={t + 9} strikeAt={-5} /></AbsoluteFill>
    <Shade k={0.85} side="full" />
    <InjuryCard t={t} zones={["chest", "stomach"]} lines={["CHEST BURNED", "STOMACH BURNED"]} year="25 JUNE 1977" strike={7} at={0.4} y={H * 0.3} scale={1.3} />
    <StrikeCounter t={t} n={7} at={0} />
  </>
); };
const S21: React.FC = () => { const t = useT(); const { height: H } = useVideoConfig(); const u = H / 1920; return (
  <AbsoluteFill style={{ background: "#030405", alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 132 * u * 1.0, color: "#fff", letterSpacing: "0.02em", opacity: ramp(t, L("s21", T.survived7) - 0.1, L("s21", T.survived7) + 0.5, easeOut), textAlign: "center", lineHeight: 1 }}>HE<br />SURVIVED.</div>
    <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 110 * u, color: C.paper, marginTop: 40 * u, opacity: ramp(t, L("s21", T.again) - 0.05, L("s21", T.again) + 0.4) }}>Again.</div>
  </AbsoluteFill>
); };
const S22: React.FC = () => { const t = useT(); return <Timeline7 t={t} at={0.25} step={0.22} title="SEVEN STRIKES" sub={t > L("s22", T.oneMan) - 0.2 ? "35 YEARS · ONE MAN" : t > L("s22", T.y35) - 0.2 ? "35 YEARS" : undefined} />; };
const S23: React.FC = () => { const t = useT(); const { height: H } = useVideoConfig(); const u = H / 1920; const g = L("s23", T.guinness); return (
  <>
    <RoyPhoto t={t} dur={dur("s23")} mode="hat" />
    <Shade k={0.75} side="bottom" />
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.56, textAlign: "center", opacity: ramp(t, g - 0.2, g + 0.4) }}>
      <div style={{ fontFamily: F.mono, fontSize: 28 * u, letterSpacing: "0.3em", color: C.burgundyHi }}>RECOGNIZED BY</div>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 84 * u, color: "#fff", lineHeight: 1.05, marginTop: 14 * u }}>GUINNESS<br />WORLD RECORDS</div>
      <div style={{ fontFamily: F.mono, fontSize: 26 * u, letterSpacing: "0.22em", color: C.paper, marginTop: 24 * u, opacity: ramp(t, g + 0.6, g + 1.2) }}>MOST LIGHTNING STRIKES SURVIVED</div>
    </div>
  </>
); };
const S24: React.FC = () => { const t = useT(); return (
  <>
    <AfterStorm t={t} />
    <Emph t={t} text="NEVER RECORDED BEING STRUCK AGAIN" at={L("s24", T.never) + 0.3} y={0.7} size={62} />
    <CreditLine t={t} text="PHOTO: SHENANDOAH NATIONAL PARK (NPS) · PUBLIC DOMAIN" />
  </>
); };
const S25: React.FC = () => { const t = useT(); return <FileSeal t={t} dur={dur("s25")} mode="close" />; };

export const Short: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Audio src={staticFile("audio/short.mp3")} />
    <Shot from={B.s1[0]} to={B.s1[1]} fadeIn={0} outT="cut"><S1 /></Shot>
    <Shot from={B.s2[0]} to={B.s2[1]} inT="cut" outT="cut"><S2 /></Shot>
    <Shot from={B.s3[0]} to={B.s3[1]} inT="cut" fadeOut={0.3}><S3 /></Shot>
    <Shot from={B.s4[0]} to={B.s4[1]} fadeIn={0.35}><S4 /></Shot>
    <Shot from={B.s5[0]} to={B.s5[1]} inT="blur"><S5 /></Shot>
    <Shot from={B.s6[0]} to={B.s6[1]} fadeIn={0.4} outT="cut"><S6 /></Shot>
    <Shot from={B.s7[0]} to={B.s7[1]} inT="cut" fadeOut={0.3}><S7 /></Shot>
    <Shot from={B.s8[0]} to={B.s8[1]} fadeIn={0.3}><S8 /></Shot>
    <Shot from={B.s9[0]} to={B.s9[1]} inT="blur"><S9 /></Shot>
    <Shot from={B.s10[0]} to={B.s10[1]} fadeIn={0.35} outT="cut"><S10 /></Shot>
    <Shot from={B.s11[0]} to={B.s11[1]} inT="cut" fadeOut={0.15}><S11 /></Shot>
    <Shot from={B.s12[0]} to={B.s12[1]} fadeIn={0.5}><S12 /></Shot>
    <Shot from={B.s13[0]} to={B.s13[1]} fadeIn={0.3} outT="cut"><S13 /></Shot>
    <Shot from={B.s14[0]} to={B.s14[1]} inT="cut"><S14 /></Shot>
    <Shot from={B.s15[0]} to={B.s15[1]} fadeIn={0.3} outT="cut"><S15 /></Shot>
    <Shot from={B.s16[0]} to={B.s16[1]} inT="cut"><S16 /></Shot>
    <Shot from={B.s17[0]} to={B.s17[1]} fadeIn={0.4}><S17 /></Shot>
    <Shot from={B.s18[0]} to={B.s18[1]} fadeIn={0.3}><S18 /></Shot>
    <Shot from={B.s19[0]} to={B.s19[1]} fadeIn={0.4} outT="cut"><S19 /></Shot>
    <Shot from={B.s20[0]} to={B.s20[1]} inT="cut" fadeOut={0.4}><S20 /></Shot>
    <Shot from={B.s21[0]} to={B.s21[1]} fadeIn={0.2}><S21 /></Shot>
    <Shot from={B.s22[0]} to={B.s22[1]} inT="blur"><S22 /></Shot>
    <Shot from={B.s23[0]} to={B.s23[1]} fadeIn={0.4}><S23 /></Shot>
    <Shot from={B.s24[0]} to={B.s24[1]} fadeIn={0.5}><S24 /></Shot>
    <Shot from={B.s25[0]} to={B.s25[1]} fadeIn={0.4} fadeOut={0}><S25 /></Shot>
    <FilmLook />
  </AbsoluteFill>
);

export { clamp, easeInOut, lerp };
