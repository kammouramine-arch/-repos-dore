import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Space, SpaceCam, SpaceState, V3, sunlit } from "../three/Space";
import { C, F } from "../theme";
import { easeOut, ramp } from "../lib/anim";
import { useT } from "../lib/time";

export type SLabel = { p: V3; text: string; sub?: string; at: number; out?: number };

export function projectSpace(cam: SpaceCam, w: number, h: number, p: V3) {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.05, 3e7);
  c.position.set(...cam.pos);
  c.up.set(...(cam.up ?? [0, 1, 0]));
  c.lookAt(new THREE.Vector3(...cam.target));
  if (cam.roll) c.rotateZ(cam.roll);
  c.updateMatrixWorld(); c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
}

/** A 3D orbital shot: state is a function of local time; HTML labels are projected from 3D points. */
export const SpaceShot: React.FC<{
  state: (t: number) => Omit<SpaceState, "time">;
  labels?: SLabel[];
  res?: number;
  grade?: number; // cinematic grade strength
  children?: React.ReactNode;
}> = ({ state, labels = [], res = 0.5, grade = 1, children }) => {
  const t = useT();
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const s = { ...state(t), time: t };
  const lit = sunlit(s.sun);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Space s={s} res={res} />
      {/* grade: lifted blacks into midnight blue, gentle highlight roll-off, sun-side bloom */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,16,28,0.25) 0%, rgba(0,0,0,0) 45%, rgba(4,8,14,0.35) 100%)", opacity: grade }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 50% at ${50 + 40 * Math.cos(s.sunAz ?? 0.6)}% 20%, rgba(255,240,215,${0.10 * lit}) 0%, rgba(0,0,0,0) 60%)`, mixBlendMode: "screen", opacity: grade }} />
      {labels.map((l, i) => {
        const pr = projectSpace(s.cam, W, H, l.p);
        if (!pr.visible) return null;
        const a = ramp(t, l.at, l.at + 0.7, easeOut) * (l.out !== undefined ? 1 - ramp(t, l.out, l.out + 0.5) : 1);
        if (a <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: pr.x, top: pr.y, opacity: a }}>
            <div style={{ position: "absolute", left: -4 * u, top: -4 * u, width: 8 * u, height: 8 * u, borderRadius: "50%", background: C.paper, boxShadow: `0 0 ${10 * u}px ${C.paper}` }} />
            <div style={{ position: "absolute", left: 0, top: -64 * u, width: 1.5 * u, height: 58 * u, background: "rgba(236,230,218,0.6)", transform: `scaleY(${a})`, transformOrigin: "bottom" }} />
            <div style={{ position: "absolute", left: 12 * u, top: -86 * u, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
              <div style={{ fontFamily: F.sans, fontSize: 24 * u, fontWeight: 600, letterSpacing: "0.2em", color: C.paper, textTransform: "uppercase" }}>{l.text}</div>
              {l.sub && <div style={{ fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.16em", color: C.paperDim, marginTop: 4 * u }}>{l.sub}</div>}
            </div>
          </div>
        );
      })}
      {children}
    </AbsoluteFill>
  );
};
