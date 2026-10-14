import React from "react";
import { useVideoConfig } from "remotion";
import { clamp, easeInOut, lerp, ramp } from "../lib/anim";
import { Stage, FireFootage } from "./Stage";
import { People } from "../three/Person";
import { Strike } from "../components/Storm";

/*
 * STRIKE 01 · April 1942 · fire lookout tower, Shenandoah National Park (illustrative reconstruction).
 * Plate: steel fire lookout tower (Wayne National Forest, public domain) — not the actual 1942 tower.
 * Sky: NOAA/NSSL storm photograph (public domain). Monochrome "archive" grade; the fire is the only warm light.
 */
const TOWER_TOP: [number, number] = [0.674, 0.128];
const CAB: [number, number] = [0.668, 0.31];

export const Strike1: React.FC<{ t: number; shot: "wide" | "run"; strikeAt?: number; legAt?: number; runFrom?: number }> = ({ t, shot, strikeAt = 1.2, legAt = 2.6, runFrom = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  if (shot === "wide") {
    const strikes: Strike[] = [
      { t: strikeAt, from: [0.56, -0.32], to: TOWER_TOP, seed: 42, strokes: 4, power: 1.15, width: 1.2, branches: 1.2 },
      { t: strikeAt + 2.6, from: [0.15, -0.1], to: [0.05, 0.55], seed: 7, strokes: 2, power: 0.5, cloud: false },
    ];
    const fire = ramp(t, strikeAt + 0.15, strikeAt + 2.2);
    const cam = v ? { fx: 0.67, fy: 0.42, k: 1 + 0.06 * ramp(t, 0, 8), py: 0.12, free: true } : { fx: 0.6, fy: 0.45, k: 1.0 + 0.06 * ramp(t, 0, 8), py: 0.2, free: true };
    return (
      <Stage t={t} sky="photos/storm_gust_noaa.jpg" skyCam={{ fx: 0.5, fy: 0.35, k: 1.2 }} plate="cut/tower_steel.png" cam={cam}
        look={{ exp: 0.36, flashGain: 1.25, con: 1.18 }} strikes={strikes} rain={0.55} mono>
        {({ map, s }) => {
          const [cx, cy] = map(CAB);
          return <FireFootage t={t} x={cx} y={cy} w={150 * s} h={110 * s} k={fire} />;
        }}
      </Stage>
    );
  }
  // run: low angle — the ranger runs from the burning tower, silhouetted against the storm; a bolt hits right beside him
  const strikes: Strike[] = [
    { t: legAt, from: [0.3, -0.5], to: [0.4, 1.3], seed: 77, strokes: 3, power: 1.25, width: 1.6, branches: 0.8, near: 0.8 },
  ];
  const cam = v ? { fx: 0.64, fy: 0.35, k: 1.15, py: 0.16, free: true } : { fx: 0.62, fy: 0.35, k: 1.05, py: 0.2, free: true };
  const run = t - runFrom;
  const hit = ramp(t, legAt - 0.03, legAt + 0.12);
  const x = lerp(W * (v ? 0.88 : 0.82), W * (v ? 0.34 : 0.44), clamp(run / (legAt - runFrom + 0.35)));
  return (
    <Stage t={t} sky="photos/storm_gust_noaa.jpg" skyCam={{ fx: 0.45, fy: 0.45, k: 1.15 }} plate="cut/tower_steel.png" cam={cam}
      look={{ exp: 0.3, flashGain: 0.5, con: 1.2 }} strikes={strikes} rain={0.9} mono>
      {({ map, s, f }) => {
        const [cx, cy] = map(CAB);
        return (
          <>
            <FireFootage t={t} x={cx} y={cy} w={150 * s} h={110 * s} k={1} />
            <People f={f} rim={0.6 + 2.5 * f} people={[{
              anim: hit < 1 ? "Sprint_Loop" : "Hit_Chest", time: hit < 1 ? run * 1.05 : t - legAt, x, y: H * (v ? 0.985 : 1.02), h: H * (v ? 0.42 : 0.62), yaw: -78,
              blend: hit > 0 && hit < 1 ? { anim: "Hit_Chest", time: Math.max(0, t - legAt), w: hit } : undefined,
            }]} />
          </>
        );
      }}
    </Stage>
  );
};
