import React from "react";
import { AbsoluteFill } from "remotion";
import { useT } from "./lib/time";
import { Wild } from "./scenes/Wild";
import { TideChart } from "./scenes/Tides";
import { Globe } from "./three/Globe";
export const Lab: React.FC<{ scene: string }> = ({ scene }) => {
  const t = useT() + 3;
  const views: Record<string, React.ReactNode> = {
    wildMoon: <Wild t={t} cam={{ x: 1300, y: 760, w: 2500 }} moon={1} fox={0.5} forage={0.3} />,
    wildDark: <Wild t={t} cam={{ x: 1300, y: 760, w: 2500 }} moon={0} fox={0.5} forage={0.8} />,
    tides: <AbsoluteFill style={{ background: "#07090c" }}><TideChart t={t} reveal={1} moonless={1} /></AbsoluteFill>,
    globe: <Globe s={{ time: t, cam: { pos: [0.4, 0.9, 4.2], target: [0, 0, 0], fov: 40 }, tilt: 23.4, spin: t * 0.1, sun: [1, 0.2, 0.6], axis: 1, cone: 1, coneDeg: 24, orbit: 0.6, moonDist: 3.2, moon: 1, moonAng: 2.4 }} />,
  };
  return <AbsoluteFill style={{ background: "#000" }}>{views[scene]}</AbsoluteFill>;
};
