import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * SOMEONE IS IN THE POOL — the guard's phone (Night 3) and the security-system text styles.
 * Canvas 1080 x 2376. Screen-fill shots show the centre 1080 x 1920 (y 228..2148). No logos, no brand names.
 */
export const SW = 1080, SH = 2376, SAFE_TOP = 228;
export const K = {
  bg: "#07090c", card: "#141820", card2: "#1b202a", line: "#242a35", text: "#f1f3f6", muted: "#8a93a2",
  red: "#ff3b30", amber: "#ffb020", teal: "#3fd0d8", green: "#30d158",
  sans: "'Inter Variable', 'Inter', sans-serif", mono: "'IBM Plex Mono', monospace",
};
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
export const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));

export const Txt: React.FC<{ s: number; w?: number; c?: string; mono?: boolean; ls?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ s, w = 500, c = K.text, mono, ls = 0, style, children }) => (
  <div style={{ fontFamily: mono ? K.mono : K.sans, fontSize: s, fontWeight: w, color: c, letterSpacing: ls, lineHeight: 1.18, ...style }}>{children}</div>
);

export const StatusBar: React.FC<{ time: string; pct?: number }> = ({ time, pct = 61 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 26, height: 60, display: "flex", alignItems: "center", padding: "0 64px", justifyContent: "space-between" }}>
    <Txt s={42} w={650}>{time}</Txt>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>{[0, 1, 2, 3].map((i) => <div key={i} style={{ width: 9, height: 12 + i * 7, borderRadius: 2, background: i < 3 ? K.text : "#4a505b" }} />)}</div>
      <div style={{ width: 62, height: 30, borderRadius: 9, border: `3px solid #c8ccd3`, padding: 3, boxSizing: "border-box" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: K.text }} />
      </div>
    </div>
  </div>
);

/** the security-camera app's icon: a plain camera glyph on dark teal (no brand) */
export const CamIcon: React.FC<{ size?: number }> = ({ size = 84 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.24, background: "linear-gradient(160deg, #1d4b52, #0d2328)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: size * 0.5, height: size * 0.34, borderRadius: size * 0.06, background: "#cfeff2", position: "relative" }}>
      <div style={{ position: "absolute", right: -size * 0.14, top: size * 0.06, width: 0, height: 0, borderTop: `${size * 0.11}px solid transparent`, borderBottom: `${size * 0.11}px solid transparent`, borderLeft: `${size * 0.14}px solid #cfeff2` }} />
      <div style={{ position: "absolute", left: size * 0.06, top: size * 0.06, width: size * 0.07, height: size * 0.07, borderRadius: "50%", background: K.red }} />
    </div>
  </div>
);

export type Note = { at: number; title: string; body: string; app?: string; red?: boolean; time?: string };

const NoteCard: React.FC<{ n: Note; t: number; hi?: number }> = ({ n, t, hi = 0 }) => {
  const k = ramp(t, n.at, n.at + 0.35);
  return (
    <div style={{ opacity: k, transform: `translateY(${(1 - k) * -40}px) scale(${1 + hi * 0.02})`, borderRadius: 44, background: `rgba(30,34,42,${0.92})`, padding: "34px 40px",
      display: "flex", gap: 30, alignItems: "flex-start", boxShadow: hi ? `0 0 0 4px rgba(255,255,255,${0.25 * hi})` : "none", marginBottom: 22 }}>
      <CamIcon size={92} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Txt s={32} w={650} c={K.muted} ls={2}>{n.app ?? "POOL CCTV"}</Txt><Txt s={32} c={K.muted}>{n.time ?? "now"}</Txt>
        </div>
        <Txt s={48} w={750} c={n.red ? "#ff6a60" : K.text} style={{ marginTop: 8 }}>{n.title}</Txt>
        <Txt s={42} w={500} c="#cfd4dc" style={{ marginTop: 6 }}>{n.body}</Txt>
      </div>
    </div>
  );
};

/** lock screen: big clock + notifications. wake 0..1 brightens the screen from black (phone lighting up) */
export const LockScreen: React.FC<{ t: number; time: string; date?: string; notes?: Note[]; wake?: number; hi?: number }> = ({ t, time, date = "Thursday 22 October", notes = [], wake = 1, hi = 0 }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 120% 70% at 50% 20%, #12202a 0%, #06080b 70%)" }}>
    <StatusBar time={time} />
    <div style={{ position: "absolute", top: SAFE_TOP + 190, width: "100%", textAlign: "center" }}>
      <Txt s={46} w={600} c="#c9d0da">{date}</Txt>
      <Txt s={250} w={700} style={{ letterSpacing: -6, marginTop: -6 }}>{time}</Txt>
    </div>
    <div style={{ position: "absolute", left: 44, right: 44, top: SAFE_TOP + 700 }}>
      {notes.map((n, i) => <NoteCard key={i} n={n} t={t} hi={i === notes.length - 1 ? hi : 0} />)}
    </div>
    <AbsoluteFill style={{ background: "#000", opacity: 1 - wake }} />
  </AbsoluteFill>
);

/** banner dropping in over any screen */
export const Banner: React.FC<{ t: number; n: Note }> = ({ t, n }) => {
  if (t < n.at) return null;
  return <div style={{ position: "absolute", left: 40, right: 40, top: SAFE_TOP + 40 }}><NoteCard n={n} t={t} /></div>;
};

export type Msg = { at: number; text: string; me?: boolean };
export const MessagesScreen: React.FC<{ t: number; time: string; name: string; msgs: Msg[]; typingAt?: number }> = ({ t, time, name, msgs, typingAt }) => (
  <AbsoluteFill style={{ background: K.bg }}>
    <StatusBar time={time} />
    <div style={{ position: "absolute", top: SAFE_TOP + 120, left: 0, right: 0, textAlign: "center" }}>
      <div style={{ width: 130, height: 130, borderRadius: 65, background: "#3a4250", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Txt s={58} w={700}>{name[0]}</Txt>
      </div>
      <Txt s={44} w={650} style={{ marginTop: 14 }}>{name}</Txt>
    </div>
    <div style={{ position: "absolute", left: 50, right: 50, top: SAFE_TOP + 420, display: "flex", flexDirection: "column", gap: 22 }}>
      {msgs.filter((m) => t >= m.at).map((m, i) => (
        <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "78%", padding: "30px 40px", borderRadius: 46,
          background: m.me ? "#1f6feb" : K.card2, opacity: ramp(t, m.at, m.at + 0.2) }}>
          <Txt s={50} w={500}>{m.text}</Txt>
        </div>
      ))}
      {typingAt !== undefined && t > typingAt && !msgs.some((m) => t >= m.at && m.at > typingAt) ? (
        <div style={{ alignSelf: "flex-start", padding: "30px 40px", borderRadius: 46, background: K.card2, display: "flex", gap: 14 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: 20, height: 20, borderRadius: 10, background: "#8a93a2", opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 4 + i)) }} />)}
        </div>
      ) : null}
    </div>
  </AbsoluteFill>
);

