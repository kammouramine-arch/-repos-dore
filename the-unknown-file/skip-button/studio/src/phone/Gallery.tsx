import React from "react";
import { F } from "../theme";
import { Person, KID, KID_OLDER, MOM, MOM_OLDER, DAD, DAD_OLD, Look } from "../rig/Person";
import { stand } from "../rig/poses";
import { EXTRAS } from "../scenes/cast";
import { EXPR } from "../rig/Face";
import { PH } from "./Phone";

/**
 * Photo gallery: every photo is a small illustrated moment drawn with the same rig (his friends,
 * his parents, places), so the people in the photos are recognisably the film's characters.
 */
export type PhotoKind = "birthday" | "friends" | "beach" | "wedding" | "baby" | "dad" | "mom" | "dinner" | "city" | "mountain" | "concert" | "momdad" | "apartment" | "moving";
export type Photo = { kind: PhotoKind; date: string; older?: number; dim?: number };

const Sky: React.FC<{ a: string; b: string; id: string }> = ({ a, b, id }) => (
  <>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
    <rect x={-2000} y={-2600} width={4000} height={2600} fill={`url(#${id})`} />
  </>
);

/** One photo, drawn in a 1600×1600 "world" box centred on x=0, ground at y=0 (top y=-1500). */
export const PhotoArt: React.FC<{ p: Photo; id: string }> = ({ p, id }) => {
  const me = (p.older ?? 0) > 0.5 ? KID_OLDER : KID;
  const fig = (look: Look, x: number, yaw: number, expr: keyof typeof EXPR = "happy", extra = {}) => <Person pose={{ ...stand(yaw, { x, expr: EXPR[expr], blink: 0 }), ...extra }} look={look} t={0} shadow={0.2} />;
  switch (p.kind) {
    case "birthday":
      return (
        <g>
          <rect x={-2000} y={-2600} width={4000} height={2600} fill="#c79a6c" />
          {[-500, -150, 250, 600].map((x, i) => <circle key={i} cx={x} cy={-1250 + (i % 2) * 80} r={70} fill={["#b0414a", "#e0b06a", "#5c7189", "#7fae6a"][i]} />)}
          {fig(EXTRAS.friendB, -420, 20)}
          {fig(me, 380, -20, "excited")}
          <path d="M380 -1260 L340 -1140 L420 -1140 Z" fill="#b0414a" stroke="#14161a" strokeWidth={6} />
          <rect x={-170} y={-560} width={340} height={200} rx={20} fill="#f4f1ea" stroke="#14161a" strokeWidth={6} />
          {[-90, 0, 90].map((x, i) => <g key={i}><rect x={x - 8} y={-650} width={16} height={90} fill="#5c7189" /><ellipse cx={x} cy={-670} rx={12} ry={22} fill="#ffcf6a" /></g>)}
        </g>
      );
    case "friends":
      return (
        <g>
          <Sky a="#8fb0cf" b="#e9eef2" id={id + "s"} />
          <rect x={-2000} y={0} width={4000} height={400} fill="#7a7470" />
          {fig(EXTRAS.friendA, -520, 15)}
          {fig(me, 0, 0, "happy")}
          {fig(EXTRAS.friendC, 520, -15)}
        </g>
      );
    case "beach":
      return (
        <g>
          <Sky a="#7fb2d9" b="#f3e4c4" id={id + "s"} />
          <rect x={-2000} y={-500} width={4000} height={500} fill="#3f86a8" />
          <rect x={-2000} y={-60} width={4000} height={460} fill="#e8d4a8" />
          <circle cx={550} cy={-1250} r={140} fill="#ffe2a0" />
          {fig(me, -280, 10, "excited")}
          {fig(EXTRAS.friendA, 300, -10)}
        </g>
      );
    case "wedding":
      return (
        <g>
          <rect x={-2000} y={-2600} width={4000} height={2600} fill="#dcd2c4" />
          <path d="M-700 -1500 Q0 -1900 700 -1500" stroke="#f4f1ea" strokeWidth={60} fill="none" />
          {fig({ ...EXTRAS.friendB, shirt: "#f4f1ea", shirtShade: "#e2ddd3", bottoms: "skirt", bottomColor: "#f4f1ea" }, -250, 15)}
          {fig({ ...EXTRAS.friendA, shirt: "#2b2d33", shirtShade: "#24262b" }, 250, -15)}
        </g>
      );
    case "baby":
      return (
        <g>
          <rect x={-2000} y={-2600} width={4000} height={2600} fill="#c9b8a4" />
          {fig(EXTRAS.friendC, -150, 20, "warm", { R: { at: [30, -730], kind: "cup", front: true }, L: { at: [-60, -710], kind: "cup", front: true } })}
          <ellipse cx={40} cy={-760} rx={110} ry={70} fill="#f4f1ea" stroke="#14161a" strokeWidth={6} />
          <circle cx={110} cy={-790} r={50} fill="#fff" stroke="#14161a" strokeWidth={6} />
        </g>
      );
    case "moving":
      return (
        <g>
          <Sky a="#a9c1d6" b="#eef2f5" id={id + "s"} />
          <rect x={-2000} y={0} width={4000} height={400} fill="#6f6560" />
          <rect x={-1100} y={-900} width={1000} height={760} rx={30} fill="#e8e3d8" stroke="#14161a" strokeWidth={6} />
          <rect x={-100} y={-640} width={420} height={500} rx={30} fill="#d8cdb8" stroke="#14161a" strokeWidth={6} />
          <circle cx={-850} cy={-90} r={90} fill="#2b2b2b" /><circle cx={150} cy={-90} r={90} fill="#2b2b2b" />
          {fig(EXTRAS.friendB, 650, -30, "warm", { R: { at: [700, -1090], kind: "open", overHead: false } })}
        </g>
      );
    case "dad":
    case "mom":
    case "momdad": {
      const o = p.older ?? 0;
      return (
        <g>
          <rect x={-2000} y={-2600} width={4000} height={2600} fill={p.kind === "mom" ? "#c7a58a" : "#a9a08f"} />
          <rect x={-2000} y={-560} width={4000} height={560} fill="#8a6440" opacity={0.5} />
          {p.kind !== "mom" && fig(o > 0.5 ? DAD_OLD : DAD, p.kind === "momdad" ? 300 : 0, -10, "warm", { stoop: o * 10 })}
          {p.kind !== "dad" && fig(o > 0.5 ? MOM_OLDER : MOM, p.kind === "momdad" ? -300 : 0, 10, "warm")}
        </g>
      );
    }
    case "dinner":
      return (
        <g>
          <rect x={-2000} y={-2600} width={4000} height={2600} fill="#c99a6b" />
          <ellipse cx={0} cy={-1400} rx={700} ry={500} fill="#ffcf8a" opacity={0.35} />
          {fig((p.older ?? 0) > 0.5 ? MOM_OLDER : MOM, 0, 0, "happy")}
          <rect x={-900} y={-500} width={1800} height={44} rx={10} fill="#8a6440" />
          {[-500, 0, 500].map((x, i) => <ellipse key={i} cx={x} cy={-510} rx={150} ry={22} fill="#f4f1ea" />)}
          <ellipse cx={0} cy={-540} rx={170} ry={55} fill="#c98f4f" />
        </g>
      );
    case "city":
      return (
        <g>
          <Sky a="#2a2f55" b="#e59a74" id={id + "s"} />
          {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-1600 + i * 360} y={-600 - ((i * 337) % 900)} width={320} height={600 + ((i * 337) % 900)} fill="#3b3550" />)}
          {fig(me, 0, 30, "smirk")}
        </g>
      );
    case "mountain":
      return (
        <g>
          <Sky a="#7fa6c9" b="#e6eef2" id={id + "s"} />
          <path d="M-2000 -300 L-900 -1400 L-200 -600 L500 -1600 L2000 -300 Z" fill="#6f7f8f" />
          <path d="M500 -1600 L330 -1380 L680 -1380 Z" fill="#fff" />
          <rect x={-2000} y={-300} width={4000} height={800} fill="#5d7a4a" />
          {fig(me, -300, 20, "happy")}
        </g>
      );
    case "concert":
      return (
        <g>
          <rect x={-2000} y={-2600} width={4000} height={2600} fill="#141824" />
          {[-700, 0, 700].map((x, i) => <path key={i} d={`M${x} -2000 L${x - 300} 0 L${x + 300} 0 Z`} fill={["#b0414a", "#5c7189", "#e0b06a"][i]} opacity={0.25} />)}
          {[-900, -450, 0, 450, 900].map((x, i) => <g key={i} transform={`translate(${x} 300)`}><circle cy={-900} r={130} fill="#0b0d12" /><rect x={-120} y={-780} width={240} height={500} rx={60} fill="#0b0d12" /></g>)}
        </g>
      );
    case "apartment":
      return (
        <g>
          <rect x={-2000} y={-2600} width={4000} height={2600} fill="#cfc4b4" />
          <rect x={-900} y={-1500} width={700} height={800} fill="#9fbfd6" stroke="#efe8dc" strokeWidth={40} />
          {[200, 520].map((x, i) => <rect key={i} x={x} y={-700 - i * 200} width={260} height={700 + i * 200} fill="#c9a77c" stroke="#14161a" strokeWidth={6} />)}
        </g>
      );
  }
};

