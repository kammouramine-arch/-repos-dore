import React from "react";
import { AbsoluteFill } from "remotion";
import { useT } from "./lib/time";
import { MapView, Fill, Line, geo } from "./map/engine";

const cam = { lon: -15.25, lat: 13.45, z: 8.0, tilt: 22 };
export const MapTest: React.FC = () => {
  const t = useT();
  const v = Math.floor(t);
  return (
    <AbsoluteFill>
      <MapView cam={{ lon: -14, lat: 13.4, z: 6 + v * 0.3, tilt: 24 }}>
        {v === 1 && <Fill d={geo.detail.GMB.d} color="#e0574e" lift={1} />}
        {v === 2 && <Fill d={geo.detail.GMB.d} color="#e0574e" lift={0} />}
        {v === 3 && <Line d={geo.gmb_ring} color="#fff" w={3} draw={0.6} glow={1} />}
        {v === 4 && <Line d={geo.river} color="#fff" w={3} draw={0.6} glow={1} />}
        {v === 6 && <path d={geo.river_water} fill="#123" />}
      </MapView>
    </AbsoluteFill>
  );
};
