import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { rng } from "../lib/anim";

/*
 * Physically scaled orbital scene (1 unit = 1 metre). The station sits at the origin, Earth's centre is
 * R_ORB below it. NASA 3D Resources models (ISS, EMU), NASA Blue Marble / Black Marble textures.
 */
export const R_EARTH = 6.371e6;
export const ALT = 420e3;
export const R_ORB = R_EARTH + ALT;
export const ISS_SCALE = 2.4; // model is ~45 units long; real truss ≈ 109 m

export type V3 = [number, number, number];
export type SpaceCam = { pos: V3; target: V3; fov: number; up?: V3; roll?: number };
export type Astro = { pos: V3; rot: V3; scale?: number; lamps?: number; visible?: boolean };
export type SpaceState = {
  cam: SpaceCam;
  sun: number; // sun elevation angle (rad) seen from the station: >0 day, <~-0.35 Earth shadow
  sunAz?: number; // sun azimuth (rad)
  earthRot: number; // rotation of Earth under the station (rad)
  iss?: { pos: V3; rot: V3; visible?: boolean };
  astro?: Astro[];
  tether?: { from: V3; to: V3; slack?: number; visible?: number };
  exposure?: number;
  stars?: number;
  fill?: number; // extra cool fill (earthshine / camera-friendly night exposure)
  time: number;
};

