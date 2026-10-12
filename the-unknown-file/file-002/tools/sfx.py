"""THE UNKNOWN FILE — FILE #002 original sound design (procedural; no music, no samples, no loops from libraries).

Every sound here is synthesised from noise and short decaying resonances: suit fan air, breathing, water,
radio static and dropouts, Quindar-style comm beeps, tether/glove/handrail contacts, hatch and latch mechanics,
repress hiss, technical ticks and low impacts. Nothing is pitched into melodies, chords, drones or rhythms.

The cue sheets live in tools/cues_short.py and tools/cues_long.py and are keyed to phrases in the narration
transcript, so the sound sits exactly where the words are.

Usage:  python3 tools/sfx.py short|long
Writes  audio/master/<name>_sfx.wav       (stereo SFX stem, unducked)
        audio/master/<name>_sfx_ducked.wav (stereo SFX stem, ducked under the narration)
"""
import json, re, sys, importlib
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
rng = np.random.default_rng(2013)


# ── building blocks ──────────────────────────────────────────────────────────────────────
def n(sec):
    return int(round(sec * SR))


def noise(sec, color="white"):
    x = rng.standard_normal(n(sec))
    if color == "pink":
        b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
        x = signal.lfilter(b, a, x)
    elif color == "brown":
        x = np.cumsum(x); x = signal.lfilter([1, -1], [1, -0.995], x)
    return x / (np.max(np.abs(x)) + 1e-9)


def bp(x, lo, hi, order=4):
    sos = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=4):
    return signal.sosfilt(signal.butter(order, f / (SR / 2), "low", output="sos"), x)


def hp(x, f, order=4):
    return signal.sosfilt(signal.butter(order, f / (SR / 2), "high", output="sos"), x)


def env_adsr(length, a=0.01, d=0.1, s=0.7, r=0.2):
    L = length; e = np.ones(L) * s
    A, D, R = n(a), n(d), n(r)
    A = min(A, L); e[:A] = np.linspace(0, 1, A)
    D = min(D, max(0, L - A)); e[A:A + D] = np.linspace(1, s, D)
    R = min(R, L); e[L - R:] *= np.linspace(1, 0, R)
    return e


def decay(length, tau):
    return np.exp(-np.arange(length) / (tau * SR))


def norm(x, peak=1.0):
    return x * (peak / (np.max(np.abs(x)) + 1e-9))


def resonance(sec, freqs, taus, amps):
    """inharmonic struck-metal ring (modal synthesis) — a single hit, not a pitch line"""
    t = np.arange(n(sec)) / SR
    y = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau) for f, tau, a in zip(freqs, taus, amps))
    return y


# ── sound library ────────────────────────────────────────────────────────────────────────
def impact(sec=2.2, weight=1.0):
    """subtle low impact: a felt thump with an air tail (no tone sustain)"""
    L = n(sec); t = np.arange(L) / SR
    f = 52 * np.exp(-t * 3.0) + 30
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    air = lp(noise(sec, "brown"), 260) * np.exp(-t / 0.7) * 0.6
    click = hp(noise(sec), 1500) * np.exp(-t / 0.008) * 0.25
    return norm(thump * weight + air + click) * 0.9


