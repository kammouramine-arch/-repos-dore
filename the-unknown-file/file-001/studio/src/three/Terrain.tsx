import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, useVideoConfig } from "remotion";
import { Assets, DS, LAKE, VILLAGES, heightAt, lakeLevelY, loadTerrain, pxToWorld } from "./terrainData";
import { rng } from "../lib/anim";

export type V3 = [number, number, number];
export type Cam = { pos: V3; target: V3; fov: number };

/** Arrival "time" (0..1) of the modelled gas front at each village (from tools/geo_render.py). */
export const VILLAGE_ARRIVAL: Record<string, number> = { Cha: 0.23, Subum: 0.32, Fang: 0.61, Mashi: 0.92 };

export type TerrainState = {
  cam: Cam;
  night: number; // 0 day grade, 1 moonlit grade
  gas: number; // gas front threshold (0 none, 1 full extent)
  gasAmt: number; // overall gas visibility
  lights: number; // village lights master
  haze: number; // distance haze density
  time: number; // seconds, drives noise/ripples
  hazeColor?: string;
  exposure?: number;
};

const NOISE = /* glsl */ `
uniform sampler2D tNoise;
float fbm2(vec2 p, float t){
  float a = texture2D(tNoise, p * 0.11 + vec2(t*0.010, -t*0.006)).r;
  float b = texture2D(tNoise, p * 0.23 + vec2(-t*0.017, t*0.011)).g;
  float c = texture2D(tNoise, p * 0.61 + vec2(t*0.031, t*0.022)).b;
  return a * 0.55 + b * 0.3 + c * 0.15;
}
`;

const GAS_FN = /* glsl */ `
uniform sampler2D tGas; uniform float uGas; uniform float uGasAmt; uniform float uTime;
float gasAt(vec2 uv, float layer){
  vec4 g = texture2D(tGas, uv);
  float arrival = 1.0 - g.r;
  float dens = g.a;
  float front = smoothstep(uGas + 0.015, uGas - 0.06, arrival);
  float edge = smoothstep(uGas - 0.10, uGas, arrival) * front;
  float n = fbm2(uv * vec2(46.0, 41.0) + layer * 1.7, uTime + layer * 5.0);
  float m = smoothstep(0.30, 0.70, n * (0.8 + dens * 0.6));
  return clamp(dens * front * m * (1.0 + edge * 1.4) * uGasAmt, 0.0, 1.0);
}`;

