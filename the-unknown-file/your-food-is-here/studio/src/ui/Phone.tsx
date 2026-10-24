import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";

/**
 * YOUR FOOD IS HERE — his phone. One unbranded delivery-app design used in all three nights.
 * Canvas 1080 x 2376 (the 3D phone screen). Screen-fill shots show the centre 1080 x 1920
 * (y 228..2148), so everything that must be read sits inside that band.
 */
export const SW = 1080, SH = 2376, SAFE_TOP = 228;
export const K = {
  bg: "#0b0d10", card: "#16191f", card2: "#1d2129", line: "#262b35", text: "#f2f3f5", muted: "#8b93a1",
  accent: "#ff6b2c", green: "#31d07a", red: "#ff453a", blue: "#3d8bff",
  sans: "'Inter Variable', 'Inter', sans-serif", mono: "'IBM Plex Mono', monospace",
};
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));

const Txt: React.FC<{ s: number; w?: number; c?: string; mono?: boolean; ls?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ s, w = 500, c = K.text, mono, ls = 0, style, children }) => (
  <div style={{ fontFamily: mono ? K.mono : K.sans, fontSize: s, fontWeight: w, color: c, letterSpacing: ls, lineHeight: 1.18, ...style }}>{children}</div>
);

export const StatusBar: React.FC<{ time: string; pct?: number; dark?: boolean }> = ({ time, pct = 34, dark = true }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 26, height: 60, display: "flex", alignItems: "center", padding: "0 64px", justifyContent: "space-between" }}>
    <Txt s={42} w={650} c={dark ? K.text : "#111"}>{time}</Txt>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>{[0, 1, 2, 3].map((i) => <div key={i} style={{ width: 9, height: 12 + i * 7, borderRadius: 2, background: i < 3 ? K.text : "#4a505b" }} />)}</div>
      <div style={{ width: 62, height: 30, borderRadius: 9, border: `3px solid #c8ccd3`, padding: 3, boxSizing: "border-box" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: pct < 15 ? K.red : K.text }} />
      </div>
    </div>
  </div>
);

/** app header bar (no logo, no brand) */
const Header: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 120 }}>
    <Txt s={34} w={600} c={K.muted} ls={3}>{sub ?? "ORDER #4471"}</Txt>
    <Txt s={66} w={800} style={{ marginTop: 8 }}>{title}</Txt>
  </div>
);

