"""SFX cue sheet — NIGHT 3. Times mirror studio/src/n3/Night3.tsx. No music."""
DURATION = 120.19
NARRATION = "audio/master/n3_narration.wav"
WORDS = "data/n03.words.json"


def steps(t0, t1, every=0.5, db=-24, soft=True):
    out, t = [], t0
    while t < t1:
        out.append(dict(kind="step", t=t, db=db, soft=soft)); t += every
    return out


def build(find, seq):
    beds = [
        dict(kind="busint", t0=0.0, t1=11.2, gain_db=-24, fade=0.8),
        dict(kind="dread", t0=0.0, t1=89.0, gain_db=-25, fade=2.0, auto=[(0, -6), (14.7, -2), (18.9, 1), (31.1, 0), (52.3, 3), (60.4, 2), (72.5, 0), (84.6, -6)]),
        dict(kind="busstill", t0=11.2, t1=84.6, gain_db=-28, fade=0.4),
        dict(kind="nightrain", t0=14.7, t1=31.1, gain_db=-30, fade=0.4, auto=[(14.7, -8), (18.9, 0), (28.6, -6)]),
        dict(kind="nightrain", t0=72.5, t1=89.0, gain_db=-24, fade=0.4, auto=[(72.5, -8), (75.0, 0)]),
        dict(kind="tvroom", t0=89.0, t1=99.9, gain_db=-28, fade=0.5),
        dict(kind="bathroom", t0=99.9, t1=118.4, gain_db=-32, fade=0.3),
        dict(kind="dread", t0=106.0, t1=118.4, gain_db=-26, fade=3.0, auto=[(106, -8), (112, 0), (117, 3)]),
    ]
    ev = [
        dict(kind="brakes", t=9.6, db=-10, sec=2.4, squeal=0.6),
        dict(kind="hydraulic", t=15.0, db=-12, sec=1.4),
        *steps(29.2, 30.9, 0.55, -20, False),
        dict(kind="flick", t=31.2, db=-14), dict(kind="flick", t=31.4, db=-16, sec=0.25),
        dict(kind="blackout", t=31.5, db=-18),
        dict(kind="cloth", t=32.6, db=-16, sec=0.7),
        *steps(43.4, 44.8, 0.6, -22, True),
        *steps(45.5, 46.3, 0.38, -20, False),
        dict(kind="cloth", t=48.4, db=-18, sec=1.2),
        dict(kind="cordpull", t=52.32, db=-18),
        dict(kind="ding", t=52.42, db=-5, eerie=1.0),
        dict(kind="pull", t=60.4, db=-14, sec=5.5),
        dict(kind="drag", t=60.6, db=-18), dict(kind="drag", t=61.8, db=-18), dict(kind="drag", t=63.0, db=-18), dict(kind="drag", t=64.1, db=-18), dict(kind="drag", t=65.0, db=-18),
        dict(kind="seat", t=67.15, db=-10), dict(kind="impact", t=67.15, db=-18, sec=1.2, weight=0.6),
        *steps(73.1, 74.9, 0.3, -14, False),
        *steps(75.0, 76.6, 0.3, -18, False),
        dict(kind="doorslam", t=77.6, db=-6),
        dict(kind="rattle", t=81.5, db=-20, sec=2.0),
        dict(kind="impact", t=82.4, db=-22, sec=1.0, weight=0.3),
        dict(kind="busaway", t=84.6, db=-10, sec=4.6),
        dict(kind="aptdoor", t=89.4, db=-18),
        *steps(89.9, 92.3, 0.55, -26, False),
        *steps(97.0, 99.6, 0.55, -26, False),
        dict(kind="switch", t=100.45, db=-12),
        dict(kind="relight", t=100.5, db=-24),
        dict(kind="cloth", t=102.9, db=-24, sec=0.8),
        dict(kind="cloth", t=111.9, db=-24, sec=0.9),
        dict(kind="impact", t=118.4, db=-12, sec=2.0, weight=1.0),
    ]
    return ev, beds
