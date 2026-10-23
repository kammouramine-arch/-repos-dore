import React from "react";
import { F } from "../theme";
import { PH } from "../phone/Phone";
import { clamp, easeOut, ramp } from "../lib/anim";
import { INK } from "../rig/Person";

/**
 * THE LAST BUS HOME — his phone. Dark UI, one design for all three nights.
 * Screen space: x −350..350, y −750..750 (same as phone/Phone.tsx PhoneInHand).
 * Battery always matches the narration: 3% on Night 1, 1% on Night 2.
 */
const W = PH.sw, H = PH.sh;
const T: React.FC<{ x: number; y: number; s: number; children: React.ReactNode; c?: string; w?: number; a?: "start" | "middle" | "end"; mono?: boolean; ls?: number; o?: number }> = ({ x, y, s, children, c = "#eef1f5", w = 500, a = "middle", mono, ls = 0, o = 1 }) => (
  <text x={x} y={y} fill={c} fontFamily={mono ? F.mono : F.sans} fontWeight={w} fontSize={s} textAnchor={a} letterSpacing={ls} opacity={o}>{children}</text>
);

export const Battery: React.FC<{ pct: number; x?: number; y?: number; dark?: boolean; blink?: number }> = ({ pct, x = 214, y = -682, dark = true, blink = 1 }) => {
  const red = pct <= 5;
  const col = red ? "#ff453a" : dark ? "#f1f3f6" : "#111";
  return (
    <g transform={`translate(${x} ${y})`} opacity={blink}>
      <T x={-14} y={22} s={30} a="end" w={600} c={col}>{pct}%</T>
      <rect x={0} y={-2} width={66} height={32} rx={9} fill="none" stroke={dark ? "#c8ccd3" : "#111"} strokeWidth={4} />
      <rect x={68} y={8} width={6} height={12} rx={2} fill={dark ? "#c8ccd3" : "#111"} />
      <rect x={5} y={3} width={Math.max(4, 56 * pct / 100)} height={22} rx={4} fill={col} />
    </g>
  );
};

/** top status bar: time left, signal + battery right */
export const Status: React.FC<{ time?: string; pct: number; dark?: boolean; blink?: number }> = ({ time = "2:16", pct, dark = true, blink = 1 }) => (
  <g>
    <T x={-262} y={-660} s={34} a="start" w={650} c={dark ? "#f1f3f6" : "#111"}>{time}</T>
    {[0, 1, 2, 3].map((i) => <rect key={i} x={96 + i * 14} y={-664 - i * 7} width={9} height={10 + i * 7} rx={2} fill={i < 1 ? (dark ? "#f1f3f6" : "#111") : "#5b616b"} />)}
    <Battery pct={pct} blink={blink} dark={dark} />
  </g>
);

const Wall: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <g>
    <defs>
      <linearGradient id="lbWall" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#1b2335" />
        <stop offset="0.55" stopColor="#0f1420" />
        <stop offset="1" stopColor="#090b10" />
      </linearGradient>
      <radialGradient id="lbWallGlow" cx="0.3" cy="0.75" r="0.7">
        <stop offset="0" stopColor="#3a2f5a" stopOpacity={0.55} />
        <stop offset="1" stopColor="#3a2f5a" stopOpacity={0} />
      </radialGradient>
    </defs>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="url(#lbWall)" />
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="url(#lbWallGlow)" />
    {dim > 0 && <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#000" opacity={dim} />}
  </g>
);

export type Note = { app: string; title: string; body: string; when?: string; red?: boolean };

