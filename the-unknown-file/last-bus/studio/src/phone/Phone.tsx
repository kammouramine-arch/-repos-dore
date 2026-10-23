import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { F } from "../theme";
import { ik2, V } from "../rig/math";
import { clamp, easeInOut, easeOut, ramp } from "../lib/anim";

/**
 * Phone close-ups (his point of view). The phone is held in his RIGHT hand: fingertips wrap the
 * left edge, the palm sits behind the lower-right corner and the thumb reaches over the screen.
 * The thumb is a two-segment IK chain with fixed lengths anchored at the palm, so it can only
 * reach where a real thumb could, and a "press" makes its pad land exactly on the button centre.
 * Phone space: phone centred at 0,0, 760 × 1560.
 */
export const PH = { w: 760, h: 1560, r: 104, sw: 700, sh: 1500, sr: 74 };
const INK = "#14161a";
const LINE = 11;

export type ThumbState = { target: V; press: number } | null;

/** The right thumb, solved from the palm. Returns the drawing and the tip position. */
const Thumb: React.FC<{ tip: V }> = ({ tip }) => {
  const base: V = [420, 690];
  const s = ik2(base, tip, 330, 290, [1, 0.7], 0);
  const d = `M${base[0]} ${base[1]} L${s.mid[0]} ${s.mid[1]} L${s.end[0]} ${s.end[1]}`;
  // thumbnail-free cartoon tip: slightly wider pad at the end
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth={112 + LINE * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke="#fff" strokeWidth={112} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* knuckle crease */}
      <path d={`M${s.mid[0] - 30} ${s.mid[1] + 34} q24 -14 52 -4`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.6} />
    </g>
  );
};

/** Rest position of the thumb tip: at the right edge of the screen, lower third. */
export const THUMB_REST: V = [300, 330];

export const PhoneInHand: React.FC<{ screen: React.ReactNode; thumb?: V | null; pressed?: boolean; tilt?: number; dip?: number; glow?: number }> = ({ screen, thumb = THUMB_REST, pressed = false, tilt = 0, dip = 0, glow = 0.5 }) => {
  return (
    <g transform={`rotate(${tilt}) translate(0 ${dip})`}>
      {/* screen light spilling onto the hand */}
      <defs>
        <radialGradient id="screenSpill">
          <stop offset="0" stopColor="#bcd6ff" stopOpacity={0.35 * glow} />
          <stop offset="1" stopColor="#bcd6ff" stopOpacity={0} />
        </radialGradient>
        <clipPath id="screenClip">
          <rect x={-PH.sw / 2} y={-PH.sh / 2} width={PH.sw} height={PH.sh} rx={PH.sr} />
        </clipPath>
      </defs>
      <ellipse cx={0} cy={0} rx={1300} ry={1500} fill="url(#screenSpill)" />
      {/* palm behind the lower-right corner (heel of the hand), wrist leaving frame bottom-right */}
      <path d="M210 520 C330 430 520 470 600 600 C690 760 720 980 760 1400 L300 1400 C300 1200 230 1000 190 820 C170 720 160 600 210 520 Z" fill="#fff" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      {/* phone body */}
      <rect x={-PH.w / 2} y={-PH.h / 2} width={PH.w} height={PH.h} rx={PH.r} fill="#15181e" stroke={INK} strokeWidth={LINE} />
      <rect x={-PH.w / 2 + 6} y={-PH.h / 2 + 6} width={PH.w - 12} height={PH.h - 12} rx={PH.r - 6} fill="none" stroke="#3a404c" strokeWidth={6} />
      <g clipPath="url(#screenClip)">{screen}</g>
      {/* speaker + camera notch */}
      <rect x={-70} y={-PH.sh / 2 + 22} width={140} height={34} rx={17} fill="#05070a" />
      {/* fingertips of the right hand wrapping the LEFT edge (index on top … little finger at the bottom) */}
      {[[150, 92], [300, 96], [440, 90], [565, 78]].map(([y, h], i) => (
        <g key={i}>
          <path d={`M${-PH.w / 2 + 24} ${y - h / 2} C${-PH.w / 2 - 70} ${y - h / 2} ${-PH.w / 2 - 70} ${y + h / 2} ${-PH.w / 2 + 24} ${y + h / 2}`} fill="#fff" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        </g>
      ))}
      {thumb && <Thumb tip={thumb} />}
      {pressed && <circle cx={thumb ? thumb[0] : 0} cy={thumb ? thumb[1] : 0} r={0} />}
    </g>
  );
};