const terrainVert = /* glsl */ `
varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const terrainFrag = /* glsl */ `
uniform sampler2D tDay; uniform sampler2D tNight; uniform float uNight; uniform vec3 uHaze; uniform float uHazeD; uniform float uExposure;
varying vec2 vUv; varying vec3 vW;
${NOISE}
${GAS_FN}
void main(){
  vec3 d = texture2D(tDay, vUv).rgb; vec3 n = texture2D(tNight, vUv).rgb;
  vec3 col = mix(d, n, uNight) * uExposure;
  float g = gasAt(vUv, 0.0);
  col = mix(col, vec3(0.70,0.78,0.84) * (0.55 + 0.45*(1.0-uNight)), g * 0.55);
  float dist = length(vW - cameraPosition);
  float f = 1.0 - exp(-pow(dist * uHazeD, 1.6));
  col = mix(col, uHaze, clamp(f, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const gasVert = /* glsl */ `
uniform float uLift; varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec3 p = position; p.y += uLift; vec4 w = modelMatrix * vec4(p,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const gasFrag = /* glsl */ `
uniform float uLayer; uniform float uNight; uniform vec3 uHaze; uniform float uHazeD;
varying vec2 vUv; varying vec3 vW;
${NOISE}
${GAS_FN}
void main(){
  float g = gasAt(vUv, uLayer) * (1.0 - uLayer * 0.13);
  if (g < 0.003) discard;
  vec3 c = mix(vec3(0.80,0.86,0.90), vec3(0.55,0.65,0.74), uNight);
  float dist = length(vW - cameraPosition);
  float f = 1.0 - exp(-pow(dist * uHazeD, 1.6));
  gl_FragColor = vec4(mix(c, uHaze, f*0.8), g * 0.16 * (1.0 - f*0.6));
  #include <colorspace_fragment>
}`;

const waterFrag = /* glsl */ `
uniform sampler2D tLake; uniform float uNight; uniform float uTime; uniform vec3 uHaze; uniform float uHazeD; uniform vec2 uSize; uniform vec2 uOrigin;
varying vec2 vUv; varying vec3 vW;
${NOISE}
void main(){
  vec2 uv = vec2((vW.x - uOrigin.x)/uSize.x + 0.5, 1.0 - ((vW.z - uOrigin.y)/uSize.y + 0.5));
  float m = texture2D(tLake, uv).r;
  if (m < 0.04) discard;
  vec3 V = normalize(cameraPosition - vW);
  float r1 = fbm2(vW.xz*9.0, uTime*2.0);
  float r2 = fbm2(vW.xz*23.0 + 4.0, uTime*3.0);
  vec3 N = normalize(vec3((r1-0.5)*0.18, 1.0, (r2-0.5)*0.18));
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  vec3 deep = mix(vec3(0.025,0.07,0.08), vec3(0.012,0.028,0.04), uNight);
  vec3 sky  = mix(vec3(0.30,0.40,0.43), vec3(0.10,0.16,0.24), uNight);
  float refl = clamp(fres*0.85 + 0.05 + 0.06*(1.0-uNight) + (r1-0.5)*0.12, 0.0, 1.0);
  vec3 col = mix(deep, sky, refl);
  col *= 0.94 + 0.12 * r2;
  vec3 L = normalize(mix(vec3(-0.5,0.35,-0.6), vec3(0.35,0.5,-0.7), uNight));
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 600.0);
  col += spec * mix(vec3(1.0,0.93,0.82), vec3(0.75,0.82,0.95), uNight) * 0.25;
  float dist = length(vW - cameraPosition);
  float f = 1.0 - exp(-pow(dist * uHazeD, 1.6));
  col = mix(col, uHaze, f);
  gl_FragColor = vec4(col, smoothstep(0.04, 0.5, m));
  #include <colorspace_fragment>
}`;

const commonVert = terrainVert;

const CamRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos);
  c.fov = cam.fov;
  c.near = 0.05;
  c.far = 400;
  c.lookAt(new THREE.Vector3(...cam.target));
  c.updateProjectionMatrix();
  return null;
};

const GAS_LAYERS = [0.008, 0.024, 0.045, 0.075, 0.11];

const Scene: React.FC<{ a: Assets; s: TerrainState }> = ({ a, s }) => {
  const haze = useMemo(() => new THREE.Color(s.hazeColor ?? "#0c141f"), [s.hazeColor]);
  const hazeD = s.haze;
  const terrainMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tDay: { value: a.day }, tNight: { value: a.night }, tGas: { value: a.gas }, tNoise: { value: a.noise },
          uNight: { value: 0 }, uHaze: { value: new THREE.Color() }, uHazeD: { value: 0.02 },
          uGas: { value: 0 }, uGasAmt: { value: 0 }, uTime: { value: 0 }, uExposure: { value: 1 },
        },
        vertexShader: terrainVert,
        fragmentShader: terrainFrag,
      }),
    [a],
  );
  const gasMats = useMemo(
    () =>
      GAS_LAYERS.map(
        (lift, i) =>
          new THREE.ShaderMaterial({
            uniforms: {
              tGas: { value: a.gas }, tNoise: { value: a.noise }, uGas: { value: 0 }, uGasAmt: { value: 0 }, uTime: { value: 0 },
              uLift: { value: lift }, uLayer: { value: i }, uNight: { value: 0 },
              uHaze: { value: new THREE.Color() }, uHazeD: { value: 0.02 },
            },
            vertexShader: gasVert,
            fragmentShader: gasFrag,
            transparent: true,
            depthWrite: false,
          }),
      ),
    [a],
  );
  const W = a.box.w;
  const H = a.box.h;
  const waterMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tLake: { value: a.lake }, tNoise: { value: a.noise }, uNight: { value: 0 }, uTime: { value: 0 },
          uHaze: { value: new THREE.Color() }, uHazeD: { value: 0.02 },
          uSize: { value: new THREE.Vector2(W, H) }, uOrigin: { value: new THREE.Vector2(a.box.cx, a.box.cz) },
        },
        vertexShader: commonVert,
        fragmentShader: waterFrag,
        transparent: true,
      }),
    [a, W, H],
  );
  // per-frame uniforms
  const tu = terrainMat.uniforms;
  tu.uNight.value = s.night; tu.uHaze.value = haze; tu.uHazeD.value = hazeD; tu.uGas.value = s.gas;
  tu.uGasAmt.value = s.gasAmt; tu.uTime.value = s.time; tu.uExposure.value = s.exposure ?? 1;
  for (const m of gasMats) {
    const u = m.uniforms;
    u.uGas.value = s.gas; u.uGasAmt.value = s.gasAmt; u.uTime.value = s.time; u.uNight.value = s.night;
    u.uHaze.value = haze; u.uHazeD.value = hazeD;
  }
  const wu = waterMat.uniforms;
  wu.uNight.value = s.night; wu.uTime.value = s.time; wu.uHaze.value = haze; wu.uHazeD.value = hazeD;

  // village lights: small clusters of warm points around each village
  const lights = useMemo(() => {
    if (!a.gasGeometry) return [];
    const r = rng(7);
    const out: { p: V3; v: string; k: number }[] = [];
    for (const v of Object.keys(VILLAGE_ARRIVAL)) {
      const [px, py] = VILLAGES[v];
      for (let i = 0; i < 14; i++) {
        const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * 32;
        const qx = px + Math.cos(ang) * rad, qy = py + Math.sin(ang) * rad;
        const [x, z] = pxToWorld(qx, qy);
        out.push({ p: [x, heightAt(a.heights, qx, qy) + 0.012, z], v, k: r() });
      }
    }
    return out;
  }, [a]);

  return (
    <>
      <CamRig cam={s.cam} />
      <mesh geometry={a.geometry} material={terrainMat} />
      <mesh position={[a.lakeC[0], a.lakeY, a.lakeC[1]]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat}>
        <planeGeometry args={[3.4, 3.4]} />
      </mesh>
      {s.gasAmt > 0.001 && a.gasGeometry && gasMats.map((m, i) => <mesh key={i} geometry={a.gasGeometry!} material={m} renderOrder={10 + i} />)}
      {s.lights > 0.001 &&
        lights.map((l, i) => {
          const reached = s.gasAmt > 0.01 ? THREE.MathUtils.smoothstep(s.gas, VILLAGE_ARRIVAL[l.v] - 0.02, VILLAGE_ARRIVAL[l.v] + 0.04 + l.k * 0.05) : 0;
          const on = s.lights * (1 - reached) * (0.6 + 0.4 * l.k);
          if (on < 0.01) return null;
          return (
            <sprite key={i} position={l.p} scale={[0.09 + 0.05 * l.k, 0.09 + 0.05 * l.k, 1]} renderOrder={30}>
              <spriteMaterial map={GLOW()} color={"#ffc27a"} transparent opacity={on} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          );
        })}
    </>
  );
};

import terrainJson from "../../public/geo/nyos_terrain.json";
const T_W_KM = () => terrainJson.width_m / 1000;
const T_H_KM = () => terrainJson.height_m / 1000;

let glowTex: THREE.Texture | null = null;
function GLOW() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.15, "rgba(255,230,190,0.85)");
  gr.addColorStop(0.45, "rgba(255,180,100,0.18)");
  gr.addColorStop(1, "rgba(255,160,80,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export const Terrain: React.FC<{ s: TerrainState; res?: number; ds?: DS }> = ({ s, res = 0.5, ds = "region" }) => {
  const vc = useVideoConfig();
  const width = Math.round(vc.width * res), height = Math.round(vc.height * res);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [handle] = useState(() => delayRender("terrain assets", { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    loadTerrain(ds).then((a) => {
      setAssets(a);
      continueRender(handle);
    });
  }, [handle, ds]);
  // Mount the canvas only once assets exist: ThreeCanvas redraws on frame changes, not on async state.
  if (!assets) return null;
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", left: 0, top: 0, transform: `scale(${1 / res})`, transformOrigin: "0 0" }}>
      <Scene a={assets} s={s} />
    </ThreeCanvas>
  );
};

/** Project world points to screen pixels for HTML overlays (labels). */
export function project(cam: Cam, w: number, h: number, p: V3): { x: number; y: number; visible: boolean } {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 0.05, 400);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.target));
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(...p).project(c);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2 };
}

export { LAKE, lakeLevelY };
