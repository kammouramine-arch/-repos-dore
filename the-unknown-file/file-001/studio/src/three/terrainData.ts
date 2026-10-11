import * as THREE from "three";
import { staticFile } from "remotion";
import terrain from "../../public/geo/nyos_terrain.json";
import nyosMeta from "../../public/geo/nyos_meta.json";
import crater from "../../public/geo/crater_terrain.json";

export const EXAG = 1.5;
export const T = terrain;
const KM_W = terrain.width_m / 1000;
const KM_H = terrain.height_m / 1000;
export const BASE = 400;

export type Assets = {
  heights: Float32Array;
  day: THREE.Texture;
  night: THREE.Texture;
  gas: THREE.Texture;
  lake: THREE.Texture;
  geometry: THREE.PlaneGeometry;
  gasGeometry: THREE.PlaneGeometry | null;
  noise: THREE.Texture;
  box: { cx: number; cz: number; w: number; h: number };
  lakeY: number;
  lakeC: [number, number];
};
export type DS = "region" | "crater";

const caches: Partial<Record<DS, Promise<Assets>>> = {};

const loadTex = (url: string) =>
  new Promise<THREE.Texture>((res, rej) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        res(t);
      },
      undefined,
      rej,
    );
  });

export function loadTerrain(ds: DS = "region"): Promise<Assets> {
  if (caches[ds]) return caches[ds]!;
  if (ds === "crater") return (caches[ds] = loadCrater());
  caches[ds] = (async () => {
    const buf = await (await fetch(staticFile("geo/nyos_height.bin"))).arrayBuffer();
    const heights = new Float32Array(buf);
    const [day, night, gas, lake, noise] = await Promise.all([
      loadTex(staticFile("geo/nyos_day.jpg")),
      loadTex(staticFile("geo/nyos_night.jpg")),
      loadTex(staticFile("geo/nyos_gas_packed.png")),
      loadTex(staticFile("geo/nyos_lake.png")),
      loadTex(staticFile("tex/noise.png")),
    ]);
    noise.colorSpace = THREE.NoColorSpace;
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
    gas.colorSpace = THREE.NoColorSpace;
    lake.colorSpace = THREE.NoColorSpace;
    const g = new THREE.PlaneGeometry(KM_W, KM_H, terrain.GW - 1, terrain.GH - 1);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, ((heights[i] - BASE) / 1000) * EXAG);
    g.computeVertexNormals();
    // half-resolution copy for the translucent gas layers
    const GW2 = (terrain.GW + 1) / 2, GH2 = Math.floor((terrain.GH + 1) / 2);
    const g2 = new THREE.PlaneGeometry(KM_W, KM_H, GW2 - 1, GH2 - 1);
    g2.rotateX(-Math.PI / 2);
    const p2 = g2.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < GH2; j++)
      for (let i = 0; i < GW2; i++)
        p2.setY(j * GW2 + i, ((heights[Math.min(terrain.GH - 1, j * 2) * terrain.GW + Math.min(terrain.GW - 1, i * 2)] - BASE) / 1000) * EXAG);
    return { heights, day, night, gas, lake, noise, geometry: g, gasGeometry: g2, box: { cx: 0, cz: 0, w: KM_W, h: KM_H }, lakeY: lakeLevelY, lakeC: LAKE };
  })();
  return caches[ds]!;
}

async function loadCrater(): Promise<Assets> {
  const buf = await (await fetch(staticFile("geo/crater_height.bin"))).arrayBuffer();
  const heights = new Float32Array(buf);
  const [day, night, lake, noise, gas] = await Promise.all([
    loadTex(staticFile("geo/crater_day.jpg")),
    loadTex(staticFile("geo/crater_night.jpg")),
    loadTex(staticFile("geo/crater_lake.png")),
    loadTex(staticFile("tex/noise.png")),
    loadTex(staticFile("geo/nyos_gas_packed.png")),
  ]);
  noise.colorSpace = THREE.NoColorSpace;
  noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
  lake.colorSpace = THREE.NoColorSpace;
  gas.colorSpace = THREE.NoColorSpace;
  const w = crater.x1 - crater.x0, h = crater.z1 - crater.z0;
  const g = new THREE.PlaneGeometry(w, h, crater.GW - 1, crater.GH - 1);
  g.rotateX(-Math.PI / 2);
  g.translate((crater.x0 + crater.x1) / 2, 0, (crater.z0 + crater.z1) / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, ((heights[i] - BASE) / 1000) * EXAG);
  g.computeVertexNormals();
  return {
    heights, day, night, gas, lake, noise, geometry: g, gasGeometry: null,
    box: { cx: (crater.x0 + crater.x1) / 2, cz: (crater.z0 + crater.z1) / 2, w, h },
    lakeY: ((crater.lake_level - 4 - BASE) / 1000) * EXAG,
    lakeC: [crater.lake_x, crater.lake_z],
  };
}
export const CRATER_LAKE: [number, number] = [crater.lake_x, crater.lake_z];
export const CRATER_LAKE_Y = ((crater.lake_level - BASE) / 1000) * EXAG;

/** DEM pixel (2304x2048 space) -> world km (x east, z south). */
export const pxToWorld = (px: number, py: number): [number, number] => [
  (px / terrain.W - 0.5) * KM_W,
  (py / terrain.H - 0.5) * KM_H,
];

export function heightAt(heights: Float32Array | null, px: number, py: number) {
  if (!heights) return 0.8;
  const gx = Math.min(terrain.GW - 1.001, Math.max(0, (px / terrain.W) * (terrain.GW - 1)));
  const gy = Math.min(terrain.GH - 1.001, Math.max(0, (py / terrain.H) * (terrain.GH - 1)));
  const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const h = (x: number, y: number) => heights[y * terrain.GW + x];
  const v = h(x0, y0) * (1 - fx) * (1 - fy) + h(x0 + 1, y0) * fx * (1 - fy) + h(x0, y0 + 1) * (1 - fx) * fy + h(x0 + 1, y0 + 1) * fx * fy;
  return ((v - BASE) / 1000) * EXAG;
}

export const lakeLevelY = ((terrain.lake_level - 9 - BASE) / 1000) * EXAG;

const lakePts = nyosMeta.lake as number[][];
const lc = lakePts.reduce((a, p) => [a[0] + p[0] / lakePts.length, a[1] + p[1] / lakePts.length], [0, 0]);
export const LAKE_PX = lc as [number, number];
export const LAKE = pxToWorld(lc[0], lc[1]);
export const VILLAGES = nyosMeta.villages as Record<string, number[]>;
export const villageWorld = (name: string): [number, number] => pxToWorld(VILLAGES[name][0], VILLAGES[name][1]);
