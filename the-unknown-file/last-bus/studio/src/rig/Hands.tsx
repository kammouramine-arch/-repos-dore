import React from "react";
import type { V } from "./math";

const INK = "#14161a";
const SKIN = "#ffffff";
const LW = 5;

/**
 * Cartoon hands — one design used everywhere (body shots and close-ups):
 * a soft mitten silhouette for the four fingers (with three short separation lines when the
 * fingers are visible) plus ONE thumb. Drawn in hand-local space: origin at the wrist, +x along
 * the hand, +y = thumb side. The rig decides the thumb side from anatomy (left/right hand, view,
 * palm direction) and passes it as `thumb` (±1), so a hand can never appear inside-out.
 */
export type HandKind = "relax" | "open" | "point" | "fist" | "grip" | "flat" | "hold" | "pocket" | "cup";

export const Hand: React.FC<{ at: V; ang: number; kind: HandKind; thumb: 1 | -1; obj?: "phone" | "phoneLit" | "mug" | "none"; objAng?: number; t?: number; scale?: number; screenToCam?: boolean }> = ({ at, ang, kind, thumb, obj, objAng, scale = 1, screenToCam = false }) => {
  const sw = LW;
  const common = { fill: SKIN, stroke: INK, strokeWidth: sw, strokeLinejoin: "round" as const };
  let shape: React.ReactNode = null;
  switch (kind) {
    case "relax":
      shape = (
        <g>
          <path d="M-2 -12 C16 -15 36 -16 47 -10 C57 -4 57 9 47 13 C35 17 15 15 -2 12 Z" {...common} />
          <path d="M38 -1 C44 1 45 6 40 8" stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <path d="M8 10 C13 20 25 26 31 22 C35 18 29 12 22 10" {...common} />
        </g>
      );
      break;
    case "open":
      shape = (
        <g>
          <path d="M-2 -14 C18 -20 44 -22 57 -14 C66 -8 66 10 57 16 C44 22 18 20 -2 14 Z" {...common} />
          {[-8, 0, 8].map((y, i) => <path key={i} d={`M${44} ${y} L${62} ${y * 1.15}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />)}
          <path d="M8 12 C16 24 28 38 38 40 C45 41 46 33 40 28 C34 22 30 16 26 12" {...common} />
        </g>
      );
      break;
    case "point":
      // index finger extended next to the thumb; middle, ring and little fingers curled (fist)
      shape = (
        <g>
          <path d="M-2 -14 C12 -18 30 -17 35 -6 C39 6 33 15 20 17 C10 18 2 16 -2 12 Z" {...common} />
          {[-10, -4].map((y, i) => <path key={i} d={`M${29} ${y} L${35} ${y + 1}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />)}
          <path d="M26 -2 L60 -1 C68 0 68 10 60 10 L28 11 Z" {...common} />
          <path d="M8 11 C14 20 26 22 32 17 C34 14 30 12 26 12" {...common} />
        </g>
      );
      break;
    case "fist":
    case "hold":
      shape = (
        <g>
          <path d="M-2 -14 C12 -18 30 -17 35 -6 C39 6 33 15 20 17 C10 18 2 16 -2 12 Z" {...common} />
          {[-9, -2, 5].map((y, i) => <path key={i} d={`M${29} ${y} L${36} ${y + 1}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />)}
          <path d="M6 10 C12 19 26 21 33 14 C35 10 30 8 26 9" {...common} />
        </g>
      );
      break;
    case "flat":
      shape = (
        <g>
          <path d="M-2 -9 C20 -11 44 -11 55 -6 C61 -2 61 6 55 8 C40 11 18 11 -2 9 Z" {...common} />
          {[-2, 3].map((y, i) => <path key={i} d={`M${44} ${y} L${58} ${y}`} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />)}
          <path d="M10 8 C18 15 30 16 35 11" {...common} />
        </g>
      );
      break;
    case "cup":
      shape = (
        <g>
          <path d="M-2 -12 C14 -16 34 -18 44 -12 C52 -6 50 10 42 14 C30 18 14 16 -2 12 Z" {...common} />
          <path d="M8 10 C14 22 28 26 34 20 C37 16 31 12 24 11" {...common} />
        </g>
      );
      break;
    case "grip":
      // fingers wrapped round the phone's back (the phone itself is drawn by the caller, unflipped)
      shape = (
        <g>
          <path d="M-2 -13 C12 -17 28 -18 36 -10 C42 -2 42 10 34 15 C24 19 10 17 -2 12 Z" {...common} />
          {[-8, -1, 6].map((y, i) => <path key={i} d={`M${30} ${y} L${37} ${y + 1}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />)}
          {screenToCam && <path d="M8 10 C14 20 30 22 38 16 C40 12 34 10 28 11" {...common} />}
        </g>
      );
      break;
    case "pocket":
      shape = null;
      break;
  }
  const r = (ang * Math.PI) / 180;
  const palm: [number, number] = [Math.cos(r) * 24 * scale, Math.sin(r) * 24 * scale];
  const isPhone = kind === "grip" && (obj === "phone" || obj === "phoneLit");
  const phone = isPhone ? (
    <g transform={`translate(${palm[0]} ${palm[1]}) rotate(${objAng ?? 0}) translate(0 ${-24 * scale}) scale(${scale})`}>
      <rect x={-25} y={-48} width={50} height={96} rx={9} fill={screenToCam ? "#0d1016" : "#1c1f26"} stroke={INK} strokeWidth={4} />
      {screenToCam ? (
        <rect x={-20} y={-43} width={40} height={86} rx={6} fill={obj === "phoneLit" ? "#2e3a4f" : "#151a22"} />
      ) : (
        <>
          <rect x={-20} y={-43} width={40} height={86} rx={6} fill="#252a35" />
          <rect x={-16} y={-39} width={12} height={16} rx={4} fill="#151820" />
        </>
      )}
      {screenToCam && obj === "phoneLit" && <rect x={-12} y={14} width={24} height={11} rx={5.5} fill="#e9eef5" />}
    </g>
  ) : null;
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      {phone && !screenToCam && phone}
      {obj === "mug" && (
        <g transform={`translate(${palm[0]} ${palm[1]})`}>
          <g transform="translate(6 -26)">
            <rect x={-28} y={-30} width={56} height={62} rx={8} fill="#d9d3c7" stroke={INK} strokeWidth={4} />
          </g>
        </g>
      )}
      <g transform={`rotate(${ang}) scale(${scale} ${scale * thumb})`}>{shape}</g>
      {phone && screenToCam && phone}
      {phone && screenToCam && (
        // thumb resting on / pressing the screen
        <g transform={`rotate(${ang}) scale(${scale} ${scale * thumb})`}>
          <path d="M10 10 C20 22 36 30 46 26 C52 22 46 14 36 12" fill={SKIN} stroke={INK} strokeWidth={LW} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};
