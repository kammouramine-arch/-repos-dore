import React from "react";
import { AbsoluteFill } from "remotion";
import { Space, R_ORB } from "./three/Space";
import { useT } from "./lib/time";
import { Helmet, GravityCompare } from "./components/Helmet";
import { SuitSystem, EvaClock } from "./components/SuitSystem";
import { Comms, Repress, WaterVision, WaterBackdrop, WarningTimeline, Fixes } from "./components/Parts";
export const Lab: React.FC<{ scene: string; s?: any }> = ({ scene, s: custom }) => {
  const t = useT();
  if (scene === "custom") return <AbsoluteFill style={{ background: "#000" }}><Space s={{ earthRot: 1.2, time: t, ...custom }} res={0.5} /></AbsoluteFill>;
  const astro = [{ pos: [6, 3, 14] as [number, number, number], rot: [0.2, 2.6, 0.3] as [number, number, number], lamps: scene === "night" ? 1 : 0 }];
  const views: Record<string, any> = {
    hero: { cam: { pos: [9, 4.2, 19], target: [4, 1.0, 9], fov: 45 }, sun: 0.5, astro },
    wide: { cam: { pos: [-120, 60, 160], target: [10, 0, 0], fov: 40 }, sun: 0.6, astro: [] },
    earth: { cam: { pos: [0, 200e3, 900e3], target: [0, -R_ORB * 0.25, -2e6], fov: 50 }, sun: -0.2, astro: [] },
    night: { cam: { pos: [9, 4.2, 19], target: [4, 1.0, 9], fov: 45 }, sun: -0.42, astro },
  };
  if (scene.startsWith("helmet")) {
    const k = Number(scene.slice(6));
    const st = [{ water: 0.0, vent: 1 }, { water: 0.12, ventWater: 1 }, { water: 0.45 }, { water: 0.75, shift: 0.5 }, { water: 1, shift: 1 }][k];
    return <Helmet t={t + 3} {...st} labels={[{ text: "VENTILATION INLET", x: 120, y: 300, at: 0, ax: 300, ay: 350 }]} />;
  }
  if (scene === "gravity") return <GravityCompare t={t + 3} />;
  if (scene === "suit1") return <SuitSystem t={t + 3} vent={1} cool={1} />;
  if (scene === "suit2") return <SuitSystem t={t + 3} vent={1} cool={0.5} fps={1} block={1} drum={1} spill={1} />;
  if (scene === "comms") return <Comms t={t + 2} fail={0.8} />;
  if (scene === "repress") return <Repress t={t + 2} p={0.6} hatch={1} />;
  if (scene === "ocean") return <WaterBackdrop t={t} />;
  if (scene === "warn") return <WarningTimeline t={t + 5} bAt={1.5} noteAt={0} />;
  if (scene === "fixes") return <Fixes t={t + 5} aAt={0.5} bAt={1} />;
  if (scene === "pov") return <AbsoluteFill><Space s={{ ...views.night, cam: { pos: [2, 1.6, 6], target: [-2, 1, -10], fov: 50 }, sun: -0.2, earthRot: 1.2, time: t, iss: { pos: [0, 0, 0], rot: [0, 0, 0] } }} /><WaterVision t={t} amount={0.7} /></AbsoluteFill>;
  if (scene === "clock") return <EvaClock t={t} minute={67.5} highlight={3} />;
  const v = views[scene];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Space s={{ ...v, earthRot: 1.2 + t * 0.001, time: t, iss: { pos: [0, 0, 0], rot: [0, 0, 0] } }} />
    </AbsoluteFill>
  );
};