/** a notification card (lock screen or banner); body wraps, big and readable */
export const NoteCard: React.FC<{ n: Note; y?: number; appear?: number; scale?: number }> = ({ n, y = -60, appear = 1, scale = 1 }) => {
  const lines = wrapW(n.body, 20);
  const h = 128 + lines.length * 52;
  const a = easeOut(clamp(appear));
  return (
    <g transform={`translate(0 ${y + (1 - a) * -40}) scale(${scale})`} opacity={clamp(appear * 1.6)}>
      <rect x={-320} y={0} width={640} height={h} rx={38} fill="#1e2330" opacity={0.96} stroke={n.red ? "#ff453a" : "#2e3546"} strokeWidth={n.red ? 4 : 2} />
      <rect x={-288} y={28} width={44} height={44} rx={11} fill={n.red ? "#ff453a" : "#34c759"} />
      <path d="M-276 44 h20 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 h-12 l-8 6 v-6 a6 6 0 0 1 -6 -6 v-10 a6 6 0 0 1 6 -6 z" fill="#fff" />
      <T x={-228} y={60} s={24} a="start" w={600} c="#9aa3b2" mono ls={2}>{n.app}</T>
      <T x={290} y={60} s={24} a="end" w={400} c="#7b8494">{n.when ?? "now"}</T>
      <T x={-288} y={116} s={36} a="start" w={750} c="#ffffff">{n.title}</T>
      {lines.map((l, i) => <T key={i} x={-288} y={170 + i * 52} s={42} a="start" w={800} c={n.red ? "#ff6b61" : "#f4f6fa"}>{l}</T>)}
    </g>
  );
};

