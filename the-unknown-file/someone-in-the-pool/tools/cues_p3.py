"""SFX cue sheet — NIGHT 3 (IT FOLLOWED YOU HOME). Absolute seconds = narration time = studio/src/edit/P3.tsx. No music."""
DURATION = 159.6
NARRATION = "audio/master/p3_narration.wav"
WORDS = "data/p03.words.json"
TRIM_DB = -5.0
END = 159.25           # hard cut to black


def build(find, seq):
    beds = [
        dict(kind="apartment", t0=0.0, t1=100.46, gain_db=-30, fade=0.05),
        dict(kind="fridge", t0=0.0, t1=100.46, gain_db=-34, fade=0.05),
        dict(kind="uwdrone", t0=29.92, t1=47.5, gain_db=-26, fade=0.3, auto=[(29.9, 0), (38.5, 3), (44.0, 5)]),
        dict(kind="trickle", t0=53.0, t1=60.46, gain_db=-22, fade=0.3),
        dict(kind="hush", t0=100.46, t1=121.92, gain_db=-30, fade=0.05),
        dict(kind="fluoro", t0=119.52, t1=124.28, gain_db=-30, fade=0.1),
        dict(kind="streetnight", t0=124.28, t1=128.96, gain_db=-24, fade=0.2),
        dict(kind="carint", t0=128.96, t1=END, gain_db=-26, fade=0.1),
        dict(kind="engine", t0=130.6, t1=END, gain_db=-30, fade=0.6),
        dict(kind="dread", t0=21.6, t1=END, gain_db=-24, fade=2.0, auto=[(21.6, -10), (35.0, -2), (41.9, 2), (47.5, -4), (60.5, -14), (65.0, -6), (73.4, 2), (80.3, 4), (87.6, 0), (97.1, 4), (101.7, 2), (111.9, 6), (119.5, -2), (128.9, -14), (134.6, -6), (144.3, 0), (153.3, 4), (157.5, 6)]),
    ]
    ev = [
        dict(kind="cup", t=0.4, db=-18, sec=0.4), dict(kind="thud", t=0.7, db=-18, sec=0.5),
        dict(kind="glasscrack", t=2.98, db=-22, seed=3),
        dict(kind="ping", t=7.45, db=-18), dict(kind="ping", t=8.55, db=-18),
        dict(kind="latch", t=11.9, db=-10),
        dict(kind="vibrate", t=17.58, db=-12, sec=0.7), dict(kind="vibrate", t=19.18, db=-12, sec=0.7),
        dict(kind="vibrate", t=21.6, db=-14, sec=0.5),
        dict(kind="tap", t=28.46, db=-16),
        dict(kind="interference", t=29.95, db=-24, sec=0.4, seed=1),
        dict(kind="deep", t=36.0, db=-14, sec=2.6), dict(kind="sting", t=38.55, db=-8, seed=2),
        dict(kind="swell", t=41.8, db=-14, sec=3.0),
        dict(kind="bathroom", t=47.6, db=-20, sec=1.0),
        dict(kind="drip", t=50.42, db=-6), dict(kind="drip", t=51.1, db=-6), dict(kind="drip", t=51.78, db=-6),
        dict(kind="step", t=57.2, db=-14), dict(kind="step", t=57.55, db=-14),
        dict(kind="valve", t=57.8, db=-8, sec=1.6),
        dict(kind="vibrate", t=64.96, db=-10, sec=0.6), dict(kind="ping", t=65.35, db=-16),
        dict(kind="tap", t=68.1, db=-16),
        dict(kind="sting", t=74.6, db=-8, seed=3),
        dict(kind="whoosh", t=78.2, db=-18, sec=0.5),
        dict(kind="sting", t=81.9, db=-6, seed=4),
        dict(kind="whoosh", t=84.7, db=-12, sec=0.6),
        dict(kind="hiss", t=87.7, db=-24, sec=3.0),
        *[dict(kind="glasstap", t=90.6 + 0.55 * i, db=-30) for i in range(7)],
        dict(kind="swell", t=93.6, db=-14, sec=3.0),
        dict(kind="step", t=97.3, db=-14), dict(kind="step", t=97.8, db=-14),
        dict(kind="doorslam2", t=99.14, db=-2), dict(kind="sting", t=99.15, db=-6, seed=5),
        dict(kind="lightsout", t=100.46, db=-8),
        dict(kind="click", t=101.75, db=-20),
        dict(kind="wetstep", t=104.1, db=-14, seed=1), dict(kind="wetstep", t=105.0, db=-12, seed=2),
        dict(kind="handle", t=106.2, db=-8, sec=1.7, slow=1.6),
        *[dict(kind="step", t=108.5 + 0.33 * i, db=-14) for i in range(9)],
        dict(kind="nearbreath", t=112.1, db=-8, sec=3.6),
        dict(kind="heartbeat", t=113.0, db=-18, sec=3.5),
        # SCARE: the hand on his shoulder
        dict(kind="cloth", t=116.45, db=-8, sec=0.5), dict(kind="sting", t=116.48, db=-2, seed=6), dict(kind="water", t=116.5, db=-22, sec=0.8),
        dict(kind="handle", t=120.2, db=-10, sec=0.6), dict(kind="door", t=120.25, db=-8, sec=1.2),
        *[dict(kind="step", t=121.95 + 0.3 * i, db=-12) for i in range(6)],
        *[dict(kind="step", t=123.6 + 0.17 * i, db=-14) for i in range(4)],
        dict(kind="door", t=124.35, db=-12, sec=1.2),
        *[dict(kind="step", t=124.8 + 0.3 * i, db=-16) for i in range(5)],
        dict(kind="cardoor", t=127.44, db=-6),
        dict(kind="breath", t=128.0, db=-16, sec=3.0, tense=1.0),
        dict(kind="carlock", t=129.3, db=-10),
        dict(kind="ignition", t=130.3, db=-10, sec=3.0),
        dict(kind="breath", t=132.4, db=-18, sec=2.4),
        dict(kind="glasstap", t=135.12, db=-6),
        dict(kind="glasstap", t=139.62, db=-8),
        dict(kind="drip", t=145.0, db=-18), dict(kind="drip", t=145.7, db=-20), dict(kind="drip", t=146.5, db=-18), dict(kind="drip", t=147.3, db=-20),
        dict(kind="drip", t=150.4, db=-14),
        # FINAL SCARE: three knocks behind his seat, her face
        dict(kind="seatknock", t=155.98, db=-4), dict(kind="seatknock", t=156.63, db=-4), dict(kind="seatknock", t=157.26, db=-3),
        dict(kind="deep", t=156.4, db=-10, sec=2.2),
        dict(kind="sting", t=158.45, db=-2, seed=9), dict(kind="nearbreath", t=158.3, db=-12, sec=0.9),
        dict(kind="scream", t=158.92, db=-10, sec=0.4, seed=4),
    ]
    return ev, beds
