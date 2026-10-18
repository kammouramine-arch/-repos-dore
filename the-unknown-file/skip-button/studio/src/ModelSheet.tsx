import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "./theme";
import { Person, KID, MOM, DAD, KID_OLDER, DAD_OLD, Look } from "./rig/Person";
import { stand } from "./rig/poses";
import { EXPR } from "./rig/Face";
import { Hand, HandKind } from "./rig/Hands";

const Label: React.FC<{ x: number; y: number; text: string; size?: number }> = ({ x, y, text, size = 26 }) => (
  <text x={x} y={y} fill="#444" fontFamily={F.mono} fontSize={size} letterSpacing={3} textAnchor="middle">{text}</text>
);

/** Character model sheet: turnaround, expressions, hands, cast. */
export const ModelSheet: React.FC = () => {
  const views: Array<[number, string]> = [[0, "FRONT"], [-45, "3/4 LEFT"], [-90, "PROFILE LEFT"], [45, "3/4 RIGHT"], [90, "PROFILE RIGHT"], [180, "BACK"]];
  const exprs = ["neutral", "smirk", "curious", "excited", "bored", "impatient", "awkward", "confused", "shock", "fear", "sad", "regret", "relief", "warm"] as const;
  const hands: HandKind[] = ["relax", "open", "point", "fist", "grip", "flat", "cup"];
  const cast: Array<[Look, string, number]> = [[KID, "HIM", 0], [KID_OLDER, "HIM · 10 YEARS LATER", 0], [MOM, "MOM", 0], [DAD, "DAD", 0], [DAD_OLD, "DAD · LATER", 0]];
  return (
    <AbsoluteFill style={{ background: "#f4f1ea" }}>
      <svg width={3840} height={2160} viewBox="0 0 3840 2160">
        <text x={120} y={120} fill="#222" fontFamily={F.sans} fontWeight={800} fontSize={64} letterSpacing={2}>THE SKIP BUTTON — CHARACTER MODEL SHEET</text>
        <text x={120} y={170} fill="#666" fontFamily={F.mono} fontSize={26} letterSpacing={3}>LOCKED PROPORTIONS · HEAD R 128 · TORSO 365 · THIGH 205 · SHIN 205 · UPPER ARM 165 · FOREARM 160 · UNITS = REFERENCE PX</text>
        {/* turnaround */}
        {views.map(([yaw, name], i) => (
          <g key={name}>
            <Person pose={stand(yaw, { expr: EXPR.smirk })} x={300 + i * 420} y={1020} scale={0.62} t={1.5} />
            <Label x={300 + i * 420} y={1080} text={name} />
          </g>
        ))}
        {/* proportion guides */}
        {[0, -75, -485, -820, -850, -1010, -1138].map((y, i) => (
          <line key={i} x1={80} x2={2620} y1={1020 + y * 0.62} y2={1020 + y * 0.62} stroke="#c9c2b4" strokeWidth={2} strokeDasharray="10 10" />
        ))}
        {/* poses */}
        <Person pose={stand(20, { hands: "pockets", expr: EXPR.smirk })} x={2850} y={1020} scale={0.62} t={1.5} />
        <Label x={2850} y={1080} text="REFERENCE POSE" />
        <Person pose={stand(55, { hands: "phone", expr: EXPR.focus, look: [0.4, 1], headTilt: 14 })} x={3320} y={1020} scale={0.62} t={1.5} />
        <Label x={3320} y={1080} text="PHONE HOLD (R HAND)" />
        {/* expressions */}
        {exprs.map((e, i) => (
          <g key={e}>
            <Person pose={stand(0, { expr: EXPR[e], blink: 0 })} x={170 + i * 255} y={2060} scale={0.34} t={1.5} shadow={0} />
            <Label x={170 + i * 255} y={2110} text={e.toUpperCase()} size={20} />
          </g>
        ))}
        {/* hands */}
        <text x={120} y={1220} fill="#222" fontFamily={F.mono} fontSize={26} letterSpacing={3}>HANDS · 4 FINGERS + 1 THUMB · RIGHT HAND SHOWN (THUMB SIDE UP)</text>
        {hands.map((k, i) => (
          <g key={k}>
            <Hand at={[200 + i * 240, 1330]} ang={0} kind={k} thumb={-1} scale={1.9} obj={k === "grip" ? "phone" : undefined} objAng={-90} />
            <Label x={260 + i * 240} y={1430} text={k.toUpperCase()} size={20} />
          </g>
        ))}
        {/* cast */}
        {cast.map(([lk, name], i) => (
          <g key={name}>
            <Person pose={stand(25, { expr: EXPR.neutral })} look={lk} x={2060 + i * 380} y={1480} scale={0.36} t={1.5} />
            <Label x={2060 + i * 380} y={1530} text={name} size={20} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