/** lock screen: 2:16, date, battery, optional notifications */
export const Lock: React.FC<{ pct: number; notes?: Array<{ n: Note; appear: number }>; time?: string; date?: string; dim?: number; blink?: number; clockGlitch?: number }> = ({ pct, notes = [], time = "2:16", date = "Sunday, 14 November", dim = 0, blink = 1, clockGlitch = 0 }) => (
  <g>
    <Wall />
    <Status time="" pct={pct} blink={blink} />
    <T x={0} y={-450} s={34} w={500} c="#c9d0db">{date}</T>
    <g transform={`translate(${clockGlitch * 8} 0)`}>
      <T x={0} y={-270} s={190} w={300}>{time}</T>
    </g>
    {notes.map((x, i) => <NoteCard key={i} n={x.n} appear={x.appear} y={-150 + i * 290} />)}
    {/* flashlight / camera shortcuts */}
    <circle cx={-230} cy={620} r={48} fill="#ffffff" opacity={0.12} />
    <circle cx={230} cy={620} r={48} fill="#ffffff" opacity={0.12} />
    <rect x={-110} y={712} width={220} height={9} rx={4.5} fill="#fff" opacity={0.6} />
    {dim > 0 && <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#000" opacity={dim} />}
  </g>
);

/** low battery alert over the lock screen */
export const LowBattery: React.FC<{ pct: number; appear: number }> = ({ pct, appear }) => {
  const a = easeOut(clamp(appear));
  return (
    <g opacity={clamp(appear * 2)}>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#000" opacity={0.45 * a} />
      <g transform={`scale(${0.9 + 0.1 * a})`}>
        <rect x={-270} y={-200} width={540} height={360} rx={40} fill="#262a33" />
        <T x={0} y={-118} s={40} w={700}>Low Battery</T>
        <T x={0} y={-54} s={34} w={400} c="#c4cad4">{pct}% battery remaining</T>
        <g transform="translate(-60 -10)">
          <rect x={0} y={0} width={110} height={52} rx={12} fill="none" stroke="#c4cad4" strokeWidth={5} />
          <rect x={112} y={16} width={9} height={20} rx={3} fill="#c4cad4" />
          <rect x={7} y={7} width={Math.max(6, 96 * pct / 100)} height={38} rx={6} fill="#ff453a" />
        </g>
        <line x1={-270} y1={78} x2={270} y2={78} stroke="#3a3f4a" strokeWidth={2} />
        <T x={0} y={132} s={36} w={600} c="#4ea1ff">Close</T>
      </g>
    </g>
  );
};

/** message thread (dark). `who` = contact header; `sub` small line under it */
export type Bubble = { text?: string; photo?: React.ReactNode; appear?: number; time?: string };
export const Thread: React.FC<{ who: string; sub?: string; pct: number; msgs: Bubble[]; big?: boolean; avatar?: "unknown" | "self" }> = ({ who, sub, pct, msgs, big = true, avatar = "unknown" }) => {
  let y = -330;
  return (
    <g>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#07080b" />
      <rect x={-W / 2} y={-H / 2} width={W} height={330} fill="#14161c" />
      <Status pct={pct} />
      <path d="M-300 -540 l-22 22 l22 22" stroke="#4ea1ff" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={0} cy={-560} r={58} fill={avatar === "self" ? "#3d4a63" : "#2b2f3a"} />
      {avatar === "unknown" ? <T x={0} y={-538} s={60} w={600} c="#8e96a6">?</T> : <SelfAvatar />}
      <T x={0} y={-466} s={32} w={650}>{who}</T>
      {sub && <T x={0} y={-430} s={22} w={500} c="#8e96a6" mono ls={2}>{sub}</T>}
      {msgs.map((m, i) => {
        const a = clamp(m.appear ?? 1);
        const fs = big ? 46 : 38;
        const lines = m.text ? wrapW(m.text, big ? 16 : 20) : [];
        const ph = m.photo ? 430 : 0;
        const h = (m.text ? 40 + lines.length * (fs + 10) : 0) + ph;
        const bw = m.photo ? 470 : Math.min(560, Math.max(...lines.map((l) => l.length)) * fs * 0.6 + 70);
        const by = y;
        y += h + 40;
        return (
          <g key={i} opacity={a} transform={`translate(0 ${(1 - a) * 24})`}>
            {m.time && <T x={0} y={by - 16} s={20} c="#6b7383" mono ls={2}>{m.time}</T>}
            <rect x={-310} y={by} width={bw} height={h} rx={36} fill="#22252e" />
            {m.photo && (
              <g>
                <defs><clipPath id={`ph${i}`}><rect x={-298} y={by + 12} width={bw - 24} height={ph - 24} rx={26} /></clipPath></defs>
                <g clipPath={`url(#ph${i})`}>
                  <g transform={`translate(${-298} ${by + 12})`}>{m.photo}</g>
                </g>
              </g>
            )}
            {lines.map((l, k) => <T key={k} x={-280} y={by + ph + 18 + (k + 1) * (fs + 10) - 6} s={fs} a="start" w={700} c="#f4f6fa">{l}</T>)}
          </g>
        );
      })}
      <rect x={-300} y={640} width={600} height={70} rx={35} fill="none" stroke="#2e333f" strokeWidth={3} />
      <T x={-262} y={686} s={28} a="start" c="#5b6372">Text Message</T>
    </g>
  );
};

/** his own contact picture: a tiny version of his messy hair silhouette */
export const SelfAvatar: React.FC<{ x?: number; y?: number; r?: number }> = ({ x = 0, y = -560, r = 58 }) => {
  const k = r / 128;
  return (
    <g transform={`translate(${x} ${y + 8}) scale(${k * 0.72})`}>
      <circle r={128} fill="#fff" stroke={INK} strokeWidth={6} />
      <path d="M-130 -20 C-136 -182 136 -182 130 -20 L118 -40 L94 -58 L76 -46 L36 -74 L12 -58 L-14 -80 L-40 -60 L-66 -76 L-92 -52 L-120 -44 Z" fill="#17130f" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <ellipse cx={-42} cy={-2} rx={11} ry={16} fill={INK} />
      <ellipse cx={42} cy={-2} rx={11} ry={16} fill={INK} />
      <path d="M-26 52 Q0 62 26 52" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
    </g>
  );
};

/** call screen: outgoing ("Calling…"), incoming (accept/decline), active (timer), ended */
export const Call: React.FC<{ t: number; name: string; state: "calling" | "incoming" | "active" | "ended"; pct: number; secs?: number; self?: boolean; press?: number }> = ({ t, name, state, pct, secs = 0, self, press = 0 }) => {
  const ring = state === "incoming" || state === "calling";
  return (
    <g>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#0b0d12" />
      <defs>
        <radialGradient id="callGlow" cx="0.5" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#24304a" stopOpacity={0.8} />
          <stop offset="1" stopColor="#0b0d12" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="url(#callGlow)" />
      <Status pct={pct} />
      <circle cx={0} cy={-330} r={120} fill={self ? "#3d4a63" : "#2b2f3a"} />
      {self ? <SelfAvatar y={-338} r={110} /> : <T x={0} y={-300} s={100} w={600} c="#cdd3dc">{name.slice(0, 1)}</T>}
      {ring && [0, 1].map((i) => <circle key={i} cx={0} cy={-330} r={140 + ((t * 120 + i * 60) % 120)} fill="none" stroke="#fff" strokeOpacity={0.16 * (1 - ((t * 120 + i * 60) % 120) / 120)} strokeWidth={4} />)}
      <T x={0} y={-120} s={66} w={650}>{name}</T>
      <T x={0} y={-64} s={32} w={400} c={state === "ended" ? "#ff6b61" : "#9aa3b2"}>
        {state === "calling" ? "calling…" : state === "incoming" ? "mobile" : state === "active" ? `0:${String(Math.floor(secs)).padStart(2, "0")}` : "Call Ended"}
      </T>
      {state === "incoming" && (
        <g>
          <circle cx={-190} cy={560} r={78} fill="#ff453a" />
          <path d="M-226 564 q36 -26 72 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" transform="rotate(180 -190 560)" />
          <circle cx={190} cy={560} r={78 * (1 - press * 0.08)} fill="#30d158" />
          <path d="M154 556 q36 26 72 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" />
          <T x={-190} y={676} s={26} c="#9aa3b2">Decline</T>
          <T x={190} y={676} s={26} c="#9aa3b2">Accept</T>
        </g>
      )}
      {(state === "calling" || state === "active") && (
        <g>
          {state === "active" && <g>{Array.from({ length: 24 }).map((_, i) => { const h = 8 + Math.abs(Math.sin(t * 9 + i * 0.9) * Math.sin(t * 3.1 + i)) * 60; return <rect key={i} x={-230 + i * 20} y={140 - h / 2} width={10} height={h} rx={5} fill="#9aa3b2" opacity={0.6} />; })}</g>}
          <circle cx={0} cy={560} r={78} fill="#ff453a" />
          <path d="M-36 564 q36 -26 72 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" transform="rotate(180 0 560)" />
        </g>
      )}
    </g>
  );
};

/** home security camera app: live feed (any node drawn in a 700×(feed) box) with LIVE badge + timestamp */
export const CamApp: React.FC<{ t: number; pct: number; feed: React.ReactNode; stamp: string; feedH?: number }> = ({ t, pct, feed, stamp, feedH = 1080 }) => (
  <g>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#050608" />
    <Status pct={pct} />
    <T x={-300} y={-560} s={34} a="start" w={700}>Home Cam</T>
    <T x={-300} y={-516} s={24} a="start" w={500} c="#8e96a6" mono ls={2}>KITCHEN</T>
    <defs><clipPath id="feedClip"><rect x={-W / 2} y={-460} width={W} height={feedH} /></clipPath></defs>
    <g clipPath="url(#feedClip)"><g transform={`translate(${-W / 2} -460)`}>{feed}</g></g>
    <g transform="translate(-320 -436)">
      <rect x={0} y={0} width={130} height={46} rx={10} fill="#000" opacity={0.6} />
      <circle cx={26} cy={23} r={10} fill="#ff453a" opacity={Math.sin(t * 5) > -0.3 ? 1 : 0.2} />
      <T x={46} y={33} s={26} a="start" w={700} mono>LIVE</T>
    </g>
    <T x={330} y={-404} s={24} a="end" w={500} mono c="#e6e9ee">{stamp}</T>
  </g>
);

export function wrapW(s: string, n: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if ((cur + " " + w).trim().length > n) { if (cur) out.push(cur.trim()); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

/** vibration: small screen-space jitter for the phone in hand, 0 when still */
export const buzz = (t: number, at: number, dur = 0.7) => (t >= at && t <= at + dur ? Math.sin(t * 95) * 7 * (1 - ramp(t, at + dur - 0.2, at + dur)) : 0);
