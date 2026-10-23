"""SFX cue sheet — NIGHT 1. Times mirror studio/src/n1/Night1.tsx shot boundaries (absolute seconds). No music."""
DURATION = 102.92
NARRATION = "audio/master/n1_narration.wav"
WORDS = "data/n01.words.json"


def steps(t0, t1, every=0.5, db=-24, soft=True):
    out, t = [], t0
    while t < t1:
        out.append(dict(kind="step", t=t, db=db, soft=soft)); t += every
    return out


def build(find, seq):
    beds = [
        dict(kind="station", t0=0.0, t1=4.9, gain_db=-22, fade=0.6),
        dict(kind="nightrain", t0=4.6, t1=17.9, gain_db=-22, fade=0.3, auto=[(4.6, 0), (12.6, 0), (13.5, -6)]),
        dict(kind="idlebus", t0=12.4, t1=23.7, gain_db=-24, fade=0.8, auto=[(12.4, -12), (14.9, 0), (17.7, -3)]),
        dict(kind="busint", t0=22.1, t1=60.6, gain_db=-25, fade=0.5, auto=[(22.1, -4), (25.3, 0), (39.6, -4), (45, -7), (58.6, -4)]),
        dict(kind="dread", t0=39.6, t1=62.9, gain_db=-24, fade=2.5, auto=[(39.6, -10), (45.1, -2), (51.1, 0), (58.6, 2)]),
        dict(kind="busint", t0=60.6, t1=62.3, gain_db=-26, fade=0.1),
        dict(kind="busint", t0=63.0, t1=70.9, gain_db=-27, fade=0.4),
        dict(kind="dread", t0=63.0, t1=100.4, gain_db=-23, fade=1.5, auto=[(63, -2), (70.6, -6), (76, 0), (87, -3), (97, 2)]),
        dict(kind="busstill", t0=71.3, t1=100.4, gain_db=-27, fade=0.6),
        dict(kind="hum", t0=0.0, t1=4.9, gain_db=-38, fade=0.5),
    ]
    ev = [
        dict(kind="trainaway", t=0.0, db=-16, sec=6.0),
        dict(kind="vibrate", t=7.4, db=-26, sec=0.5),
        dict(kind="ping", t=8.35, db=-26),
        *steps(4.85, 7.3, 0.52, -26, False),
        dict(kind="whoosh", t=10.6, db=-24, sec=2.0, lo=150, hi=2000, up=True),
        dict(kind="brakes", t=13.0, db=-12, sec=2.6, squeal=0.6),
        dict(kind="flick", t=15.42, db=-22),
        dict(kind="hydraulic", t=16.45, db=-12, sec=1.4),
        *steps(23.7, 25.2, 0.45, -22, False),
        *steps(25.35, 27.9, 0.5, -24, True),
        dict(kind="cloth", t=28.5, db=-22, sec=0.8), dict(kind="seat", t=29.2, db=-18),
        dict(kind="vibrate", t=31.75, db=-14, sec=0.9),
        dict(kind="ping", t=33.3, db=-18),
        dict(kind="rattle", t=40.5, db=-22, sec=2.5),
        dict(kind="cloth", t=51.25, db=-22, sec=0.9),
        dict(kind="pull", t=54.8, db=-20, sec=3.6),
        dict(kind="cloth", t=58.75, db=-14, sec=0.6), dict(kind="seat", t=58.8, db=-18),
        dict(kind="flick", t=61.02, db=-14), dict(kind="flick", t=61.2, db=-16, sec=0.25), dict(kind="flick", t=61.55, db=-14), dict(kind="flick", t=62.1, db=-15, sec=0.25),
        dict(kind="blackout", t=62.35, db=-12),
        dict(kind="relight", t=63.0, db=-14),
        dict(kind="heartbeat2", t=63.4, db=-18, sec=7.0, bpm=84),
        dict(kind="brakes", t=71.2, db=-12, sec=2.2, squeal=0.4),
        dict(kind="hydraulic", t=72.45, db=-12, sec=1.4),
        dict(kind="cloth", t=78.6, db=-18, sec=0.7),
        dict(kind="drag", t=80.6, db=-22, sec=0.7), dict(kind="drag", t=81.3, db=-24, sec=0.6),
        dict(kind="cloth", t=82.3, db=-22, sec=0.8),
        *steps(83.6, 86.8, 0.5, -20, False),
        *steps(87.2, 89.8, 0.55, -30, False),
        dict(kind="doorslam", t=91.72, db=-6),
        dict(kind="vibrate", t=93.3, db=-14, sec=0.9),
        dict(kind="ping", t=95.55, db=-16),
        dict(kind="impact", t=100.4, db=-14, sec=2.4, weight=0.8),
    ]
    return ev, beds
