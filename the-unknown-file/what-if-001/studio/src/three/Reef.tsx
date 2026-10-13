import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useVideoConfig } from "remotion";
import { rng } from "../lib/anim";

/*
 * Original 3D coral reef (procedural, metres). Branching (staghorn-type) and table Acropora, massive brain-type
 * colonies, sea fans, rock, sand, caustics, god-rays, marine snow, reef fish, and coral spawning (gamete bundles).
 * Illustration of real biology; colonies, timings and fish counts are illustrative, not data.
 */

export type V3 = [number, number, number];
export type ReefCam = { pos: V3; target: V3; fov: number; roll?: number };
export type ReefState = {
  cam: ReefCam;
  time: number;
  night: number; // 0 day .. 1 night
  moonlight?: number; // faint moonlight from above at night
  torch?: number; // diver's torch from the camera
  spawn?: { p: number; frac: number; seed?: number }; // progress through the night, fraction of colonies spawning tonight
  health?: number; // 1 healthy reef .. 0 heavily degraded (illustrative)
  fish?: number; // 0..1 fish abundance
  juveniles?: number; // small fish sheltering in branches
};

// ── noise / helpers ───────────────────────────────────────────────────────────────────
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let acc = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    acc += hash(xi + dx, yi + dy, zi + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  }
  return acc;
}
const fbm = (x: number, y: number, z: number) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15;

function colorize(g: THREE.BufferGeometry, f: (p: THREE.Vector3, i: number) => THREE.Color) {
  const pos = g.attributes.position; const col = new Float32Array(pos.count * 3); const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const c = f(v, i); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

// ── coral generators ──────────────────────────────────────────────────────────────────
function branching(seed: number, size: number, base: THREE.Color, tip: THREE.Color) {
  const r = rng(seed); const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const grow = (start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const end = start.clone().addScaledVector(dir, len);
    const g = new THREE.CylinderGeometry(rad * 0.72, rad, len, 7, 1, true);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    g.translate(start.x, start.y, start.z);
    const t0 = depth / 5;
    colorize(g, (p) => base.clone().lerp(tip, Math.min(1, t0 + (p.y - start.y) / (len * 5))).multiplyScalar(0.8 + 0.35 * fbm(p.x * 30, p.y * 30, p.z * 30)));
    parts.push(g);
    if (depth >= 4 || rad < 0.006) {
      const s = new THREE.SphereGeometry(rad * 0.85, 6, 5); s.translate(end.x, end.y, end.z);
      colorize(s, () => tip.clone().multiplyScalar(1.15)); parts.push(s); return;
    }
    const kids = depth < 1 ? 3 : 2 + (r() < 0.4 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const ax = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize();
      const nd = dir.clone().applyAxisAngle(ax, (0.35 + r() * 0.45) * (depth === 0 ? 1.1 : 1)).lerp(up, 0.25).normalize();
      grow(end, nd, len * (0.72 + r() * 0.18), rad * 0.74, depth + 1);
    }
  };
  for (let k = 0; k < 3; k++) {
    const d = new THREE.Vector3((r() - 0.5) * 0.8, 1, (r() - 0.5) * 0.8).normalize();
    grow(new THREE.Vector3((r() - 0.5) * 0.06, 0, (r() - 0.5) * 0.06), d, 0.13 * size, 0.026 * size, 0);
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
}

function table(seed: number, size: number, col: THREE.Color) {
  const r = rng(seed);
  const stalk = new THREE.CylinderGeometry(0.05 * size, 0.08 * size, 0.25 * size, 8); stalk.translate(0, 0.125 * size, 0);
  const plate = new THREE.CylinderGeometry(0.55 * size, 0.42 * size, 0.06 * size, 40, 3);
  const p = plate.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const rr = Math.hypot(v.x, v.z);
    v.y += 0.08 * size * Math.pow(rr / (0.55 * size), 2) + (fbm(v.x * 4 + seed, 0, v.z * 4) - 0.5) * 0.05 * size;
    v.x *= 1 + (r() - 0.5) * 0.04; p.setXYZ(i, v.x, v.y, v.z);
  }
  plate.translate(0, 0.27 * size, 0); plate.computeVertexNormals();
  const g = mergeGeometries([stalk.toNonIndexed(), plate.toNonIndexed()])!;
  return colorize(g, (q) => col.clone().multiplyScalar(0.75 + 0.35 * fbm(q.x * 9, q.y * 9, q.z * 9)));
}

function brain(seed: number, size: number, col: THREE.Color, groove: THREE.Color) {
  const g = new THREE.SphereGeometry(0.45 * size, 72, 40, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const p = g.attributes.position; const v = new THREE.Vector3(); const n = new THREE.Vector3();
  const gv: number[] = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); n.copy(v).normalize();
    const w = Math.sin((v.x * 26 + Math.sin(v.z * 11 + seed) * 3.2 + fbm(v.x * 3, v.y * 3, v.z * 3) * 6) / size);
    const d = -Math.pow(Math.abs(w), 0.4) * 0.018 * size + (fbm(v.x * 2 + seed, v.y * 2, v.z * 2) - 0.5) * 0.06 * size;
    v.addScaledVector(n, d); v.y *= 0.72; p.setXYZ(i, v.x, v.y, v.z); gv.push(Math.abs(w));
  }
  g.computeVertexNormals();
  return colorize(g, (_q, i) => groove.clone().lerp(col, Math.pow(gv[i], 0.6)));
}

