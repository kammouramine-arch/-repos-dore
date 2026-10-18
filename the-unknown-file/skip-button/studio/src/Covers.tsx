import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "./theme";
import { Person, KID, KID_OLDER, Pose } from "./rig/Person";
import { stand } from "./rig/poses";
import { EXPR } from "./rig/Face";
import { PhoneInHand, AppBg, SkipButton, SKIP_BTN, padOn } from "./phone/Phone";
import { Glow } from "./scenes/env";

/** Floating calendar pages (time passing) — drawn in screen pixels. */
const Pages: React.FC<{ items: Array<{ x: number; y: number; r: number; s: number; year: number; month: string; o: number }> }> = ({ items }) => (
  <>
    {items.map((p, i) => (
      <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s})`} opacity={p.o}>
        <rect x={-150} y={-20} width={300} height={360} rx={8} fill="#e9e4da" />
        <rect x={-150} y={-20} width={300} height={90} rx={8} fill="#8e2c34" />
        <text x={0} y={42} fill="#fff" fontFamily={F.sans} fontWeight={800} fontSize={44} textAnchor="middle" letterSpacing={3}>{p.month}</text>
        <text x={0} y={120} fill="#444" fontFamily={F.mono} fontSize={40} textAnchor="middle">{p.year}</text>
        {Array.from({ length: 28 }).map((_, k) => <rect key={k} x={-120 + (k % 7) * 36} y={150 + Math.floor(k / 7) * 44} width={26} height={26} fill="#cfc8bb" />)}
      </g>
    ))}
  </>
);

/** Ghost silhouettes of him at different moments, fading into the dark (the skipped years). */
const Ghosts: React.FC<{ x0: number; y: number; s: number; n: number; dx: number }> = ({ x0, y, s, n, dx }) => (
  <>
    {Array.from({ length: n }).map((_, i) => (
      <g key={i} opacity={0.08 + i * 0.05} transform={`translate(${x0 + i * dx} ${y}) scale(${s})`} style={{ filter: "grayscale(1)" }}>
        <Person pose={stand(-70, { expr: EXPR.neutral, hands: i % 2 ? "phone" : "relax", blink: 0 })} look={i > n / 2 ? KID_OLDER : KID} t={i} shadow={0} />
      </g>
    ))}
  </>
);

/** 16:9 YouTube thumbnail (rendered at 1920×1080). */
export const Thumb: React.FC = () => {
  const face: Pose = { ...stand(40, { hands: "relax", headTilt: 12, headYaw: 22, look: [0.9, 0.6], expr: EXPR.curious, blink: 0 }) };
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 62% 50%, #1d2738 0%, #07090c 72%)" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <Pages items={[
          { x: 980, y: 120, r: -14, s: 0.62, year: 2026, month: "MARCH", o: 0.5 }, { x: 1180, y: 60, r: 9, s: 0.5, year: 2029, month: "JULY", o: 0.35 },
          { x: 1700, y: 140, r: 18, s: 0.55, year: 2032, month: "OCTOBER", o: 0.25 }, { x: 1830, y: 520, r: -10, s: 0.48, year: 2036, month: "OCTOBER", o: 0.18 },
          { x: 760, y: 640, r: 12, s: 0.5, year: 2027, month: "MAY", o: 0.22 },
        ]} />
        <Ghosts x0={1240} y={1180} s={0.62} n={5} dx={130} />
        {/* his face, lit by the phone */}
        <g transform="translate(1060 2080) scale(1.35)">
          <Glow id="thGlow" x={260} y={-1000} rx={700} ry={600} color="#9fc6ff" o={0.35} />
          <Person pose={face} look={KID} t={1} shadow={0} />
        </g>
        {/* the phone in his hand: glowing SKIP, thumb hovering */}
        <g transform="translate(1560 470) scale(0.4) rotate(-8)">
          <ellipse cx={0} cy={380} rx={520} ry={360} fill="#bcd6ff" opacity={0.12} />
          <PhoneInHand screen={<g><AppBg /><SkipButton glow={1} /></g>} thumb={[300, 520]} glow={1} />
        </g>
      </svg>
      {/* title */}
      <div style={{ position: "absolute", left: 90, top: 300, width: 900 }}>
        <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.4em", color: C.paperDim, marginBottom: 24 }}>THE UNKNOWN FILE</div>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 168, lineHeight: 0.92, color: C.paper, letterSpacing: "-0.01em", textShadow: "0 10px 50px rgba(0,0,0,0.6)" }}>THE<br />SKIP<br />BUTTON</div>
        <div style={{ height: 8, width: 420, background: C.burgundyHi, marginTop: 34 }} />
      </div>
    </AbsoluteFill>
  );
};

/** 9:16 short-form cover (rendered at 1080×1920). */
export const Cover: React.FC = () => {
  const p: Pose = stand(40, { hands: "phone", headTilt: 10, headYaw: 18, look: [0.7, 0.9], expr: EXPR.shock, blink: 0 });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 62%, #1d2738 0%, #07090c 70%)" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <Pages items={[
          { x: 140, y: 820, r: -16, s: 0.5, year: 2026, month: "MARCH", o: 0.45 }, { x: 930, y: 760, r: 12, s: 0.46, year: 2029, month: "JULY", o: 0.35 },
          { x: 190, y: 1480, r: 10, s: 0.42, year: 2032, month: "OCTOBER", o: 0.25 }, { x: 930, y: 1430, r: -8, s: 0.44, year: 2036, month: "OCTOBER", o: 0.3 },
        ]} />
        <g transform="translate(470 2380) scale(1.45)">
          <Glow id="cvGlow" x={220} y={-880} rx={650} ry={600} color="#9fc6ff" o={0.32} />
          <Person pose={p} look={KID_OLDER} t={1} shadow={0} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 132, lineHeight: 0.95, color: C.paper, textShadow: "0 10px 50px rgba(0,0,0,0.7)" }}>HE SKIPPED<br />10 YEARS</div>
        <div style={{ margin: "40px auto 0", height: 7, width: 300, background: C.burgundyHi }} />
        <div style={{ marginTop: 34, fontFamily: F.mono, fontSize: 34, letterSpacing: "0.34em", color: C.paperDim }}>THE SKIP BUTTON</div>
      </div>
    </AbsoluteFill>
  );
};
export { SKIP_BTN, padOn };
