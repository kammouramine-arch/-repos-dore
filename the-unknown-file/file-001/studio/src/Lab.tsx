import React from "react";
import { AbsoluteFill } from "remotion";
import { GeoMap, NYOS } from "./components/GeoMap";
import { CrossSection, LAKE } from "./components/CrossSection";
import { FilmLook } from "./components/FilmLook";
import { useT } from "./lib/time";
export const Lab: React.FC<{ scene: string }> = ({ scene }) => {
  const t = useT() + 5;
  return (
    <AbsoluteFill>
      {scene === "globe" && <GeoMap t={t} view={{ lon: 12, lat: 4, zoom: 1.1 }} cameroon={1} labels={[{ lon: 12.3, lat: 6, text: "Cameroon", at: 0, kind: "country" }]} />}
      {scene === "map" && <GeoMap t={t} view={{ lon: 10.4, lat: 6.0, zoom: 90 }} cameroon={1} nw={1} relief={1} lakes={1} labels={[{ lon: NYOS[0], lat: NYOS[1], text: "Lake Nyos", at: 0, kind: "lake" }]} pins={[{ lon: NYOS[0], lat: NYOS[1], at: 0 }]} />}
      {scene === "xs" && <CrossSection t={t} accum={0.8} source={1} pressure={1} layers={1} labels={[{ text: "DISSOLVED CO₂", x: LAKE.mid + 330, y: 620, at: 0, ax: LAKE.mid + 150, ay: 640 }]} />}
      {scene === "xs2" && <CrossSection t={t} accum={0.9} rise={0.8} erupt={0.7} flow={0.6} />}
      {scene === "xs3" && <CrossSection t={t} accum={0.6} pipe={1} pipeFlow={1} pipes={3} cam={{ x: LAKE.mid, y: 520, zoom: 1.6 }} />}
      <FilmLook />
    </AbsoluteFill>
  );
};
