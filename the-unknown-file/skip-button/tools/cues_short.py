"""SFX cue sheet — THE SKIP BUTTON vertical short. Times mirror studio/src/short/Short.tsx (shot start + local
press/skip times). No music: narration + original sound design only."""
DURATION = 124.2
NARRATION = "audio/master/short_narration.wav"


def steps(t0, t1, every=0.53, db=-20, soft=True):
    out, t = [], t0
    while t < t1:
        out.append(dict(kind="step", t=t, db=db, soft=soft)); t += every
    return out


def build(find, seq):
    beds = [
        dict(kind="cafe", t0=0.0, t1=14.55, gain_db=-24, fade=0.4, auto=[(0, -6), (2.3, -10), (6.0, 0), (8.7, -6), (9.4, 0)]),
        dict(kind="office", t0=14.55, t1=22.25, gain_db=-26, fade=0.3),
        dict(kind="cafe", t0=22.25, t1=24.9, gain_db=-34, fade=0.2),
        dict(kind="traffic", t0=24.9, t1=25.25, gain_db=-24, fade=0.1),
        dict(kind="street", t0=25.25, t1=25.8, gain_db=-28, fade=0.1),
        dict(kind="office", t0=25.8, t1=26.9, gain_db=-26, fade=0.1),
        dict(kind="street", t0=26.9, t1=28.1, gain_db=-28, fade=0.1),
        dict(kind="apartment", t0=28.1, t1=30.9, gain_db=-28, fade=0.3),
        dict(kind="park", t0=30.9, t1=39.6, gain_db=-26, fade=0.8),
        dict(kind="kitchen", t0=39.6, t1=41.75, gain_db=-28, fade=0.4),
        dict(kind="apartment", t0=41.75, t1=46.1, gain_db=-28, fade=0.3),
        dict(kind="office", t0=46.1, t1=47.75, gain_db=-34, fade=0.3),
        dict(kind="hush", t0=47.75, t1=52.2, gain_db=-30, fade=0.6),
        dict(kind="bathroom", t0=52.2, t1=57.45, gain_db=-30, fade=0.6),
        dict(kind="hush", t0=57.45, t1=100.1, gain_db=-32, fade=1.0),
        dict(kind="nighttown", t0=100.1, t1=103.2, gain_db=-28, fade=0.8),
        dict(kind="kitchen", t0=103.2, t1=116.5, gain_db=-28, fade=0.5),
        dict(kind="nighttown", t0=116.5, t1=121.6, gain_db=-30, fade=1.0),
    ]
    ev = [
        dict(kind="swell", t=2.3, db=-20),
        *[dict(kind="step", t=x, db=-24, soft=True) for x in (6.4, 7.0, 7.6)],
        dict(kind="press", t=9.15, db=-10, mood="play"), dict(kind="skipfx", t=9.3, db=-12, sec=0.75, mood="play"),
        dict(kind="cup", t=10.7, db=-18),
        dict(kind="clocktick", t=12.4, db=-14, sec=0.6, rate=12),
        dict(kind="press", t=17.85, db=-10, mood="play"), dict(kind="skipfx", t=18.0, db=-12, sec=0.75, mood="play"),
        *steps(18.4, 20.4, db=-22),
        dict(kind="press", t=23.05, db=-12, mood="play"), dict(kind="press", t=24.15, db=-12, mood="play"),
        dict(kind="skipfx", t=25.25, db=-13, sec=0.75, mood="play"),
        dict(kind="skipfx", t=26.2, db=-13, sec=0.75, mood="play"),
        dict(kind="skipfx", t=27.35, db=-13, sec=1.1, mood="uneasy"),
        dict(kind="ring", t=41.8, db=-18, sec=1.4), dict(kind="vibrate", t=41.8, db=-20, sec=1.2),
        dict(kind="ring", t=43.3, db=-26, sec=1.6),
        dict(kind="press", t=45.42, db=-12, mood="uneasy"),
        dict(kind="ring", t=46.2, db=-24, sec=1.5),
        dict(kind="press", t=48.3, db=-12, mood="uneasy"), dict(kind="skipfx", t=48.37, db=-12, sec=3.4, mood="cold"),
        dict(kind="swell", t=54.9, db=-20),
        dict(kind="tap", t=57.6, db=-20), dict(kind="tap", t=59.5, db=-24), dict(kind="tap", t=61.5, db=-24), dict(kind="tap", t=63.7, db=-24), dict(kind="tap", t=65.8, db=-22),
        dict(kind="tap", t=70.9, db=-20), dict(kind="ring", t=71.15, db=-28, sec=0.5),
        dict(kind="ping", t=74.55, db=-20),
        *[dict(kind="tap", t=85.6 + i * 0.18, db=-26, bright=0.6) for i in range(6)],
        dict(kind="tap", t=93.4, db=-16, bright=0.6),
        *steps(100.1, 101.6, db=-22),
        dict(kind="door", t=101.15, db=-18),
        dict(kind="chair", t=103.3, db=-24),
        dict(kind="laugh", t=105.7, db=-24, sec=1.2),
        dict(kind="impact", t=121.35, db=-22, sec=2.0, weight=0.6),
    ]
    return ev, beds
