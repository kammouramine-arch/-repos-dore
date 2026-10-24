"""SOMEONE IS IN THE POOL — original sound design (kit inherited from YOUR FOOD IS HERE and earlier UNKNOWN FILE episodes). Procedural only: synthesised from noise and decaying resonances,
no samples, no library loops, NO MUSIC (no licence-verified music was available, so none is used).
Inherits THE UNKNOWN FILE kit (THE LAST BUS HOME and earlier) and adds a doorbell / delivery kit:
doorbell chime, knuckle knocks + violent pounding, wet footsteps, lever handle, camera shutter, microphone pop,
doorbell-camera interference, distorted scream, scare stings, fridge hum, rain on glass, corridor fluorescent buzz.

Usage:  python3 tools/sfx.py p1|p2|p3   (run from the project root)
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



# ── THE SKIP BUTTON kit ─────────────────────────────────────────────────────────────────
def tap(sec=0.09, bright=1.0):
    """fingertip on glass: tiny damped knock + a hint of click"""
    L = n(sec); t = np.arange(L) / SR
    k = resonance(sec, [1900, 3100, 5200], [0.012, 0.007, 0.004], [0.6, 0.35 * bright, 0.2 * bright])
    return norm(k + lp(noise(sec, "pink"), 2500) * np.exp(-t / 0.006) * 0.5) * 0.5


def press(mood="play"):
    """the SKIP button: soft thock + an airy lift (warmer/brighter early, duller later)"""
    sec = 0.6; L = n(sec); t = np.arange(L) / SR
    th = resonance(sec, [180, 410], [0.05, 0.03], [0.8, 0.4])
    air = bp(noise(sec), 1800, 6500, 2) * np.exp(-t / (0.09 if mood == "play" else 0.05)) * (0.5 if mood == "play" else 0.25)
    shine = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.22) * a for f, a in ([(1568, 0.25), (2349, 0.18)] if mood == "play" else [(880, 0.12)] if mood == "uneasy" else []))
    return norm(th + air + shine) * 0.7


def skipfx(sec=0.9, mood="play"):
    """the recurring SKIP time-jump: a fast forward-smear of air, a pitch glide, a soft landing.
    play = bright and quick; uneasy = hollower; cold = grey, long, with a dropout of the room."""
    L = n(sec); t = np.arange(L) / SR
    up = whoosh(sec, 300, 7000 if mood == "play" else 4500, True)
    f = np.where(t < sec * 0.5, 220 + 1800 * (t / (sec * 0.5)) ** 2, 2000 * np.exp(-(t - sec * 0.5) * 10) + 120)
    glide = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / sec) ** 2 * (0.15 if mood == "play" else 0.08)
    land = np.zeros(L); s = n(sec * 0.5)
    land[s:] = impact(sec - sec * 0.5, 0.5)[: L - s] * (0.35 if mood != "cold" else 0.6)
    tickk = np.zeros(L)
    if mood != "play":
        for i in range(10):
            p = n(sec * (0.15 + i * 0.065)); tk = tick()[: L - p]; tickk[p:p + len(tk)] += tk * 0.5
    y = up * (1.0 if mood == "play" else 0.7) + glide + land + tickk
    if mood == "cold": y = lp(y, 2600)
    return norm(y) * 0.8


def ping(kind="message"):
    """notification: two short sine blips (UI sound, not musical phrase)"""
    sec = 0.5; t = np.arange(n(sec)) / SR
    a = np.sin(2 * np.pi * 1320 * t) * np.exp(-t / 0.06)
    b = np.zeros_like(t); s = n(0.11); b[s:] = (np.sin(2 * np.pi * 1760 * t[: len(t) - s]) * np.exp(-t[: len(t) - s] / 0.08))
    return norm(a + b) * 0.35


def ring(sec=2.0):
    """phone ringing: classic dual-tone bursts (440+480 Hz) — a signal, not music"""
    t = np.arange(n(sec)) / SR
    tone = (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * (((t % 1.2) < 0.55)).astype(float)
    tone *= (np.sin(2 * np.pi * 22 * t) * 0.15 + 0.85)
    return norm(lp(tone, 3000)) * 0.32


def vibrate(sec=0.8):
    t = np.arange(n(sec)) / SR
    buzz = lp(np.sign(np.sin(2 * np.pi * 150 * t)) * 0.6 + noise(sec, "brown") * 0.2, 900) * ((t % 0.4) < 0.25)
    return norm(buzz) * 0.35


def clocktick(sec=1.0, rate=1.0):
    L = n(sec); y = np.zeros(L)
    for i in range(int(sec * rate) + 1):
        s = n(i / rate)
        k = resonance(0.04, [2600, 4100], [0.004, 0.003], [0.6, 0.3])[: max(0, L - s)]
        y[s:s + len(k)] += k * (1.0 if i % 2 else 0.8)
    return norm(y) * 0.25


def step(soft=False, surface="floor"):
    sec = 0.22; L = n(sec); t = np.arange(L) / SR
    heel = lp(noise(sec, "brown"), 300 if soft else 520) * np.exp(-t / 0.03)
    scuff = bp(noise(sec), 900, 3500, 2) * np.exp(-((t - 0.05) / 0.03) ** 2) * (0.15 if surface == "floor" else 0.3)
    return norm(heel + scuff) * (0.35 if soft else 0.5)


def door(sec=1.8, open_=True):
    """front door: latch click, soft creak (narrow band, glided), wood thud"""
    L = n(sec); t = np.arange(L) / SR
    y = np.zeros(L)
    la = latch()[:L]; y[: len(la)] += la * 0.8
    f = 380 + 120 * np.sin(np.pi * np.clip(t / sec, 0, 1)) + 30 * np.sin(2 * np.pi * 7 * t)
    creak = bp(noise(sec), 300, 1200, 2) * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.clip((t - 0.15) / (sec * 0.7), 0, 1)) ** 2
    y += creak * 0.35
    return norm(y) * 0.6


def cup(sec=0.4):
    """ceramic cup set down / handed over"""
    t = np.arange(n(sec)) / SR
    return norm(resonance(sec, [2100, 3400, 5300], [0.06, 0.04, 0.02], [0.5, 0.3, 0.2]) + lp(noise(sec, "brown"), 400) * np.exp(-t / 0.02) * 0.6) * 0.4


def chair(sec=0.7):
    t = np.arange(n(sec)) / SR
    return norm(bp(noise(sec), 400, 1600, 2) * np.sin(np.pi * t / sec) ** 2 * 0.5 + lp(noise(sec, "brown"), 200) * np.exp(-((t - sec * 0.8) / 0.05) ** 2)) * 0.4


def laugh_soft(sec=1.4, seed=1):
    """two people laughing softly, wordless and far in the mix: breathy pulsed noise bursts"""
    R = np.random.default_rng(seed); t = np.arange(n(sec)) / SR
    y = np.zeros(len(t))
    for k in range(2):
        f0 = R.uniform(170, 260)
        pulses = np.clip(np.sin(2 * np.pi * R.uniform(4.5, 6) * t + R.uniform(0, 6)), 0, 1) ** 2 * np.exp(-t / (sec * 0.6))
        y += bp(noise(sec), f0 * 2, f0 * 8, 2) * pulses
    return norm(lp(y, 2500)) * 0.35


# beds
def cafe(sec):
    """café: room murmur, espresso hiss now and then, cup clinks"""
    L = n(sec); y = murmur(sec, 10) * 0.7 + room(sec) * 0.4
    R = np.random.default_rng(int(sec * 100))
    for _ in range(int(sec * 0.6)):
        s = n(R.uniform(0, sec)); c = cup()[: L - s] * R.uniform(0.2, 0.5); y[s:s + len(c)] += c
    for _ in range(int(sec / 9) + 1):
        s = n(R.uniform(0, sec)); h = hp(noise(min(1.6, sec)), 2500) * 0.12; h = h[: L - s] * np.sin(np.pi * np.linspace(0, 1, len(h[: L - s]))); y[s:s + len(h)] += h
    return norm(y) * 0.5


def office(sec):
    L = n(sec); y = room(sec) * 0.6
    R = np.random.default_rng(int(sec * 37))
    t = 0.0
    while t < sec:
        burst = R.uniform(0.6, 2.2)
        for k in range(int(burst * 7)):
            s = n(t + k / 7 + R.uniform(0, 0.04))
            if s < L:
                c = tap(0.05, 0.4)[: L - s] * 0.25; y[s:s + len(c)] += c
        t += burst + R.uniform(1.5, 4.0)
    return norm(y) * 0.45


def traffic(sec):
    L = n(sec); t = np.arange(L) / SR
    rumble = lp(noise(sec, "brown"), 140) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.1 * t))
    idle = lp(noise(sec, "pink"), 500) * 0.3
    return norm(rumble + idle) * 0.5


def busbed(sec):
    t = np.arange(n(sec)) / SR
    eng = lp(noise(sec, "brown"), 120) * (1 + 0.3 * np.sin(2 * np.pi * 26 * t))
    return norm(eng + room(sec) * 0.3) * 0.5


def park(sec):
    L = n(sec); t = np.arange(L) / SR
    y = lp(noise(sec, "pink"), 900) * 0.25 + wind(sec) * 0.4
    R = np.random.default_rng(int(sec * 13))
    for _ in range(int(sec * 0.5)):
        s = n(R.uniform(0, sec)); f = R.uniform(2800, 4600); d = R.uniform(0.08, 0.18)
        tt = np.arange(n(d)) / SR
        chirp = np.sin(2 * np.pi * (f + 900 * np.sin(2 * np.pi * 14 * tt)) * tt) * np.sin(np.pi * tt / d) * 0.15
        chirp = chirp[: L - s]; y[s:s + len(chirp)] += chirp
    return norm(y) * 0.45


def street(sec):
    return norm(traffic(sec) * 0.6 + lp(noise(sec, "pink"), 1600) * 0.25 + murmur(sec, 4) * 0.2) * 0.45


def apartment(sec):
    t = np.arange(n(sec)) / SR
    hum = lp(noise(sec, "brown"), 90) * 0.4 + np.sin(2 * np.pi * 50 * t) * 0.02
    return norm(room(sec) * 0.5 + hum) * 0.35


def bathroom(sec):
    return norm(bp(noise(sec, "pink"), 200, 2400, 2) * 0.5 + room(sec) * 0.3) * 0.35


def kitchen(sec):
    return norm(apartment(sec) * 0.8 + clocktick(sec, 1.0) * 0.6) * 0.4


def nighttown(sec):
    return norm(traffic(sec) * 0.25 + crickets(sec, 0.5) * 0.5 + wind(sec) * 0.2) * 0.4


def hush(sec):
    """near-silence: a thin, low room tone (grief scenes)"""
    return norm(lp(noise(sec, "pink"), 500) * 0.4) * 0.15


LIB.update(dict(tap=tap, press=press, skipfx=skipfx, ping=ping, ring=ring, vibrate=vibrate, clocktick=clocktick, step=step, door=door, cup=cup, chair=chair, laugh=laugh_soft))
BEDS.update(dict(cafe=cafe, office=office, traffic=traffic, busbed=busbed, park=park, street=street, apartment=apartment, bathroom=bathroom, kitchen=kitchen, nighttown=nighttown, hush=hush))




# ── THE LAST BUS HOME kit (horror: silence, hum, the bus) ───────────────────────────────
def busengine(sec, load=0.5, seed=21):
    """city bus diesel from inside: low firing pulse + gearbox whine + body rattle (no tone line)"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    rpm = 9.5 + 3.0 * load
    fire = np.clip(np.sin(2 * np.pi * rpm * t + 0.3 * np.sin(2 * np.pi * 0.2 * t)), 0, 1) ** 3
    body = lp(noise(sec, "brown"), 180) * (0.6 + 0.6 * fire)
    whine = bp(noise(sec), 600 + 300 * load, 760 + 340 * load, 2) * 0.08 * load
    rattle = bp(noise(sec), 2500, 6000, 2) * np.clip(lp(R.standard_normal(L), 3, 1) * 40, 0, 1) * 0.05
    return norm(body + whine + rattle) * 0.55