function fan(seed: number, size: number, col: THREE.Color) {
  const r = rng(seed); const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const grow = (s: THREE.Vector3, ang: number, len: number, rad: number, depth: number) => {
    const dir = new THREE.Vector3(Math.sin(ang), Math.cos(ang), 0);
    const e = s.clone().addScaledVector(dir, len);
    const g = new THREE.CylinderGeometry(rad * 0.8, rad, len, 4, 1, true); g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir)); g.translate(s.x, s.y, s.z); parts.push(g);
    if (depth < 6) for (let k = 0; k < 2; k++) grow(e, ang + (k ? 1 : -1) * (0.18 + r() * 0.3), len * 0.82, rad * 0.8, depth + 1);
  };
  grow(new THREE.Vector3(0, 0, 0), 0, 0.12 * size, 0.012 * size, 0);
  return colorize(mergeGeometries(parts.map((p) => p.toNonIndexed()))!, () => col);
}

function rock(seed: number, rx: number, ry: number, rz: number) {
  const g = new THREE.IcosahedronGeometry(1, 5); const p = g.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const k = 0.75 + 0.5 * fbm(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6);
    p.setXYZ(i, v.x * rx * k, v.y * ry * k, v.z * rz * k);
  }
  g.computeVertexNormals();
  return colorize(g, (q) => new THREE.Color("#3a3438").lerp(new THREE.Color("#5b4f49"), fbm(q.x * 3, q.y * 3, q.z * 3)));
}

