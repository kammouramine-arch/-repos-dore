import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { geoArea, geoDistance, geoGraticule10, geoOrthographic, geoPath, GeoPermissibleObjects } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology } from "topojson-specification";
import world from "../data/countries-50m.json";
import nyosOsm from "../data/osm_Lake_Nyos.json";
import monounOsm from "../data/osm_Lac_Monoun.json";
import nwOsm from "../data/osm_Northwest_Region__Cameroon.json";
import regionMeta from "../../public/geo/region_meta.json";
import nyosMeta from "../../public/geo/nyos_meta.json";
import { C, F } from "../theme";
import { clamp, easeOut, ramp, rng } from "../lib/anim";

const topo = world as unknown as Topology;
const countries = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
const borders = mesh(topo, topo.objects.countries as any, (a: any, b: any) => a !== b);
const land = feature(topo, topo.objects.land) as unknown as GeoJSON.FeatureCollection;
const cameroon = countries.features.find((f) => String(f.id) === "120")!;
const grat = geoGraticule10();
// OSM rings come in the opposite winding to d3's spherical convention; rewind when the area exceeds a hemisphere
const geo = (o: any) => {
  const g = JSON.parse(JSON.stringify(o[0].geojson));
  if (geoArea(g) > 2 * Math.PI) {
    if (g.type === "Polygon") g.coordinates = g.coordinates.map((r: number[][]) => r.slice().reverse());
    else g.coordinates = g.coordinates.map((p: number[][][]) => p.map((r) => r.slice().reverse()));
  }
  return g as GeoJSON.Geometry;
};
const nyosLake = geo(nyosOsm);
const monounLake = geo(monounOsm);
const nwRegion = geo(nwOsm);

export const NYOS: [number, number] = [10.2981, 6.4379];
export const MONOUN: [number, number] = [10.5852, 5.5791];

export type GeoView = { lon: number; lat: number; zoom: number; cx?: number; cy?: number };
export type GeoLabel = { lon: number; lat: number; text: string; sub?: string; at: number; out?: number; kind?: "place" | "lake" | "country" | "region" | "village"; dx?: number; dy?: number };

export type GeoMapProps = {
  t: number;
  view: GeoView;
  land?: number;
  borders?: number;
  cameroon?: number;
  nw?: number;
  relief?: number; // regional relief raster opacity
  local?: number; // Nyos local relief raster opacity
  lakes?: number;
  labels?: GeoLabel[];
  pins?: { lon: number; lat: number; at: number; out?: number; color?: string }[];
  arc?: { from: [number, number]; to: [number, number]; p: number; label?: string };
  arcs?: { from: [number, number]; to: [number, number]; p: number; label?: string }[];
  gasOverlay?: number;
  stars?: number;
  glow?: number;
};

const starField = (() => {
  const r = rng(42);
  return Array.from({ length: 220 }, () => ({ x: r(), y: r(), s: r() ** 3, k: r() }));
})();

