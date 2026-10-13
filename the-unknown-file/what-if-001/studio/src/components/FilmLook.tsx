import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/** Final grade over everything: vignette, gentle top/bottom falloff and animated film grain. */
export const FilmLook: React.FC<{ grain?: number; vignette?: number }> = ({ grain = 0.09, vignette = 0.55 }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const i = Math.floor((f * 12) / fps) % 8; // grain refresh at 12 Hz feels filmic
  const ox = ((i * 137) % 512) * (width / 1920);
  const oy = ((i * 251) % 512) * (width / 1920);
  const tile = 512 * Math.max(1, Math.min(width, height) / 1080);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 1000 }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(3,5,8,${vignette}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile(`tex/grain${i}.png`)})`,
          backgroundSize: `${tile}px ${tile}px`,
          backgroundPosition: `${ox}px ${oy}px`,
          mixBlendMode: "overlay",
          opacity: grain,
        }}
      />
    </AbsoluteFill>
  );
};

/** Preload helper so images never pop in mid-render. */
export const Preload: React.FC<{ srcs: string[] }> = ({ srcs }) => (
  <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 }}>
    {srcs.map((s) => (
      <Img key={s} src={staticFile(s)} />
    ))}
  </div>
);
