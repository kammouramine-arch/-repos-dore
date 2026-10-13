"""THE UNKNOWN FILE — WHAT IF? #001 original score (composed in code for this production).

No samples, loops, presets or third-party recordings: every note is synthesised here (additive pads, a soft
piano-like voice, a low pulse) and placed through a convolution reverb whose impulse response is generated noise.
The score is an original work of the production; it carries no third-party licence and no Content ID registration.

Usage: python3 tools/music.py short|long      → audio/master/<name>_music.wav (stereo stem, un-ducked)
The cue sheet (sections, chords, timing) is in score_<name>() below and follows the narration's story beats.
"""
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
rng = np.random.default_rng(1969)
A4 = 440.0
NOTE = {"C": -9, "C#": -8, "Db": -8, "D": -7, "D#": -6, "Eb": -6, "E": -5, "F": -4, "F#": -3, "Gb": -3, "G": -2, "G#": -1, "Ab": -1, "A": 0, "A#": 1, "Bb": 1, "B": 2}


def hz(n):  # "D3", "Bb2"
    name, octv = n[:-1], int(n[-1])
    return A4 * 2 ** ((NOTE[name] + (octv - 4) * 12) / 12)


def N(sec):
    return int(round(sec * SR))


def env(L, a, r, hold=None):
    e = np.ones(L)
    A, R = min(N(a), L), min(N(r), L)
    e[:A] = np.linspace(0, 1, A) ** 1.6
    e[L - R:] *= np.linspace(1, 0, R) ** 1.4
    return e


def pad(freqs, sec, bright=0.35, det=0.0035, amp=1.0):
    """warm pad: a few detuned, softly band-limited saw-like voices per note, slow swells"""
    L = N(sec); t = np.arange(L) / SR
    out = np.zeros((2, L))
    for f in freqs:
        for v, (d, pan) in enumerate([(-det, -0.6), (0, 0.0), (det, 0.6)]):
            ff = f * (1 + d)
            ph = rng.uniform(0, 6.28)
            s = np.zeros(L)
            for k in range(1, 7):
                s += np.sin(2 * np.pi * ff * k * t + ph * k) / k * (bright ** (k - 1))
            lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.05 + 0.02 * v) * t + ph)
            s *= lfo
            out[0] += s * np.cos((pan + 1) * np.pi / 4)
            out[1] += s * np.sin((pan + 1) * np.pi / 4)
    out *= env(L, min(3.5, sec * 0.35), min(4.0, sec * 0.4)) * amp / max(1, len(freqs) * 2.2)
    return out


def piano(f, sec=4.0, vel=0.6):
    """soft felt-piano-like note: inharmonic partials, fast attack, long decay"""
    L = N(sec); t = np.arange(L) / SR
    B = 0.0004
    s = np.zeros(L)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + B * k * k)
        s += np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * (0.7 ** (k - 1)) * np.exp(-t * (0.7 + 0.45 * k))
    s *= np.minimum(1, t / 0.006) * vel
    s = signal.sosfilt(signal.butter(2, 3200 / (SR / 2), "low", output="sos"), s)
    return np.vstack([s, s])


def pulse(f, sec, bpm, amp=0.6):
    """low, soft heartbeat-like pulse for tension (sub sine with a short envelope)"""
    L = N(sec); t = np.arange(L) / SR
    beat = 60 / bpm
    ph = (t % beat) / beat
    e = np.exp(-ph * 9) + 0.55 * np.exp(-np.clip(ph - 0.22, 0, None) * 11) * (ph > 0.22)
    e *= np.minimum(1, (ph * beat) / 0.025)  # soft attack: no click
    s = np.sin(2 * np.pi * f * t) * e * amp
    s = signal.sosfilt(signal.butter(2, 180 / (SR / 2), "low", output="sos"), s)
    s *= env(L, 2.5, 3.0)
    return np.vstack([s, s])


def air(sec, amp=0.15):
    """very quiet filtered noise bed (keeps the score breathing between chords)"""
    L = N(sec)
    x = rng.standard_normal((2, L))
    sos = signal.butter(2, [300 / (SR / 2), 2500 / (SR / 2)], "band", output="sos")
    x = signal.sosfilt(sos, x) * amp * 0.1
    return x * env(L, 4, 4)


def reverb(x, rt=4.5, mix=0.35):
    L = N(rt)
    t = np.arange(L) / SR
    ir = rng.standard_normal((2, L)) * np.exp(-t * 6.9 / rt)
    ir = signal.sosfilt(signal.butter(1, 5000 / (SR / 2), "low", output="sos"), ir)
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    wet = np.vstack([signal.fftconvolve(x[0], ir[0])[: x.shape[1]], signal.fftconvolve(x[1], ir[1])[: x.shape[1]]])
    return x * (1 - mix) + wet * mix * 1.8


