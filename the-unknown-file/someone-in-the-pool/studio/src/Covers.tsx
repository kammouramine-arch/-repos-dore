import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { K } from "./ui/Phone";

/** Episode covers / thumbnails (1080x1920). A 3D frame from the episode, dark gradient, the thumbnail line. No logo, no watermark. */
const Title: React.FC<{ lines: string[]; color?: string; top?: boolean }> = ({ lines, color = "#3fd0d8", top }) => (
  <AbsoluteFill style={{ justifyContent: top ? "flex-start" : "flex-end", padding: top ? "190px 70px 0" : "0 70px 170px" }}>
    {lines.map((l, i) => (
      <div key={i} style={{ fontFamily: K.sans, fontSize: 124, fontWeight: 900, lineHeight: 0.98, letterSpacing: -3, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.95), 0 0 2px #000" }}>{l}</div>
    ))}
    <div style={{ width: 220, height: 12, background: color, marginTop: 30, boxShadow: `0 0 30px ${color}` }} />
  </AbsoluteFill>
);
const Shade: React.FC<{ top?: boolean }> = ({ top }) => <AbsoluteFill style={{ background: top ? "linear-gradient(0deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.92) 100%)" : "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.92) 100%)" }} />;
const Grain: React.FC = () => <Img src={staticFile("fx/grain_3.png")} style={{ position: "absolute", width: 1080, height: 1920, opacity: 0.1, mixBlendMode: "overlay" }} />;
const Frame: React.FC<{ src: string; filter?: string }> = ({ src, filter }) => <Img src={staticFile(src)} style={{ width: 1080, height: 1920, objectFit: "cover", filter }} />;

export const PoolCover1: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Frame src="shots/p1/cover1.jpg" />
    <Shade top /><Grain />
    <Title top lines={["SOMEONE IS", "UNDER THE", "POOL"]} />
  </AbsoluteFill>
);
export const PoolCover2: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Frame src="shots/p2/cover2.jpg" />
    <Shade /><Grain />
    <Title lines={["THE POOL IS EMPTY.", "SO WHO", "IS THAT?"]} color="#ff3b30" />
  </AbsoluteFill>
);
export const PoolCover3: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Frame src="shots/p3/cover3.jpg" />
    <Shade /><Grain />
    <Title lines={["IT FOLLOWED", "YOU HOME"]} color="#ff3b30" />
  </AbsoluteFill>
);