const Btn: React.FC<{ label: string; y: number; glow?: number; pressed?: number; color?: string; h?: number }> = ({ label, y, glow = 0, pressed = 0, color = K.accent, h = 150 }) => (
  <div style={{
    position: "absolute", left: 64, right: 64, top: y, height: h, borderRadius: 40, background: color,
    display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - pressed * 0.04})`,
    boxShadow: glow ? `0 0 ${40 + glow * 70}px ${glow * 18}px ${color}aa` : "none", filter: `brightness(${1 + glow * 0.25 - pressed * 0.2})`,
  }}>
    <Txt s={56} w={800} c="#140800" ls={2}>{label}</Txt>
  </div>
);

// ------------------------------------------------------------------ screens
export type Msg = { at: number; text: string; from?: "driver" | "app" | "me" };

export const OrderScreen: React.FC<{ t: number; tapAt?: number; time: string }> = ({ t, tapAt = 99, time }) => {
  const placed = t >= tapAt + 0.25;
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <StatusBar time={time} />
      <Header title={placed ? "Order placed" : "Your basket"} sub="DELIVERY · ASAP" />
      <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 330, borderRadius: 40, background: K.card, padding: 44 }}>
        <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
          <div style={{ width: 230, height: 230, borderRadius: 30, background: "radial-gradient(circle at 50% 42%, #e3a052 0 34%, #7a3a12 35% 46%, #3b230f 47% 60%, #c9883b 61% 100%)" }} />
          <div>
            <Txt s={52} w={750}>Double smash burger</Txt>
            <Txt s={40} w={500} c={K.muted} style={{ marginTop: 10 }}>Fries · Cola · No pickles</Txt>
            <Txt s={48} w={700} c={K.accent} style={{ marginTop: 18 }}>$18.40</Txt>
          </div>
        </div>
        <div style={{ height: 2, background: K.line, margin: "40px 0" }} />
        <Txt s={40} w={500} c={K.muted}>Deliver to</Txt>
        <Txt s={48} w={700} style={{ marginTop: 6 }}>Apartment 6A · 6th floor</Txt>
      </div>
      {placed ? (
        <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 1080, borderRadius: 40, background: "#10261a", padding: 44, border: `3px solid ${K.green}` }}>
          <Txt s={54} w={800} c={K.green}>✓ Order confirmed</Txt>
          <Txt s={44} w={500} c={K.text} style={{ marginTop: 14 }}>Finding you a driver…</Txt>
        </div>
      ) : null}
      <Btn label={placed ? "TRACK ORDER" : "PLACE ORDER"} y={SAFE_TOP + 1500} pressed={t > tapAt && t < tapAt + 0.25 ? 1 : 0} color={placed ? K.card2 : K.accent} />
    </AbsoluteFill>
  );
};

/** stylised map with route + driver dot */
const MapView: React.FC<{ t: number; progress: number; h: number }> = ({ t, progress, h }) => {
  const route = "M 140 820 C 260 700, 300 560, 470 520 S 760 430, 820 250";
  return (
    <svg width={952} height={h} viewBox={`0 0 952 ${h}`} style={{ borderRadius: 40, background: "#12161c" }}>
      {Array.from({ length: 14 }).map((_, i) => <line key={"h" + i} x1={0} y1={i * 70 + 20} x2={952} y2={i * 70 - 40} stroke="#1c222b" strokeWidth={i % 4 === 0 ? 22 : 9} />)}
      {Array.from({ length: 10 }).map((_, i) => <line key={"v" + i} x1={i * 110 + 30} y1={0} x2={i * 110 - 50} y2={h} stroke="#1c222b" strokeWidth={i % 3 === 0 ? 20 : 8} />)}
      <rect x={560} y={600} width={260} height={160} fill="#152019" rx={18} />
      <path d={route} stroke={K.accent} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray="2 22" />
      <circle cx={140} cy={820} r={30} fill={K.text} /><circle cx={140} cy={820} r={14} fill={K.bg} />
      <g transform={`translate(820 250)`}>
        <circle r={46 + 8 * Math.sin(t * 4)} fill={K.accent} opacity={0.25} />
        <circle r={30} fill={K.accent} />
        <path d="M -14 -4 h 22 l 8 10 v 8 h -36 z" fill="#140800" />
      </g>
    </svg>
  );
};

export const TrackScreen: React.FC<{ t: number; time: string; eta?: string; note?: string }> = ({ t, time, eta = "8", note }) => (
  <AbsoluteFill style={{ background: K.bg }}>
    <StatusBar time={time} />
    <Header title="On the way" />
    <div style={{ position: "absolute", left: 64, top: SAFE_TOP + 300 }}><MapView t={t} progress={0} h={920} /></div>
    <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 1260, borderRadius: 40, background: K.card, padding: 44 }}>
      <Txt s={40} w={600} c={K.muted} ls={3}>YOUR DRIVER</Txt>
      <Txt s={72} w={850} style={{ marginTop: 10 }}>DRIVER — {eta} MINUTES AWAY</Txt>
      <Txt s={42} w={500} c={K.muted} style={{ marginTop: 16 }}>{note ?? "Marcus · grey hatchback"}</Txt>
    </div>
  </AbsoluteFill>
);

export const ChatScreen: React.FC<{ t: number; time: string; msgs: Msg[]; typingAt?: number[]; title?: string }> = ({ t, time, msgs, typingAt = [], title = "Marcus (driver)" }) => {
  const shown = msgs.filter((m) => t >= m.at);
  const typing = typingAt.some((a) => t >= a && t < a + 0.9);
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <StatusBar time={time} />
      <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 110, height: 150, borderBottom: `2px solid ${K.line}`, display: "flex", alignItems: "center", padding: "0 64px", gap: 28 }}>
        <div style={{ width: 96, height: 96, borderRadius: 48, background: "#2a2f39", display: "flex", alignItems: "center", justifyContent: "center" }}><Txt s={44} w={700}>M</Txt></div>
        <div><Txt s={50} w={750}>{title}</Txt><Txt s={34} w={500} c={K.muted}>Your driver · ORDER #4471</Txt></div>
      </div>
      <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 330, display: "flex", flexDirection: "column", gap: 34 }}>
        {shown.map((m, i) => {
          const a = easeOut((t - m.at) / 0.35);
          const me = m.from === "me";
          return (
            <div key={i} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: 860, opacity: a, transform: `translateY(${(1 - a) * 30}px) scale(${0.96 + a * 0.04})` }}>
              <div style={{ background: me ? K.blue : K.card2, borderRadius: 44, padding: "36px 44px" }}>
                <Txt s={60} w={800}>{m.text}</Txt>
              </div>
              <Txt s={30} w={500} c={K.muted} style={{ marginTop: 10, marginLeft: 16 }}>{time} AM</Txt>
            </div>
          );
        })}
        {typing ? <div style={{ alignSelf: "flex-start", background: K.card2, borderRadius: 40, padding: "30px 40px", display: "flex", gap: 14 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: 20, height: 20, borderRadius: 10, background: K.muted, opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 6 + i)) }} />)}
        </div> : null}
      </div>
    </AbsoluteFill>
  );
};

/** a notification banner that drops in from the top */
export const Banner: React.FC<{ t: number; at: number; title: string; body: string; app?: string; red?: boolean; y?: number }> = ({ t, at, title, body, app = "DELIVERY", red, y = SAFE_TOP + 40 }) => {
  if (t < at) return null;
  const a = easeOut((t - at) / 0.35);
  return (
    <div style={{ position: "absolute", left: 36, right: 36, top: y + (1 - a) * -260, borderRadius: 48, background: "rgba(30,34,42,0.97)", padding: "34px 44px", border: red ? `4px solid ${K.red}` : `2px solid #333a46`, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><Txt s={32} w={650} c={K.muted} ls={3}>{app}</Txt><Txt s={32} w={500} c={K.muted}>now</Txt></div>
      <Txt s={44} w={750} style={{ marginTop: 10 }}>{title}</Txt>
      <Txt s={56} w={850} c={red ? "#ff6b61" : K.text} style={{ marginTop: 8 }}>{body}</Txt>
    </div>
  );
};

