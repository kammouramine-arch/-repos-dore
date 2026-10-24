"""SFX cue sheet — NIGHT 2 (THE POOL IS EMPTY. SO WHO IS THAT?). Absolute seconds = narration time = studio/src/edit/P2.tsx. No music."""
DURATION = 137.6
NARRATION = "audio/master/p2_narration.wav"
WORDS = "data/p02.words.json"
TRIM_DB = -5.0
END = 137.45           # hard cut to black


def build(find, seq):
    office = [(0, -40), (20.6, -40), (20.7, 0), (35.1, 0), (35.2, -12), (38.3, -12), (38.4, 0)]
    beds = [
        dict(kind="poolroom", t0=0.0, t1=20.66, gain_db=-24, fade=0.05, auto=[(0, -6), (12.9, 0), (17.2, 2)]),
        dict(kind="office_hum", t0=20.66, t1=END, gain_db=-30, fade=0.3),
        dict(kind="crt", t0=20.66, t1=134.8, gain_db=-40, fade=0.3),
        dict(kind="camstatic", t0=10.24, t1=12.94, gain_db=-26, fade=0.05),
        dict(kind="water", t0=12.94, t1=17.18, gain_db=-16, fade=0.4),
        dict(kind="uwdrone", t0=35.14, t1=38.36, gain_db=-26, fade=0.3),
        dict(kind="uwdrone", t0=44.08, t1=62.54, gain_db=-22, fade=0.2, auto=[(44.08, 0), (52.0, 2), (56.8, -4)]),
        dict(kind="camstatic", t0=44.08, t1=62.54, gain_db=-38, fade=0.05),
        dict(kind="radio_static", t0=89.37, t1=96.82, gain_db=-20, fade=0.02, auto=[(89.37, 0), (91.9, -8), (95.5, -8), (96.8, 0)]),
        dict(kind="radio_static", t0=97.67, t1=101.12, gain_db=-20, fade=0.02, auto=[(97.67, 0), (99.0, -8)]),
        dict(kind="dread", t0=31.5, t1=END, gain_db=-24, fade=2.0, auto=[(31.5, -10), (44.1, 0), (56.9, 4), (62.5, -10), (67.5, -4), (75.3, 2), (86.1, -14), (89.1, -4), (103.3, 0), (113.9, 2), (122.5, 4), (133.0, 6), (134.6, -12), (136.6, 6)]),
    ]
    ev = [
        *[dict(kind="tilestep", t=0.15 + 0.52 * i, db=-20, seed=i) for i in range(7)],
        dict(kind="paper", t=3.8, db=-18, sec=0.6),
        dict(kind="glitch", t=5.98, db=-14, seed=1), dict(kind="uwknock", t=7.45, db=-10, seed=2), dict(kind="interference", t=8.5, db=-18, sec=0.5, seed=3), dict(kind="glitch", t=9.95, db=-14, seed=4),
        dict(kind="glitch", t=10.25, db=-14, seed=5),
        dict(kind="bubble", t=14.0, db=-16, f0=180, sec=0.6), dict(kind="bubble", t=15.6, db=-18, f0=140, sec=0.8),
        dict(kind="drip", t=18.4, db=-20), dict(kind="drip", t=19.7, db=-24),
        *[dict(kind="tap", t=21.2 + 0.16 * i + (0.5 if i > 6 else 0), db=-24, bright=0.5) for i in range(14)],
        dict(kind="clocktick", t=25.05, db=-18, sec=2.2),
        *[dict(kind="alarm", t=27.35 + 0.7 * i, db=-15 - (i // 3)) for i in range(6)],
        dict(kind="heartbeat", t=31.8, db=-22, sec=3.3),
        dict(kind="alarm", t=35.2, db=-18),
        dict(kind="glitch", t=44.1, db=-10, seed=6), dict(kind="sting", t=44.15, db=-10, seed=3),
        dict(kind="scrape", t=53.7, db=-22, sec=1.2), dict(kind="scrape", t=55.3, db=-22, sec=1.2),
        dict(kind="lapping", t=55.6, db=-18, sec=2.5), dict(kind="water", t=56.85, db=-16, sec=1.6), dict(kind="lapping", t=57.4, db=-16, sec=3.0),
        dict(kind="knob", t=62.5, db=-12), dict(kind="interference", t=62.54, db=-12, sec=0.5, seed=7),
        # wet footsteps approaching, then appearing as prints (75.26 + 0.78 i)
        *[dict(kind="wetstep", t=67.9 + 0.78 * i, db=-30 + 1.5 * i, seed=i) for i in range(7)],
        *[dict(kind="wetstep", t=75.26 + 0.78 * i, db=-19 + 0.8 * i, seed=10 + i) for i in range(11)],
        dict(kind="latch", t=84.9, db=-10),
        dict(kind="squelch", t=89.37, db=-12),
        dict(kind="knob", t=96.67, db=-10), dict(kind="squelch", t=96.8, db=-14, on=False),
        dict(kind="squelch", t=97.67, db=-10),
        dict(kind="crtoff", t=101.3, db=-16),
        *[dict(kind="drip", t=104.0 + 0.66 * i + 0.13 * (i % 3), db=-24) for i in range(28)],
        dict(kind="glasstap", t=121.6, db=-22),
        dict(kind="whoosh", t=122.55, db=-16, sec=0.5),
        *[dict(kind="glasstap", t=t, db=-20 + 1.5 * i) for i, t in enumerate((124.25, 126.37, 127.77, 128.97, 130.07, 131.07, 132.07))],
        *[dict(kind="cloth", t=t + 0.05, db=-26, sec=0.4) for t in (124.25, 126.37, 127.77, 128.97, 130.07, 131.07, 132.07)],
        # SCARE: the slam, the crack
        dict(kind="doorslam2", t=132.8, db=-2), dict(kind="sting", t=132.8, db=-4, seed=4),
        dict(kind="glasscrack", t=133.04, db=-6, seed=1),
        *[dict(kind="crtoff", t=134.6 + a, db=-14) for a in (0.15, 0.4, 0.55, 0.8, 1.0)],
        # FINAL SCARE: her face in the black glass
        dict(kind="deep", t=135.5, db=-12, sec=1.8),
        dict(kind="sting", t=136.62, db=-2, seed=8), dict(kind="nearbreath", t=136.7, db=-14, sec=0.8),
    ]
    return ev, beds
