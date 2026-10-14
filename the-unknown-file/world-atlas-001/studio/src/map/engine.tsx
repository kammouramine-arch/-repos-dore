import React from "react";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import geoRaw from "../data/geo.json";
import terrainRaw from "../data/terrain.json";
import { clamp, easeInOut, lerp, ramp } from "../lib/anim";
import { F } from "../theme";

/*
 * WORLD ATLAS map engine.
 * Everything lives in Web-Mercator "world pixels" at zoom Z_REF = 12 (terrain rasters and vectors share it).
 * A camera (lon, lat, z, tilt, rot) maps world → screen: scale k = 2^(z − 12) screen px per world px.
 * The map plane is an SVG larger than the frame, tilted with CSS 3D for the relief-map look.
 */
export const ZREF = 12;
const S = 256 * 2 ** ZREF;
export const geo = geoRaw as any;
const terrain = terrainRaw as Record<string, { z: number; x: number; y: number; w: number; h: number }>;

export const merc = (lon: number, lat: number): [number, number] => {
  const x = ((lon + 180) / 360) * S;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * S;
  return [x, y];
};
export const unmerc = (x: number, y: number): [number, number] => {
  const lon = (x / S) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / S;
  return [lon, (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))];
};

export type Cam = { lon: number; lat: number; z: number; tilt?: number; rot?: number };

/** camera keyframes; centre interpolated in world space, zoom linearly in z (= exponential scale) */
export function camAt(t: number, keys: [number, Cam][]): Cam {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) {
      const p = easeInOut(clamp((t - t0) / (t1 - t0)));
      const [ax, ay] = merc(a.lon, a.lat), [bx, by] = merc(b.lon, b.lat);
      // keep the destination steady while zooming in: bias the centre move toward the zoom curve
      const za = a.z, zb = b.z;
      const z = lerp(za, zb, p);
      const ka = 2 ** za, kb = 2 ** zb, kz = 2 ** z;
      const w = kb === ka ? p : clamp((1 / ka - 1 / kz) / (1 / ka - 1 / kb));
      const [lon, lat] = unmerc(lerp(ax, bx, w), lerp(ay, by, w));
      return { lon, lat, z, tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, p), rot: lerp(a.rot ?? 0, b.rot ?? 0, p) };
    }
  }
  return keys[keys.length - 1][1];
}

export type MapCtx = { k: number; u: number; z: number; cam: Cam };
const Ctx = React.createContext<MapCtx>({ k: 1, u: 1, z: 4, cam: { lon: 0, lat: 0, z: 4 } });
export const useMap = () => React.useContext(Ctx);

const LEVELS: { id: string; z0: number; z1: number }[] = [
  { id: "africa", z0: -99, z1: -98 },
  { id: "westafrica", z0: 5.0, z1: 5.6 },
  { id: "senegambia", z0: 6.6, z1: 7.2 },
  { id: "gambia", z0: 8.3, z1: 8.9 },
];

export const OCEAN = "#0b1218";