export const LockScreen: React.FC<{ t: number; time: string; date?: string; notes?: Array<{ at: number; title: string; body: string; red?: boolean }>; dim?: number }> = ({ t, time, date = "Saturday 14 March", notes = [], dim = 0 }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 70%, #1d2433 0%, #0b0e14 60%, #06070a 100%)" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 170, textAlign: "center" }}>
      <Txt s={46} w={600} c="#cfd4dc">{date}</Txt>
      <Txt s={250} w={700} style={{ marginTop: -10, letterSpacing: -6 }}>{time}</Txt>
    </div>
    <div style={{ position: "absolute", left: 40, right: 40, top: SAFE_TOP + 700, display: "flex", flexDirection: "column", gap: 28 }}>
      {notes.filter((n) => t >= n.at).map((n, i) => {
        const a = easeOut((t - n.at) / 0.35);
        return (
          <div key={i} style={{ borderRadius: 48, background: "rgba(36,40,50,0.92)", padding: "34px 44px", opacity: a, transform: `translateY(${(1 - a) * 40}px)`, border: n.red ? `4px solid ${K.red}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><Txt s={32} w={650} c={K.muted} ls={3}>DELIVERY</Txt><Txt s={32} w={500} c={K.muted}>now</Txt></div>
            <Txt s={44} w={700} style={{ marginTop: 8 }}>{n.title}</Txt>
            <Txt s={58} w={850} c={n.red ? "#ff6b61" : K.text} style={{ marginTop: 6 }}>{n.body}</Txt>
          </div>
        );
      })}
    </div>
    {dim ? <AbsoluteFill style={{ background: "#000", opacity: dim }} /> : null}
  </AbsoluteFill>
);

/** proof-of-delivery card with a photo (photo is a rendered image or video under public/) */
export const Photo: React.FC<{ src: string; video?: boolean; startFrom?: number; zoom?: number; fx?: number; fy?: number; flash?: number; style?: React.CSSProperties }> = ({ src, video, startFrom = 0, zoom = 1, fx = 0.5, fy = 0.5, flash = 0, style }) => (
  <div style={{ position: "relative", overflow: "hidden", ...style }}>
    <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}>
      {video ? <OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>
    {flash > 0 ? <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} /> : null}
  </div>
);

export const DeliveredScreen: React.FC<{ t: number; time: string; photo?: string; photoVideo?: boolean; photoAt?: number; confirmAt?: number; title?: string; caption?: string; zoom?: number; fx?: number; fy?: number; stamp?: string }> = ({ t, time, photo, photoVideo, photoAt = 0, confirmAt = 99, title = "Delivered", caption = "Proof of delivery", zoom = 1, fx = 0.5, fy = 0.5, stamp }) => (
  <AbsoluteFill style={{ background: K.bg }}>
    <StatusBar time={time} />
    <Header title={title} />
    {photo && t >= photoAt ? (
      <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 320, borderRadius: 40, background: K.card, overflow: "hidden", opacity: easeOut((t - photoAt) / 0.4) }}>
        <Photo src={photo} video={photoVideo} zoom={zoom} fx={fx} fy={fy} style={{ width: 952, height: 1100 }} />
        {stamp ? <div style={{ position: "absolute", left: 30, top: 1100 - 90, background: "rgba(0,0,0,0.55)", borderRadius: 16, padding: "10px 20px" }}><Txt s={40} w={600} mono c="#ffd27a">{stamp}</Txt></div> : null}
        <div style={{ padding: "30px 40px" }}><Txt s={40} w={600} c={K.muted}>{caption}</Txt></div>
      </div>
    ) : null}
    {t >= confirmAt ? (
      <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 1560, opacity: easeOut((t - confirmAt) / 0.4) }}>
        <Txt s={56} w={850} style={{ textAlign: "center" }}>PLEASE CONFIRM YOU RECEIVED YOUR ORDER.</Txt>
      </div>
    ) : null}
  </AbsoluteFill>
);

/** full-screen photo viewer (tap-through) with timestamp in the corner */
export const PhotoViewer: React.FC<{ src: string; video?: boolean; startFrom?: number; stamp?: string; zoom?: number; fx?: number; fy?: number; time: string; caption?: string; stampHi?: number }> = ({ src, video, startFrom, stamp, zoom = 1, fx = 0.5, fy = 0.5, time, caption = "Proof of delivery", stampHi = 0 }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Photo src={src} video={video} startFrom={startFrom} zoom={zoom} fx={fx} fy={fy} style={{ position: "absolute", left: 0, top: SAFE_TOP + 180, width: SW, height: 1620 }} />
    <StatusBar time={time} />
    <div style={{ position: "absolute", left: 64, top: SAFE_TOP + 110 }}><Txt s={40} w={650} c={K.muted}>{caption}</Txt></div>
    {stamp ? <div style={{ position: "absolute", right: 48, top: SAFE_TOP + 1690, background: `rgba(0,0,0,${0.55 + stampHi * 0.3})`, borderRadius: 18, padding: "12px 26px", border: stampHi ? `4px solid rgba(255,210,122,${stampHi})` : "none" }}>
      <Txt s={48 + stampHi * 10} w={650} mono c="#ffd27a">{stamp}</Txt></div> : null}
  </AbsoluteFill>
);

/** doorbell camera app: live feed (rendered corridor footage) + chrome */
export const DoorbellScreen: React.FC<{ t: number; time: string; feed?: React.ReactNode; talk?: number; lost?: number; clock?: string; label?: string }> = ({ t, time, feed, talk = 0, lost = 0, clock = "03:13:41", label = "Front Door" }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <div style={{ position: "absolute", left: 0, top: SAFE_TOP + 170, width: SW, height: 1440, overflow: "hidden", background: "#050505" }}>
      {feed}
      {lost ? <AbsoluteFill style={{ background: "#000", opacity: lost }}><div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center" }}>
        <Txt s={54} w={750} c="#d8dbe0">CONNECTION LOST</Txt><Txt s={38} w={500} c={K.muted} style={{ marginTop: 14 }}>Reconnecting…</Txt></div></AbsoluteFill> : null}
      <div style={{ position: "absolute", left: 34, top: 30, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ background: lost ? "#444" : K.red, borderRadius: 12, padding: "6px 18px" }}><Txt s={34} w={800} c="#fff">LIVE</Txt></div>
        <Txt s={34} w={500} mono c="#e8e8e8" style={{ textShadow: "0 2px 6px #000" }}>{clock}</Txt>
      </div>
    </div>
    <StatusBar time={time} />
    <div style={{ position: "absolute", left: 64, top: SAFE_TOP + 100 }}><Txt s={48} w={750}>{label}</Txt></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 1650, display: "flex", justifyContent: "center", gap: 120 }}>
      <div style={{ width: 170, height: 170, borderRadius: 85, background: talk ? K.blue : "#23272f", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: talk ? `0 0 ${30 + 30 * Math.abs(Math.sin(t * 8))}px ${K.blue}` : "none" }}>
        <svg width={70} height={90} viewBox="0 0 70 90"><rect x={20} y={2} width={30} height={52} rx={15} fill="#fff" /><path d="M8 40 a27 27 0 0 0 54 0" stroke="#fff" strokeWidth={6} fill="none" /><line x1={35} y1={67} x2={35} y2={86} stroke="#fff" strokeWidth={6} /></svg>
      </div>
      <div style={{ width: 170, height: 170, borderRadius: 85, background: "#23272f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={80} height={80} viewBox="0 0 80 80"><rect x={6} y={14} width={50} height={52} rx={8} fill="none" stroke="#fff" strokeWidth={6} /><path d="M56 32 l18 -12 v40 l-18 -12 z" fill="#fff" /></svg>
      </div>
    </div>
    {talk ? <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 1590, textAlign: "center" }}><Txt s={34} w={600} c={K.blue}>MICROPHONE ON</Txt></div> : null}
  </AbsoluteFill>
);

export const CallScreen: React.FC<{ t: number; name: string; state: "incoming" | "active" | "ended"; secs?: number }> = ({ t, name, state, secs = 0 }) => (
  <AbsoluteFill style={{ background: "linear-gradient(#1a1d24, #07080a)" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 300, textAlign: "center" }}>
      <Txt s={46} w={500} c={K.muted}>{state === "incoming" ? "incoming call…" : state === "active" ? `00:${String(Math.floor(secs)).padStart(2, "0")}` : "Call ended"}</Txt>
      <Txt s={96} w={800} style={{ marginTop: 20 }}>{name}</Txt>
    </div>
    {state === "incoming" ? (
      <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 1500, display: "flex", justifyContent: "space-around" }}>
        <div style={{ width: 190, height: 190, borderRadius: 95, background: K.red }} />
        <div style={{ width: 190, height: 190, borderRadius: 95, background: K.green, transform: `scale(${1 + 0.06 * Math.sin(t * 8)})` }} />
      </div>
    ) : state === "active" ? (
      <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 1500, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 190, height: 190, borderRadius: 95, background: K.red }} />
      </div>
    ) : null}
  </AbsoluteFill>
);

/** NIGHT 3 final-attempt screen: big glowing CONFIRM, tiny "THAT'S NOT MY ORDER." beneath */
export const FinalScreen: React.FC<{ t: number; time: string; photo?: string; glow?: number; small?: number; press?: "confirm" | "not" | null; pressAmt?: number; zoomSmall?: number; title?: string }> = ({ t, time, photo, glow = 1, small = 1, press = null, pressAmt = 0, title = "FINAL DELIVERY ATTEMPT." }) => (
  <AbsoluteFill style={{ background: K.bg }}>
    <StatusBar time={time} pct={9} />
    <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 120 }}>
      <Txt s={34} w={600} c={K.red} ls={3}>ORDER #4471</Txt>
      <Txt s={62} w={850} style={{ marginTop: 8 }}>{title}</Txt>
    </div>
    {photo ? <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 330, borderRadius: 40, overflow: "hidden" }}>
      <Photo src={photo} style={{ width: 952, height: 980 }} />
      <div style={{ position: "absolute", right: 24, bottom: 24, background: "rgba(0,0,0,0.6)", borderRadius: 14, padding: "8px 18px" }}><Txt s={36} w={600} mono c="#ffd27a">3:13 AM</Txt></div>
    </div> : null}
    <Btn label="CONFIRM DELIVERY" y={SAFE_TOP + 1400} glow={glow * (0.6 + 0.4 * Math.sin(t * 3.2))} pressed={press === "confirm" ? pressAmt : 0} />
    <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 1610, textAlign: "center", opacity: small }}>
      <span style={{ fontFamily: K.sans, fontSize: 30, fontWeight: 600, color: press === "not" && pressAmt > 0.5 ? "#fff" : "#7c8492", letterSpacing: 2,
        padding: "14px 26px", borderRadius: 18, background: press === "not" ? `rgba(255,255,255,${0.18 * pressAmt})` : "transparent" }}>THAT'S NOT MY ORDER.</span>
    </div>
  </AbsoluteFill>
);

export const CanceledScreen: React.FC<{ time: string }> = ({ time }) => (
  <AbsoluteFill style={{ background: K.bg }}>
    <StatusBar time={time} pct={8} />
    <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 700, textAlign: "center" }}>
      <Txt s={34} w={600} c={K.muted} ls={3}>ORDER #4471</Txt>
      <Txt s={96} w={850} style={{ marginTop: 16 }}>ORDER CANCELED.</Txt>
      <Txt s={44} w={500} c={K.muted} style={{ marginTop: 24 }}>No charge has been made.</Txt>
    </div>
  </AbsoluteFill>
);

export const Gallery: React.FC<{ time: string; empty?: boolean }> = ({ time }) => (
  <AbsoluteFill style={{ background: K.bg }}>
    <StatusBar time={time} />
    <Header title="Photos" sub="RECENTS" />
    <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 700, textAlign: "center" }}>
      <Txt s={64} w={800}>No photos</Txt>
      <Txt s={42} w={500} c={K.muted} style={{ marginTop: 18 }}>Photos you take or receive will appear here.</Txt>
    </div>
  </AbsoluteFill>
);
