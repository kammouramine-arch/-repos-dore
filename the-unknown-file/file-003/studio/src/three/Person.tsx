import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { ThreeCanvas } from "@remotion/three";
import { continueRender, delayRender, staticFile, useVideoConfig } from "remotion";

/*
 * Reenactment figures: Quaternius "Universal Animation Library" mannequin (CC0) driven by its motion-captured clips
 * (Sprint_Loop, Walk_Loop, Driving_Loop, Sitting_Idle_Loop, Fixing_Kneeling, Hit_Head, Hit_Chest, Idle_Loop ...).
 * Rendered as an anonymous, storm-lit silhouette wearing a park-ranger campaign hat. Never a portrait of Roy Sullivan.
 * Screen-space placement: an orthographic camera maps 1 unit = 1 pixel, so figures sit exactly on photo plates.
 */
type Assets = { scene: THREE.Object3D; clips: THREE.AnimationClip[] };
let cache: Promise<Assets> | null = null;
function load(): Promise<Assets> {
  if (cache) return cache;
  cache = new Promise((res, rej) =>
    new GLTFLoader().load(staticFile("models/ual_mannequin.glb"), (g) => {
      // "clothe" the mannequin: inflate the skin a little along its normals so the silhouette loses muscle definition
      // and joint gaps (reads as shirt + trousers rather than a figure-drawing mannequin)
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o: any) => {
        if (!o.isSkinnedMesh) return;
        const geo = o.geometry as THREE.BufferGeometry;
        const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute;
        const ws = new THREE.Vector3(); o.getWorldScale(ws);
        const d = 0.022 / ws.x; // metres in world -> local units
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i) * ws.y; // approx height above floor in metres (rest pose)
          const k = y > 1.62 ? 0.25 : y < 0.1 ? 0.6 : 1; // keep the head and feet close to true size
          pos.setXYZ(i, pos.getX(i) + nor.getX(i) * d * k, pos.getY(i) + nor.getY(i) * d * k, pos.getZ(i) + nor.getZ(i) * d * k);
        }
        pos.needsUpdate = true;
      });
      res({ scene: g.scene, clips: g.animations });
    }, undefined, rej));
  return cache;
}

/** near-black material with a fresnel edge light (backlit silhouette: no surface anatomy, only a thin rim) */
function silhouetteMat(color: string, rim: { k: number; col: THREE.Color }) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimK = { value: rim.k };
    sh.uniforms.rimCol = { value: rim.col };
    m.userData.shader = sh;
    sh.fragmentShader = "uniform float rimK;\nuniform vec3 rimCol;\n" + sh.fragmentShader.replace(
      "#include <dithering_fragment>",
      "float fr = pow(1.0 - clamp(abs(dot(normal, vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 3.0);\ngl_FragColor.rgb += rimCol * fr * rimK;\n#include <dithering_fragment>");
  };
  return m;
}

export type PersonSpec = {
  anim: string;          // clip name
  time: number;          // seconds into the clip (loops for *_Loop clips)
  x: number; y: number;  // feet position, screen px
  h: number;             // standing height in px
  yaw?: number;          // degrees; 90 = facing screen-right, -90 = facing left, 0 = facing camera, 180 = away
  pitch?: number;        // camera tilt look (degrees, positive = seen from slightly above)
  blend?: { anim: string; time: number; w: number }; // optional second clip blended in
  rodBend?: number;      // fishing rod (attached to right hand) if defined
  hat?: boolean;
  color?: string;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
function makeHat() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: "#08090a" });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.012, 48), m);
  // crown with a "Montana pinch": a cone whose four sides are pushed in
  const cg = new THREE.CylinderGeometry(0.04, 0.098, 0.115, 48, 6);
  const p = cg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const pinch = 1 - 0.22 * Math.pow(Math.abs(Math.cos(2 * a)), 3) * clamp01(0.5 + y / 0.115);
    p.setXYZ(i, x * pinch, y, z * pinch);
  }
  cg.computeVertexNormals();
  const crown = new THREE.Mesh(cg, m);
  crown.position.y = 0.062;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.022, 48), new THREE.MeshBasicMaterial({ color: "#060606" }));
  band.position.y = 0.013;
  g.add(brim, crown, band);
  return g;
}

