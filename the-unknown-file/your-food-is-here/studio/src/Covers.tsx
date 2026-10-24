import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { DoorbellScreen, SAFE_TOP, SW, SH, K } from "./ui/Phone";

/** Episode covers (1080x1920). One style: 3D frame, dark gradient, big condensed title, small series line. No logo, no 6B. */
const Title: React.FC<{ night: number; lines: string[]; color?: string }> = ({ night, lines, color = "#ff3b30" }) => (
  <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 70px 150px" }}>
    <div style={{ fontFamily: K.sans, fontSize: 34, fontWeight: 700, letterSpacing: 8, color: "#d6d9de", marginBottom: 22, textShadow: "0 2px 12px #000" }}>
      YOUR FOOD IS HERE · NIGHT {night}
    </div>
    {lines.map((l, i) => (
      <div key={i} style={{ fontFamily: K.sans, fontSize: 132, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>{l}</div>
    ))}
    <div style={{ width: 220, height: 12, background: color, marginTop: 30, boxShadow: `0 0 30px ${color}` }} />
  </AbsoluteFill>
);
const Shade: React.FC = () => <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.92) 100%)" }} />;
const Grain: React.FC = () => <Img src={staticFile("fx/grain_3.png")} style={{ position: "absolute", width: 1080, height: 1920, opacity: 0.1, mixBlendMode: "overlay" }} />;

export const Cover1: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <div style={{ position: "absolute", left: 0, top: -SAFE_TOP, width: SW, height: SH }}>
      <DoorbellScreen t={0} time="3:14" clock="03:14:09" label="Front Door"
        feed={<AbsoluteFill><Img src={staticFile("shots/n1/cover1.jpg")} style={{ width: 1080, height: 1440, objectFit: "cover", filter: "saturate(0.6) contrast(1.12) brightness(1.05)" }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)" }} /></AbsoluteFill>} />
    </div>
    <Shade /><Grain />
    <Title night={1} lines={["YOUR DRIVER", "ISN'T HERE"]} />
  </AbsoluteFill>
);
export const Cover2: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Img src={staticFile("shots/n2/cover2.jpg")} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
    <Shade /><Grain />
    <Title night={2} lines={["ONE MINUTE", "IN THE FUTURE"]} />
  </AbsoluteFill>
);
export const Cover3: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Img src={staticFile("shots/n3/cover3.jpg")} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
    <Shade /><Grain />
    <Title night={3} lines={["DO NOT", "CONFIRM", "DELIVERY"]} />
  </AbsoluteFill>
);