class Score:
    def __init__(self, dur):
        self.buf = np.zeros((2, N(dur) + N(8)))
        self.dur = dur

    def add(self, x, at, gain=1.0):
        s = N(at); e = min(self.buf.shape[1], s + x.shape[1])
        self.buf[:, s:e] += x[:, : e - s] * gain

    def chords(self, at, seq, each, bright=0.32, amp=1.0, octave_doubling=True):
        """seq: list of chord note lists; each chord held `each` seconds with overlap"""
        for i, ch in enumerate(seq):
            fr = [hz(n) for n in ch]
            if octave_doubling:
                fr.append(hz(ch[0]) / 2)
            self.add(pad(fr, each * 1.45, bright, amp=amp), at + i * each)

    def melody(self, at, notes, step, vel=0.5):
        for i, n in enumerate(notes):
            if n:
                self.add(piano(hz(n), 5.0, vel), at + i * step)

    def render(self):
        y = reverb(self.buf, 5.5, 0.38)[:, : N(self.dur)]
        y = signal.sosfilt(signal.butter(2, 35 / (SR / 2), "high", output="sos"), y)
        # gentle fade-out at the end
        f = N(3); y[:, -f:] *= np.linspace(1, 0, f)
        return y / (np.max(np.abs(y)) + 1e-9) * 0.5


# chord vocabulary (D minor world)
Dm = ["D3", "A3", "F4"]; Dm9 = ["D3", "A3", "E4", "F4"]; Bb = ["Bb2", "F3", "D4"]; F = ["F2", "C3", "A3"]; C = ["C3", "G3", "E4"]
Gm = ["G2", "D3", "Bb3"]; Am = ["A2", "E3", "C4"]; Fmaj7 = ["F2", "C3", "E3", "A3"]; Bbmaj7 = ["Bb2", "F3", "A3", "D4"]; Csus = ["C3", "F3", "G3"]
Dsus = ["D3", "G3", "A3"]; Eb = ["Eb3", "Bb3", "G4"]


def score_short():
    S = Score(117.5)
    # cold open: restrained suspense — suspended D, a low pulse after the vanishing
    S.chords(0.0, [Dsus, Dm9], 6.0, bright=0.25, amp=0.7)
    S.add(pulse(hz("D2") / 2, 14, 62, 0.35), 3.0)
    S.add(air(18), 0.0)
    # the grunion: quiet tension that builds and breaks off
    S.chords(18.0, [Dm, Bb, Gm, Dm, Eb, Dm], 4.4, bright=0.3, amp=0.75)
    S.add(pulse(hz("D2") / 2, 26, 70, 0.4), 18.0)
    # the reef: wonder (major colour) → unease when the timing falls apart
    S.chords(44.5, [Fmaj7, C, Bbmaj7, F], 2.6, bright=0.4, amp=0.8)
    S.melody(45.0, ["A4", None, "C5", None, "F5", None, "E5", None], 1.3, 0.35)
    S.chords(55.0, [Dm, Eb, Gm, Dm, Bb], 2.6, bright=0.28, amp=0.75)
    # the fishing family: understated, warm
    S.chords(67.8, [F, C, Dm, Bb], 2.7, bright=0.35, amp=0.7)
    S.melody(68.2, ["C5", "A4", None, "F4", "G4", None, "A4", None], 1.35, 0.3)
    # nights on land and the distant future: dark and spacious
    S.chords(78.8, [Dm9, Gm, Dm9, Eb, Dm9], 3.3, bright=0.22, amp=0.65)
    # ending: reflective, unresolved then resolving to F over D
    S.chords(95.5, [Bb, F, C, Dm], 4.0, bright=0.32, amp=0.75)
    S.chords(111.5, [["D3", "F3", "A3", "C4"]], 6.0, bright=0.3, amp=0.7)
    S.melody(106.8, ["F4", None, "A4", None, "D5", None, None, "C5"], 1.1, 0.3)
    return S


