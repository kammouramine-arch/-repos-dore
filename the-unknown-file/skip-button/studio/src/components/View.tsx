import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

/**
 * A camera onto the world: centre (cx, cy) and visible width `w` in world units. The same sets are
 * framed differently for the 9:16 short and the 16:9 film (the composition decides the aspect).
 */
export type Cam = { cx: number; cy: number; w: number };
export const View: React.FC<{ cam: Cam; children: React.ReactNode; style?: React.CSSProperties; bg?: string }> = ({ cam, children, style, bg = "#0b0d10" }) => {
  const { width, height } = useVideoConfig();
  const h = (cam.w * height) / width;
  return (
    <AbsoluteFill style={{ background: bg, ...style }}>
      <svg width={width} height={height} viewBox={`${cam.cx - cam.w / 2} ${cam.cy - h / 2} ${cam.w} ${h}`} preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
        {children}
      </svg>
    </AbsoluteFill>
  );
};

/** Interpolate cameras with easing. */
export const camLerp = (a: Cam, b: Cam, k: number): Cam => ({ cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, w: a.w * Math.pow(b.w / a.w, k) });

/** Cinematic grade applied to a whole shot (CSS filter on the layer). */
export const GRADE = {
  warm: "saturate(1.05) contrast(1.02) brightness(1.02) sepia(0.06)",
  day: "saturate(0.95) contrast(1.0)",
  cool: "saturate(0.72) contrast(1.02) brightness(0.96) hue-rotate(-4deg)",
  cold: "saturate(0.45) contrast(1.05) brightness(0.88)",
  grief: "saturate(0.28) contrast(1.06) brightness(0.78)",
  night: "saturate(0.65) brightness(0.92)",
  home: "saturate(1.0) contrast(1.02) sepia(0.08)",
} as const;
