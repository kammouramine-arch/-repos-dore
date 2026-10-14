"""THE UNKNOWN FILE — FILE #003 original sound design (procedural; no samples, no loops from libraries).

FILE #003 adds a storm kit: synthesised thunder (every strike gets its own seed, distance and roll pattern —
no repeated thunder file), rain (open air / on a truck roof / on a window), gusting wind, a distant storm bed,
fire crackle, an electrical arc, a stream, tinnitus after a strike, a heartbeat and a period truck engine.


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


# ── WHAT IF? additions ──────────────────────────────────────────────────────────────────
def surf(sec, period=7.0, amp=1.0):
    """waves breaking and washing up a beach: periodic swells of pink noise, slow wash-back hiss"""
    L = n(sec); t = np.arange(L) / SR
    x = noise(sec, "pink")
    ph = (t % period) / period
    e = np.where(ph < 0.18, (ph / 0.18) ** 2, np.exp(-(ph - 0.18) * 4.5))
    crash = lp(x, 1800) * e
    wash = bp(noise(sec), 1500, 7000, 2) * np.clip(np.sin(np.pi * np.clip((ph - 0.2) / 0.6, 0, 1)), 0, 1) * 0.35
    rumble = lp(noise(sec, "brown"), 120) * 0.5
    return norm(crash + wash + rumble) * 0.6 * amp


def crickets(sec, density=1.0):
    """nocturnal insects: many tiny chirp trains at slightly different rates (natural, not musical)"""
    L = n(sec); y = np.zeros(L); t = np.arange(L) / SR
    for k in range(int(10 * density)):
        f = rng.uniform(4200, 5600); rate = rng.uniform(2.2, 3.6); ph = rng.uniform(0, 1)
        gate = ((t * rate + ph) % 1) < 0.12
        trill = (np.sin(2 * np.pi * 38 * t) > 0) * gate
        y += np.sin(2 * np.pi * f * t) * trill * rng.uniform(0.2, 0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t + k))
    y = signal.lfilter([0.3], [1, -0.7], y)
    return norm(y) * 0.3


def owl(sec=1.6):
    """a soft owl call (two low hoots)"""
    L = n(sec); y = np.zeros(L)
    for k, (d, l) in enumerate([(0.0, 0.35), (0.55, 0.7)]):
        tt = np.arange(n(l)) / SR
        f = 380 * (1 - 0.05 * tt / l)
        h = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / l) ** 1.5
        h += 0.3 * lp(noise(l), 600) * np.sin(np.pi * tt / l)
        s = n(d); y[s:s + len(h)] += h
    return norm(y) * 0.45


def murmur(sec, people=12):
    """crowd murmur: many band-limited, syllable-modulated noise voices (no intelligible speech)"""
    L = n(sec); y = np.zeros(L); t = np.arange(L) / SR
    for k in range(people):
        f0 = rng.uniform(140, 260)
        v = bp(noise(sec), f0 * 2, f0 * 9, 2)
        syll = np.clip(np.sin(2 * np.pi * rng.uniform(3, 5.5) * t + rng.uniform(0, 6)) + rng.uniform(-0.2, 0.4), 0, 1)
        phrase = np.clip(np.sin(2 * np.pi * rng.uniform(0.08, 0.2) * t + rng.uniform(0, 6)) + 0.3, 0, 1)
        y += v * syll * phrase * rng.uniform(0.4, 1.0)
    return norm(lp(y, 3000)) * 0.5


def underwater(sec):
    """underwater ambience: low muffled rumble + distant clicks of reef life"""
    L = n(sec)
    x = lp(noise(sec, "brown"), 300) + 0.25 * lp(noise(sec, "pink"), 800)
    clicks = np.zeros(L); idx = rng.integers(0, L, int(sec * 30)); clicks[idx] = rng.uniform(-1, 1, len(idx))
    clicks = bp(clicks, 2000, 9000, 2) * 0.6
    return norm(x + clicks) * 0.55


def wind(sec):
    x = bp(noise(sec, "pink"), 200, 1500, 2)
    L = len(x); t = np.arange(L) / SR
    return norm(x * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t) ** 2)) * 0.4


def engine(sec):
    """small diesel boat engine, distant: low putter"""
    L = n(sec); t = np.arange(L) / SR
    f = 11.0
    puls = np.clip(np.sin(2 * np.pi * f * t), 0, 1) ** 4
    x = lp(noise(sec, "brown"), 260) * puls + 0.4 * np.sin(2 * np.pi * 2 * f * t) * puls
    return norm(lp(x, 400)) * 0.5


def vanish(sec=3.0):
    """the Moon disappears: a restrained inward air swell that collapses into near-silence (no explosion)"""
    L = n(sec); t = np.arange(L) / SR
    x = bp(noise(sec, "pink"), 300, 4000, 2)
    e = (t / (sec * 0.55)) ** 2.5 * (t < sec * 0.55) + np.exp(-(t - sec * 0.55) * 18) * (t >= sec * 0.55)
    th = lp(noise(sec, "brown"), 90) * np.exp(-np.clip(t - sec * 0.55, 0, None) * 3) * (t >= sec * 0.55) * 0.7
    return norm(x * e + th) * 0.7


def tv(sec):
    """muffled television in another room (no speech content): band-limited babble + hum"""
    return norm(lp(murmur(sec, 2), 1200) + 0.05 * lp(noise(sec), 100)) * 0.4


def market(sec):
    return norm(murmur(sec, 16) + 0.15 * bp(noise(sec), 2000, 6000, 2)) * 0.5


LIB.update(dict(owl=owl, vanish=vanish))
BEDS.update(dict(surf=surf, crickets=crickets, murmur=murmur, underwater=underwater, wind=wind, engine=engine, tv=tv, market=market))


# ── FILE #003 storm kit ───────────────────────────────────────────────────────────────────
def _r(seed):
    return np.random.default_rng(int(seed) * 7919 + 17)


def thunder(sec=7.0, dist=0.5, seed=0, crack=1.0):
    """cloud-to-ground thunder. dist 0 = right overhead (tearing crack + boom), 1 = far away (soft low roll).
    Each seed produces a different roll pattern, so no two strikes sound alike."""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    brown = np.cumsum(R.standard_normal(L)); brown -= signal.lfilter([1], [1, -0.9995], brown) * 0.0005
    brown = brown - np.convolve(brown, np.ones(4801) / 4801, mode="same")
    brown /= np.max(np.abs(brown)) + 1e-9
    cut = 420 - 280 * dist
    rumble = lp(brown, cut, 2)
    # rolling envelope: several reflections / channel segments arriving at different times
    env = np.zeros(L)
    onset = 0.02 + 0.5 * dist
    for k in range(int(4 + R.integers(0, 4))):
        c = onset + R.uniform(0.0, 0.25 + 0.55 * sec * (0.35 + 0.4 * dist))
        w = R.uniform(0.25, 0.9) * (1 + dist)
        a = R.uniform(0.4, 1.0) * np.exp(-k * 0.25)
        env += a * np.exp(-0.5 * ((t - c) / w) ** 2)
    env *= np.exp(-np.maximum(0, t - onset) / (1.4 + 1.6 * dist))
    am = 1 + 0.35 * np.sin(2 * np.pi * R.uniform(3, 8) * t + R.uniform(0, 6)) * np.sin(2 * np.pi * R.uniform(0.4, 1.2) * t)
    out = rumble * env * am
    if dist < 0.55 and crack > 0:
        # the tearing crack: a burst of broadband ripping in the first ~0.4 s, then a low boom
        k = (0.55 - dist) / 0.55 * crack
        rip = np.zeros(L); pos = n(0.004)
        while pos < n(0.45):
            ln = int(R.integers(n(0.003), n(0.03)))
            seg = R.standard_normal(min(ln, L - pos)) * R.uniform(0.3, 1.0) * np.exp(-pos / n(0.25))
            rip[pos:pos + len(seg)] += seg
            pos += ln + int(R.integers(0, n(0.012)))
        rip = hp(rip, 900, 2) * 0.9 + bp(rip, 200, 2500, 2) * 0.6
        f = np.linspace(70, 32, L)
        boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9) * (t > 0.01)
        out = out * (0.8 + 0.4 * k) + rip * 1.4 * k + boom * 0.8 * k
    out = hp(out, 18, 2)
    return norm(out, 0.95 - 0.35 * dist)


def stormbed(sec, density=0.12, seed=3):
    """distant storm: very far thunder rolls scattered over the bed"""
    R = _r(seed); L = n(sec); out = np.zeros(L)
    tt = R.uniform(0, 3)
    while tt < sec:
        x = thunder(R.uniform(5, 8), dist=R.uniform(0.8, 1.0), seed=int(R.integers(0, 10 ** 6)))
        s = n(tt); e = min(L, s + len(x)); out[s:e] += x[: e - s] * R.uniform(0.4, 0.9)
        tt += R.exponential(1 / density)
    return out * 0.6


def rain(sec, heavy=0.6, seed=5):
    """steady rain in the open: hiss + scattered drops"""
    R = _r(seed); L = n(sec)
    hiss = bp(noise(sec, "pink"), 500, 9000, 2) * (0.5 + 0.5 * heavy)
    drops = np.zeros(L); k = int(sec * (120 + 600 * heavy))
    idx = R.integers(0, L - 400, k)
    for i in idx:
        drops[i:i + 200] += R.standard_normal(200) * np.exp(-np.arange(200) / R.uniform(15, 60)) * R.uniform(0.2, 1.0)
    drops = bp(drops, 1500, 7000, 2) * 0.6
    gust = 1 + 0.3 * lp(R.standard_normal(L), 0.4, 1) / 0.02
    return norm((hiss + drops) * np.clip(gust, 0.5, 1.6), 0.6)


def roofrain(sec, seed=6):
    """rain drumming on a truck roof / windscreen: denser, more resonant drops"""
    R = _r(seed); L = n(sec); x = np.zeros(L)
    idx = R.integers(0, L - 2400, int(sec * 900))
    for i in idx:
        ln = int(R.integers(300, 900))
        x[i:i + ln] += R.standard_normal(ln) * np.exp(-np.arange(ln) / (ln / 5)) * R.uniform(0.1, 0.6)
    x = bp(x, 900, 6500, 2) + lp(x, 700, 2) * 0.4
    bedn = lp(noise(sec, "pink"), 2500) * 0.35
    return norm(x * 0.5 + bedn, 0.55)


def gusts(sec, seed=7):
    """storm wind with gusts (band-limited noise, slow random swells)"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    base = bp(noise(sec, "pink"), 120, 1600, 2)
    env = 0.5 + 0.5 * np.clip(lp(R.standard_normal(L), 0.3, 1) * 60, -1, 1)
    whistle = bp(noise(sec), 700, 1100, 2) * np.clip(env - 0.6, 0, 1) * 0.8
    return norm(base * (0.35 + env) + whistle, 0.6)