function makeRod() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: "#09090a" });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, 2.4, 8), m);
  rod.position.y = 1.2;
  g.add(rod);
  return g;
}

const PersonMesh: React.FC<{ a: Assets; s: PersonSpec; f: number; rim: number; W: number; H: number; ox: number; oy: number }> = ({ a, s, f, rim, W, H, ox, oy }) => {
  const obj = useMemo(() => {
    const o = skClone(a.scene) as THREE.Object3D;
    const mat = new THREE.MeshBasicMaterial({ color: s.color ?? "#07080a" });
    o.traverse((c: any) => { if (c.isMesh || c.isSkinnedMesh) { c.material = mat; c.frustumCulled = false; } });
    const head = o.getObjectByName("Head");
    if (s.hat !== false && head) {
      // bind pose: express "world up, 17 cm above the head joint" in the head bone's local space so the hat sits level
      o.updateMatrixWorld(true);
      const qh = new THREE.Quaternion(), ph = new THREE.Vector3(), sc = new THREE.Vector3();
      head.matrixWorld.decompose(ph, qh, sc);
      const qo = new THREE.Quaternion(); o.getWorldQuaternion(qo);
      const hat = makeHat();
      hat.name = "hat";
      hat.quaternion.copy(qh.clone().invert().multiply(qo));
      hat.position.copy(new THREE.Vector3(0, 0.155, 0.015).applyQuaternion(qh.clone().invert().multiply(qo)).divideScalar(sc.x));
      hat.scale.setScalar(1 / sc.x);
      hat.userData.fixed = true;
      head.add(hat);
    }
    // joint fillers: dark spheres on the skeleton close the gaps between the mannequin's segments
    {
      o.updateMatrixWorld(true);
      const jm = new THREE.MeshBasicMaterial({ color: s.color ?? "#07080a" });
      const J: [string, number][] = [["thigh_l", 0.095], ["thigh_r", 0.095], ["calf_l", 0.068], ["calf_r", 0.068], ["foot_l", 0.052], ["foot_r", 0.052],
        ["upperarm_l", 0.072], ["upperarm_r", 0.072], ["lowerarm_l", 0.055], ["lowerarm_r", 0.055], ["hand_l", 0.045], ["hand_r", 0.045],
        ["spine_01", 0.13], ["spine_02", 0.14], ["spine_03", 0.14], ["neck_01", 0.065], ["pelvis", 0.13], ["clavicle_l", 0.07], ["clavicle_r", 0.07]];
      for (const [bn, r] of J) {
        const b = o.getObjectByName(bn);
        if (!b) continue;
        const sc = new THREE.Vector3(); b.getWorldScale(sc);
        const sp = new THREE.Mesh(new THREE.SphereGeometry(r / sc.x, 16, 12), jm);
        sp.frustumCulled = false;
        b.add(sp);
      }
    }
    if (s.rodBend !== undefined) {
      const hand = o.getObjectByName("hand_r");
      if (hand) { const r = makeRod(); r.name = "rod"; hand.add(r); }
    }
    return o;
  }, [a, s.hat, s.rodBend !== undefined, s.color]);
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj]);
  // pose for this frame (deterministic: no clock, the mixer is set to an absolute time)
  mixer.stopAllAction();
  const clip = a.clips.find((c) => c.name === s.anim) ?? a.clips[0];
  const act = mixer.clipAction(clip);
  act.reset(); act.play(); act.setEffectiveWeight(s.blend ? 1 - s.blend.w : 1);
  const loopT = (c: THREE.AnimationClip, t: number) => (c.name.includes("Loop") ? ((t % c.duration) + c.duration) % c.duration : Math.min(t, c.duration - 1e-3));
  act.time = loopT(clip, s.time);
  if (s.blend) {
    const c2 = a.clips.find((c) => c.name === s.blend!.anim);
    if (c2) { const a2 = mixer.clipAction(c2); a2.reset(); a2.play(); a2.setEffectiveWeight(s.blend.w); a2.time = loopT(c2, s.blend.time); }
  }
  mixer.update(0);
  // hat: sit on the head bone (bone space is in the rig's local units)
  const rod = obj.getObjectByName("rod");
  if (rod) { const rr = (s as any).rodRot ?? [1.6, 0, 0]; rod.rotation.set(rr[0] - (s.rodBend ?? 0) * 0.25, rr[1], rr[2]); }
  const k = s.h / 1.83;
  obj.position.set(s.x - ox - W / 2, H / 2 - (s.y - oy), 0); // W,H here = canvas box size
  obj.scale.setScalar(k);
  obj.rotation.set(((s.pitch ?? 0) * Math.PI) / 180, ((s.yaw ?? 90) * Math.PI) / 180, 0);
  return (
    <>
      <primitive object={obj} />
      <hemisphereLight args={["#8c9bb3", "#0b0c0e", 0.12 + 0.22 * f]} />
      <directionalLight position={[-300, 600, 400]} intensity={0.08 + 0.35 * f} color="#dfe6ff" />
      <directionalLight position={[500, 300, -900]} intensity={rim} color="#cdd8ff" />
    </>
  );
};