// ── reef layout (built once) ──────────────────────────────────────────────────────────
type Colony = { geo: THREE.BufferGeometry; pos: V3; rot: number; scale: number; kind: string; spawner: boolean; tint: THREE.Color; deadOrder: number };
let LAYOUT: { rocks: { geo: THREE.BufferGeometry; pos: V3 }[]; colonies: Colony[]; sand: THREE.BufferGeometry } | null = null;
const sandH = (x: number, z: number) => (fbm(x * 0.25, 0, z * 0.25) - 0.5) * 0.6 + Math.sin(x * 1.3 + z * 0.4) * 0.03;
function layout() {
  if (LAYOUT) return LAYOUT;
  const r = rng(2026);
  const rocks: { geo: THREE.BufferGeometry; pos: V3; rx: number; ry: number; rz: number }[] = [];
  const mounds: [number, number, number, number][] = [[0, 0, 2.2, 1.1], [-3.4, -1.5, 1.6, 0.8], [3.2, -2.2, 1.8, 0.9], [1.2, -4.6, 1.5, 0.7], [-2.2, -5.4, 1.9, 1.0], [4.6, 1.8, 1.3, 0.6], [-4.8, 2.2, 1.4, 0.7]];
  for (const [x, z, rr, h] of mounds) rocks.push({ geo: rock(Math.round(x * 10 + z), rr, h, rr * 0.9), pos: [x, sandH(x, z) - h * 0.25, z], rx: rr, ry: h, rz: rr * 0.9 });
  const colonies: Colony[] = [];
  const pal = [
    ["#6b5a3c", "#d9c79a"], ["#4f5e3d", "#b8d08e"], ["#5d4552", "#d6a7c4"], ["#3d5866", "#9fd3dc"], ["#6a4a34", "#e2b48a"],
  ];
  const surfaceOn = (m: typeof rocks[0], ang: number, rad: number): V3 => {
    const x = m.pos[0] + Math.cos(ang) * rad * m.rx, z = m.pos[2] + Math.sin(ang) * rad * m.rz;
    const y = m.pos[1] + m.ry * Math.sqrt(Math.max(0, 1 - rad * rad)) * 0.92;
    return [x, y, z];
  };
  let id = 0;
  for (const m of rocks) {
    const count = Math.round(7 + m.rx * 7);
    for (let k = 0; k < count; k++) {
      const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.85;
      const pos = surfaceOn(m, ang, rad);
      const pick = r();
      const pc = pal[Math.floor(r() * pal.length)];
      let geo: THREE.BufferGeometry, kind: string;
      const sc = 0.55 + r() * 0.6;
      if (pick < 0.55) { geo = branching(++id * 13, 2.2, new THREE.Color(pc[0]), new THREE.Color(pc[1])); kind = "branch"; }
      else if (pick < 0.66) { geo = table(++id * 7, 1.1, new THREE.Color(pc[1]).multiplyScalar(0.8)); kind = "table"; }
      else if (pick < 0.9) { geo = brain(++id * 5, 1.4, new THREE.Color(pc[1]).multiplyScalar(0.85), new THREE.Color(pc[0])); kind = "brain"; }
      else { geo = fan(++id * 3, 2.4, new THREE.Color(["#7a3f6e", "#a35a3a", "#6e4f86"][Math.floor(r() * 3)])); kind = "fan"; }
      colonies.push({ geo, pos, rot: r() * Math.PI * 2, scale: sc, kind, spawner: kind !== "fan", tint: new THREE.Color(1, 1, 1), deadOrder: r() });
    }
  }
  // sand with gentle ripples
  const sand = new THREE.PlaneGeometry(90, 90, 180, 180); sand.rotateX(-Math.PI / 2);
  const sp = sand.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, sandH(sp.getX(i), sp.getZ(i)) - 0.35);
  sand.computeVertexNormals();
  colorize(sand, (q) => new THREE.Color("#b8a888").lerp(new THREE.Color("#8f8166"), fbm(q.x * 0.5, 0, q.z * 0.5)));
  LAYOUT = { rocks: rocks.map((m) => ({ geo: m.geo, pos: m.pos })), colonies, sand };
  return LAYOUT;
}

// ── caustics injected into standard materials ─────────────────────────────────────────
const CAUSTIC = `
float caustic(vec2 uv, float time){
  vec2 p = mod(uv*6.28318, 6.28318) - 250.0; vec2 i = p; float c = 1.0; float inten = .005;
  for (int n = 0; n < 4; n++) { float t = time * (1.0 - (3.5 / float(n+1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten), p.y / (cos(i.y+t)/inten))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0);
}`;
const uniforms = { uTime: { value: 0 }, uCaustic: { value: 1 } };
function causticMat(params: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uCaustic = uniforms.uCaustic;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN; uniform float uTime; uniform float uCaustic;\n" + CAUSTIC)
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n float up = smoothstep(-0.2, 0.9, vWN.y);\n float cs = caustic(vWPos.xz * 0.22, uTime * 0.6) + 0.6 * caustic(vWPos.xz * 0.37 + 3.1, uTime * 0.45);\n gl_FragColor.rgb += diffuseColor.rgb * cs * up * uCaustic * 0.9;");
  };
  return m;
}