def whoosh(sec=1.4, lo=200, hi=3800, up=True):
    """band-swept air movement for transitions"""
    x = noise(sec, "pink"); L = len(x)
    k = np.linspace(0, 1, L) if up else np.linspace(1, 0, L)
    out = np.zeros(L); seg = 2048
    for i in range(0, L, seg):
        c = lo * (hi / lo) ** k[min(i + seg // 2, L - 1)]
        out[i:i + seg] = bp(x[max(0, i - 4096):i + seg], c * 0.6, min(c * 1.6, SR / 2 - 100), 2)[-len(x[i:i + seg]):]
    e = np.sin(np.pi * np.linspace(0, 1, L)) ** 1.6
    return norm(out * e) * 0.8


def fan(sec):
    """PLSS fan / ventilation air inside the helmet: broadband, slowly breathing, no pitch"""
    x = noise(sec, "pink")
    x = bp(x, 180, 2600, 2) + 0.25 * lp(noise(sec, "brown"), 120)
    wob = 1 + 0.08 * np.sin(2 * np.pi * 0.13 * np.arange(len(x)) / SR + 1.0)
    return norm(x * wob) * 0.5


def breath(sec=3.6, tense=0.0):
    """one inhale/exhale cycle heard inside a closed helmet"""
    L = n(sec); t = np.linspace(0, 1, L)
    inh = np.exp(-((t - 0.25) / 0.13) ** 2); exh = np.exp(-((t - 0.68) / (0.16 - 0.04 * tense)) ** 2) * 0.8
    x = noise(sec, "pink")
    a = bp(x, 500, 2400, 2) * inh + bp(x, 250, 1400, 2) * exh
    return norm(lp(a, 3200)) * (0.5 + 0.3 * tense)


def bubble(f0, sec=0.18):
    """single bubble resonance (rising chirp, very short)"""
    L = n(sec); t = np.arange(L) / SR
    f = f0 * (1 + 2.2 * t / sec)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (sec / 4)) * np.minimum(1, t / 0.002)


def water(sec, density=6.0, lo=350, hi=1400, muffled=False):
    """water moving in an enclosed space: bubbles + soft slosh"""
    L = n(sec); y = np.zeros(L)
    k = int(sec * density)
    for _ in range(k):
        s = rng.integers(0, max(1, L - n(0.2))); b = bubble(rng.uniform(lo, hi), rng.uniform(0.05, 0.16))
        y[s:s + len(b)] += b * rng.uniform(0.2, 1.0)
    slosh = lp(noise(sec, "brown"), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * np.arange(L) / SR) ** 2)
    y = y * 0.5 + slosh * 0.5
    if muffled: y = lp(y, 900)
    e = env_adsr(L, 0.3, 0.1, 1, 0.4)
    return norm(y * e) * 0.7


def drip(sec=0.7):
    """a single drop landing (Earth gravity panel)"""
    L = n(sec); y = np.zeros(L)
    b = bubble(900, 0.09); y[:len(b)] += b
    sp = hp(noise(0.12), 1800) * decay(n(0.12), 0.02) * 0.4; y[n(0.01):n(0.01) + len(sp)] += sp
    return norm(y) * 0.6


def static(sec, fail=0.5, seed=0):
    """restrained radio static with dropouts"""
    r = np.random.default_rng(seed)
    x = bp(noise(sec), 300, 3400, 4) * 0.5
    L = len(x); g = np.ones(L)
    # dropouts: gaps of near-silence, more frequent as fail rises
    t = 0.0
    while t < sec:
        t += r.uniform(0.25, 1.2) * (1.4 - fail)
        d = r.uniform(0.06, 0.35) * (0.5 + fail)
        a, b = n(t), min(L, n(t + d)); g[a:b] = 0.03
        t += d
    g = signal.lfilter([0.02], [1, -0.98], g)
    crackle = np.zeros(L); idx = r.integers(0, L, int(sec * 40 * (0.3 + fail)))
    crackle[idx] = r.uniform(-1, 1, len(idx)); crackle = hp(crackle, 1200) * 1.5
    return norm(x * g + crackle) * 0.6


def quindar(f=2525.0, sec=0.25):
    """NASA-style 250 ms comm-key beep (a signalling tone, not music)"""
    L = n(sec); t = np.arange(L) / SR
    y = np.sin(2 * np.pi * f * t) * env_adsr(L, 0.004, 0.0, 1.0, 0.01)
    return bp(y, 300, 3400, 2) * 0.35


def click(metal=True):
    """carabiner / tether hook click"""
    sec = 0.35; L = n(sec)
    tr = hp(noise(sec), 2500) * decay(L, 0.004)
    ring = resonance(sec, [2900, 4170, 5630, 7410], [0.03, 0.025, 0.018, 0.012], [0.5, 0.35, 0.25, 0.15]) if metal else 0
    return norm(tr + ring) * 0.55