/** one or more figures over the current frame; f = storm flash (0..1), rim = backlight strength */
export const People: React.FC<{ people: PersonSpec[]; f?: number; rim?: number; res?: number; blur?: number; opacity?: number }> = ({ people, f = 0, rim = 1.2, res = 0.7, blur = 0, opacity = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const [a, setA] = useState<Assets | null>(null);
  const [handle] = useState(() => delayRender("mannequin", { timeoutInMilliseconds: 120000 }));
  useEffect(() => { load().then((x) => { setA(x); continueRender(handle); }); }, [handle]);
  if (!a) return null;
  // render only the figures' bounding box (WebGL + the silhouette filter are the expensive parts of a frame)
  const bx0 = Math.max(0, Math.floor(Math.min(...people.map((p) => p.x - p.h * (p.rodBend !== undefined ? 1.4 : 0.8))))), bx1 = Math.min(W, Math.ceil(Math.max(...people.map((p) => p.x + p.h * (p.rodBend !== undefined ? 1.4 : 0.8)))));
  const by0 = Math.max(0, Math.floor(Math.min(...people.map((p) => p.y - p.h * (p.rodBend !== undefined ? 1.6 : 1.25))))), by1 = Math.min(H, Math.ceil(Math.max(...people.map((p) => p.y + p.h * 0.15))));
  const BW = Math.max(2, bx1 - bx0), BH = Math.max(2, by1 - by0);
  const w = Math.round(BW * res), h = Math.round(BH * res);
  const u = Math.min(W, H) / 1080;
  const ra = Math.min(1, 0.12 + 0.18 * rim + 0.55 * f);
  const rimF = `drop-shadow(${-1.6 * u}px ${-1.2 * u}px ${1.2 * u}px rgba(205,215,255,${ra}))${f > 0.05 ? ` drop-shadow(0 0 ${8 * u}px rgba(190,205,255,${(0.4 * f).toFixed(3)}))` : ""}`;
  return (
    <>
    <ThreeCanvas width={w} height={h} orthographic camera={{ zoom: res, position: [0, 0, 3000], near: 1, far: 8000 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", left: bx0, top: by0, transform: `scale(${1 / res})`, transformOrigin: "0 0", filter: `${rimF}${blur ? ` blur(${blur}px)` : ""}`, opacity }}>
      {people.map((p, i) => <PersonMesh key={i} a={a} s={p} f={f} rim={rim} W={BW} H={BH} ox={bx0} oy={by0} />)}
    </ThreeCanvas>
    </>
  );
};