// ── fish ─────────────────────────────────────────────────────────────────────────────
let FISHGEO: THREE.BufferGeometry | null = null;
function fishGeo() {
  if (FISHGEO) return FISHGEO;
  const body = new THREE.SphereGeometry(1, 14, 10); body.scale(1, 0.48, 0.17);
  const tail = new THREE.BufferGeometry();
  tail.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.9, 0, 0, -1.55, 0.45, 0, -1.55, -0.45, 0, -0.9, 0, 0, -1.55, -0.45, 0, -1.55, 0.45, 0]), 3));
  tail.computeVertexNormals();
  const dorsal = new THREE.BufferGeometry();
  dorsal.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.4, 0.4, 0, 0.3, 0.45, 0, -0.2, 0.75, 0, 0.3, 0.45, 0, -0.4, 0.4, 0, -0.2, 0.75, 0]), 3));
  dorsal.computeVertexNormals();
  const b2 = body.toNonIndexed(); b2.deleteAttribute("uv");
  FISHGEO = mergeGeometries([b2, tail, dorsal])!;
  colorize(FISHGEO, (p) => { const c = new THREE.Color(1, 1, 1); const stripe = Math.abs(p.x - 0.1) < 0.12 || Math.abs(p.x + 0.45) < 0.1; return c.multiplyScalar(stripe ? 0.25 : (p.y > 0.15 ? 0.75 : 1)); });
  return FISHGEO;
}
const SCHOOLS = (() => {
  const r = rng(77);
  const kinds = [
    { col: "#f2c94c", size: 0.08, n: 26 }, { col: "#3fa7e0", size: 0.06, n: 40 }, { col: "#e86a3a", size: 0.07, n: 14 },
    { col: "#cfd6de", size: 0.11, n: 20 }, { col: "#7fd6c2", size: 0.05, n: 30 },
  ];
  return kinds.map((k, i) => ({ ...k, cx: (r() - 0.5) * 8, cz: -1.5 - r() * 4, cy: 1.3 + r() * 1.6, rad: 1.2 + r() * 1.8, sp: 0.18 + r() * 0.15, dir: r() < 0.5 ? 1 : -1, seed: 300 + i,
    members: Array.from({ length: k.n }, () => ({ o: [r() - 0.5, r() - 0.5, r() - 0.5] as V3, ph: r() * 6.28, ord: r() })) }));
})();

const Fish: React.FC<{ s: ReefState }> = ({ s }) => {
  const geo = fishGeo();
  const meshes = useMemo(() => SCHOOLS.map((sc) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: sc.col, roughness: 0.45, metalness: 0.15, vertexColors: true }), sc.n);
    m.frustumCulled = false; return m;
  }), [geo]);
  const ab = s.fish ?? 1;
  const dummy = new THREE.Object3D();
  SCHOOLS.forEach((sc, k) => {
    const m = meshes[k];
    sc.members.forEach((f, i) => {
      const vis = f.ord < ab;
      const a = s.time * sc.sp * sc.dir + f.ph * 0.15 + i * 0.02;
      const x = sc.cx + Math.cos(a) * sc.rad + f.o[0] * 1.1, z = sc.cz + Math.sin(a) * sc.rad * 0.6 + f.o[2] * 1.1, y = sc.cy + f.o[1] * 0.7 + Math.sin(s.time * 1.3 + f.ph) * 0.06;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -a * 1 - (sc.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(s.time * 6 + f.ph) * 0.12, 0);
      dummy.scale.setScalar(vis ? sc.size * (0.85 + f.ord * 0.3) : 0.0001);
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};

/** juveniles darting in and out of branching colonies */
const Juveniles: React.FC<{ s: ReefState; colonies: Colony[] }> = ({ s, colonies }) => {
  const geo = fishGeo();
  const branchy = useMemo(() => colonies.filter((c) => c.kind === "branch").slice(0, 14), [colonies]);
  const m = useMemo(() => { const mm = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: "#7fe0f0", roughness: 0.4, vertexColors: true, emissive: "#0a2a30" }), 14 * 6); mm.frustumCulled = false; return mm; }, [geo]);
  const dummy = new THREE.Object3D();
  const r = rng(9);
  const live = s.health ?? 1;
  branchy.forEach((c, ci) => {
    const alive = c.deadOrder < live;
    for (let k = 0; k < 6; k++) {
      const ph = r() * 6.28, rr = 0.15 + r() * 0.25;
      const out = alive ? 0.35 + 0.25 * Math.sin(s.time * 0.8 + ph) : 1.6;
      dummy.position.set(c.pos[0] + Math.cos(s.time * 0.9 + ph) * rr * out * 2, c.pos[1] + 0.25 + 0.15 * Math.sin(s.time + ph), c.pos[2] + Math.sin(s.time * 0.9 + ph) * rr * out * 2);
      dummy.rotation.set(0, -(s.time * 0.9 + ph) - Math.PI / 2, 0);
      dummy.scale.setScalar((s.juveniles ?? 0) > 0 && alive ? 0.035 * (s.juveniles ?? 0) : 0.0001);
      dummy.updateMatrix(); m.setMatrixAt(ci * 6 + k, dummy.matrix);
    }
  });
  m.instanceMatrix.needsUpdate = true;
  return <primitive object={m} />;
};