def idlebus(sec):
    return busengine(sec, 0.1, 22)


def drivebus(sec):
    return busengine(sec, 0.7, 23)


def hum(sec, f=100.0):
    """fluorescent tubes: mains buzz with harmonics + faint ballast hiss"""
    t = np.arange(n(sec)) / SR
    y = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 0.5), (2, 0.35), (3, 0.2), (5, 0.08)))
    y = y * (1 + 0.08 * np.sin(2 * np.pi * 0.3 * t)) + hp(noise(sec), 6000) * 0.05
    return norm(y) * 0.25


def busint(sec):
    """bus interior at night: engine through the floor + tube hum + window vibration"""
    return norm(drivebus(sec) * 0.8 + hum(sec) * 0.25 + bp(noise(sec, "pink"), 120, 400, 2) * 0.2) * 0.5


def busstill(sec):
    """bus stopped, engine idling"""
    return norm(idlebus(sec) * 0.7 + hum(sec) * 0.3) * 0.45


def deadbus(sec):
    """after the bell: engine off; only the tubes and a very low room"""
    return norm(hum(sec) * 0.5 + lp(noise(sec, "pink"), 300) * 0.15) * 0.25


def station(sec):
    """empty underground platform: big reverberant room tone, distant ventilation, far rumble"""
    L = n(sec); t = np.arange(L) / SR
    air = lp(noise(sec, "pink"), 700) * 0.4
    vent = bp(noise(sec), 180, 260, 2) * 0.3
    rumble = lp(noise(sec, "brown"), 60) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t) ** 2) * 0.5
    return norm(air + vent + rumble) * 0.4


