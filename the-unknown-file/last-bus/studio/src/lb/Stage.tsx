import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Person, Pose, Look, settle } from "../rig/Person";
import { Proj, PW, PH } from "./place";

/**
 * Light presets that sit the white-skinned vector characters inside the rendered plates:
 * a colour tint (ambient of the set) + a soft directional "key" built from the character's own
 * silhouette (blurred alpha → diffuse lighting), so the figure gets a lit side and a shadow side.
 */
export type LightName = "bus" | "busDim" | "red" | "street" | "station" | "home" | "bath" | "bathDark" | "dark" | "phone" | "tv";
const LIGHTS: Record<LightName, { tint: [number, number, number]; key: string; az: number; el: number; kd: number; ka: number }> = {
  bus: { tint: [0.74, 0.83, 0.95], key: "#e4f1ff", az: 235, el: 52, kd: 0.78, ka: 0.3 },
  busDim: { tint: [0.5, 0.58, 0.72], key: "#b9d2f0", az: 235, el: 52, kd: 0.7, ka: 0.22 },
  red: { tint: [0.86, 0.5, 0.5], key: "#ff8f80", az: 250, el: 50, kd: 0.8, ka: 0.3 },
  street: { tint: [0.74, 0.72, 0.72], key: "#ffd9b8", az: 290, el: 55, kd: 0.8, ka: 0.26 },
  station: { tint: [0.66, 0.74, 0.86], key: "#d6e8ff", az: 270, el: 62, kd: 0.8, ka: 0.24 },
  home: { tint: [0.86, 0.8, 0.74], key: "#ffe2c2", az: 250, el: 55, kd: 0.8, ka: 0.28 },
  bath: { tint: [0.86, 0.9, 0.96], key: "#f4f8ff", az: 270, el: 70, kd: 0.8, ka: 0.3 },
  bathDark: { tint: [0.3, 0.34, 0.44], key: "#9fb2d0", az: 200, el: 40, kd: 0.6, ka: 0.18 },
  dark: { tint: [0.34, 0.38, 0.5], key: "#8fa6c8", az: 230, el: 45, kd: 0.6, ka: 0.18 },
  phone: { tint: [0.5, 0.6, 0.76], key: "#bfe0ff", az: 90, el: 30, kd: 0.85, ka: 0.18 },
  tv: { tint: [0.68, 0.72, 0.86], key: "#c3d6ff", az: 300, el: 35, kd: 0.8, ka: 0.26 },
};

export const LightDefs: React.FC = () => (
  <defs>
    {(Object.keys(LIGHTS) as LightName[]).map((n) => {
      const L = LIGHTS[n];
      return (
        <filter key={n} id={`lit-${n}`} x="-25%" y="-15%" width="150%" height="130%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values={`${L.tint[0]} 0 0 0 0  0 ${L.tint[1]} 0 0 0  0 0 ${L.tint[2]} 0 0  0 0 0 1 0`} result="tint" />
          <feGaussianBlur in="SourceAlpha" stdDeviation={26} result="blur" />
          <feDiffuseLighting in="blur" surfaceScale={9} diffuseConstant={1} lightingColor={L.key} result="key">
            <feDistantLight azimuth={L.az} elevation={L.el} />
          </feDiffuseLighting>
          <feComposite in="tint" in2="key" operator="arithmetic" k1={L.kd} k2={L.ka} k3={0} k4={0} result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>
      );
    })}
  </defs>
);

/** A rig character standing on a projected point, lit for the set. */
export const Char: React.FC<{ a: Proj; pose: Pose; look: Look; t: number; light?: LightName; seed?: number; shadow?: number; opacity?: number; extraScale?: number; qcName?: string; blur?: number }> = ({ a, pose, look, t, light = "bus", seed = 1, shadow = 0.32, opacity = 1, extraScale = 1, qcName, blur = 0 }) => (
  <g transform={`translate(${a.x} ${a.y}) scale(${a.s * extraScale})`} opacity={opacity}>
    <g filter={`url(#lit-${light})`} style={blur ? { filter: `url(#lit-${light}) blur(${blur}px)` } : undefined}>
      <Person pose={settle(pose, look)} look={look} t={t} seed={seed} shadow={shadow} qcName={qcName} />
    </g>
  </g>
);

export type Frame = { x: number; y: number; z: number; rot?: number };

/**
 * One shot inside a plate. Layers, back to front:
 *   plate → `under` (svg) → `children` (svg: characters) → foreground plate layer (__fg.png)
 *   → `over` (svg) → `masked` (svg clipped to the plate's __mask: window glass / door opening / mirror)
 * Everything is drawn in plate pixels; `frame` is a 2D camera (centre + zoom) over the plate.
 */
export const Stage: React.FC<{
  plate: string;
  frame?: Frame;
  fg?: boolean;
  grade?: string;
  under?: React.ReactNode;
  children?: React.ReactNode;
  over?: React.ReactNode;
  masked?: React.ReactNode;
  maskedHtml?: React.ReactNode;
  maskedBlend?: React.CSSProperties["mixBlendMode"];
  maskedBelow?: boolean;
  plateOpacity?: number;
  bright?: number;
  topLayer?: React.ReactNode;
}> = ({ plate, frame = { x: PW / 2, y: PH / 2, z: 1 }, fg, grade, under, children, over, masked, maskedHtml, maskedBlend = "normal", maskedBelow, plateOpacity = 1, bright = 1, topLayer }) => {
  const z = Math.max(1, frame.z);
  // keep the zoomed frame inside the plate (no empty borders)
  const hx = PW / 2 / z, hy = PH / 2 / z;
  const cx = Math.min(PW - hx, Math.max(hx, frame.x)), cy = Math.min(PH - hy, Math.max(hy, frame.y));
  const tr = `translate(${PW / 2}px, ${PH / 2}px) rotate(${frame.rot ?? 0}deg) scale(${z}) translate(${-cx}px, ${-cy}px)`;
  const svg = (node: React.ReactNode, style?: React.CSSProperties) => (
    <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>
      <LightDefs />
      {node}
    </svg>
  );
  const maskLayer = masked || maskedHtml ? (
    <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, WebkitMaskImage: `url(${staticFile(`plates/${plate}__mask.png`)})`, WebkitMaskSize: "100% 100%", maskImage: `url(${staticFile(`plates/${plate}__mask.png`)})`, maskSize: "100% 100%", mixBlendMode: maskedBlend }}>
      {maskedHtml}
      {masked && svg(masked)}
    </div>
  ) : null;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transformOrigin: "0 0", transform: tr, filter: `${grade ?? ""} brightness(${bright})` }}>
        <Img src={staticFile(`plates/${plate}.jpg`)} style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, opacity: plateOpacity }} />
        {maskLayer && maskedBelow && maskLayer}
        {under && svg(under)}
        {children && svg(children)}
        {fg && <Img src={staticFile(`plates/${plate}__fg.png`)} style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH }} />}
        {over && svg(over)}
        {maskLayer && !maskedBelow && maskLayer}
        {topLayer}
      </div>
    </AbsoluteFill>
  );
};