// ── spawning bundles ──────────────────────────────────────────────────────────────────
let DOT: THREE.Texture | null = null;
const dotTex = () => {
  if (DOT) return DOT;
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.9)"); gr.addColorStop(0.6, "rgba(255,255,255,0.25)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); DOT = new THREE.CanvasTexture(c); return DOT;
};
const Bundles: React.FC<{ s: ReefState; colonies: Colony[] }> = ({ s, colonies }) => {
  const sp = s.spawn;
  const PER = 46;
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(colonies.length * PER * 3), 3)); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colonies.length * PER * 3), 3)); return g; }, [colonies.length]);
  if (!sp || sp.p <= 0) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute, col = geo.attributes.color as THREE.BufferAttribute;
  const r = rng(sp.seed ?? 5);
  const live = s.health ?? 1;
  colonies.forEach((c, ci) => {
    const tonight = c.spawner && c.deadOrder < live && r() < sp.frac;
    const t0 = 0.12 + r() * 0.12; // release moment within the night (synchronised colonies: close together)
    for (let k = 0; k < PER; k++) {
      const idx = ci * PER + k;
      const rel = (sp.p - t0 - k * 0.011) / 0.55; // time since this bundle left the colony
      if (!tonight || rel <= 0) { pos.setXYZ(idx, 0, -999, 0); continue; }
      const rise = Math.pow(rel, 0.8) * (2.2 + r() * 1.2);
      const ang = r() * Math.PI * 2, spread = 0.05 + rel * 0.6 * r();
      pos.setXYZ(idx, c.pos[0] + Math.cos(ang) * spread + Math.sin(s.time * 0.7 + k) * 0.05 * rel, c.pos[1] + 0.25 + rise, c.pos[2] + Math.sin(ang) * spread);
      const pink = r();
      col.setXYZ(idx, 0.95, 0.32 + 0.18 * pink, 0.36 + 0.14 * pink);
    }
  });
  pos.needsUpdate = true; col.needsUpdate = true;
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.11} map={dotTex()} vertexColors transparent depthWrite={false} sizeAttenuation opacity={0.95} blending={THREE.AdditiveBlending} />
    </points>
  );
};

/** suspended particles ("marine snow") */
const Snow: React.FC<{ s: ReefState }> = ({ s }) => {
  const geo = useMemo(() => {
    const r = rng(31); const n = 1600; const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(r() - 0.5) * 20, r() * 7 - 0.3, (r() - 0.5) * 20 - 2], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g;
  }, []);
  return <points geometry={geo} position={[Math.sin(s.time * 0.05) * 0.3, -((s.time * 0.02) % 1), 0]}>
    <pointsMaterial size={s.night > 0.5 ? 0.012 : 0.018} map={dotTex()} color={s.night > 0.5 ? "#5f7686" : "#d8f0ff"} transparent opacity={s.night > 0.5 ? 0.18 : 0.5} depthWrite={false} sizeAttenuation />
  </points>;
};