def trainaway(sec=6.0):
    """the last train, already far down the tunnel: a fading rumble with a rail squeal"""
    L = n(sec); t = np.arange(L) / SR
    rum = lp(noise(sec, "brown"), 110) * np.exp(-t / (sec * 0.35))
    squeal = bp(noise(sec), 2800, 3300, 2) * np.exp(-((t - 0.8) / 0.6) ** 2) * 0.25
    clack = np.zeros(L)
    for i in range(8):
        s = n(0.2 + i * 0.42 * (1 + i * 0.12))
        if s < L - n(0.05): clack[s:s + n(0.05)] += lp(noise(0.05, "brown"), 300) * np.exp(-np.arange(n(0.05)) / (0.01 * SR)) * np.exp(-s / (sec * 0.3 * SR))
    return norm(rum + squeal + clack * 0.6) * 0.7


def nightrain(sec):
    """street at night in the rain: rain + far traffic + sodium-lamp buzz"""
    return norm(rain(sec, 0.5) * 0.8 + traffic(sec) * 0.25 + hum(sec, 120) * 0.04) * 0.5


def hydraulic(sec=1.4, open_=True):
    """bus door: pneumatic hiss + fold mechanism + end clunk"""
    L = n(sec); t = np.arange(L) / SR
    hs = bp(noise(sec), 1800, 9000, 2) * (np.exp(-t / 0.35) if open_ else np.exp(-t / 0.2)) * 0.7
    mech = bp(noise(sec, "pink"), 300, 1400, 2) * np.clip(np.sin(np.pi * t / (sec * 0.6)), 0, 1) * 0.4
    clunk = np.zeros(L); s = n(sec * (0.55 if open_ else 0.35))
    c = impact(0.5, 0.6)[: L - s] * 0.8; clunk[s:s + len(c)] += c
    return norm(hs + mech + clunk) * 0.8


def doorslam(sec=1.2):
    """the bus doors slamming shut: fast hiss, hard rubber-and-metal impact, rattle tail"""
    L = n(sec); t = np.arange(L) / SR
    hs = bp(noise(sec), 2000, 8000, 2) * np.exp(-t / 0.08) * 0.5
    hit = impact(sec, 1.2)
    ring_ = resonance(sec, [310, 870, 1450, 2230], [0.12, 0.08, 0.05, 0.03], [0.3, 0.25, 0.15, 0.1])
    return norm(hs + hit + ring_ * 0.6) * 0.95


def brakes(sec=2.4, squeal=0.5):
    """air brakes: tyre-and-road swell, a short squeal, the air-release pfff"""
    L = n(sec); t = np.arange(L) / SR
    road = lp(noise(sec, "brown"), 400) * np.clip(1 - t / (sec * 0.7), 0, 1) * 0.6
    sq = bp(noise(sec), 2300, 2700, 3) * np.exp(-((t - sec * 0.5) / (sec * 0.15)) ** 2) * squeal * 0.4
    air = np.zeros(L); s = n(sec * 0.72)
    a = bp(noise(sec - sec * 0.72), 1500, 9000, 2) * np.exp(-np.arange(L - s) / (0.12 * SR)); air[s:] = a * 0.8
    return norm(road + sq + air) * 0.8


def ding(sec=2.2, eerie=0.0):
    """the stop-request bell: a single struck chime (two partials) — the bell the story is about"""
    t = np.arange(n(sec)) / SR
    y = (np.sin(2 * np.pi * 1046 * t) * 0.8 + np.sin(2 * np.pi * 2093 * t + 0.4) * 0.3 + np.sin(2 * np.pi * 2795 * t) * 0.12) * np.exp(-t / 0.55)
    strike = hp(noise(sec), 3000) * np.exp(-t / 0.004) * 0.3
    if eerie > 0:  # Night 3: a slower decay and a slight detuned beat
        y += np.sin(2 * np.pi * 1052 * t) * np.exp(-t / 0.9) * 0.4 * eerie
    return norm(y + strike) * 0.6


def flick(sec=0.35):
    """a fluorescent tube dropping out and striking again: buzz-click-buzz"""
    L = n(sec); t = np.arange(L) / SR
    z = np.sign(np.sin(2 * np.pi * 100 * t)) * bp(noise(sec), 200, 3000, 2) * 0.3
    k = np.zeros(L)
    for p in (0.0, sec * 0.6):
        s = n(p); kk = resonance(0.03, [3200, 5100], [0.004, 0.003], [0.6, 0.3])[: L - s]; k[s:s + len(kk)] += kk
    return norm(z * (t > sec * 0.1) * (t < sec * 0.55) + k) * 0.5


