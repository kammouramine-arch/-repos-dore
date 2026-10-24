"""SFX cue sheet — NIGHT 3 (DO NOT CONFIRM). Written in ORIGINAL narration seconds, shifted by OFF = 1.50 s
because the spoken "Night three," is removed (tools/edit_narration.sh). Matches studio/src/edit/N3.tsx. No music."""
OFF = 1.5
DURATION = 157.5 - OFF
NARRATION = "audio/master/n3_narration.wav"
WORDS = "data/n03.words.json"


def build(find, seq):
    beds = [
        dict(kind="roomtone", t0=1.5, t1=120.0, gain_db=-30, fade=0.05),
        dict(kind="fluoro", t0=1.5, t1=120.0, gain_db=-36, fade=0.05),
        dict(kind="fridge", t0=1.5, t1=120.0, gain_db=-34, fade=0.05),
        dict(kind="dread", t0=1.5, t1=89.4, gain_db=-24, fade=0.05, auto=[(1.5, -10), (16, -4), (28.8, 0), (42.5, -4), (53, 0), (62, 2), (67, 4), (75.5, 5), (85, 6)]),
        dict(kind="camstatic", t0=92.95, t1=104.68, gain_db=-30, fade=0.05),
        dict(kind="dread", t0=92.95, t1=120.0, gain_db=-24, fade=0.05, auto=[(92.95, -6), (98.4, 4), (105, 0), (110.5, 3)]),
        dict(kind="roomtone", t0=127.26, t1=136.86, gain_db=-30, fade=0.05),
        dict(kind="fluoro", t0=127.26, t1=136.86, gain_db=-36, fade=0.05),
        dict(kind="fridge", t0=127.26, t1=136.86, gain_db=-34, fade=0.05),
        dict(kind="fluoro", t0=136.86, t1=157.0, gain_db=-28, fade=0.3),
        dict(kind="roomtone", t0=136.86, t1=157.0, gain_db=-32, fade=0.3),
        dict(kind="dread", t0=145.2, t1=157.0, gain_db=-24, fade=1.0, auto=[(145.2, -8), (149.9, -2), (154.3, 2)]),
    ]
    ev = [
        dict(kind="vibrate", t=13.55, db=-14, sec=0.5), dict(kind="ping", t=13.6, db=-17),
        dict(kind="ping", t=16.3, db=-14),
        dict(kind="tap", t=18.9, db=-16),
        dict(kind="swell", t=30.8, db=-18, sec=2.5),
        *[dict(kind="glitch", t=45.48 + i * 0.78, db=-20, seed=30 + i) for i in range(6)],
        dict(kind="heartbeat", t=50.2, db=-22, sec=12.0),
        dict(kind="clocktick", t=62.2, db=-15, sec=4.6),
        dict(kind="tap", t=63.6, db=-10, bright=0.6),
        dict(kind="doorbell", t=65.95, db=-8),
        *[dict(kind="wetstep", t=t, db=d, seed=40 + i) for i, (t, d) in enumerate([(67.9, -24), (68.95, -20), (70.0, -16), (71.05, -13), (72.1, -11)])],
        dict(kind="handle", t=73.5, db=-6, sec=1.9, slow=1.2),
        dict(kind="cloth", t=83.4, db=-16, sec=0.6), dict(kind="tap", t=84.6, db=-14, bright=0.5),
        dict(kind="pound", t=85.0, db=-2, sec=4.3, rate=4.6, seed=50),
        dict(kind="tap", t=93.0, db=-14),
        dict(kind="sting", t=98.58, db=-2, seed=51), dict(kind="glitch", t=98.6, db=-8, seed=52),
        dict(kind="scream", t=102.1, db=-4, sec=2.5, seed=53), dict(kind="interference", t=102.1, db=-10, sec=2.5, seed=54),
        dict(kind="thud", t=105.1, db=-4), dict(kind="thud", t=105.32, db=-16),
        dict(kind="heartbeat", t=109.5, db=-16, sec=6.5),
        dict(kind="tap", t=115.45, db=-8, bright=0.7),
        dict(kind="glitch", t=116.5, db=-18, seed=55),
        dict(kind="lightsout", t=120.0, db=-4),
        dict(kind="nearbreath", t=122.6, db=-6, sec=2.7, pan=0.45),
        dict(kind="relight", t=127.28, db=-8),
        dict(kind="ping", t=133.95, db=-18),
        dict(kind="breath", t=135.4, db=-16, sec=1.6),
        dict(kind="handle", t=137.9, db=-10, sec=1.1, slow=0.8), dict(kind="aptdoor", t=138.6, db=-10),
        dict(kind="paper", t=145.6, db=-18),
        *[dict(kind="knock", t=t, db=-7, heavy=0.8, seed=60 + i, pan=0.35) for i, t in enumerate((154.4, 155.05, 155.7))],
    ]
    for e in ev:
        e["t"] -= OFF
    for b in beds:
        b["t0"] = max(0.0, b["t0"] - OFF); b["t1"] -= OFF
        if b.get("auto"):
            b["auto"] = [(t - OFF, g) for t, g in b["auto"]]
    return ev, beds
