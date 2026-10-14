import React from "react";
import { AbsoluteFill } from "remotion";
import { People } from "./three/Person";

const R: [number, number, number][] = [[-1.1, 0, 0.25], [1.1, 0, 0.25], [0, 0, 1.3], [0, 0, -1.3], [1.6, 0, 0], [-1.6, 0, 0], [0, 1.3, 0.8], [0, -1.3, -0.8]];
export const Lab: React.FC = () => (
  <AbsoluteFill style={{ background: "#8a93a0" }}>
    <People f={0.2} rim={1.2} res={1} people={R.map((r, i) => ({ anim: "Idle_Loop", time: 1, x: 120 + i * 230, y: 1000, h: 330, yaw: 75, rodBend: 0.2, rodRot: r } as any))} />
    {R.map((r, i) => <div key={i} style={{ position: "absolute", left: 60 + i * 230, top: 1020, fontSize: 22, color: "#000" }}>{i}: {r.join(",")}</div>)}
  </AbsoluteFill>
);