def glove(sec=0.5):
    """padded glove contact / rub on a handrail"""
    L = n(sec)
    x = bp(noise(sec, "pink"), 150, 1800, 2) * np.exp(-np.arange(L) / (0.08 * SR))
    th = lp(noise(sec, "brown"), 180) * np.exp(-np.arange(L) / (0.05 * SR))
    return norm(x + th * 0.8) * 0.5


def hatch(sec=2.0):
    """heavy hatch closing: low thump + short metallic body"""
    L = n(sec)
    body = resonance(sec, [97, 143, 211, 377, 598], [0.25, 0.2, 0.15, 0.08, 0.05], [0.8, 0.6, 0.45, 0.3, 0.2])
    th = impact(sec, 1.2) * 0.8
    return norm(body * 0.7 + th) * 0.85


def latch():
    """mechanical latch: two quick clacks"""
    y = np.zeros(n(0.5))
    for k, d in enumerate([0.0, 0.11]):
        c = click(True) * (1 - 0.3 * k); s = n(d); y[s:s + len(c)] += c[: len(y) - s]
    return norm(lp(y, 6000)) * 0.6


def hiss(sec, rise=True):
    """repressurisation: air rushing in, building then easing"""
    x = bp(noise(sec), 900, 9000, 2)
    L = len(x); k = np.linspace(0, 1, L)
    e = (np.sin(np.pi * k) ** 0.7) * (0.4 + 0.6 * k if rise else 1)
    return norm(x * e) * 0.5


def tick():
    """clean technical UI tick for diagrams"""
    L = n(0.08)
    y = resonance(0.08, [3200, 5100], [0.01, 0.006], [0.6, 0.3]) + hp(noise(0.08), 3000) * decay(L, 0.002) * 0.4
    return norm(y) * 0.35


def swell(sec=2.5):
    """low tension rise: filtered air thickening (no pitch)"""
    x = lp(noise(sec, "brown"), 220) + 0.3 * bp(noise(sec, "pink"), 300, 900, 2)
    L = len(x); e = np.linspace(0, 1, L) ** 2 * env_adsr(L, 0.01, 0, 1, 0.25)
    return norm(x * e) * 0.6


def room(sec):
    """control-room tone: soft HVAC air"""
    return norm(lp(noise(sec, "pink"), 1200) + 0.3 * lp(noise(sec, "brown"), 100)) * 0.4


def paper(sec=0.6):
    """folder / paper slide for the case file"""
    L = n(sec); x = bp(noise(sec), 1200, 7000, 2)
    e = np.sin(np.pi * np.linspace(0, 1, L)) ** 2
    return norm(x * e) * 0.35


def stamp():
    """rubber stamp onto a folder: dull thump + paper slap"""
    th = lp(noise(0.4, "brown"), 300) * decay(n(0.4), 0.05)
    sl = bp(noise(0.4), 800, 5000, 2) * decay(n(0.4), 0.015)
    return norm(th + sl * 0.7) * 0.8


LIB = dict(impact=impact, whoosh=whoosh, breath=breath, water=water, drip=drip, static=static, quindar=quindar,
           click=click, glove=glove, hatch=hatch, latch=latch, hiss=hiss, tick=tick, swell=swell, paper=paper, stamp=stamp)
BEDS = dict(fan=fan, room=room, water=lambda s: water(s, 3.0, muffled=True), static=static)


# ── cue helpers ──────────────────────────────────────────────────────────────────────────
def cue_finder(tokens):
    ws = [(re.sub(r"[^a-z0-9]", "", t["w"].lower()), t["s"], t["e"]) for t in tokens]
    cur = [0.0]

    def find(phrase, after=0.0):
        p = [re.sub(r"[^a-z0-9]", "", x.lower()) for x in phrase.split()]
        p = [x for x in p if x]
        for i in range(len(ws)):
            if ws[i][1] < after - 1e-6: continue
            if all(i + j < len(ws) and ws[i + j][0] == p[j] for j in range(len(p))):
                return ws[i][1], ws[i + len(p) - 1][2]
        raise KeyError(f"cue not found: {phrase!r} after {after}")

    def seq(phrase):
        s, e = find(phrase, cur[0]); cur[0] = s + 0.01; return s

    return find, seq


