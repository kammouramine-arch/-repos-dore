import React from "react";
import { AbsoluteFill } from "remotion";
import { F } from "./theme";
import { Person, Look, Pose } from "./rig/Person";
import { stand } from "./rig/poses";
import { EXPR } from "./rig/Face";
import { HERO, DOUBLE, DRIVER, ROOMMATE } from "./lb/cast";
import { uncanny, seatedPose } from "./lb/scenes";
import { SeriesMark } from "./lb/type";

/** Character sheet: the four characters in front / three-quarter / profile / back, plus the double's tells. */
const ROWS: Array<{ name: string; note: string; look: Look; extra?: (p: Pose) => Pose }> = [
  { name: "HIM", note: "dark navy hoodie (strings, pocket), blue jeans, white sneakers, messy dark hair", look: HERO },
  { name: "THE DOUBLE", note: "identical design object — only behaviour differs: no blinking, drifting eyes, late smile", look: DOUBLE, extra: (p) => uncanny(p, 2.3, { smileAt: 0, drift: 1 }) },
  { name: "THE DRIVER", note: "grey-blue uniform + badge, dark cap; face kept in the brim's shadow", look: DRIVER, extra: (p) => ({ ...p, brim: 0.9 }) },
  { name: "THE ROOMMATE", note: "mustard sweater, grey sweatpants, curly hair, round glasses", look: ROOMMATE },
];
const YAWS = [0, 40, 90, 160];

export const Sheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#14171d", fontFamily: F.sans }}>
    <div style={{ position: "absolute", left: 60, top: 40, color: "#ece6da", fontWeight: 800, fontSize: 56 }}>THE LAST BUS HOME — CHARACTERS</div>
    <div style={{ position: "absolute", right: 60, top: 56 }}><SeriesMark size={22} /></div>
    <svg width={2400} height={3000} viewBox="0 0 2400 3000" style={{ position: "absolute", top: 120 }}>
      {ROWS.map((r, i) => (
        <g key={i} transform={`translate(0 ${i * 700})`}>
          <rect x={30} y={20} width={2340} height={660} rx={20} fill="#1b1f27" />
          <text x={60} y={80} fill="#ece6da" fontFamily={F.sans} fontWeight={800} fontSize={40}>{r.name}</text>
          <text x={60} y={124} fill="#9aa3b2" fontFamily={F.mono} fontSize={22}>{r.note}</text>
          {YAWS.map((y, k) => {
            let p = stand(y, { expr: EXPR.neutral, blink: 0 });
            if (r.extra) p = r.extra(p);
            return <g key={k} transform={`translate(${260 + k * 420} 640) scale(0.42)`}><Person pose={p} look={r.look} t={1} seed={i * 10 + k} /></g>;
          })}
          <g transform={`translate(${260 + 4 * 420} 640) scale(0.42)`}>
            <Person pose={r.extra ? r.extra({ ...seatedPose(-70), expr: EXPR.neutral, blink: 0 }) : { ...seatedPose(-70), expr: EXPR.uneasy }} look={r.look} t={1} seed={i * 10 + 9} />
          </g>
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);
