"""SFX cue sheet — NIGHT 2. Times mirror studio/src/n2/Night2.tsx. No music."""
DURATION = 116.51
NARRATION = "audio/master/n2_narration.wav"
WORDS = "data/n02.words.json"


def steps(t0, t1, every=0.5, db=-24, soft=True):
    out, t = [], t0
    while t < t1:
        out.append(dict(kind="step", t=t, db=db, soft=soft)); t += every
    return out


def build(find, seq):
    beds = [
        dict(kind="busint", t0=0.0, t1=18.9, gain_db=-24, fade=0.8),
        dict(kind="dread", t0=0.0, t1=74.0, gain_db=-26, fade=2.0, auto=[(0, -6), (12, -2), (33.8, 0), (40, 2), (58, -2), (68, 0)]),
        dict(kind="busint", t0=18.7, t1=20.6, gain_db=-24, fade=0.2, auto=[(18.7, 0), (20.6, -6)]),
        dict(kind="busint", t0=20.5, t1=73.9, gain_db=-28, fade=0.3, auto=[(20.5, -2), (33.8, -8), (40.7, -3)]),
        dict(kind="deadbus", t0=73.9, t1=116.5, gain_db=-28, fade=0.05),
        dict(kind="dread", t0=78.9, t1=114.4, gain_db=-24, fade=2.0, auto=[(78.9, -4), (86.3, 0), (92, -2), (99.5, 2), (109.6, 3)]),
        dict(kind="camstatic", t0=86.3, t1=92.0, gain_db=-34, fade=0.1),
        dict(kind="hum", t0=33.8, t1=40.7, gain_db=-40, fade=0.3),
    ]
    ev = [
        dict(kind="clocktick", t=13.9, db=-24, sec=1.5, rate=14),
        dict(kind="flick", t=13.95, db=-24), dict(kind="flick", t=15.45, db=-22),
        dict(kind="brakes", t=18.8, db=-18, sec=2.4, squeal=0.2),
        dict(kind="vibrate", t=24.0, db=-20, sec=0.4),
        dict(kind="ping", t=30.6, db=-16), dict(kind="ping", t=32.05, db=-20),
        dict(kind="ring", t=42.3, db=-28, sec=3.0),
        dict(kind="ping", t=45.45, db=-14),
        dict(kind="ping", t=47.05, db=-18),
        *steps(49.7, 50.8, 0.5, -24, False),
        dict(kind="cloth", t=55.0, db=-20, sec=0.8),
        dict(kind="scrape", t=56.0, db=-20, sec=1.2), dict(kind="scrape", t=57.8, db=-20, sec=1.4),
        dict(kind="cloth", t=72.55, db=-18, sec=0.5),
        dict(kind="cordpull", t=73.15, db=-14),
        dict(kind="ding", t=73.72, db=-6),
        dict(kind="whoosh", t=73.8, db=-30, sec=1.5, lo=100, hi=900, up=False),
        dict(kind="vibrate", t=79.1, db=-14, sec=0.9),
        dict(kind="static", t=86.35, db=-24, sec=0.3, fail=0.0, seed=4),
        dict(kind="ring", t=92.1, db=-16, sec=4.0),
        dict(kind="tap", t=96.3, db=-18),
        dict(kind="whisper", t=99.4, db=-22, sec=1.6),
        dict(kind="tap", t=101.0, db=-20),
        dict(kind="heartbeat2", t=104.0, db=-20, sec=10.0, bpm=70),
        dict(kind="impact", t=114.4, db=-14, sec=2.0, weight=0.8),
    ]
    return ev, beds