def blackout(sec=1.0):
    """the lights die: a thump of relays and the hum cutting to nothing"""
    L = n(sec); t = np.arange(L) / SR
    k = impact(sec, 0.4) * 0.6
    h = hum(sec) * np.exp(-t / 0.05)
    return norm(k + h) * 0.7


def relight(sec=0.8):
    """tubes striking back on: ticks then hum swelling"""
    L = n(sec); t = np.arange(L) / SR
    tk = sum(np.roll(resonance(sec, [3500], [0.004], [0.5]), n(x)) for x in (0.0, 0.12, 0.2))
    return norm(tk + hum(sec) * np.clip(t / (sec * 0.6), 0, 1)) * 0.6


def dread(sec, seed=31):
    """non-melodic sub rumble that swells slowly (sound design, not music: no pitch, no rhythm)"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    x = lp(noise(sec, "brown"), 70) * (0.6 + 0.4 * np.clip(lp(R.standard_normal(L), 0.15, 1) * 60, -1, 1))
    air = bp(noise(sec, "pink"), 900, 2600, 2) * 0.06
    return norm(x + air) * 0.55


def cloth(sec=0.6):
    """hoodie fabric rustle (sitting, standing, reaching)"""
    L = n(sec); t = np.arange(L) / SR
    x = bp(noise(sec, "pink"), 1200, 6000, 2) * np.sin(np.pi * t / sec) ** 1.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t))
    return norm(x) * 0.3


def seat(sec=0.7):
    """sitting onto a vinyl/moquette bus seat: soft thump + creak"""
    L = n(sec); t = np.arange(L) / SR
    th = lp(noise(sec, "brown"), 220) * np.exp(-t / 0.08)
    cr = bp(noise(sec), 700, 1100, 3) * np.exp(-((t - 0.18) / 0.08) ** 2) * 0.3
    return norm(th + cr + cloth(sec) * 0.5) * 0.5


def rattle(sec=1.5):
    """window glass vibrating in its frame"""
    L = n(sec); t = np.arange(L) / SR
    x = bp(noise(sec), 1600, 4200, 2) * np.clip(np.sin(2 * np.pi * 21 * t), 0, 1) ** 6 * np.sin(np.pi * t / sec)
    return norm(x) * 0.3


def whisper(sec=1.6):
    """breathy phone-line air under a whispered line (the line itself is the narrator)"""
    L = n(sec); t = np.arange(L) / SR
    x = bp(noise(sec, "pink"), 2000, 7000, 2) * np.sin(np.pi * t / sec) ** 2
    line = bp(noise(sec), 300, 3400, 2) * 0.1
    return norm(x + line) * 0.35


def switch(sec=0.2):
    t = np.arange(n(sec)) / SR
    return norm(resonance(sec, [1800, 3400], [0.01, 0.006], [0.6, 0.3]) + lp(noise(sec), 2000) * np.exp(-t / 0.004) * 0.6) * 0.5


def camstatic(sec):
    return static(sec, 0.0, 3) * 0.4 + hum(sec, 60) * 0.05


def heartbeat2(sec=4.0, bpm=78):
    return heartbeat(sec, bpm)


def aptdoor(sec=1.6):
    return door(sec, True)


def scrape(sec=1.2):
    """fingers brushing dust off metal under the seat"""
    L = n(sec); t = np.arange(L) / SR
    x = bp(noise(sec), 2500, 8000, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t) ** 2) * np.sin(np.pi * t / sec)
    return norm(x) * 0.3


def cordpull(sec=0.4):
    """the cord snapping taut: a dry creak and a click in the bell mechanism"""
    L = n(sec); t = np.arange(L) / SR
    cr = bp(noise(sec), 900, 1600, 3) * np.exp(-t / 0.06) * 0.5
    ck = resonance(sec, [2400, 3900], [0.01, 0.006], [0.5, 0.3])
    return norm(cr + ck) * 0.5


def drag(sec=0.9):
    """a shoe dragged backward across the ribbed floor"""
    L = n(sec); t = np.arange(L) / SR
    x = bp(noise(sec), 500, 3000, 2) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 26 * t))) * np.sin(np.pi * t / sec)
    return norm(x) * 0.45


def pull(sec=2.5):
    """the invisible pull: an inward low air swell (no pitch)"""
    L = n(sec); t = np.arange(L) / SR
    x = lp(noise(sec, "brown"), 120) * (t / sec) ** 2 + bp(noise(sec, "pink"), 300, 1200, 2) * np.sin(np.pi * t / sec) * 0.3
    return norm(x) * 0.6


def busaway(sec=4.6):
    """the bus pulling away: engine load rising then fading round the corner"""
    L = n(sec); t = np.arange(L) / SR
    x = busengine(sec, 0.9, 27) * np.clip(1 - (t / sec) ** 1.5, 0, 1) * (0.6 + 0.4 * np.clip(t / 0.8, 0, 1))
    return norm(lp(x, 1800 - 1200 * 0) ) * 0.8


def tvroom(sec):
    return norm(tv(sec) * 0.35 + apartment(sec) * 0.8) * 0.4


LIB.update(dict(busaway=busaway, hydraulic=hydraulic, doorslam=doorslam, brakes=brakes, ding=ding, flick=flick, blackout=blackout, relight=relight, cloth=cloth, seat=seat,
                rattle=rattle, whisper=whisper, switch=switch, trainaway=trainaway, aptdoor=aptdoor, scrape=scrape, cordpull=cordpull, drag=drag, pull=pull, heartbeat2=heartbeat2))
BEDS.update(dict(busint=busint, busstill=busstill, deadbus=deadbus, station=station, nightrain=nightrain, dread=dread, hum=hum, camstatic=camstatic, tvroom=tvroom, idlebus=idlebus, drivebus=drivebus))




# ── YOUR FOOD IS HERE kit ───────────────────────────────────────────────────────────────
def _verb(x, sec=0.6, wet=0.25, lo=300, hi=5000):
    """small-room reflections: decaying filtered noise convolution"""
    L = n(sec); ir = noise(sec) * np.exp(-np.arange(L) / (0.12 * SR)); ir = bp(ir, lo, hi, 2)
    ir /= np.sum(np.abs(ir)) + 1e-9
    y = signal.fftconvolve(x, ir)[: len(x)] * 40
    return x * (1 - wet) + y * wet


def doorbell(sec=2.6, muffled=False):
    """two-tone apartment chime (ding-dong): struck bars with slightly inharmonic partials"""
    L = n(sec); t = np.arange(L) / SR; y = np.zeros(L)
    for start, f in ((0.0, 659.3), (0.42, 523.3)):
        tt = np.clip(t - start, 0, None); on = t >= start
        bar = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / tau) for m, a, tau in ((1, 1.0, 0.9), (2.76, 0.35, 0.25), (5.4, 0.15, 0.08), (0.5, 0.12, 1.2)))
        hit = bp(noise(sec), 2000, 6000, 2) * np.exp(-tt / 0.004) * 0.2
        y += (bar + hit) * on
    y = _verb(y, 0.8, 0.3)
    if muffled:
        y = lp(y, 1600)
    return norm(y) * 0.8


def knock(heavy=0.6, muffled=False, seed=0):
    """knuckles on a solid door: low body thump + woody mid + knuckle click"""
    R = _r(seed); sec = 0.5; L = n(sec); t = np.arange(L) / SR
    body = resonance(sec, [95 * R.uniform(0.95, 1.05), 170, 260], [0.09, 0.05, 0.03], [1.0, 0.5 * heavy, 0.3])
    wood = resonance(sec, [620 * R.uniform(0.9, 1.1), 980, 1500], [0.02, 0.014, 0.008], [0.5, 0.35, 0.2])
    clk = bp(noise(sec), 1500, 6000, 2) * np.exp(-t / 0.003) * 0.6
    y = body * (0.6 + heavy) + wood + clk * (1 - 0.7 * muffled)
    if muffled:
        y = lp(y, 700)
    return norm(_verb(y, 0.5, 0.25)) * (0.6 + 0.4 * heavy)


def pound(sec=3.5, rate=4.2, seed=3):
    """violent pounding on the front door: fist blows, frame rattle, chain jingling"""
    R = _r(seed); L = n(sec); y = np.zeros(L)
    tt = 0.0; k = 0
    while tt < sec - 0.3:
        x = knock(1.0, False, seed + k) * R.uniform(0.75, 1.0)
        x = x + lp(noise(0.5, "brown"), 120) * np.exp(-np.arange(n(0.5)) / (0.05 * SR)) * 0.8
        s = n(tt); y[s:s + len(x)] += x[: L - s]
        tt += 1 / rate * R.uniform(0.7, 1.3); k += 1
    rat = rattle(sec) * 0.35 if "rattle" in LIB else 0
    chain = bp(noise(sec), 3000, 9000, 2) * (np.abs(np.sin(np.arange(L) / SR * 13)) ** 4) * 0.08
    return norm(y + rat + chain) * 0.95


def wetstep(seed=0, heavy=0.8):
    """a slow, heavy step in wet shoes on the corridor carpet: heel thud + squelch"""
    R = _r(seed); sec = 0.55; L = n(sec); t = np.arange(L) / SR
    thud = lp(noise(sec, "brown"), 180) * np.exp(-t / 0.06) * heavy
    sq = bp(noise(sec), 900, 3200, 2) * np.exp(-np.maximum(0, t - 0.06) / 0.09) * (t > 0.05) * 0.45
    drip_ = sum(np.sin(2 * np.pi * R.uniform(1800, 2600) * t) * np.exp(-np.maximum(0, t - d) / 0.01) * (t > d) * 0.15 for d in R.uniform(0.08, 0.3, 3))
    return norm(thud + sq + drip_) * 0.7


def handle(sec=1.4, slow=1.0):
    """lever handle pushed down slowly: latch scrape, spring tension creak, release"""
    L = n(sec); t = np.arange(L) / SR
    creak = bp(noise(sec), 900, 2400, 4) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 23 * t * slow))) * np.clip(t / 0.2, 0, 1) * np.exp(-t / (0.9 * slow))
    latch_ = resonance(sec, [1800, 2900, 4300], [0.02, 0.012, 0.006], [0.5, 0.35, 0.2])
    s = n(sec * 0.75); latch_ = np.concatenate([np.zeros(s), latch_[: L - s]])
    return norm(creak * 0.7 + latch_ * 0.6) * 0.6


def shutter(sec=0.45):
    """phone/camera shutter: two crisp mechanical clicks + a short whirr"""
    L = n(sec); t = np.arange(L) / SR; y = np.zeros(L)
    for d, a in ((0.0, 1.0), (0.085, 0.8)):
        tt = np.clip(t - d, 0, None)
        y += (bp(noise(sec), 2500, 9000, 2) * np.exp(-tt / 0.004) + resonance(sec, [3200, 5100], [0.006, 0.004], [0.4, 0.3])) * (t >= d) * a
    y += bp(noise(sec), 1200, 3000, 2) * np.exp(-((t - 0.04) / 0.03) ** 2) * 0.2
    return norm(y) * 0.8


def micpop(sec=0.9):
    """doorbell app microphone opening: pop, then hissy live line"""
    L = n(sec); t = np.arange(L) / SR
    pop = lp(noise(sec), 400) * np.exp(-t / 0.02)
    line = bp(noise(sec), 800, 6000, 2) * 0.12 * np.clip((t - 0.05) / 0.1, 0, 1)
    return norm(pop + line) * 0.6


def interference(sec=1.2, seed=0):
    """digital doorbell-camera breakup: buzz, bit-crushed bursts"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    buzz = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.3 + np.sign(np.sin(2 * np.pi * 977 * t)) * 0.08
    gate = (np.sin(2 * np.pi * R.uniform(7, 13) * t + R.uniform(0, 6)) > 0.2)
    crush = np.round(noise(sec) * 6) / 6
    return norm((buzz + crush * 0.6) * gate * np.exp(-t / (sec * 0.8))) * 0.55


