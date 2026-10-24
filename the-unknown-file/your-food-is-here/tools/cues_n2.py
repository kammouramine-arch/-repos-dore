"""SFX cue sheet — NIGHT 2 (THE DELIVERY PHOTO). Absolute seconds = narration time = studio/src/edit/N2.tsx. No music."""
DURATION = 136.3
NARRATION = "audio/master/n2_narration.wav"
WORDS = "data/n02.words.json"


def build(find, seq):
    beds = [
        dict(kind="bathroom", t0=0.0, t1=7.78, gain_db=-28, fade=0.05),
        dict(kind="fluoro", t0=0.0, t1=7.78, gain_db=-34, fade=0.05),
        dict(kind="roomtone", t0=7.78, t1=135.8, gain_db=-30, fade=0.05),
        dict(kind="traffic", t0=7.78, t1=14.78, gain_db=-36, fade=0.3),
        dict(kind="tvroom", t0=14.78, t1=17.42, gain_db=-30, fade=0.1),
        dict(kind="rainglass", t0=14.78, t1=135.8, gain_db=-27, fade=0.4),
        dict(kind="fridge", t0=14.78, t1=135.8, gain_db=-35, fade=0.4),
        dict(kind="dread", t0=21.9, t1=135.8, gain_db=-24, fade=1.5, auto=[(21.9, -8), (35.9, 0), (46.2, 2), (48.8, -6), (52.8, 2), (64.2, 0), (73.8, 3), (83.9, -3), (97.2, 3), (104.6, 0), (110.4, 4), (118.6, 2), (126.3, 5), (131.6, -6)]),
    ]
    ev = [
        dict(kind="clocktick", t=17.45, db=-16, sec=4.4),
        dict(kind="doorbell", t=22.6, db=-9),
        dict(kind="vibrate", t=27.1, db=-14, sec=0.6),
        dict(kind="ping", t=28.75, db=-15), dict(kind="ping", t=33.95, db=-15),
        dict(kind="cloth", t=46.4, db=-20, sec=0.9),
        dict(kind="swell", t=48.6, db=-18, sec=2.2),
        dict(kind="heartbeat", t=52.6, db=-22, sec=8.0),
        dict(kind="clocktick", t=57.3, db=-14, sec=3.4),
        dict(kind="vibrate", t=64.6, db=-13, sec=0.6), dict(kind="ping", t=64.7, db=-16),
        dict(kind="swell", t=70.2, db=-15, sec=2.6),
        dict(kind="step", t=73.95, db=-16, soft=False), dict(kind="step", t=74.55, db=-18, soft=False),
        dict(kind="ping", t=76.55, db=-16),
        dict(kind="heartbeat", t=83.9, db=-20, sec=9.4),
        dict(kind="clocktick", t=93.35, db=-14, sec=3.8),
        dict(kind="tap", t=95.52, db=-10, bright=0.6),
        dict(kind="knock", t=98.71, db=-5, heavy=0.8, muffled=True, seed=11),
        dict(kind="knock", t=99.41, db=-5, heavy=0.8, muffled=True, seed=12),
        dict(kind="knock", t=100.11, db=-5, heavy=0.8, muffled=True, seed=13),
        dict(kind="rattle", t=102.4, db=-8, sec=2.2),
        dict(kind="pound", t=102.45, db=-14, sec=2.1, rate=11, seed=14),
        dict(kind="ring", t=104.65, db=-10, sec=4.6),
        dict(kind="tap", t=109.5, db=-14),
        dict(kind="phonebreath", t=110.2, db=-10, sec=3.3),
        dict(kind="tap", t=117.75, db=-12), dict(kind="ping", t=117.9, db=-20),
        dict(kind="ping", t=119.4, db=-15),
        dict(kind="swell", t=122.6, db=-14, sec=3.0),
        dict(kind="sting", t=130.58, db=-3, seed=21), dict(kind="glitch", t=130.6, db=-10, seed=22),
        dict(kind="ping", t=133.15, db=-14),
    ]
    return ev, beds
