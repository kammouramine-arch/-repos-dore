"""SFX cue sheet — NIGHT 1 (SOMEONE IS UNDER THE POOL). Absolute seconds = narration time = studio/src/edit/P1.tsx. No music."""
DURATION = 126.0
NARRATION = "audio/master/p1_narration.wav"
WORDS = "data/p01.words.json"
TRIM_DB = -5.0
END = 125.8            # hard cut to black: every bed and effect stops here


def build(find, seq):
    hall = [(0, 0), (5.9, -14), (47.9, -14), (48.4, 0), (87.4, 0), (87.5, -16)]
    beds = [
        dict(kind="poolroom", t0=0.0, t1=END, gain_db=-20, fade=0.05, auto=hall),
        dict(kind="office_hum", t0=5.9, t1=47.9, gain_db=-30, fade=0.3),
        dict(kind="office_hum", t0=87.46, t1=END, gain_db=-30, fade=0.3),
        dict(kind="crt", t0=11.4, t1=47.9, gain_db=-40, fade=0.3),
        dict(kind="uwdrone", t0=16.0, t1=45.24, gain_db=-22, fade=0.6, auto=[(16, -6), (21.4, 0), (38.98, 2), (44.2, 5)]),
        dict(kind="camstatic", t0=16.0, t1=45.24, gain_db=-36, fade=0.05),
        dict(kind="uwdrone", t0=87.46, t1=91.38, gain_db=-28, fade=0.3),
        dict(kind="dread", t0=21.4, t1=END, gain_db=-24, fade=2.0, auto=[(21.4, -8), (38.98, 0), (44.3, 4), (45.3, -10), (56.7, -4), (72.5, 2), (83.7, 4), (87.5, -12), (95.3, -4), (101.3, 2), (107.2, -14), (110.0, 2), (114.7, -6), (118.8, 2), (122.5, 6)]),
    ]
    ev = [
        dict(kind="drip", t=2.1, db=-26), dict(kind="drip", t=3.3, db=-30),
        dict(kind="clocktick", t=4.05, db=-18, sec=1.9),
        dict(kind="knob", t=14.82, db=-14),
        dict(kind="alarm", t=16.05, db=-16), dict(kind="alarm", t=16.75, db=-16), dict(kind="alarm", t=17.45, db=-17), dict(kind="alarm", t=18.15, db=-19),
        dict(kind="cloth", t=19.6, db=-24, sec=0.8),
        dict(kind="interference", t=38.98, db=-26, sec=0.4, seed=1),
        # SCARE 1: she looks into the lens, the feed tears
        dict(kind="deep", t=40.8, db=-14, sec=3.5),
        dict(kind="sting", t=44.28, db=-3, seed=2),
        dict(kind="glitch", t=44.3, db=-9, seed=3), dict(kind="interference", t=44.45, db=-12, sec=0.8, seed=4),
        # he grabs the torch and runs
        dict(kind="cloth", t=45.3, db=-16, sec=0.5), dict(kind="castors", t=45.5, db=-14, sec=1.4),
        dict(kind="tilestep", t=47.95, db=-14, seed=1), dict(kind="tilestep", t=48.25, db=-14, seed=2),
        dict(kind="latch", t=48.15, db=-12), dict(kind="door", t=48.2, db=-16, sec=1.2),
        dict(kind="switch", t=49.08, db=-8), dict(kind="ballast", t=49.15, db=-12, sec=0.7), dict(kind="flick", t=49.3, db=-18),
        dict(kind="tilestep", t=54.0, db=-20, seed=3), dict(kind="tilestep", t=54.6, db=-22, seed=4),
        # the knocks under the water
        dict(kind="uwknock", t=59.0, db=-6, seed=1), dict(kind="uwknock", t=59.6, db=-6, seed=2), dict(kind="uwknock", t=60.2, db=-5, seed=3),
        dict(kind="lapping", t=59.3, db=-24, sec=2.5),
        dict(kind="tilestep", t=62.35, db=-16, seed=5, wet=0.6), dict(kind="tilestep", t=62.9, db=-16, seed=6, wet=0.6),
        dict(kind="uwknock", t=63.43, db=-4, seed=4), dict(kind="uwknock", t=64.08, db=-4, seed=5), dict(kind="uwknock", t=64.73, db=-3, seed=6, weight=1.3),
        dict(kind="lapping", t=63.8, db=-22, sec=2.5),
        dict(kind="click", t=66.35, db=-14),
        # the hand
        dict(kind="deep", t=69.5, db=-14, sec=3.0),
        dict(kind="scrape", t=71.2, db=-24, sec=1.2),
        dict(kind="drag", t=74.0, db=-18, sec=0.9),
        dict(kind="scrape", t=76.4, db=-18, sec=1.2),
        dict(kind="drag", t=79.6, db=-16, sec=0.9),
        dict(kind="uwknock", t=81.3, db=-2, seed=7, weight=1.6), dict(kind="impact", t=81.3, db=-14, sec=1.5, weight=0.8),
        dict(kind="scrape", t=82.2, db=-16, sec=1.2),
        # he runs back
        dict(kind="whoosh", t=83.8, db=-16, sec=0.8), dict(kind="tilestep", t=83.9, db=-12, seed=7, wet=0.8), dict(kind="tilestep", t=84.25, db=-12, seed=8, wet=0.8),
        dict(kind="breath", t=84.0, db=-18, sec=3.0, tense=1.0),
        dict(kind="tilestep", t=85.8, db=-14, seed=9), dict(kind="tilestep", t=86.15, db=-14, seed=10), dict(kind="tilestep", t=86.5, db=-14, seed=11), dict(kind="tilestep", t=86.85, db=-15, seed=12),
        dict(kind="breath", t=91.3, db=-16, sec=2.2),
        # CAM 1: she is behind him (drips)
        *[dict(kind="drip", t=95.6 + 1.1 * i, db=-22 - (i % 3)) for i in range(9)],
        dict(kind="swell", t=101.0, db=-16, sec=3.0),
        dict(kind="heartbeat", t=101.3, db=-22, sec=5.8), dict(kind="heartbeat", t=110.0, db=-20, sec=8.5), dict(kind="heartbeat", t=118.8, db=-16, sec=6.9),
        dict(kind="chair", t=105.7, db=-10, sec=0.7), dict(kind="castors", t=105.75, db=-18, sec=0.8), dict(kind="whoosh", t=105.8, db=-18, sec=0.6),
        dict(kind="chair", t=108.3, db=-16, sec=0.7),
        dict(kind="glitch", t=110.06, db=-16, seed=5),
        dict(kind="nearbreath", t=111.6, db=-18, sec=2.8),
        dict(kind="drip", t=116.44, db=-8),
        *[dict(kind="drip", t=119.0 + 0.8 * i, db=-18 + i) for i in range(4)],
        # FINAL SCARE
        dict(kind="deep", t=122.3, db=-10, sec=3.0),
        dict(kind="drip", t=123.3, db=-12), dict(kind="drip", t=123.95, db=-11), dict(kind="drip", t=124.5, db=-10),
        dict(kind="sting", t=125.26, db=-2, seed=9),
        dict(kind="scream", t=125.3, db=-12, sec=0.5, seed=2),
    ]
    return ev, beds
