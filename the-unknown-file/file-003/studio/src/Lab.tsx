import React from "react";
import { AbsoluteFill } from "remotion";
import { People } from "./three/Person";

// Scratch composition for previewing the 3D silhouette rig (not part of either film).
export const Lab: React.FC = () => (
  <AbsoluteFill style={{ background: "#8a93a0" }}>
    <People f={0.2} rim={1.2} res={1} people={[{ anim: "Idle_Loop", time: 1, x: 960, y: 1000, h: 600, yaw: 75 } as any]} />
  </AbsoluteFill>
);
