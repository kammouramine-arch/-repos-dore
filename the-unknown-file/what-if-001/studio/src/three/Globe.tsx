import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { rng } from "../lib/anim";

/*
 * Earth in space (NASA Blue Marble / Black Marble textures) with an optional Moon (NASA LRO colour map),
 * a drawn rotation axis, and an illustrative "tilt range" cone. Units: Earth radius = 1.
 */
export type GlobeState = {
  time: number;
  cam: { pos: [number, number, number]; target: [number, number, number]; fov: number };
  tilt: number; // axial tilt (deg)
  spin: number; // rotation about the axis (rad)
  sun: [number, number, number];
  axis?: number; // axis line opacity
  cone?: number; // tilt-variation cone opacity (illustrative)
  coneDeg?: number; // half-angle of the illustrative cone around the orbit normal
  moon?: number; // Moon visibility
  moonAng?: number; // Moon orbital angle (rad)
  moonDist?: number; // drawn distance (not to scale)
  orbit?: number; // dashed orbit ring opacity (where the Moon was)
  stars?: number;
};

type Tex = { day: THREE.Texture; night: THREE.Texture; clouds: THREE.Texture; ocean: THREE.Texture; moon: THREE.Texture };
let cache: Promise<Tex> | null = null;
const load = (u: string, srgb = true) => new Promise<THREE.Texture>((res, rej) => new THREE.TextureLoader().load(u, (t) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
const loadAll = () => cache ?? (cache = Promise.all([
  load(staticFile("earth/day_8k.jpg")), load(staticFile("earth/night_8k.jpg")), load(staticFile("earth/clouds_8k.jpg"), false), load(staticFile("earth/ocean_4k.png"), false), load(staticFile("moon/moon_4k.jpg")),
]).then(([day, night, clouds, ocean, moon]) => ({ day, night, clouds, ocean, moon })));

const vert = `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const frag = `uniform sampler2D tDay; uniform sampler2D tNight; uniform sampler2D tClouds; uniform sampler2D tOcean; uniform vec3 uSun;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float ndl = dot(N, uSun);
  float dayAmt = smoothstep(-0.12, 0.18, ndl);
  vec3 day = texture2D(tDay, vUv).rgb; vec3 night = texture2D(tNight, vUv).rgb; float c = texture2D(tClouds, vUv).r; float ocean = texture2D(tOcean, vUv).r;
  vec3 lit = day * (0.05 + 1.1 * max(ndl, 0.0));
  vec3 H = normalize(uSun + V); lit += vec3(1.0, 0.92, 0.78) * pow(max(dot(N, H), 0.0), 70.0) * ocean * max(ndl, 0.0) * 1.2;
  lit = mix(lit, vec3(1.0) * (0.08 + 1.05 * max(ndl, 0.0)), c * 0.9);
  vec3 col = mix(night * vec3(1.15, 0.95, 0.75) * 1.3 * (1.0 - c * 0.85), lit, dayAmt);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, vec3(0.35, 0.55, 0.95) * (0.12 + dayAmt), rim * 0.6);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const atmo = `uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - abs(dot(N, V)), 4.0);
  float lit = smoothstep(-0.25, 0.3, dot(N, uSun)); gl_FragColor = vec4(vec3(0.3, 0.55, 1.0), rim * lit * 0.8);
  #include <colorspace_fragment>
}`;

const CamRig: React.FC<{ s: GlobeState }> = ({ s }) => {
  const { camera } = useThree(); const c = camera as THREE.PerspectiveCamera;
  c.position.set(...s.cam.pos); c.fov = s.cam.fov; c.near = 0.01; c.far = 2000; c.lookAt(new THREE.Vector3(...s.cam.target)); c.updateProjectionMatrix();
  return null;
};

const Scene: React.FC<{ tx: Tex; s: GlobeState }> = ({ tx, s }) => {
  const sun = new THREE.Vector3(...s.sun).normalize();
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { tDay: { value: tx.day }, tNight: { value: tx.night }, tClouds: { value: tx.clouds }, tOcean: { value: tx.ocean }, uSun: { value: new THREE.Vector3() } }, vertexShader: vert, fragmentShader: frag }), [tx]);
  const am = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uSun: { value: new THREE.Vector3() } }, vertexShader: vert, fragmentShader: atmo, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending }), []);
  mat.uniforms.uSun.value.copy(sun); am.uniforms.uSun.value.copy(sun);
  const stars = useMemo(() => {
    const r = rng(5); const n = 3000; const p = new Float32Array(n * 3); const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, th = r() * 6.283, R = 900, q = Math.sqrt(1 - u * u); p.set([R * q * Math.cos(th), R * u, R * q * Math.sin(th)], i * 3); const b = 0.3 + 0.7 * Math.pow(r(), 3); c.set([b, b, b * 1.05], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
  }, []);
  const ring = useMemo(() => {
    const pts: THREE.Vector3[] = []; for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }
    const g = new THREE.BufferGeometry().setFromPoints(pts); return g;
  }, []);
  const tiltR = (s.tilt * Math.PI) / 180;
  const md = s.moonDist ?? 6;
  const ma = s.moonAng ?? 0.6;
  const cone = s.cone ?? 0;
  const coneDeg = s.coneDeg ?? 20;
  return (
    <>
      <CamRig s={s} />
      <points geometry={stars}><pointsMaterial size={1.3} sizeAttenuation={false} vertexColors transparent opacity={s.stars ?? 1} depthWrite={false} /></points>
      <group rotation={[0, 0, -tiltR]}>
        <mesh material={mat} rotation={[0, s.spin, 0]}><sphereGeometry args={[1, 160, 110]} /></mesh>
        {(s.axis ?? 0) > 0 && (
          <mesh><cylinderGeometry args={[0.006, 0.006, 3.0, 8]} /><meshBasicMaterial color="#ece6da" transparent opacity={s.axis} /></mesh>
        )}
      </group>
      <mesh material={am}><sphereGeometry args={[1.025, 96, 64]} /></mesh>
      {/* orbit-normal reference line and the illustrative variation cone */}
      {(s.axis ?? 0) > 0 && <mesh><cylinderGeometry args={[0.003, 0.003, 2.6, 6]} /><meshBasicMaterial color="#7d8590" transparent opacity={0.6 * (s.axis ?? 0)} /></mesh>}
      {cone > 0 && (
        <>
          <mesh position={[0, 1.0, 0]}><coneGeometry args={[Math.tan((coneDeg * Math.PI) / 180) * 1.0, 1.0, 64, 1, true]} /><meshBasicMaterial color="#b0414a" transparent opacity={0.14 * cone} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        </>
      )}
      {(s.orbit ?? 0) > 0 && (
        <lineLoop geometry={ring} scale={md} onUpdate={(o: any) => o.computeLineDistances()}><lineDashedMaterial color="#cfd8e6" transparent opacity={s.orbit} dashSize={0.3} gapSize={0.2} /></lineLoop>
      )}
      {(s.moon ?? 0) > 0 && (
        <mesh position={[Math.cos(ma) * md, 0, Math.sin(ma) * md]} rotation={[0, -ma + Math.PI / 2, 0]}>
          <sphereGeometry args={[0.2727, 96, 64]} />
          <meshStandardMaterial map={tx.moon} roughness={1} metalness={0} transparent opacity={s.moon} />
        </mesh>
      )}
      <directionalLight position={sun.clone().multiplyScalar(50)} intensity={2.4} />
      <ambientLight intensity={0.03} />
    </>
  );
};

export const Globe: React.FC<{ s: GlobeState; res?: number }> = ({ s, res = 0.5 }) => {
  const vc = useVideoConfig();
  const [tx, setTx] = useState<Tex | null>(null);
  const [h] = useState(() => delayRender("globe tex", { timeoutInMilliseconds: 180000 }));
  useEffect(() => { loadAll().then((t) => { setTx(t); continueRender(h); }); }, [h]);
  if (!tx) return null;
  return (
    <ThreeCanvas width={Math.round(vc.width * res)} height={Math.round(vc.height * res)} gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", left: 0, top: 0, transform: `scale(${1 / res})`, transformOrigin: "0 0" }}>
      <Scene tx={tx} s={s} />
    </ThreeCanvas>
  );
};
