import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { F } from "../theme";
import { clamp } from "../lib/anim";

export type Sub = { start: number; end: number; en: string; fr: string };

/** Burned-in French subtitles, inside the 9:16 safe area (clear of platform UI on the right and bottom). */
export const Subtitles: React.FC<{ subs: Sub[]; lang?: "fr" | "en"; bottom?: number; maxWidth?: number; size?: number }> = ({ subs, lang = "fr", bottom, maxWidth, size }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const t = f / fps;
  const cur = subs.find((s) => t >= s.start && t < s.end);
  if (!cur) return null;
  const a = clamp((t - cur.start) / 0.12) * clamp((cur.end - t) / 0.12);
  const vertical = H > W;
  return (
    <div
      style={{
        position: "absolute", left: vertical ? 70 * u : 0, right: vertical ? 150 * u : 0, bottom: bottom ?? (vertical ? 470 : 70) * u,
        display: "flex", justifyContent: "center", zIndex: 900, opacity: a,
      }}
    >
      <div
        style={{
          maxWidth: maxWidth ?? (vertical ? 860 : 1500) * u, textAlign: "center", fontFamily: F.sans, fontWeight: 600, fontSize: (size ?? (vertical ? 44 : 46)) * u,
          lineHeight: 1.28, color: "#f4efe6", padding: `${10 * u}px ${22 * u}px`, borderRadius: 10 * u,
          background: "rgba(7,9,12,0.58)", textShadow: `0 ${2 * u}px ${6 * u}px rgba(0,0,0,0.6)`, letterSpacing: "0.005em",
        }}
      >
        {cur[lang]}
      </div>
    </div>
  );
};