def place(buf, x, t, gain_db=0.0, pan=0.0):
    s = n(t)
    if s >= buf.shape[1] or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    x = x[: buf.shape[1] - s] * 10 ** (gain_db / 20)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, s:s + len(x)] += x * l * 1.414; buf[1, s:s + len(x)] += x * r * 1.414


def bed(buf, kind, t0, t1, gain_db, fade=1.0, auto=None, width=0.6, **kw):
    """continuous bed with fades; auto = [(t, db_offset), ...] gain automation in absolute time"""
    sec = t1 - t0
    if sec <= 0: return
    L = n(sec); x = BEDS[kind](sec, **kw) if kw else BEDS[kind](sec)
    x2 = BEDS[kind](sec, **kw) if kw else BEDS[kind](sec)  # decorrelated second channel for width
    e = np.ones(L); F = min(n(fade), L // 2)
    e[:F] = np.linspace(0, 1, F); e[L - F:] *= np.linspace(1, 0, F)
    if auto:
        ts = np.arange(L) / SR + t0
        pts = sorted(auto)
        db = np.interp(ts, [p[0] for p in pts], [p[1] for p in pts])
        e *= 10 ** (db / 20)
    g = 10 ** (gain_db / 20)
    s = n(t0)
    mid, side = (x + x2) / 2, (x - x2) / 2 * width
    buf[0, s:s + L] += (mid + side)[: buf.shape[1] - s] * e[: buf.shape[1] - s] * g
    buf[1, s:s + L] += (mid - side)[: buf.shape[1] - s] * e[: buf.shape[1] - s] * g


def voice_envelope(path, L):
    sr, v = wavfile.read(path)
    v = v.astype(np.float64)
    if v.ndim > 1: v = v.mean(axis=1)
    v /= 32768.0
    if sr != SR: v = signal.resample_poly(v, SR, sr)
    v = np.pad(np.abs(v), (0, max(0, L - len(v))))[:L]
    # attack 30 ms / release 400 ms follower → 0..1 voice activity
    a, r = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.4 * SR))
    lvl = signal.lfilter([1 - r], [1, -r], v)  # smooth
    lvl = lvl / (np.percentile(lvl[lvl > 1e-4], 90) + 1e-9)
    return np.clip(lvl, 0, 1)


def main():
    name = sys.argv[1]
    cues = importlib.import_module(f"cues_{name}")
    tokens = json.load(open(f"studio/src/data/{name}.tokens.json"))
    find, seq = cue_finder(tokens)
    dur = cues.DURATION
    buf = np.zeros((2, n(dur)))
    events, beds = cues.build(find, seq)
    for b in beds:
        bed(buf, **b)
    for e in events:
        kind = e.pop("kind"); t = e.pop("t"); g = e.pop("db", 0.0); pan = e.pop("pan", 0.0)
        place(buf, LIB[kind](**e), t, g, pan)
    peak = np.max(np.abs(buf))
    print(f"sfx peak {20 * np.log10(peak + 1e-9):.1f} dBFS")
    wavfile.write(f"audio/master/{name}_sfx.wav", SR, (np.clip(buf.T, -1, 1) * 32767).astype(np.int16))
    # duck under the narration (−7 dB at full voice, smooth)
    va = voice_envelope(cues.NARRATION, buf.shape[1])
    duck = 10 ** (-7 * va / 20)
    wavfile.write(f"audio/master/{name}_sfx_ducked.wav", SR, (np.clip((buf * duck).T, -1, 1) * 32767).astype(np.int16))


if __name__ == "__main__":
    sys.path.insert(0, "tools")
    main()