/** the tilted map plane; children are SVG drawn in world coordinates */
export const MapView: React.FC<{ cam: Cam; children?: React.ReactNode; style?: React.CSSProperties; terrainStyle?: React.CSSProperties }> = ({ cam, children, style, terrainStyle }) => {
  const { width: W, height: H } = useVideoConfig();
  const k = 2 ** (cam.z - ZREF);
  const [cx, cy] = merc(cam.lon, cam.lat);
  const tilt = cam.tilt ?? 0;
  const PW = W * (1 + tilt / 40), PH = H * (1 + tilt / 22);
  const vb = `${cx - PW / 2 / k} ${cy - PH / 2 / k} ${PW / k} ${PH / k}`;
  const ctx: MapCtx = { k, u: 1 / k, z: cam.z, cam };
  return (
    <AbsoluteFill style={{ background: OCEAN, perspective: H * 1.15, overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", left: (W - PW) / 2, top: (H - PH) / 2, width: PW, height: PH, transform: `rotateX(${tilt}deg) rotateZ(${cam.rot ?? 0}deg)`, transformOrigin: "50% 50%" }}>
        <svg width={PW} height={PH} viewBox={vb} style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            {LEVELS.map((L) => {
              const m = terrain[L.id];
              return (
                <mask id={`mk_${L.id}`} key={L.id} maskUnits="userSpaceOnUse" x={m.x} y={m.y} width={m.w} height={m.h}>
                  <image href={staticFile("terrain/feather.png")} x={m.x} y={m.y} width={m.w} height={m.h} preserveAspectRatio="none" />
                </mask>
              );
            })}
          </defs>
          <g style={terrainStyle}>
            {(() => {
              // view rectangle in world px; skip levels hidden under a finer, fully opaque level that covers the view
              const vx0 = cx - PW / 2 / k, vx1 = cx + PW / 2 / k, vy0 = cy - PH / 2 / k, vy1 = cy + PH / 2 / k;
              const vis = LEVELS.map((L) => {
                const m = terrain[L.id];
                const o = L.z0 < -10 ? 1 : ramp(cam.z, L.z0, L.z1);
                const inset = m.w * 0.06;
                const covers = o >= 1 && vx0 > m.x + inset && vx1 < m.x + m.w - inset && vy0 > m.y + inset && vy1 < m.y + m.h - inset;
                const touches = vx1 > m.x && vx0 < m.x + m.w && vy1 > m.y && vy0 < m.y + m.h;
                return { L, m, o, covers, touches };
              });
              let top = -1;
              vis.forEach((v, i) => { if (v.covers) top = i; });
              return vis.map((v, i) => {
                if (v.o <= 0 || !v.touches || i < top) return null;
                return <image key={v.L.id} href={staticFile(`terrain/${v.L.id}.jpg`)} x={v.m.x} y={v.m.y} width={v.m.w} height={v.m.h} opacity={v.o} preserveAspectRatio="none" mask={v.L.z0 < -10 ? undefined : `url(#mk_${v.L.id})`} />;
              });
            })()}
          </g>
          <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/** filled territory, tinted into the relief (multiply) with an optional lifted edge */
export const Fill: React.FC<{ d: string; color: string; o?: number; blend?: "multiply" | "normal" | "color" | "overlay" | "soft-light"; lift?: number; edge?: string; edgeW?: number }> = ({ d, color, o = 1, blend = "multiply", lift = 0, edge, edgeW = 2 }) => {
  const { u } = useMap();
  if (o <= 0) return null;
  return (
    <g opacity={o}>
      {lift > 0 && [[10, 0.12], [7, 0.16], [4, 0.22]].map(([dy, a], i) => <path key={i} d={d} fill="#000" opacity={a * lift} transform={`translate(${dy * 0.3 * u * lift},${dy * u * lift})`} />)}
      <path d={d} fill={color} style={{ mixBlendMode: blend }} transform={lift > 0 ? `translate(0,${-3 * u * lift})` : undefined} />
      <path d={d} fill={color} opacity={0.32} transform={lift > 0 ? `translate(0,${-3 * u * lift})` : undefined} />
      {edge && <path d={d} fill="none" stroke={edge} strokeWidth={edgeW} vectorEffect="non-scaling-stroke" transform={lift > 0 ? `translate(0,${-3 * u * lift})` : undefined} />}
    </g>
  );
};

/** stroke that can be drawn on (draw 0→1), constant screen width */
export const Line: React.FC<{ d: string; color: string; w?: number; o?: number; draw?: number; from?: number; dash?: string; glow?: number; cap?: "round" | "butt" }> = ({ d, color, w = 2, o = 1, draw = 1, from = 0, dash, glow = 0, cap = "round" }) => {
  if (o <= 0 || draw <= from) return null;
  const full = !dash && draw >= 1 && from <= 0; // fully drawn: no dash pattern (dashing long paths is very slow)
  const da = dash ? undefined : full ? undefined : `${draw - from} 2`;
  const off = dash || full ? undefined : -from;
  const pl = dash || full ? undefined : 1;
  // opacity goes on each stroke (never on a group: group opacity forces a huge offscreen layer)
  return (
    <>
      {glow > 0 && [[7, 0.07], [4.2, 0.12], [2.4, 0.22]].map(([m, a], i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={w * m} strokeLinecap={cap} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={pl} strokeDasharray={da} strokeDashoffset={off} strokeOpacity={a * glow * o} />
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap={cap} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={pl} strokeDasharray={dash ?? da} strokeDashoffset={off} strokeOpacity={o} />
    </>
  );
};

/** map label in world space, sized in screen pixels */
export const Label: React.FC<{ at: [number, number]; text: string; size?: number; color?: string; o?: number; font?: "serif" | "sans" | "mono"; weight?: number; spacing?: number; anchor?: "start" | "middle" | "end"; dy?: number; italic?: boolean; halo?: boolean; rot?: number }> = ({ at, text, size = 30, color = "#ece6da", o = 1, font = "sans", weight = 700, spacing = 0.12, anchor = "middle", dy = 0, italic, halo = true, rot = 0 }) => {
  const { u } = useMap();
  if (o <= 0) return null;
  const [x, y] = at;
  const fam = font === "serif" ? F.serif : font === "mono" ? F.mono : F.sans;
  const fs = size * u;
  return (
    <g opacity={o} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>
      {halo && <text x={x} y={y + dy * u} textAnchor={anchor} fontFamily={fam} fontWeight={weight} fontSize={fs} letterSpacing={`${spacing}em`} fontStyle={italic ? "italic" : undefined} fill="none" stroke="#06090c" strokeWidth={fs * (font === "serif" ? 0.07 : 0.16)} strokeLinejoin="round" opacity={font === "serif" ? 0.45 : 0.65}>{text}</text>}
      <text x={x} y={y + dy * u} textAnchor={anchor} fontFamily={fam} fontWeight={weight} fontSize={fs} letterSpacing={`${spacing}em`} fontStyle={italic ? "italic" : undefined} fill={color}>{text}</text>
    </g>
  );
};

/** settlement / post marker */
export const Pin: React.FC<{ at: [number, number]; color?: string; o?: number; r?: number; pulse?: number; shape?: "dot" | "square" | "fort" }> = ({ at, color = "#ece6da", o = 1, r = 7, pulse = 0, shape = "dot" }) => {
  const { u } = useMap();
  if (o <= 0) return null;
  const [x, y] = at;
  const R = r * u;
  return (
    <g opacity={o}>
      {pulse > 0 && <circle cx={x} cy={y} r={R * (1 + 2.5 * pulse)} fill="none" stroke={color} strokeWidth={2 * u} opacity={1 - pulse} />}
      {shape === "dot" && <><circle cx={x} cy={y} r={R * 1.5} fill="#06090c" opacity={0.6} /><circle cx={x} cy={y} r={R} fill={color} /></>}
      {shape === "square" && <><rect x={x - R * 1.3} y={y - R * 1.3} width={R * 2.6} height={R * 2.6} fill="#06090c" opacity={0.6} /><rect x={x - R} y={y - R} width={R * 2} height={R * 2} fill={color} /></>}
      {shape === "fort" && (
        <g>
          <path d={`M${x - R * 1.6},${y + R} L${x - R * 1.6},${y - R * 0.6} L${x - R},${y - R * 0.6} L${x - R},${y - R * 1.2} L${x - R * 0.4},${y - R * 1.2} L${x - R * 0.4},${y - R * 0.6} L${x + R * 0.4},${y - R * 0.6} L${x + R * 0.4},${y - R * 1.2} L${x + R},${y - R * 1.2} L${x + R},${y - R * 0.6} L${x + R * 1.6},${y - R * 0.6} L${x + R * 1.6},${y + R} Z`} fill={color} stroke="#06090c" strokeWidth={1.5 * u} />
        </g>
      )}
    </g>
  );
};

/** curved arrow between two world points, drawn on */
export const Arrow: React.FC<{ a: [number, number]; b: [number, number]; bend?: number; color: string; w?: number; draw?: number; o?: number; head?: number }> = ({ a, b, bend = 0.25, color, w = 4, draw = 1, o = 1, head = 18 }) => {
  const { u } = useMap();
  if (o <= 0 || draw <= 0) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * bend, cy = my + dx * bend;
  const d = `M${a[0]},${a[1]} Q${cx},${cy} ${b[0]},${b[1]}`;
  // head at the drawn end
  const p = clamp(draw);
  const qx = (1 - p) * (1 - p) * a[0] + 2 * (1 - p) * p * cx + p * p * b[0];
  const qy = (1 - p) * (1 - p) * a[1] + 2 * (1 - p) * p * cy + p * p * b[1];
  const tx = 2 * (1 - p) * (cx - a[0]) + 2 * p * (b[0] - cx), ty = 2 * (1 - p) * (cy - a[1]) + 2 * p * (b[1] - cy);
  const ang = (Math.atan2(ty, tx) * 180) / Math.PI;
  const H = head * u;
  return (
    <g opacity={o}>
      <path d={d} fill="none" stroke="#06090c" strokeWidth={w + 4} opacity={0.5} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={`${p} 2`} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={w} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={`${p} 2`} strokeLinecap="round" />
      <path d={`M${H * 0.5},0 L${-H * 0.6},${-H * 0.55} L${-H * 0.3},0 L${-H * 0.6},${H * 0.55} Z`} fill={color} transform={`translate(${qx},${qy}) rotate(${ang})`} />
    </g>
  );
};

/** lat/lon graticule (vintage atlas) */
export const Graticule: React.FC<{ step: number; o?: number; lon0?: number; lon1?: number; lat0?: number; lat1?: number; labels?: boolean }> = ({ step, o = 0.15, lon0 = -40, lon1 = 70, lat0 = -45, lat1 = 50, labels }) => {
  const { u } = useMap();
  if (o <= 0) return null;
  const lines: React.ReactNode[] = [];
  for (let lon = Math.ceil(lon0 / step) * step; lon <= lon1; lon += step) {
    const [x, y0] = merc(lon, lat1), [, y1] = merc(lon, lat0);
    lines.push(<line key={`a${lon}`} x1={x} y1={y0} x2={x} y2={y1} stroke="#d9c9a3" strokeWidth={1} vectorEffect="non-scaling-stroke" />);
  }
  for (let lat = Math.ceil(lat0 / step) * step; lat <= lat1; lat += step) {
    const [x0, y] = merc(lon0, lat), [x1] = merc(lon1, lat);
    lines.push(<line key={`b${lat}`} x1={x0} y1={y} x2={x1} y2={y} stroke="#d9c9a3" strokeWidth={1} vectorEffect="non-scaling-stroke" />);
  }
  return <g opacity={o} strokeDasharray={`${6} ${6}`}>{lines}</g>;
};

export const P = (name: string): [number, number] => geo.places[name];