def fire(sec, size=1.0, seed=8):
    """fire: low roar + crackles and pops"""
    R = _r(seed); L = n(sec)
    roar = lp(noise(sec, "brown"), 500) * 0.8 * size
    roar *= 1 + 0.4 * lp(R.standard_normal(L), 3, 1) / 0.05
    cr = np.zeros(L)
    for i in R.integers(0, L - 1200, int(sec * 40 * size)):
        ln = int(R.integers(60, 600)); cr[i:i + ln] += R.standard_normal(ln) * np.exp(-np.arange(ln) / (ln / 4)) * R.uniform(0.2, 1)
    cr = hp(cr, 1200, 2)
    return norm(roar + cr * 0.8, 0.6)


def arc(sec=0.7, seed=9):
    """electrical arc / transformer flash: buzzing 60 Hz harmonics + crackle burst"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    buzz = signal.sawtooth(2 * np.pi * 120 * t) * 0.4 + np.sign(np.sin(2 * np.pi * 60 * t)) * 0.2
    cr = R.standard_normal(L) * (R.random(L) < 0.08)
    x = (bp(buzz, 100, 3000, 2) + hp(cr, 2000, 2) * 1.5) * np.exp(-t / (sec / 3))
    return norm(x, 0.8)


def tinnitus(sec=4.0, f=6100.0):
    """a quiet high ring after a very close strike (restrained, fades)"""
    t = np.arange(n(sec)) / SR
    e = np.minimum(1, t / 0.08) * np.exp(-t / (sec / 2.5))
    return norm(np.sin(2 * np.pi * f * t) * e + 0.3 * np.sin(2 * np.pi * f * 1.003 * t) * e, 0.5)


def brook(sec, seed=10):
    """a mountain stream: band noise with fast bubbling modulation"""
    R = _r(seed); L = n(sec)
    a = bp(noise(sec, "pink"), 300, 3500, 2)
    b = bp(noise(sec), 1500, 6000, 2) * (0.5 + 0.5 * np.abs(lp(R.standard_normal(L), 12, 1)) * 30)
    return norm(a * 0.7 + b * 0.35, 0.55)


def heartbeat(sec=4.0, bpm=62):
    """low lub-dub thumps (science section)"""
    L = n(sec); t = np.arange(L) / SR; x = np.zeros(L)
    per = 60 / bpm
    for k in range(int(sec / per) + 1):
        for off, a in ((0, 1.0), (0.28, 0.65)):
            s = k * per + off
            m = (t >= s) & (t < s + 0.25)
            x[m] += a * np.sin(2 * np.pi * 48 * (t[m] - s)) * np.exp(-(t[m] - s) / 0.06)
    return norm(x, 0.9)


def truck(sec, rev=0.0, seed=11):
    """period pickup on the road: low engine burble + tyre hiss (wet road)"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    f0 = 34 + 6 * rev
    eng = sum(np.sin(2 * np.pi * f0 * h * t + R.uniform(0, 6)) / h for h in (1, 2, 3, 4, 6))
    eng *= 1 + 0.25 * np.sin(2 * np.pi * f0 / 2 * t)
    hiss = bp(noise(sec), 800, 5000, 2) * 0.35
    return norm(lp(eng, 400) * 0.8 + hiss, 0.55)


def silence(sec=1.0):
    return np.zeros(n(sec))


LIB.update(dict(thunder=thunder, arc=arc, tinnitus=tinnitus, heartbeat=heartbeat))
BEDS.update(dict(rain=rain, roofrain=roofrain, gusts=gusts, fire=fire, brook=brook, stormbed=stormbed, truck=truck))


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
    import inspect
    if "seed" in inspect.signature(BEDS[kind]).parameters:  # seeded generators: give the 2nd channel its own seed
        kw2 = dict(kw); kw2["seed"] = kw.get("seed", 0) + 101 + int(t0 * 10)
        x2 = BEDS[kind](sec, **kw2)
    else:
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