type Assets = { iss: THREE.Object3D; emu: THREE.Object3D; day: THREE.Texture; night: THREE.Texture; clouds: THREE.Texture; ocean: THREE.Texture };
let cache: Promise<Assets> | null = null;
const texLoad = (u: string, srgb = true) =>
  new Promise<THREE.Texture>((res, rej) =>
    new THREE.TextureLoader().load(u, (t) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
const glb = (u: string) => new Promise<THREE.Object3D>((res, rej) => new GLTFLoader().load(u, (g) => res(g.scene), undefined, rej));

function loadAssets(): Promise<Assets> {
  if (cache) return cache;
  cache = (async () => {
    const [iss, emu, day, night, clouds, ocean] = await Promise.all([
      glb(staticFile("models/iss_b.glb")), glb(staticFile("models/emu.glb")),
      texLoad(staticFile("earth/day_8k.jpg")), texLoad(staticFile("earth/night_8k.jpg")),
      texLoad(staticFile("earth/clouds_8k.jpg"), false), texLoad(staticFile("earth/ocean_4k.png"), false),
    ]);
    // ISS (B) ships every part in the same grey: assign believable materials per part (by source material index)
    const pv = pvTexture();
    const MODULE = new Set(["blinn5SG.001", "blinn3SG.001", "blinn1SG.001", "lambert4SG.001", "blinn4SG.001", "bendedtruss_blin.001", "lambert6SG.001", "initialShadingGr.001", "soyuz_blinn2SG.001"]);
    const TRUSS = new Set(["lambert3SG.001", "anisotropic1SG.001", "apollohorns_blin.001", "soyuz_blinn4SG.001", "bendedtruss_bli1.001"]);
    iss.traverse((o: any) => {
      if (!o.isMesh) return;
      const n = (o.material?.name || "") as string;
      if (n === "lambert7SG.001") {
        o.material = new THREE.MeshStandardMaterial({ map: pv, color: "#ffffff", roughness: 0.32, metalness: 0.45, side: THREE.DoubleSide, emissive: "#05080f" });
      } else if (TRUSS.has(n)) {
        o.material = new THREE.MeshStandardMaterial({ color: "#b9bdc2", roughness: 0.42, metalness: 0.4, side: THREE.DoubleSide });
      } else if (MODULE.has(n)) {
        o.material = new THREE.MeshStandardMaterial({ color: "#e4e0d6", roughness: 0.66, metalness: 0.05, side: THREE.DoubleSide });
      } else {
        o.material = new THREE.MeshStandardMaterial({ color: "#5d6066", roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
      }
    });
    emu.traverse((o: any) => {
      if (o.isMesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        // the model maps its flag-patch texture across the whole backpack — drop it there
        const map = m.name === "EMU:emusuit21_emusuit5_jetpack2SG" ? null : m.map ?? null;
        o.material = new THREE.MeshStandardMaterial({ name: m.name, color: m.color, map, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide });
      }
    });
    // the source model carries a stray cluster of parts far above the station (model y ≈ 41): hide it
    iss.updateMatrixWorld(true);
    iss.traverse((o: any) => {
      if (!o.isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      if ((b.min.y + b.max.y) / 2 > 35) o.visible = false;
    });
    // real attitude: truss across the orbit (z), pressurised modules along the flight direction (x)
    iss.rotation.z = -Math.PI / 2;
    const station = new THREE.Group();
    station.add(iss);
    return { iss: station, emu, day, night, clouds, ocean };
  })();
  return cache;
}

/** procedural photovoltaic blanket: dark blue cells, thin silver grid, gold edge bands */
function pvTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#13203a"; g.fillRect(0, 0, 512, 1024);
  for (let y = 0; y < 1024; y += 16) for (let x = 0; x < 512; x += 16) {
    const v = 22 + ((x * 7 + y * 13) % 9);
    g.fillStyle = `rgb(${v - 6},${v + 6},${v + 34})`; g.fillRect(x + 1, y + 1, 14, 14);
  }
  g.fillStyle = "rgba(190,200,215,0.55)";
  for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 3, 1024);
  g.fillStyle = "#8a6a2a"; g.fillRect(0, 0, 512, 10); g.fillRect(0, 1014, 512, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Italian tricolour patch for Luca Parmitano's suit (the model ships a US flag) */
export function italianFlag() {
  const c = document.createElement("canvas"); c.width = 300; c.height = 200;
  const g = c.getContext("2d")!;
  ["#009246", "#f1f2f1", "#ce2b37"].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 100, 0, 100, 200); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const LOGDEPTH_V = `#include <common>\n#include <logdepthbuf_pars_vertex>`;
const LOGDEPTH_F = `#include <logdepthbuf_pars_fragment>`;

const earthVert = /* glsl */ `
${LOGDEPTH_V}
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
const earthFrag = /* glsl */ `
${LOGDEPTH_F}
uniform sampler2D tDay; uniform sampler2D tNight; uniform sampler2D tClouds; uniform sampler2D tOcean;
uniform vec3 uSun; uniform float uExposure; uniform float uCloudShift;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(N, uSun);
  float dayAmt = smoothstep(-0.12, 0.18, ndl);
  vec3 day = texture2D(tDay, vUv).rgb;
  vec3 night = texture2D(tNight, vUv).rgb;
  float c = texture2D(tClouds, vUv + vec2(uCloudShift, 0.0)).r;
  float cs = texture2D(tClouds, vUv + vec2(uCloudShift - 0.0015, 0.0006)).r; // offset for cloud shadow
  float ocean = texture2D(tOcean, vUv).r;
  vec3 lit = day * (0.06 + 1.1 * max(ndl, 0.0)) * (1.0 - 0.45 * cs * dayAmt);
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0) * ocean * max(ndl, 0.0) * 1.6;
  lit += vec3(1.0, 0.92, 0.78) * spec;
  lit = mix(lit, vec3(1.0) * (0.10 + 1.05 * max(ndl, 0.0)), c * 0.92);
  vec3 col = mix(night * vec3(1.15, 0.95, 0.75) * 1.4 * (1.0 - c * 0.85), lit, dayAmt);
  // sunset tint near the terminator
  float term = exp(-pow(ndl / 0.10, 2.0));
  col += vec3(0.55, 0.22, 0.06) * term * 0.35 * (1.0 - c * 0.5);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, vec3(0.35, 0.55, 0.95) * (0.15 + dayAmt), rim * 0.55);
  gl_FragColor = vec4(col * uExposure, 1.0);
  #include <colorspace_fragment>
}`;
const atmoFrag = /* glsl */ `
${LOGDEPTH_F}
uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float rim = pow(1.0 - abs(dot(N, V)), 5.0);
  float ndl = dot(N, uSun);
  float lit = smoothstep(-0.18, 0.25, ndl);
  float term = exp(-pow(ndl / 0.12, 2.0));
  vec3 col = mix(vec3(0.28, 0.52, 1.0), vec3(1.0, 0.45, 0.16), term * 0.85);
  gl_FragColor = vec4(col, rim * lit * 0.75);
  #include <colorspace_fragment>
}`;

const CamRig: React.FC<{ cam: SpaceCam }> = ({ cam }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos);
  c.up.set(...(cam.up ?? [0, 1, 0]));
  c.fov = cam.fov; c.near = 0.05; c.far = 3e7;
  c.lookAt(new THREE.Vector3(...cam.target));
  if (cam.roll) c.rotateZ(cam.roll);
  c.updateProjectionMatrix();
  return null;
};

const sunVec = (s: SpaceState) => {
  const az = s.sunAz ?? 0.6;
  return new THREE.Vector3(Math.cos(s.sun) * Math.cos(az), Math.sin(s.sun), Math.cos(s.sun) * Math.sin(az)).normalize();
};
/** fraction of the sun visible from the station (Earth shadow with a soft penumbra) */
export const sunlit = (sun: number) => {
  const horizon = -Math.acos(R_EARTH / R_ORB); // ≈ -0.35 rad below local horizontal
  return THREE.MathUtils.smoothstep(sun, horizon - 0.012, horizon + 0.03);
};

const Scene: React.FC<{ a: Assets; s: SpaceState }> = ({ a, s }) => {
  const sun = sunVec(s);
  const light = sunlit(s.sun);
  const earthMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { tDay: { value: a.day }, tNight: { value: a.night }, tClouds: { value: a.clouds }, tOcean: { value: a.ocean }, uSun: { value: new THREE.Vector3() }, uExposure: { value: 1 }, uCloudShift: { value: 0 } },
    vertexShader: earthVert, fragmentShader: earthFrag,
  }), [a]);
  const atmoMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uSun: { value: new THREE.Vector3() } }, vertexShader: earthVert, fragmentShader: atmoFrag,
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  }), []);
  earthMat.uniforms.uSun.value.copy(sun);
  earthMat.uniforms.uExposure.value = s.exposure ?? 1;
  earthMat.uniforms.uCloudShift.value = s.time * 0.00002;
  atmoMat.uniforms.uSun.value.copy(sun);

  const iss = useMemo(() => a.iss.clone(true), [a]);
  const emus = useMemo(() => [0, 1].map((k) => {
    const e = a.emu.clone(true);
    if (k === 0) {
      const it = italianFlag();
      e.traverse((o: any) => {
        if (!o.isMesh) return;
        const m = (o.material as THREE.MeshStandardMaterial).clone();
        if (m.name === "EMU:emusuit21_lambert4SG") m.color.set("#ededed"); // EV2 suits carry no red stripes
        if (m.name === "EMU:emusuit21_lambert9SG") m.map = it;
        o.material = m;
      });
    }
    return e;
  }), [a]);
  const stars = useMemo(() => {
    const r = rng(11); const n = 2600; const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, R = 1.5e7;
      const sq = Math.sqrt(1 - u * u);
      pos.set([R * sq * Math.cos(th), R * u, R * sq * Math.sin(th)], i * 3);
      const b = 0.3 + 0.7 * Math.pow(r(), 3);
      col.set([b, b, b * (0.9 + 0.2 * r())], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const tetherGeo = useMemo(() => {
    if (!s.tether) return null;
    const f = new THREE.Vector3(...s.tether.from), t = new THREE.Vector3(...s.tether.to);
    const mid = f.clone().lerp(t, 0.5).add(new THREE.Vector3(0, -(s.tether.slack ?? 0.6), 0.2 * Math.sin(s.time * 0.7)));
    const q1 = f.clone().lerp(mid, 0.5).add(new THREE.Vector3(0.05 * Math.sin(s.time), 0, 0));
    const curve = new THREE.CatmullRomCurve3([f, q1, mid, mid.clone().lerp(t, 0.5), t]);
    return new THREE.TubeGeometry(curve, 120, 0.028, 8, false);
  }, [s.tether?.from.join(), s.tether?.to.join(), s.tether?.slack, Math.round(s.time * 24)]);

  const earthQ = new THREE.Euler(0.42, s.earthRot, 0.18);
  return (
    <>
      <CamRig cam={s.cam} />
      <points geometry={stars} renderOrder={-10}>
        <pointsMaterial size={1.4} sizeAttenuation={false} vertexColors transparent opacity={(s.stars ?? 1) * 0.9} depthWrite={false} />
      </points>
      <group position={[0, -R_ORB, 0]} rotation={earthQ}>
        <mesh material={earthMat}><sphereGeometry args={[R_EARTH, 192, 128]} /></mesh>
      </group>
      <mesh position={[0, -R_ORB, 0]} material={atmoMat}><sphereGeometry args={[R_EARTH * 1.004, 160, 120]} /></mesh>
      <directionalLight position={sun.clone().multiplyScalar(100)} intensity={3.2 * light} color={"#fff6ea"} />
      <hemisphereLight args={["#0a0f18", "#3b5a86", 0.55 * Math.max(0.05, light) + (s.fill ?? 0)]} />
      <ambientLight intensity={0.02} />
      {s.iss?.visible !== false && (
        <primitive object={iss} position={s.iss?.pos ?? [0, 0, 0]} rotation={s.iss?.rot ?? [0, 0, 0]} scale={ISS_SCALE} />
      )}
      {(s.astro ?? []).map((as, i) => (as.visible === false ? null : (
        <group key={i} position={as.pos} rotation={as.rot}>
          <primitive object={emus[i]} scale={as.scale ?? 1} />
          {(as.lamps ?? 0) > 0 && (
            <>
              <Lamp x={0.18} k={as.lamps ?? 0} />
              <Lamp x={-0.18} k={as.lamps ?? 0} />
              {[0.2, -0.2].map((x) => (
                <group key={x} position={[x, 1.72, -0.27]}>
                  <mesh><sphereGeometry args={[0.03, 10, 8]} /><meshBasicMaterial color={"#fff8e8"} transparent opacity={as.lamps} /></mesh>
                  <sprite scale={[0.9, 0.9, 1]}><spriteMaterial map={glowTex()} color={"#fff1d6"} transparent opacity={0.85 * (as.lamps ?? 0)} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
                </group>
              ))}
            </>
          )}
        </group>
      )))}
      {tetherGeo && (s.tether?.visible ?? 1) > 0 && (
        <mesh geometry={tetherGeo}><meshStandardMaterial color={"#e6e0d0"} emissive={"#6d685c"} roughness={0.6} transparent opacity={s.tether?.visible ?? 1} /></mesh>
      )}
    </>
  );
};

let _glow: THREE.Texture | null = null;
const glowTex = () => {
  if (_glow) return _glow;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.12, "rgba(255,240,210,0.6)"); gr.addColorStop(0.4, "rgba(255,220,180,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
};

/** helmet-mounted lamp: a spotlight whose target travels with the suit */
const Lamp: React.FC<{ x: number; k: number }> = ({ x, k }) => {
  const [l] = useState(() => {
    const sp = new THREE.SpotLight("#fff1d6", 1, 22, 0.42, 0.6, 1.2);
    sp.position.set(x, 1.72, -0.25);
    sp.target.position.set(x, 1.4, -8); // the suit model faces -z
    return sp;
  });
  l.intensity = 70 * k;
  return (<><primitive object={l} /><primitive object={l.target} /></>);
};

export const Space: React.FC<{ s: SpaceState; res?: number }> = ({ s, res = 0.5 }) => {
  const vc = useVideoConfig();
  const width = Math.round(vc.width * res), height = Math.round(vc.height * res);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [handle] = useState(() => delayRender("space assets", { timeoutInMilliseconds: 180000 }));
  useEffect(() => { loadAssets().then((a) => { setAssets(a); continueRender(handle); }); }, [handle]);
  if (!assets) return null;
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true }}
      style={{ position: "absolute", left: 0, top: 0, transform: `scale(${1 / res})`, transformOrigin: "0 0" }}>
      <Scene a={assets} s={s} />
    </ThreeCanvas>
  );
};
