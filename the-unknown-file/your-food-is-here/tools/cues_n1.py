"""SFX cue sheet — NIGHT 1 (THE WRONG DRIVER). Absolute seconds = narration time = studio/src/edit/N1.tsx. No music."""
DURATION = 128.3
NARRATION = "audio/master/n1_narration.wav"
WORDS = "data/n01.words.json"


def build(find, seq):
    beds = [
        dict(kind="roomtone", t0=0.0, t1=127.7, gain_db=-30, fade=0.05),
        dict(kind="rainglass", t0=0.0, t1=127.7, gain_db=-20, fade=0.05, auto=[(0, 0), (14, 0), (17, -4), (38.2, -10), (70.9, -6), (97.6, -4), (110.9, -8), (124.5, -12)]),
        dict(kind="fridge", t0=0.0, t1=127.7, gain_db=-34, fade=0.05),
        dict(kind="dread", t0=18.9, t1=127.7, gain_db=-24, fade=2.0, auto=[(18.9, -10), (30.8, -2), (38.2, 0), (53.6, 3), (67.0, 5), (70.9, -12), (77, -4), (92.9, 2), (99.4, -10), (101, -2), (110.9, -14), (113.3, 3), (124.5, 5)]),
        dict(kind="camstatic", t0=38.16, t1=70.9, gain_db=-32, fade=0.05, auto=[(38.16, 0), (48.5, 6), (51.6, 0), (67.3, 3)]),
        dict(kind="fluoro", t0=48.5, t1=51.8, gain_db=-30, fade=0.1),
    ]
    ev = [
        dict(kind="tap", t=1.0, db=-26), dict(kind="tap", t=2.9, db=-24), dict(kind="tap", t=9.92, db=-20),
        dict(kind="ping", t=10.2, db=-22),
        dict(kind="doorbell", t=15.9, db=-10),
        dict(kind="cloth", t=16.1, db=-18, sec=0.8),
        dict(kind="ping", t=25.45, db=-16),
        dict(kind="ping", t=28.03, db=-15),
        dict(kind="knock", t=33.3, db=-12, heavy=0.5, seed=1),
        dict(kind="knock", t=35.45, db=-6, heavy=0.9, seed=2), dict(kind="knock", t=36.05, db=-6, heavy=0.9, seed=3), dict(kind="knock", t=36.65, db=-6, heavy=0.9, seed=4),
        dict(kind="tap", t=37.35, db=-20),
        dict(kind="interference", t=38.16, db=-24, sec=0.5, seed=1),
        dict(kind="micpop", t=48.55, db=-14),
        dict(kind="cloth", t=54.2, db=-28, sec=1.2),
        dict(kind="vibrate", t=60.6, db=-12, sec=0.9),
        dict(kind="ping", t=63.15, db=-14), dict(kind="ping", t=64.2, db=-14),
        dict(kind="step", t=65.95, db=-16, soft=False), dict(kind="step", t=66.5, db=-18, soft=False),
        dict(kind="whoosh", t=68.15, db=-14, sec=0.6, lo=300, hi=5000, up=True),
        dict(kind="sting", t=68.58, db=-4, seed=1),
        dict(kind="glitch", t=68.62, db=-10, seed=2),
        dict(kind="interference", t=68.9, db=-14, sec=2.0, seed=3),
        dict(kind="glitch", t=70.85, db=-12, seed=4),
        dict(kind="cloth", t=72.5, db=-14, sec=0.6), dict(kind="tap", t=72.75, db=-14, bright=0.4),
        dict(kind="vibrate", t=76.55, db=-14, sec=0.6), dict(kind="ping", t=76.75, db=-14),
        dict(kind="tap", t=86.2, db=-18),
        dict(kind="swell", t=92.5, db=-16, sec=3.0),
        dict(kind="swell", t=103.2, db=-14, sec=2.5),
        dict(kind="heartbeat", t=101.0, db=-22, sec=9.0),
        dict(kind="ping", t=108.85, db=-16),
        dict(kind="shutter", t=113.25, db=-4, pan=0.15),
        dict(kind="ping", t=119.25, db=-20),
        dict(kind="heartbeat", t=120.5, db=-16, sec=7.0),
        dict(kind="nearbreath", t=124.6, db=-12, sec=2.6),
        dict(kind="sting", t=126.55, db=-3, seed=7),
    ]
    return ev, beds