export const GeoMap: React.FC<GeoMapProps> = ({
  t, view, land: landO = 1, borders: bO = 0.5, cameroon: camO = 0, nw = 0, relief = 0, local = 0, lakes = 0, labels = [], pins = [], arc, arcs = [], gasOverlay = 0, stars = 1, glow = 1,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const R = Math.min(W, H) * 0.42 * view.zoom;
  const cx = (view.cx ?? 0.5) * W;
  const cy = (view.cy ?? 0.5) * H;
  const proj = useMemo(
    () => geoOrthographic().rotate([-view.lon, -view.lat]).scale(R).translate([cx, cy]).clipAngle(90).precision(0.2),
    [view.lon, view.lat, R, cx, cy],
  );
  const path = geoPath(proj);
  const center: [number, number] = [view.lon, view.lat];
  const vis = (p: [number, number]) => geoDistance(p, center) < Math.PI / 2 - 0.01;

  // raster placement from bbox corners (nearly affine at these scales)
  const placeRaster = (m: { lon_min: number; lon_max: number; lat_min: number; lat_max: number }) => {
    const a = proj([m.lon_min, m.lat_max]);
    const b = proj([m.lon_max, m.lat_min]);
    if (!a || !b) return null;
    // web-mercator rows: vertical stretch is ~uniform at 5-7°N, so a linear placement is accurate to <0.5%
    return { left: a[0], top: a[1], width: b[0] - a[0], height: b[1] - a[1] };
  };
  const rm = regionMeta.meta;
  const regionBox = relief > 0 ? placeRaster(rm) : null;
  const nm = nyosMeta.meta;
  const localBox = local > 0 || gasOverlay > 0 ? placeRaster(nm) : null;
  const zoomedIn = view.zoom > 30;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0f1824 0%, ${C.ink} 75%)` }}>
      {/* stars */}
      {stars > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", opacity: stars * clamp(1 - (view.zoom - 1) / 3) }}>
          {starField.map((s, i) => (
            <circle key={i} cx={s.x * W} cy={s.y * H} r={(0.6 + s.s * 1.6) * u} fill="#dfe6ee" opacity={0.25 + 0.5 * s.k * (0.7 + 0.3 * Math.sin(t * 1.3 + i))} />
          ))}
        </svg>
      )}
      {/* atmosphere glow */}
      {glow > 0 && R < W * 3 && (
        <div
          style={{
            position: "absolute", left: cx - R * 1.12, top: cy - R * 1.12, width: R * 2.24, height: R * 2.24, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(70,110,150,0) 86%, rgba(90,140,190,0.22) 89.5%, rgba(40,70,110,0.0) 100%)",
            opacity: glow,
          }}
        />
      )}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="sphere" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#1b2a3c" />
            <stop offset="60%" stopColor="#0d1622" />
            <stop offset="100%" stopColor="#05080c" />
          </radialGradient>
          <radialGradient id="shade" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <path d={path({ type: "Sphere" } as GeoPermissibleObjects) ?? ""} fill="url(#sphere)" />
        <path d={path(grat) ?? ""} fill="none" stroke="#9fb3c6" strokeOpacity={0.07 * (zoomedIn ? 0.5 : 1)} strokeWidth={1 * u} />
        <path d={path(land) ?? ""} fill="#26323f" fillOpacity={landO} stroke="#8aa0b5" strokeOpacity={0.35 * landO} strokeWidth={0.8 * u} />
        <path d={path(borders as any) ?? ""} fill="none" stroke="#a9b9c6" strokeOpacity={0.22 * bO} strokeWidth={0.8 * u} />
        {camO > 0 && (
          <path d={path(cameroon) ?? ""} fill={C.burgundy} fillOpacity={0.28 * camO * (1 - Math.max(relief, local))} stroke={C.burgundyHi} strokeOpacity={0.95 * camO} strokeWidth={1.6 * u} />
        )}
      </svg>
      {/* regional relief */}
      {regionBox && (
        <div style={{ position: "absolute", ...regionBox, opacity: relief, overflow: "hidden", WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)" }}>
          <Img src={staticFile("geo/region_relief_night.jpg")} style={{ width: "100%", height: "100%", display: "block" }} />
          <Img src={staticFile("geo/region_contours.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35 }} />
        </div>
      )}
      {localBox && (
        <div style={{ position: "absolute", ...localBox, opacity: local, overflow: "hidden", WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)" }}>
          <Img src={staticFile("geo/nyos_relief_night.jpg")} style={{ width: "100%", height: "100%", display: "block" }} />
          <Img src={staticFile("geo/nyos_contours.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.45 }} />
        </div>
      )}
      {localBox && gasOverlay > 0 && (
        <div style={{ position: "absolute", ...localBox, opacity: gasOverlay * 0.75 }}>
          <Img src={staticFile("geo/nyos_gas_packed.png")} style={{ width: "100%", height: "100%", display: "block", filter: "brightness(0) invert(0.85) sepia(0.2) hue-rotate(170deg)" }} />
        </div>
      )}
      {(regionBox || localBox) && (
        // soft edges around rasters so they melt into the vector map
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 62% 62% at 50% 50%, rgba(7,9,12,0) 60%, rgba(7,9,12,${0.85 * Math.max(relief, local)}) 100%)` }} />
      )}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {(camO > 0 && (relief > 0 || local > 0)) && (
          <path d={path(cameroon) ?? ""} fill="none" stroke={C.burgundyHi} strokeOpacity={0.9 * camO} strokeWidth={1.8 * u} />
        )}
        {nw > 0 && (
          <path d={path(nwRegion as any) ?? ""} fill={C.burgundy} fillOpacity={0.09 * nw} stroke={C.paper} strokeOpacity={0.7 * nw} strokeWidth={1.4 * u} strokeDasharray={`${6 * u} ${5 * u}`} />
        )}
        {lakes > 0 && (
          <>
            <path d={path(nyosLake as any) ?? ""} fill="#0b2531" fillOpacity={lakes} stroke="#bcd3df" strokeOpacity={0.9 * lakes} strokeWidth={1.4 * u} />
            <path d={path(monounLake as any) ?? ""} fill="#0b2531" fillOpacity={lakes} stroke="#bcd3df" strokeOpacity={0.9 * lakes} strokeWidth={1.4 * u} />
          </>
        )}
        {arc && <Arc proj={proj} arc={arc} u={u} />}
        {arcs.map((a, i) => <Arc key={i} proj={proj} arc={a} u={u} />)}
      </svg>
      {/* pins */}
      {pins.map((p, i) => {
        if (!vis([p.lon, p.lat])) return null;
        const xy = proj([p.lon, p.lat])!;
        const a = ramp(t, p.at, p.at + 0.6, easeOut) * (p.out !== undefined ? 1 - ramp(t, p.out, p.out + 0.5) : 1);
        const pulse = ((t - p.at) % 2.2) / 2.2;
        return (
          <div key={i} style={{ position: "absolute", left: xy[0], top: xy[1], opacity: a }}>
            <div style={{ position: "absolute", width: 14 * u, height: 14 * u, left: -7 * u, top: -7 * u, borderRadius: "50%", background: p.color ?? C.burgundyHi, boxShadow: `0 0 ${18 * u}px ${p.color ?? C.burgundyHi}` }} />
            <div style={{ position: "absolute", width: 70 * u, height: 70 * u, left: -35 * u, top: -35 * u, borderRadius: "50%", border: `${1.5 * u}px solid ${p.color ?? C.burgundyHi}`, transform: `scale(${0.2 + pulse})`, opacity: 1 - pulse }} />
          </div>
        );
      })}
      {/* labels */}
      {labels.map((l, i) => {
        if (!vis([l.lon, l.lat])) return null;
        const xy = proj([l.lon, l.lat])!;
        const a = ramp(t, l.at, l.at + 0.7, easeOut) * (l.out !== undefined ? 1 - ramp(t, l.out, l.out + 0.5) : 1);
        if (a <= 0) return null;
        const kind = l.kind ?? "place";
        const big = kind === "country" || kind === "lake";
        return (
          <div key={i} style={{ position: "absolute", left: xy[0] + (l.dx ?? 22) * u, top: xy[1] + (l.dy ?? -14) * u, opacity: a, transform: `translateX(${(1 - a) * -12 * u}px)`, whiteSpace: "nowrap" }}>
            <div
              style={{
                fontFamily: kind === "lake" ? F.serif : F.sans, fontStyle: kind === "lake" ? "italic" : undefined,
                fontWeight: kind === "lake" ? 400 : kind === "village" ? 500 : 700, fontSize: (kind === "lake" ? 54 : big ? 30 : kind === "village" ? 21 : 22) * u,
                letterSpacing: kind === "lake" ? "0.01em" : "0.24em", color: kind === "village" ? "#e9d6b5" : C.paper,
                textShadow: `0 ${2 * u}px ${10 * u}px rgba(0,0,0,0.85)`, textTransform: kind === "lake" ? undefined : "uppercase",
              }}
            >
              {l.text}
            </div>
            {l.sub && (
              <div style={{ fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.18em", color: C.paperDim, marginTop: 6 * u, textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>{l.sub}</div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Arc: React.FC<{ proj: any; arc: NonNullable<GeoMapProps["arc"]>; u: number }> = ({ proj, arc, u }) => {
  const a = proj(arc.from), b = proj(arc.to);
  if (!a || !b) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const c = [mx + nx * len * 0.28, my + ny * len * 0.28];
  const d = `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`;
  const L = len * 1.15;
  return (
    <g>
      <path d={d} fill="none" stroke={C.paper} strokeOpacity={0.85} strokeWidth={1.6 * u} strokeDasharray={`${L}`} strokeDashoffset={L * (1 - arc.p)} />
      {arc.label && arc.p > 0.6 && (
        <text x={c[0] + nx * 26 * u * Math.sign(nx || 1)} y={c[1]} fill={C.paperDim} fontFamily={F.mono} fontSize={17 * u} letterSpacing={3 * u} opacity={clamp((arc.p - 0.6) / 0.3)} textAnchor="middle">
          {arc.label}
        </text>
      )}
    </g>
  );
};
