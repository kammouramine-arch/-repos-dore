import React from "react";
import { AbsoluteFill } from "remotion";
import { useT } from "./lib/time";
import { Person } from "./rig/Person";
import { walkPose, walkDist, sitPose } from "./rig/motion";
import { stand } from "./rig/poses";
import { clamp } from "./lib/anim";

/**
 * QC composition. Left: walker with a camera that follows him and ground ticks fixed to the world
 * (a planted foot must stay locked to its tick). Right: sit down / stand up on a chair.
 */
export const MotionTest: React.FC<{ part?: "walk" | "sit" | "turn" }> = ({ part = "walk" }) => {
  const t = useT();
  const total = 2600;
  const d = walkDist(t, 0.5, total);
  const wp = walkPose(d, { x0: 0, dir: 1, total });
  const cam = clamp(d - 0, 0, total);
  const k = t < 1 ? 0 : t < 3 ? (t - 1) / 2 : t < 5 ? 1 : 1 - (t - 5) / 2;
  const sp = sitPose(clamp(k), { x: 0, yaw: -90, seatY: 240 });
  const S = 0.7;
  return (
    <AbsoluteFill style={{ background: "#ece7dd" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {part === "walk" && (
          <g transform={`translate(${960 - cam * S} 980) scale(${S})`}>
            <line x1={-2000} x2={5000} y1={0} y2={0} stroke="#9a9182" strokeWidth={4} />
            {Array.from({ length: 60 }).map((_, i) => <line key={i} x1={-1000 + i * 100} x2={-1000 + i * 100} y1={0} y2={i % 5 ? 20 : 50} stroke="#9a9182" strokeWidth={4} />)}
            <Person pose={{ ...wp, expr: "neutral" }} t={t} />
          </g>
        )}
        {part === "sit" && (
          <g transform={`translate(960 980) scale(${S})`}>
            <line x1={-2000} x2={2000} y1={0} y2={0} stroke="#9a9182" strokeWidth={4} />
            <g fill="#8a6a4a" stroke="#14161a" strokeWidth={5}>
              <rect x={-40} y={-260} width={300} height={30} />
              <rect x={230} y={-720} width={30} height={490} />
              <rect x={-30} y={-230} width={22} height={230} />
              <rect x={226} y={-230} width={22} height={230} />
            </g>
            <Person pose={{ ...sp, expr: "neutral" }} t={t} />
          </g>
        )}
        {part === "turn" && (
          <g transform={`translate(960 980) scale(${S})`}>
            <Person pose={stand(((t * 45) % 360) - 180, { expr: "smirk" })} t={t} />
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: 20, top: 20, fontFamily: "monospace", fontSize: 28 }}>{part} t={t.toFixed(3)} d={d.toFixed(0)}</div>
    </AbsoluteFill>
  );
};
