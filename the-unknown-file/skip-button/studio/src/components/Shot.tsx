import React, { createContext, useContext } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { easeSoft, ramp } from "../lib/anim";

type ShotCtx = { dur: number };
const Ctx = createContext<ShotCtx>({ dur: 1 });
export const useShot = () => {
  const { dur } = useContext(Ctx);
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  return { t, dur, p: Math.min(1, Math.max(0, t / dur)) };
};

export type Transition = "fade" | "blur" | "push" | "cut" | "dip";

/** A shot on the master timeline, in absolute seconds, with soft in/out transitions. */
export const Shot: React.FC<{
  from: number;
  to: number;
  fadeIn?: number;
  fadeOut?: number;
  inT?: Transition;
  outT?: Transition;
  z?: number;
  name?: string;
  children: React.ReactNode;
}> = ({ from, to, fadeIn = 0.6, fadeOut = 0.6, inT = "fade", outT = "fade", z = 0, name, children }) => {
  const { fps } = useVideoConfig();
  const start = Math.round(from * fps);
  const dur = Math.max(1, Math.round((to - from) * fps));
  return (
    <Sequence from={start} durationInFrames={dur} name={name} layout="none">
      <Ctx.Provider value={{ dur: dur / fps }}>
        <ShotFrame fadeIn={inT === "cut" ? 0 : fadeIn} fadeOut={outT === "cut" ? 0 : fadeOut} inT={inT} outT={outT} dur={dur / fps} z={z}>
          {children}
        </ShotFrame>
      </Ctx.Provider>
    </Sequence>
  );
};

const ShotFrame: React.FC<{ fadeIn: number; fadeOut: number; inT: Transition; outT: Transition; dur: number; z: number; children: React.ReactNode }> = ({
  fadeIn, fadeOut, inT, outT, dur, z, children,
}) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = f / fps;
  const a = fadeIn > 0 ? ramp(t, 0, fadeIn, easeSoft) : 1;
  const b = fadeOut > 0 ? 1 - ramp(t, dur - fadeOut, dur, easeSoft) : 1;
  const k = width / 1920;
  let filter = "";
  let transform = "";
  if (inT === "blur" && a < 1) filter += ` blur(${(1 - a) * 18 * k}px)`;
  if (outT === "blur" && b < 1) filter += ` blur(${(1 - b) * 18 * k}px)`;
  if (inT === "push" && a < 1) transform += ` scale(${1 + (1 - a) * 0.06})`;
  if (outT === "push" && b < 1) transform += ` scale(${1 + (1 - b) * 0.08})`;
  const dipIn = inT === "dip" ? a * a : a;
  const dipOut = outT === "dip" ? b * b : b;
  return (
    <AbsoluteFill style={{ opacity: Math.min(dipIn, dipOut), filter: filter || undefined, transform: transform || undefined, zIndex: z }}>
      {children}
    </AbsoluteFill>
  );
};