def scream(sec=2.2, seed=0):
    """the phone blasting a distorted scream: a strained voiced source with formants, pitch climbing, clipped hard"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    f0 = 330 + 180 * np.clip(t / 0.5, 0, 1) + 25 * np.sin(2 * np.pi * 6.5 * t) + 15 * R.standard_normal(L).cumsum() / np.sqrt(L)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    src = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 30)) + noise(sec) * 0.6
    y = sum(bp(src, f * 0.85, f * 1.15, 2) * a for f, a in ((800, 1.0), (1250, 0.8), (2800, 0.6), (3600, 0.4)))
    y = np.tanh(norm(y) * 6.0)
    y = np.round(y * 10) / 10
    y = hp(y, 300) * np.clip(t / 0.03, 0, 1) * np.clip((sec - t) / 0.25, 0, 1)
    return norm(y) * 0.95


def sting(sec=3.0, seed=0, high=1.0):
    """scare hit (sound design, not music): sub drop + metallic smash + dissonant screech that decays"""
    R = _r(seed); L = n(sec); t = np.arange(L) / SR
    sub = np.sin(2 * np.pi * (55 - 25 * np.clip(t / 0.8, 0, 1)) * t) * np.exp(-t / 0.9)
    hit = impact(sec, 1.0)[:L] if "impact" in LIB else 0
    screech = sum(np.sin(2 * np.pi * f * t + R.uniform(0, 6)) for f in (1720, 1810, 2650, 3990)) * 0.15 * np.exp(-t / 0.7) * high
    screech = screech * (1 + 0.6 * np.sin(2 * np.pi * 9 * t))
    smash = bp(noise(sec), 400, 7000, 2) * np.exp(-t / 0.18) * 0.7
    return norm(sub * 1.2 + hit + screech + smash) * 0.95


def glitch(sec=0.6, seed=0):
    R = _r(seed); L = n(sec); y = np.zeros(L)
    for k in range(int(R.integers(5, 10))):
        a = R.integers(0, L - n(0.04)); d = n(R.uniform(0.01, 0.05))
        y[a:a + d] += np.sign(np.sin(2 * np.pi * R.uniform(200, 3000) * np.arange(d) / SR)) * R.uniform(0.3, 1.0)
    return norm(bp(y, 150, 9000, 2)) * 0.6


def fridge(sec):
    """kitchen fridge: 50 Hz hum + compressor rumble + faint rattle"""
    L = n(sec); t = np.arange(L) / SR
    hum_ = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((50, 1.0), (100, 0.5), (150, 0.2)))
    comp = lp(noise(sec, "brown"), 140) * 0.6
    return norm(hum_ * 0.5 + comp) * 0.35


def rainglass(sec, seed=12):
    """rain heard from inside: dense hiss through glass + irregular drips on the sill"""
    R = _r(seed); L = n(sec)
    body = lp(bp(noise(sec, "pink"), 300, 6000, 2), 3500)
    drops = np.zeros(L)
    for p in R.integers(0, L - n(0.02), int(sec * 14)):
        d = n(0.012); drops[p:p + d] += np.sin(2 * np.pi * R.uniform(2500, 4500) * np.arange(d) / SR) * np.exp(-np.arange(d) / (0.003 * SR)) * R.uniform(0.2, 0.6)
    return norm(body * 0.8 + drops * 0.5) * 0.5


def fluoro(sec):
    """corridor fluorescent tubes: 100/120 Hz buzz with harmonics"""
    L = n(sec); t = np.arange(L) / SR
    b = sum(np.sin(2 * np.pi * 100 * k * t) / k ** 1.3 for k in range(1, 12))
    return norm(b * (1 + 0.1 * np.sin(2 * np.pi * 0.3 * t)) + bp(noise(sec), 2000, 6000, 2) * 0.05) * 0.3


def roomtone(sec):
    """quiet apartment at 3 a.m.: low air, distant city"""
    return norm(lp(noise(sec, "brown"), 200) + bp(noise(sec, "pink"), 200, 1200, 2) * 0.15) * 0.3


def phonebreath(sec=4.0, seed=0):
    """slow, wet breathing heard through a phone earpiece (band-limited, compressed)"""
    b = breath(sec, tense=0.7)
    return norm(np.tanh(bp(b, 300, 3400, 4) * 3)) * 0.6


def nearbreath(sec=3.0):
    """breathing right beside the ear in total darkness: close, slow, slightly wet"""
    b = breath(sec, tense=0.3)
    return norm(lp(b, 5000) + bp(noise(sec), 2000, 7000, 2) * 0.05 * np.abs(np.sin(np.arange(n(sec)) / SR * np.pi / 1.5))) * 0.8


def thud(sec=0.8):
    """phone hitting the floor"""
    L = n(sec); t = np.arange(L) / SR
    return norm(resonance(sec, [140, 520, 2400], [0.03, 0.02, 0.006], [1.0, 0.5, 0.3]) + bp(noise(sec), 1500, 7000, 2) * np.exp(-t / 0.01) * 0.5) * 0.8


def lightsout(sec=1.2):
    """every light dies at once: breaker clunk + mains hum cut + ring-down"""
    L = n(sec); t = np.arange(L) / SR
    clunk = resonance(sec, [90, 240, 900], [0.06, 0.03, 0.01], [1, 0.4, 0.2])
    hum_ = np.sin(2 * np.pi * 100 * t) * 0.3 * (t < 0.06)
    return norm(clunk + hum_) * 0.85


LIB.update(dict(doorbell=doorbell, knock=knock, pound=pound, wetstep=wetstep, handle=handle, shutter=shutter, micpop=micpop,
                interference=interference, scream=scream, sting=sting, glitch=glitch, phonebreath=phonebreath, nearbreath=nearbreath,
                thud=thud, lightsout=lightsout))
BEDS.update(dict(fridge=fridge, rainglass=rainglass, fluoro=fluoro, roomtone=roomtone))


# ── SOMEONE IS IN THE POOL kit ──────────────────────────────────────────────────────────
def poolroom(sec, seed=40):
    """big tiled hall at night: ventilation rumble, filter pump hum, distant water lapping in the gutter, long tail"""
    r = np.random.default_rng(seed)
    vent = lp(noise(sec, "brown"), 220) * 0.6 + bp(noise(sec, "pink"), 300, 1400) * 0.12
    t = np.arange(n(sec)) / SR
    pump = (np.sin(2 * np.pi * 50 * t) * 0.5 + np.sin(2 * np.pi * 100 * t) * 0.3 + np.sin(2 * np.pi * 150 * t) * 0.1) * 0.08
    pump *= 1 + 0.15 * np.sin(2 * np.pi * 0.21 * t)
    lap = bp(noise(sec, "pink"), 400, 1600) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.33 * t + r.uniform(0, 6))) ** 3 * 0.18
    return norm(vent + pump + lap) * 0.8


def office_hum(sec):
    t = np.arange(n(sec)) / SR
    return norm(np.sin(2 * np.pi * 120 * t) * 0.3 + np.sin(2 * np.pi * 240 * t) * 0.1 + hp(noise(sec, "pink"), 4000) * 0.05 + lp(noise(sec, "brown"), 150) * 0.3) * 0.6


def crt(sec):
    """monitor whine + faint scan buzz"""
    t = np.arange(n(sec)) / SR
    return norm(np.sin(2 * np.pi * 15734 * t) * 0.15 + np.sin(2 * np.pi * 60 * t) * 0.2 + bp(noise(sec), 2000, 6000) * 0.04) * 0.5


def uwdrone(sec, seed=41):
    """the underwater drone under the CCTV feed of the deep end: muffled, pressure-like, slow beating"""
    t = np.arange(n(sec)) / SR
    b = lp(noise(sec, "brown"), 160) * 0.7
    tone = (np.sin(2 * np.pi * 41 * t) + 0.7 * np.sin(2 * np.pi * 41.7 * t) + 0.3 * np.sin(2 * np.pi * 83 * t)) * 0.25
    bub = np.zeros(n(sec)); r = np.random.default_rng(seed)
    for _ in range(int(sec * 1.2)):
        s = r.integers(0, max(1, n(sec) - n(0.3))); bb = bubble(r.uniform(300, 900), 0.2) * r.uniform(0.05, 0.2)
        bub[s:s + len(bb)] += bb[: n(sec) - s]
    return norm(b + tone + lp(bub, 1500))


def uwknock(seed=0, weight=1.0):
    """a knock heard through 3 m of water and a concrete slab: dull, low, with a watery ring"""
    r = np.random.default_rng(seed + 50)
    L = n(1.4)
    k = lp(noise(0.05) * decay(n(0.05), 0.012), 600)
    k = np.pad(k, (0, L - len(k)))
    body = resonance(1.4, [52, 78, 131, 210], [0.45, 0.3, 0.18, 0.1], [1.0, 0.6, 0.3, 0.15])
    x = k * 0.8 + body[:L] * decay(L, 0.35) * weight
    x = lp(x, 900)
    x = _verb(x, 1.2, 0.35, 80, 1200)
    return norm(x) * (0.8 + 0.2 * r.random())


def lapping(sec=1.5):
    """water slapping the coping after a disturbance"""
    x = bp(noise(sec, "pink"), 300, 2500) * env_adsr(n(sec), 0.05, 0.3, 0.4, 0.8)
    return norm(x * (0.6 + 0.4 * np.sin(np.linspace(0, 14, n(sec))) ** 2)) * 0.7


def tilestep(seed=0, wet=0.0):
    r = np.random.default_rng(seed + 60)
    L = n(0.35)
    heel = bp(noise(0.35), 150, 3000) * decay(L, 0.02)
    sole = bp(noise(0.35), 800, 6000) * decay(L, 0.04) * 0.4
    x = heel + sole
    if wet:
        x += bp(noise(0.35), 1500, 7000) * decay(L, 0.08) * 0.5 * wet
    return norm(_verb(x, 0.9, 0.3, 200, 5000)) * r.uniform(0.75, 1.0)


def castors(sec=1.4):
    x = bp(noise(sec, "pink"), 600, 4000) * env_adsr(n(sec), 0.05, 0.2, 0.6, 0.5)
    t = np.arange(n(sec)) / SR
    return norm(x * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * t)) + 0.2 * np.sin(2 * np.pi * 900 * t) * env_adsr(n(sec), 0.1, 0.2, 0.3, 0.6)) * 0.8


def ballast(sec=0.6):
    """fluorescent tube striking: ticks + rising hum"""
    t = np.arange(n(sec)) / SR
    hum_ = np.sin(2 * np.pi * 100 * t) * np.linspace(0, 1, n(sec)) * 0.3
    ticks = np.zeros(n(sec))
    for k in range(5):
        s = n(0.05 + 0.08 * k); c = click(True)[: n(sec) - s]; ticks[s:s + len(c)] += c * 0.6
    return norm(hum_ + ticks) * 0.8


def alarm(sec=0.5):
    t = np.arange(n(sec)) / SR
    x = np.sign(np.sin(2 * np.pi * 2400 * t)) * 0.3 * env_adsr(n(sec), 0.005, 0.02, 0.9, 0.02)
    return lp(x, 6000)


def radio_static(sec, seed=0):
    r = np.random.default_rng(seed + 70)
    x = bp(noise(sec), 600, 3800)
    t = np.arange(n(sec)) / SR
    am = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * r.uniform(2, 5) * t + r.uniform(0, 6)))
    crack = (r.random(n(sec)) > 0.9993).astype(float) * r.uniform(0.5, 1.0)
    return norm(x * am + lp(crack, 3000) * 2.0) * 0.8


def squelch(on=True):
    L = n(0.25)
    x = bp(noise(0.25), 800, 4000) * (decay(L, 0.06) if on else np.linspace(1, 0, L) ** 3)
    t = np.arange(L) / SR
    return norm(x + 0.3 * np.sin(2 * np.pi * 1600 * t) * decay(L, 0.03)) * 0.9


def knob(sec=0.15):
    return norm(click(False)[: n(sec)] + bp(noise(sec), 2000, 8000) * decay(n(sec), 0.01) * 0.3)


def glasscrack(sec=1.6, seed=0):
    r = np.random.default_rng(seed + 80)
    L = n(sec)
    crack = hp(noise(sec), 2500) * decay(L, 0.04)
    tinkle = np.zeros(L)
    for _ in range(18):
        s = int(r.integers(n(0.02), n(0.8))); f = r.uniform(3000, 9000)
        tt = np.arange(L - s) / SR
        tinkle[s:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / r.uniform(0.02, 0.08)) * r.uniform(0.1, 0.4)
    return norm(crack + tinkle + impact(sec, 0.6)[:L] * 0.4)


def doorslam2(sec=1.4):
    return norm(doorslam(sec)[: n(sec)] + impact(sec, 1.2)[: n(sec)] * 0.6)


def crtoff(sec=0.7):
    """a monitor switching off: thump + collapsing whine"""
    t = np.arange(n(sec)) / SR
    f = 15734 * np.exp(-t * 10)
    wh = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.2
    th = lp(noise(sec), 200) * decay(n(sec), 0.05)
    return norm(wh + th) * 0.8


def valve(sec=1.6):
    t = np.arange(n(sec)) / SR
    sq = np.sin(2 * np.pi * (700 + 300 * np.sin(2 * np.pi * 0.8 * t)) * t) * 0.15 * env_adsr(n(sec), 0.1, 0.3, 0.6, 0.4)
    grind = bp(noise(sec), 300, 2500) * env_adsr(n(sec), 0.05, 0.3, 0.5, 0.4) * 0.4
    thunk = np.pad(impact(0.4, 0.4)[: n(0.4)], (n(sec) - n(0.4), 0)) * 0.6
    return norm(sq + grind + thunk)


def trickle(sec, seed=0):
    return water(sec, 14.0, 700, 3000) * 0.8


def carlock(sec=0.4):
    x = np.zeros(n(sec))
    for k in range(4):
        s = n(0.02 + 0.06 * k); c = click(True)[: n(sec) - s]; x[s:s + len(c)] += c * (0.5 + 0.2 * k)
    return norm(lp(x, 5000) + lp(noise(sec), 300) * decay(n(sec), 0.05) * 0.5)


def ignition(sec=3.5):
    t = np.arange(n(sec)) / SR
    crank = bp(noise(sec), 100, 800) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t))) * (t < 0.9) * 0.7
    idle = engine(sec)[: n(sec)] * np.clip((t - 0.7) * 2, 0, 1) * 0.8
    return norm(crank + idle)


def cardoor(sec=1.0):
    return norm(lp(impact(sec, 0.8)[: n(sec)], 1500) + bp(noise(sec), 200, 1200) * decay(n(sec), 0.06) * 0.6)


def glasstap(seed=0):
    L = n(0.3)
    x = hp(noise(0.3), 1500) * decay(L, 0.006) + resonance(0.3, [1200, 2650], [0.03, 0.02], [0.4, 0.2])[:L]
    return norm(x) * 0.9


def seatknock(seed=0):
    """knuckles on the back of the driver's seat: dull, upholstered, close"""
    L = n(0.5)
    x = lp(noise(0.5), 400) * decay(L, 0.02) + resonance(0.5, [95, 160], [0.06, 0.04], [1.0, 0.4])[:L]
    return norm(x)