/** A photo tile (rounded square) at screen coords. */
export const PhotoTile: React.FC<{ p: Photo; x: number; y: number; s: number; id: string; hi?: number }> = ({ p, x, y, s, id, hi = 0 }) => (
  <g>
    <svg x={x} y={y} width={s} height={s} viewBox="-800 -1500 1600 1600" preserveAspectRatio="xMidYMid slice">
      <PhotoArt p={p} id={id} />
    </svg>
    {p.dim ? <rect x={x} y={y} width={s} height={s} fill="#000" opacity={p.dim} /> : null}
    {hi > 0 && <rect x={x - 4} y={y - 4} width={s + 8} height={s + 8} fill="none" stroke="#fff" strokeWidth={8 * hi} />}
  </g>
);

/** Grid screen: month headers + 3-column tiles; `scroll` in screen units. */
export const GalleryScreen: React.FC<{ sections: Array<{ title: string; photos: Photo[] }>; scroll: number; hi?: [number, number, number] }> = ({ sections, scroll, hi }) => {
  const W = PH.sw, s = (W - 16) / 3;
  let y = -560 - scroll;
  return (
    <g>
      <rect x={-W / 2} y={-PH.sh / 2} width={W} height={PH.sh} fill="#0f1115" />
      {sections.map((sec, si) => {
        const top = y;
        y += 80;
        const rows = Math.ceil(sec.photos.length / 3);
        const tiles = sec.photos.map((p, i) => {
          const tx = -W / 2 + (i % 3) * (s + 8), ty = y + Math.floor(i / 3) * (s + 8);
          if (ty > PH.sh / 2 + 20 || ty + s < -PH.sh / 2 - 20) return null;
          return <PhotoTile key={i} p={p} x={tx} y={ty} s={s} id={`ph${si}_${i}`} hi={hi && hi[0] === si && hi[1] === i ? hi[2] : 0} />;
        });
        y += rows * (s + 8) + 40;
        return (
          <g key={si}>
            <text x={-W / 2 + 24} y={top + 56} fill="#e9edf3" fontFamily={F.sans} fontWeight={800} fontSize={40}>{sec.title}</text>
            {tiles}
          </g>
        );
      })}
      <rect x={-W / 2} y={-PH.sh / 2} width={W} height={150} fill="#0f1115" opacity={0.92} />
      <text x={-W / 2 + 24} y={-PH.sh / 2 + 118} fill="#fff" fontFamily={F.sans} fontWeight={800} fontSize={52}>Photos</text>
    </g>
  );
};

/** Total content height of a gallery (for scroll ranges). */
export const galleryHeight = (sections: Array<{ photos: Photo[] }>) => {
  const s = (PH.sw - 16) / 3;
  return sections.reduce((h, sec) => h + 80 + Math.ceil(sec.photos.length / 3) * (s + 8) + 40, 0);
};

/** Large single photo (full-screen viewer) with date line. */
export const PhotoViewer: React.FC<{ p: Photo; id: string }> = ({ p, id }) => (
  <g>
    <rect x={-PH.sw / 2} y={-PH.sh / 2} width={PH.sw} height={PH.sh} fill="#000" />
    <PhotoTile p={p} x={-PH.sw / 2} y={-PH.sw / 2} s={PH.sw} id={id} />
    <text x={0} y={-PH.sw / 2 - 40} fill="#e9edf3" fontFamily={F.mono} fontSize={32} textAnchor="middle" letterSpacing={3}>{p.date}</text>
  </g>
);