/** god-rays from the surface (day only) */
const Rays: React.FC<{ s: ReefState }> = ({ s }) => {
  const mat = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(200,240,255,0.55)"); gr.addColorStop(1, "rgba(200,240,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, 64, 256);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  }, []);
  const day = 1 - s.night;
  if (day <= 0.02) return null;
  const r = rng(4);
  return <>{Array.from({ length: 9 }, (_, i) => {
    const x = (r() - 0.5) * 12, z = -r() * 8, w = 0.4 + r() * 1.2;
    return <mesh key={i} position={[x + Math.sin(s.time * 0.2 + i) * 0.4, 4.5, z]} rotation={[0, r() * 3, 0.25 + Math.sin(s.time * 0.15 + i) * 0.04]} material={mat}>
      <planeGeometry args={[w, 11]} />
      <meshBasicMaterial attach="material" map={mat.map} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.22 * day} side={THREE.DoubleSide} />
    </mesh>;
  })}</>;
};

const CamRig: React.FC<{ cam: ReefCam }> = ({ cam }) => {
  const { camera } = useThree(); const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos); c.fov = cam.fov; c.near = 0.02; c.far = 200; c.lookAt(new THREE.Vector3(...cam.target));
  if (cam.roll) c.rotateZ(cam.roll);
  c.updateProjectionMatrix(); return null;
};

const Scene: React.FC<{ s: ReefState }> = ({ s }) => {
  const L = layout();
  const { scene } = useThree();
  const night = s.night;
  const fogCol = new THREE.Color("#0b4f6e").lerp(new THREE.Color("#02070d"), night);
  scene.background = fogCol;
  scene.fog = new THREE.FogExp2(fogCol.getHex(), lerpN(0.075, 0.11, night));
  uniforms.uTime.value = s.time; uniforms.uCaustic.value = 1 - night;
  const mats = useMemo(() => ({
    coral: causticMat({ vertexColors: true, roughness: 0.85, metalness: 0 }),
    rock: causticMat({ vertexColors: true, roughness: 0.95 }),
    sand: causticMat({ vertexColors: true, roughness: 1 }),
  }), []);
  const dead = useMemo(() => causticMat({ color: "#6f6c63", roughness: 1 }), []);
  const live = s.health ?? 1;
  return (
    <>
      <CamRig cam={s.cam} />
      <hemisphereLight args={["#8fd0ec", "#2a3a34", lerpN(1.1, 0.04, night)]} />
      <directionalLight position={[2, 10, 3]} intensity={lerpN(1.6, 0, night)} color="#d6f2ff" />
      {night > 0 && <directionalLight position={[-3, 10, 1]} intensity={0.22 * (s.moonlight ?? 0) * night} color="#9fb6e8" />}
      {night > 0 && <ambientLight intensity={0.05 * night} color="#3a5a7a" />}
      {(s.torch ?? 0) > 0 && <Torch cam={s.cam} k={s.torch ?? 0} />}
      <mesh geometry={L.sand} material={mats.sand} />
      {L.rocks.map((rk, i) => <mesh key={i} geometry={rk.geo} position={rk.pos} material={mats.rock} />)}
      {L.colonies.map((c, i) => (
        <mesh key={i} geometry={c.geo} position={c.pos} rotation={[0, c.rot, 0]} scale={c.scale} material={c.deadOrder < live ? mats.coral : dead} />
      ))}
      <Snow s={s} />
      <Rays s={s} />
      <Fish s={s} />
      <Juveniles s={s} colonies={L.colonies} />
      <Bundles s={s} colonies={L.colonies} />
    </>
  );
};
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

const Torch: React.FC<{ cam: ReefCam; k: number }> = ({ cam, k }) => {
  const [l] = React.useState(() => { const sp = new THREE.SpotLight("#fff1dc", 1, 30, 0.55, 0.7, 1.4); return sp; });
  l.position.set(cam.pos[0] + 0.4, cam.pos[1] + 0.3, cam.pos[2]);
  l.target.position.set(...cam.target);
  l.intensity = 40 * k;
  return <><primitive object={l} /><primitive object={l.target} /></>;
};

export const Reef: React.FC<{ s: ReefState; res?: number }> = ({ s, res = 0.5 }) => {
  const vc = useVideoConfig();
  const width = Math.round(vc.width * res), height = Math.round(vc.height * res);
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", left: 0, top: 0, transform: `scale(${1 / res})`, transformOrigin: "0 0" }}>
      <Scene s={s} />
    </ThreeCanvas>
  );
};