/** Full-frame insert: blurred world behind, phone in hand, gentle handheld drift. */
export const PhoneInsert: React.FC<{ t: number; bg?: React.ReactNode; screen: React.ReactNode; thumb?: V | null; zoom?: number; tilt?: number; dip?: number; offset?: V; vignette?: number; glow?: number; bgBlur?: number }> = ({ t, bg, screen, thumb, zoom = 1, tilt = -4, dip = 0, offset = [0, 0], vignette = 0.6, glow = 0.6, bgBlur = 26 }) => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  // phone height fills ~78% of a vertical frame / ~92% of a horizontal frame
  const base = (vertical ? height * 0.74 : height * 0.92) / PH.h;
  const sc = base * zoom;
  const driftX = Math.sin(t * 0.9) * 6 + Math.sin(t * 2.1) * 2, driftY = Math.cos(t * 0.7) * 6;
  return (
    <AbsoluteFill style={{ background: "#07090c" }}>
      {bg && <AbsoluteFill style={{ filter: `blur(${bgBlur * (width / 1920)}px) brightness(0.55) saturate(0.8)`, transform: "scale(1.08)" }}>{bg}</AbsoluteFill>}
      <svg width={width} height={height} viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${offset[0] * width + driftX} ${offset[1] * height + driftY + (vertical ? height * 0.04 : height * 0.03)}) scale(${sc})`}>
          <PhoneInHand screen={screen} thumb={thumb} tilt={tilt} dip={dip} glow={glow} />
        </g>
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 65% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)` }} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------------------------- *
 * Screen content (drawn in screen space: x −350..350, y −750..750)
 * ------------------------------------------------------------------------------------------- */
const W = PH.sw, H = PH.sh;
export const SKIP_BTN: V = [0, 380];
/** Where the thumb pad lands: the ⏭ glyph at the right end of the button (letters stay readable). */
export const padOn = (btn: V, scale = 1): V => [btn[0] + 125 * scale, btn[1] + 4];
export const PLAY_BTN: V = [-170, 400];
export const SKIP2_BTN: V = [170, 400];

const Txt: React.FC<{ x: number; y: number; s: number; children: React.ReactNode; c?: string; w?: number; a?: "start" | "middle" | "end"; mono?: boolean; ls?: number; o?: number; serif?: boolean }> = ({ x, y, s, children, c = "#f1f3f6", w = 500, a = "middle", mono, ls = 0, o = 1, serif }) => (
  <text x={x} y={y} fill={c} fontFamily={mono ? F.mono : serif ? F.serif : F.sans} fontWeight={w} fontSize={s} textAnchor={a} letterSpacing={ls} opacity={o}>{children}</text>
);