/** the security app's live view: camera name, LIVE pill, timestamp, the feed filling the middle of the screen */
export const CamApp: React.FC<{ t: number; time: string; cam: string; place: string; stamp: string; feed: React.ReactNode; live?: boolean; snapshot?: boolean; loading?: number }> = ({ t, time, cam, place, stamp, feed, live = true, snapshot, loading = 0 }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: SAFE_TOP + 230, height: 1460, overflow: "hidden", background: "#050607" }}>
      {loading > 0 ? null : feed}
      {loading > 0 ? <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 110, height: 110, borderRadius: 55, border: "10px solid #333", borderTopColor: "#ddd", transform: `rotate(${t * 400}deg)` }} />
      </AbsoluteFill> : null}
    </div>
    <StatusBar time={time} />
    <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 112, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <Txt s={36} w={600} c={K.muted} ls={3}>{cam}</Txt>
        <Txt s={58} w={800}>{place}</Txt>
      </div>
      {live ? <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 26px", borderRadius: 30, background: "rgba(255,59,48,0.18)" }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: K.red, opacity: Math.sin(t * 6) > -0.3 ? 1 : 0.2 }} />
        <Txt s={36} w={750} c="#ff6a60" ls={2}>LIVE</Txt>
      </div> : <Txt s={36} w={650} c={K.amber} ls={2}>{snapshot ? "SNAPSHOT" : ""}</Txt>}
    </div>
    <div style={{ position: "absolute", left: 64, right: 64, top: SAFE_TOP + 1720, display: "flex", justifyContent: "space-between" }}>
      <Txt s={38} mono c="#c9d0da">{stamp}</Txt>
      <Txt s={38} mono c={K.muted}>{live ? "HD · 8 FPS" : "MOTION EVENT"}</Txt>
    </div>
  </AbsoluteFill>
);

/** a finger tap ring */
export const Tap: React.FC<{ t: number; at: number; x: number; y: number }> = ({ t, at, x, y }) => {
  const k = (t - at) / 0.45;
  if (k < -0.3 || k > 1) return null;
  const kk = clamp(k);
  return (
    <div style={{ position: "absolute", left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: 70, background: `rgba(255,255,255,${0.35 * (1 - kk)})`,
      transform: `scale(${0.6 + 0.6 * kk})`, border: "4px solid rgba(255,255,255,0.5)" }} />
  );
};