def score_long():
    S = Score(597.5)
    # 0–58: the night it disappeared — suspense, sparse
    S.chords(0.0, [Dsus, Dm9, Dsus, Dm9], 5.5, bright=0.22, amp=0.6)
    S.add(air(60), 0.0)
    S.add(pulse(hz("D2") / 2, 30, 58, 0.3), 11.5)
    S.chords(22.0, [Dm, Bb, Gm, Eb, Dm, Bb], 4.5, bright=0.26, amp=0.6)
    S.melody(42.8, ["D5", None, "C5", None, "A4", None, None, None, "F4", None, "E4"], 1.3, 0.25)
    # 62–105: first morning (calm) → the oceans (curious)
    S.chords(62.0, [F, C, Dm, Bb, F, C], 3.6, bright=0.4, amp=0.6)
    S.chords(83.6, [Dm9, Bbmaj7, Fmaj7, C, Dm9, Gm], 3.6, bright=0.33, amp=0.6)
    # 105–193: the grunion — wonder, then a slow-building tension
    S.chords(105.0, [Fmaj7, Bbmaj7, Fmaj7, C], 4.0, bright=0.38, amp=0.6)
    S.melody(119.4, ["A4", None, "C5", None, "D5", None, "C5", None, "A4", None, "F4", None], 1.5, 0.28)
    S.chords(121.0, [Dm, Bb, F, C, Dm, Bb, F, C], 4.1, bright=0.32, amp=0.6)
    S.chords(154.0, [Dm, Eb, Dm, Gm, Dm, Eb, Dm, Bb, Gm, Dm], 4.0, bright=0.26, amp=0.65)
    S.add(pulse(hz("D2") / 2, 38, 66, 0.35), 156.0)
    # 193–330: coral reefs — wonder → disruption → years
    S.chords(193.5, [Fmaj7, C, Bbmaj7, F, Fmaj7, C, Bbmaj7, Csus], 3.2, bright=0.42, amp=0.65)
    S.melody(201.5, ["C5", None, "A4", None, "F5", None, "E5", None, "C5", None, "D5", None, "A4"], 1.4, 0.28)
    S.chords(219.5, [F, Am, Bb, C, F, Am, Bb, C], 4.2, bright=0.4, amp=0.65)
    S.chords(253.3, [Dm9, Eb, Dm9, Gm, Dm9, Eb, Bb, Gm, Dm9], 3.9, bright=0.24, amp=0.6)
    S.add(pulse(hz("D2") / 2, 34, 60, 0.3), 255.0)
    S.chords(288.0, [Dm, Bb, F, C, Dm, Bb, Gm, Dm, Bb, F], 4.0, bright=0.3, amp=0.6)
    # 328–387: the fishing family — understated emotion
    S.chords(327.8, [F, C, Dm, Bb, F, C, Bb, C, F, C, Dm, Bb, Gm, C], 4.2, bright=0.36, amp=0.62)
    S.melody(337.6, ["C5", "A4", None, "F4", "G4", None, "A4", None, None, "C5", "D5", None, "C5", None, "A4", None], 1.3, 0.3)
    S.melody(360.2, ["F4", None, "A4", None, "G4", None, None, "E4", None, "F4"], 1.6, 0.26)
    # 387–443: nights on land — nocturnal, spare
    S.chords(387.3, [Dm9, Gm, Dm9, Eb, Dm9, Gm, Bb, Dm9, Eb, Dm9, Gm, Dm9, Dm9, Dm9], 4.0, bright=0.2, amp=0.5)
    # 443–506: the distant future — wide, slow
    S.chords(443.2, [Dsus, Bbmaj7, Fmaj7, Csus, Dsus, Gm, Bbmaj7, Fmaj7, Csus, Dm9, Bbmaj7, Csus, Dm9, Dm9, Dsus, Dsus], 3.9, bright=0.28, amp=0.55)
    # 506–592: decades later — reflective, then the final turn
    S.chords(505.6, [Bb, F, C, Dm, Bb, F, Gm, C, Bb, F, C, Dm, Bb, Gm, C, F, Bb, F, Dm, C, Bb, Bb], 3.9, bright=0.34, amp=0.62)
    S.melody(508.9, ["F4", None, "A4", None, "C5", None, None, "D5", None, "C5", None, "A4", None, None, "F4", None], 1.5, 0.28)
    S.melody(579.9, ["D5", None, None, "C5", None, None, "A4", None, None, "F4", None, None, "D4"], 0.95, 0.3)
    S.chords(589.0, [["D3", "F3", "A3", "C4"]], 8.0, bright=0.3, amp=0.7)
    return S


if __name__ == "__main__":
    name = sys.argv[1]
    S = score_short() if name == "short" else score_long()
    y = S.render()
    wavfile.write(f"audio/master/{name}_music.wav", SR, (np.clip(y.T, -1, 1) * 32767).astype(np.int16))
    print(name, "music", y.shape[1] / SR, "s")