/** The SKIP button: small black pill, four white letters + skip glyph. */
export const SkipButton: React.FC<{ at?: V; scale?: number; pressed?: number; appear?: number; label?: string; glow?: number; tone?: "dark" | "light" }> = ({ at = SKIP_BTN, scale = 1, pressed = 0, appear = 1, label = "SKIP", glow = 0.6, tone = "dark" }) => {
  const k = scale * (1 - pressed * 0.06);
  const letters = label.split("");
  const isPlay = label === "PLAY";
  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${k})`} opacity={clamp(appear * 1.4)}>
      <rect x={-200} y={-80} width={400} height={160} rx={80} fill="none" stroke="#dfe8ff" strokeOpacity={0.25 * glow + pressed * 0.5} strokeWidth={18 + pressed * 10} />
      <rect x={-188} y={-68} width={376} height={136} rx={68} fill={tone === "dark" ? "#050608" : "#f2f4f7"} stroke={tone === "dark" ? "#2c313b" : "#c9ced6"} strokeWidth={4} />
      {letters.map((ch, i) => (
        <text key={i} x={-70 + i * 44 - (isPlay ? 0 : 0)} y={22} fill={tone === "dark" ? "#ffffff" : "#0b0d10"} fontFamily={F.sans} fontWeight={800} fontSize={62} textAnchor="middle" opacity={clamp(appear * letters.length - i)}>{ch}</text>
      ))}
      {isPlay ? (
        <path d="M108 -26 L150 0 L108 26 Z" fill={tone === "dark" ? "#fff" : "#0b0d10"} opacity={clamp(appear * 2 - 1)} />
      ) : (
        <g fill={tone === "dark" ? "#fff" : "#0b0d10"} opacity={clamp(appear * 2 - 1)}>
          <path d="M100 -24 L128 0 L100 24 Z" />
          <path d="M126 -24 L154 0 L126 24 Z" />
          <rect x={154} y={-24} width={8} height={48} />
        </g>
      )}
      {pressed > 0.5 && <circle r={230} fill="none" stroke="#ffffff" strokeOpacity={(1 - pressed) * 0.6 + 0.15} strokeWidth={6} />}
    </g>
  );
};

/** Dark app background with subtle radial light. */
export const AppBg: React.FC<{ tone?: string }> = ({ tone = "#0d1015" }) => (
  <g>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={tone} />
    <defs>
      <radialGradient id="appGlow" cx="0.5" cy="0.62" r="0.6">
        <stop offset="0" stopColor="#2a3550" stopOpacity={0.55} />
        <stop offset="1" stopColor="#0d1015" stopOpacity={0} />
      </radialGradient>
    </defs>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="url(#appGlow)" />
  </g>
);

export const StatusBar: React.FC<{ time: string; dark?: boolean }> = ({ time, dark = true }) => (
  <g>
    <Txt x={-270} y={-660} s={34} a="start" w={600} c={dark ? "#f1f3f6" : "#111"}>{time}</Txt>
    <rect x={200} y={-686} width={64} height={30} rx={8} fill="none" stroke={dark ? "#f1f3f6" : "#111"} strokeWidth={4} />
    <rect x={206} y={-680} width={44} height={18} rx={4} fill={dark ? "#f1f3f6" : "#111"} />
  </g>
);

/** Lock screen: big time + date + optional notification card. */
export const LockScreen: React.FC<{ time: string; date: string; note?: { app: string; title: string; body: string }; noteIn?: number; wall?: [string, string]; dim?: number }> = ({ time, date, note, noteIn = 1, wall = ["#28324a", "#141a28"], dim = 0 }) => (
  <g>
    <defs>
      <linearGradient id="lockWall" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor={wall[0]} />
        <stop offset="1" stopColor={wall[1]} />
      </linearGradient>
    </defs>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="url(#lockWall)" />
    <Txt x={0} y={-430} s={34} w={500} c="#dfe5ee">{date}</Txt>
    <Txt x={0} y={-270} s={170} w={300}>{time}</Txt>
    {note && (
      <g transform={`translate(0 ${-60 + (1 - easeOut(clamp(noteIn))) * 60})`} opacity={clamp(noteIn * 1.5)}>
        <rect x={-310} y={-80} width={620} height={170} rx={34} fill="#e9edf3" opacity={0.92} />
        <Txt x={-270} y={-30} s={24} a="start" w={600} c="#59606b" mono ls={2}>{note.app}</Txt>
        <Txt x={-270} y={14} s={34} a="start" w={700} c="#111">{note.title}</Txt>
        <Txt x={-270} y={58} s={30} a="start" w={400} c="#2a2e35">{note.body}</Txt>
      </g>
    )}
    {dim > 0 && <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#000" opacity={dim} />}
  </g>
);

/** Small round avatar with a rig-style face (no photo of a real person). */
export const Avatar: React.FC<{ x: number; y: number; r: number; hair?: "mom" | "momGray" | "dad" | "kid" | "aunt"; bg?: string }> = ({ x, y, r, hair = "mom", bg = "#8a4b4f" }) => {
  const k = r / 128;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * 1.18} fill={bg} />
      <g transform={`scale(${k * 0.78}) translate(0 20)`}>
        {(hair === "mom" || hair === "momGray" || hair === "aunt") && <path d="M-138 -10 C-160 -180 160 -180 138 -10 C142 50 132 92 110 110 L-110 110 C-132 92 -142 50 -138 -10 Z" fill={hair === "momGray" ? "#b9b4ae" : hair === "aunt" ? "#6b4a3a" : "#4a3a33"} stroke={INK} strokeWidth={5} />}
        <circle r={128} fill="#fff" stroke={INK} strokeWidth={5} />
        {(hair === "mom" || hair === "momGray" || hair === "aunt") && <path d="M-132 -2 C-136 -178 136 -178 132 -2 C102 -58 34 -74 -6 -62 C-46 -84 -104 -56 -132 -2 Z" fill={hair === "momGray" ? "#b9b4ae" : hair === "aunt" ? "#6b4a3a" : "#4a3a33"} stroke={INK} strokeWidth={5} />}
        {hair === "kid" && [[-34, -122, -76, -164], [-12, -126, -30, -200], [10, -125, 2, -186]].map(([x1, y1, x2, y2], i) => <path key={i} d={`M${x1} ${y1} Q${x1 - 6} ${(y1 + y2) / 2} ${x2} ${y2}`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />)}
        <ellipse cx={-42} cy={-4} rx={11} ry={16} fill={INK} />
        <ellipse cx={42} cy={-4} rx={11} ry={16} fill={INK} />
        <path d="M-28 50 Q0 70 28 50" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
};

/** Incoming call screen with the SKIP button floating above decline/accept. */
export const CallScreen: React.FC<{ t: number; name: string; sub?: string; hair?: "mom" | "dad"; skip?: number; pressed?: number; state?: "incoming" | "calling" | "noanswer" | "out" }> = ({ t, name, sub = "mobile", hair = "mom", skip = 1, pressed = 0, state = "incoming" }) => {
  const ring = state === "incoming" || state === "calling" ? (Math.sin(t * 7) > 0 ? 1 : 0.7) : 0;
  return (
    <g>
      <AppBg tone="#141922" />
      <StatusBar time="" />
      <Avatar x={0} y={-330} r={110} hair={hair} />
      {ring > 0 && [0, 1].map((i) => <circle key={i} cx={0} cy={-330} r={140 + ((t * 120 + i * 60) % 120)} fill="none" stroke="#fff" strokeOpacity={0.18 * (1 - ((t * 120 + i * 60) % 120) / 120)} strokeWidth={4} />)}
      <Txt x={0} y={-130} s={70} w={600}>{name}</Txt>
      <Txt x={0} y={-74} s={32} w={400} c={state === "noanswer" || state === "out" ? "#ff8a80" : "#aab3c0"}>
        {state === "incoming" ? sub : state === "calling" ? "calling…" : state === "noanswer" ? "No answer" : "This number is no longer in service"}
      </Txt>
      {state === "incoming" && (
        <g>
          <circle cx={-190} cy={600} r={74} fill="#e5483f" />
          <path d="M-226 604 q36 -26 72 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" transform="rotate(180 -190 600)" />
          <circle cx={190} cy={600} r={74} fill="#35c25a" />
          <path d="M154 596 q36 26 72 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" />
          <Txt x={-190} y={710} s={26} c="#aab3c0">Decline</Txt>
          <Txt x={190} y={710} s={26} c="#aab3c0">Accept</Txt>
          {skip > 0 && <SkipButton at={SKIP_BTN} appear={skip} pressed={pressed} scale={0.9} />}
        </g>
      )}
      {(state === "calling" || state === "noanswer" || state === "out") && (
        <g>
          <circle cx={0} cy={600} r={74} fill="#e5483f" opacity={state === "calling" ? 1 : 0.4} />
          <path d="M-36 604 q36 -26 72 0" stroke="#fff" strokeWidth={14} fill="none" strokeLinecap="round" transform="rotate(180 0 600)" opacity={state === "calling" ? 1 : 0.4} />
        </g>
      )}
    </g>
  );
};

export type Msg = { from: "them" | "me"; text: string; time?: string; highlight?: number; appear?: number };

/** Message thread with a date header and bubbles (their messages on the left). */
export const MessageScreen: React.FC<{ name: string; hair?: "mom" | "aunt"; date: string; msgs: Msg[]; scroll?: number; unanswered?: boolean }> = ({ name, hair = "mom", date, msgs, scroll = 0, unanswered }) => {
  let y = -300 - scroll;
  return (
    <g>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#f2f2f5" />
      <rect x={-W / 2} y={-H / 2} width={W} height={300} fill="#e7e8ec" />
      <Avatar x={0} y={-560} r={56} hair={hair === "aunt" ? "aunt" : "mom"} bg={hair === "aunt" ? "#5c7189" : "#8a4b4f"} />
      <Txt x={0} y={-460} s={34} w={600} c="#111">{name}</Txt>
      <Txt x={0} y={y - 40} s={24} c="#8a8f98" mono ls={2}>{date}</Txt>
      {msgs.map((m, i) => {
        const lines = wrap(m.text, 22);
        const h = 34 + lines.length * 44;
        const by = y;
        y += h + 34;
        const left = m.from === "them";
        const bw = Math.min(520, Math.max(...lines.map((l) => l.length)) * 21 + 60);
        const bx = left ? -300 : 300 - bw;
        const a = clamp(m.appear ?? 1);
        return (
          <g key={i} opacity={a} transform={`translate(0 ${(1 - a) * 20})`}>
            <rect x={bx} y={by} width={bw} height={h} rx={34} fill={left ? "#e2e3e8" : "#3478f6"} stroke={m.highlight ? "#b0414a" : "none"} strokeWidth={m.highlight ? 6 * m.highlight : 0} />
            {lines.map((l, k) => <Txt key={k} x={bx + 30} y={by + 56 + k * 44} s={34} a="start" w={400} c={left ? "#111" : "#fff"}>{l}</Txt>)}
            {m.time && <Txt x={left ? bx + 4 : bx + bw - 4} y={by + h + 26} s={20} a={left ? "start" : "end"} c="#8a8f98" mono>{m.time}</Txt>}
          </g>
        );
      })}
      {unanswered && <Txt x={0} y={Math.min(y + 30, 700)} s={22} c="#8a8f98" mono ls={2}>NO REPLY</Txt>}
    </g>
  );
};

export const wrap = (s: string, n: number) => {
  const words = s.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > n) {
      out.push(cur.trim());
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out;
};

/** The app screen used near the end: only SKIP and PLAY. Optional search box for "rewind". */
export const SkipPlayScreen: React.FC<{ appear?: number; pressPlay?: number; pressSkip?: number; search?: string; searchResult?: number; playOnly?: boolean }> = ({ appear = 1, pressPlay = 0, pressSkip = 0, search, searchResult = 0 }) => (
  <g>
    <AppBg />
    {search !== undefined && (
      <g>
        <rect x={-300} y={-560} width={600} height={90} rx={45} fill="#1d222b" stroke="#2f3644" strokeWidth={3} />
        <circle cx={-250} cy={-517} r={16} fill="none" stroke="#8a93a3" strokeWidth={5} />
        <Txt x={-210} y={-503} s={36} a="start" c="#e6ebf2" w={400}>{search}</Txt>
        {searchResult > 0 && <Txt x={0} y={-400} s={30} c="#8a93a3" o={searchResult} mono ls={2}>NO RESULTS</Txt>}
      </g>
    )}
    <SkipButton at={PLAY_BTN} label="PLAY" appear={appear} pressed={pressPlay} scale={0.78} tone="light" />
    <SkipButton at={SKIP2_BTN} label="SKIP" appear={appear} pressed={pressSkip} scale={0.78} />
  </g>
);

/** Thumb tip path for a press: rest → hover → contact → release. Contact lasts `hold` seconds. */
export function thumbPress(t: number, at: number, target: V, o: { rest?: V; approach?: number; hold?: number; hover?: number } = {}): { tip: V; press: number } {
  const rest = o.rest ?? THUMB_REST;
  const approach = o.approach ?? 0.35, hold = o.hold ?? 0.14;
  const hoverPt: V = [target[0] + 26, target[1] + 40];
  // move from rest to hover, then down onto the button (contact), then lift back toward rest
  const a = ramp(t, at - approach, at - 0.08, easeInOut);
  const c = ramp(t, at - 0.08, at, easeOut);
  const r = ramp(t, at + hold, at + hold + 0.4, easeInOut);
  let p: V = [rest[0] + (hoverPt[0] - rest[0]) * a, rest[1] + (hoverPt[1] - rest[1]) * a];
  p = [p[0] + (target[0] - hoverPt[0]) * c, p[1] + (target[1] - hoverPt[1]) * c];
  p = [p[0] + (rest[0] - p[0]) * r * (o.hover !== undefined ? 0 : 1), p[1] + (rest[1] - p[1]) * r * (o.hover !== undefined ? 0 : 1)];
  const press = t >= at - 0.02 && t <= at + hold ? 1 : clamp(1 - Math.abs(t - at) * 12);
  return { tip: p, press };
}