def deep(sec=4.0):
    """sub-bass pressure swell that sits under a scare"""
    t = np.arange(n(sec)) / SR
    return norm(np.sin(2 * np.pi * 36 * t) * env_adsr(n(sec), sec * 0.7, 0.1, 0.9, 0.3) + lp(noise(sec, "brown"), 90) * 0.3)


def carint(sec):
    return norm(lp(noise(sec, "brown"), 120) * 0.6 + bp(noise(sec, "pink"), 200, 800) * 0.05) * 0.5


def streetnight(sec):
    return norm(lp(noise(sec, "brown"), 300) * 0.6 + bp(noise(sec, "pink"), 500, 3000) * 0.08) * 0.6


LIB.update(dict(uwknock=uwknock, lapping=lapping, tilestep=tilestep, castors=castors, ballast=ballast, alarm=alarm, squelch=squelch, knob=knob,
                glasscrack=glasscrack, doorslam2=doorslam2, crtoff=crtoff, valve=valve, carlock=carlock, ignition=ignition, cardoor=cardoor,
                glasstap=glasstap, seatknock=seatknock, deep=deep))
BEDS.update(dict(poolroom=poolroom, office_hum=office_hum, crt=crt, uwdrone=uwdrone, radio_static=radio_static, trickle=trickle, carint=carint,
                 streetnight=streetnight))


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
    segs = json.load(open(cues.WORDS))
    tokens = [w | {"w": w["w"]} for sg in segs for w in sg["words"]]
    find, seq = cue_finder(tokens)
    dur = cues.DURATION
    amb = np.zeros((2, n(dur))); fx = np.zeros((2, n(dur)))
    events, beds = cues.build(find, seq)
    for b in beds:
        bed(amb, **b)
    for e in events:
        kind = e.pop("kind"); t = e.pop("t"); g = e.pop("db", 0.0); pan = e.pop("pan", 0.0)
        gen = LIB.get(kind) or BEDS.get(kind) or globals()[kind]      # any library sound, bed or generator can be a one-shot
        place(fx, gen(**e), t, g, pan)
    trim = 10 ** (getattr(cues, "TRIM_DB", 0.0) / 20)      # per-episode overall effects trim (narration stays primary)
    amb *= trim; fx *= trim
    buf = amb + fx
    va0 = voice_envelope(cues.NARRATION, buf.shape[1]); dk = 10 ** (-7 * va0 / 20)
    # separate, editable stems (ambience beds / spot effects), both already ducked under the voice
    import os; os.makedirs("audio/stems", exist_ok=True)
    wavfile.write(f"audio/stems/{name}_ambience.wav", SR, (np.clip((amb * dk).T, -1, 1) * 32767).astype(np.int16))
    wavfile.write(f"audio/stems/{name}_effects.wav", SR, (np.clip((fx * dk).T, -1, 1) * 32767).astype(np.int16))
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
