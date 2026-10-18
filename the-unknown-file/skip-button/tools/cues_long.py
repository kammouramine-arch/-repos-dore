"""SFX cue sheet — THE SKIP BUTTON full film. Times mirror studio/src/long/Long.tsx. No music."""
DURATION = 522.6
NARRATION = "audio/master/long_narration.wav"


def steps(t0, t1, every=0.53, db=-22, soft=True):
    out, t = [], t0
    while t < t1:
        out.append(dict(kind="step", t=t, db=db, soft=soft)); t += every
    return out


def build(find, seq):
    beds = [
        dict(kind="hush", t0=0.0, t1=5.4, gain_db=-34, fade=1.0),
        dict(kind="office", t0=5.4, t1=9.6, gain_db=-30, fade=0.2),
        dict(kind="apartment", t0=9.6, t1=11.8, gain_db=-30, fade=0.2),
        dict(kind="hush", t0=11.8, t1=39.4, gain_db=-34, fade=0.6),
        dict(kind="street", t0=39.4, t1=41.3, gain_db=-26, fade=0.6),
        dict(kind="cafe", t0=41.3, t1=88.4, gain_db=-25, fade=0.5),
        dict(kind="office", t0=88.4, t1=116.1, gain_db=-27, fade=0.6),
        dict(kind="cafe", t0=116.1, t1=120.2, gain_db=-36, fade=0.3),
        dict(kind="traffic", t0=120.2, t1=121.5, gain_db=-24, fade=0.1), dict(kind="busbed", t0=120.2, t1=122.6, gain_db=-30, fade=0.1),
        dict(kind="office", t0=122.6, t1=127.2, gain_db=-27, fade=0.1),
        dict(kind="street", t0=127.2, t1=129.9, gain_db=-28, fade=0.1),
        dict(kind="apartment", t0=129.9, t1=137.4, gain_db=-28, fade=0.4),
        dict(kind="park", t0=137.4, t1=151.2, gain_db=-26, fade=0.8),
        dict(kind="hush", t0=151.2, t1=155.6, gain_db=-32, fade=0.5),
        dict(kind="apartment", t0=155.6, t1=161.6, gain_db=-28, fade=0.5),
        dict(kind="street", t0=161.6, t1=175.8, gain_db=-28, fade=0.6),
        dict(kind="hush", t0=175.8, t1=191.4, gain_db=-34, fade=0.6),
        dict(kind="apartment", t0=191.4, t1=231.2, gain_db=-29, fade=0.6),
        dict(kind="kitchen", t0=231.2, t1=234.4, gain_db=-28, fade=0.4),
        dict(kind="apartment", t0=234.4, t1=244.4, gain_db=-29, fade=0.4),
        dict(kind="kitchen", t0=244.4, t1=247.0, gain_db=-28, fade=0.4),
        dict(kind="hush", t0=247.0, t1=250.3, gain_db=-34, fade=0.4),
        dict(kind="kitchen", t0=250.3, t1=254.5, gain_db=-28, fade=0.5),
        dict(kind="office", t0=254.5, t1=255.2, gain_db=-32, fade=0.1), dict(kind="kitchen", t0=255.2, t1=261.6, gain_db=-30, fade=0.2),
        dict(kind="hush", t0=261.6, t1=272.8, gain_db=-30, fade=0.8),
        dict(kind="bathroom", t0=272.8, t1=289.9, gain_db=-30, fade=0.8),
        dict(kind="hush", t0=289.9, t1=440.4, gain_db=-32, fade=1.0),
        dict(kind="cafe", t0=440.4, t1=444.4, gain_db=-30, fade=0.8),
        dict(kind="office", t0=444.4, t1=448.4, gain_db=-31, fade=0.5),
        dict(kind="kitchen", t0=448.4, t1=455.2, gain_db=-30, fade=0.6),
        dict(kind="hush", t0=455.2, t1=458.6, gain_db=-32, fade=0.5),
        dict(kind="nighttown", t0=458.6, t1=465.0, gain_db=-27, fade=0.6),
        dict(kind="kitchen", t0=465.0, t1=508.6, gain_db=-28, fade=0.6),
        dict(kind="nighttown", t0=508.6, t1=520.0, gain_db=-29, fade=1.2),
    ]
    ev = [
        dict(kind="swell", t=0.3, db=-20),
        dict(kind="skipfx", t=7.0, db=-14, sec=1.1, mood="uneasy"), dict(kind="skipfx", t=9.0, db=-14, sec=1.1, mood="uneasy"), dict(kind="skipfx", t=11.1, db=-14, sec=1.6, mood="cold"),
        dict(kind="press", t=15.05, db=-10, mood="play"),
        dict(kind="impact", t=34.7, db=-22, sec=2.0, weight=0.6),
        *steps(39.5, 41.3),
        dict(kind="ping", t=45.3, db=-20),
        *[dict(kind="tick", t=51.2 + i * 0.09, db=-22) for i in range(8)], dict(kind="swell", t=51.4, db=-22),
        dict(kind="press", t=68.3, db=-10, mood="play"), dict(kind="skipfx", t=68.5, db=-12, sec=0.75, mood="play"),
        dict(kind="cup", t=70.3, db=-18),
        dict(kind="clocktick", t=76.6, db=-14, sec=0.6, rate=12),
        *steps(87.0, 88.4),
        dict(kind="press", t=100.55, db=-10, mood="play"), dict(kind="skipfx", t=100.7, db=-12, sec=0.75, mood="play"),
        *steps(101.2, 104.2),
        dict(kind="press", t=117.3, db=-12, mood="play"), dict(kind="press", t=119.0, db=-12, mood="play"),
        dict(kind="skipfx", t=121.5, db=-13, sec=0.75, mood="play"), dict(kind="skipfx", t=123.5, db=-13, sec=0.75, mood="play"),
        dict(kind="skipfx", t=126.0, db=-13, sec=0.75, mood="play"), dict(kind="skipfx", t=128.7, db=-13, sec=1.1, mood="uneasy"),
        dict(kind="press", t=215.35, db=-12, mood="uneasy"), dict(kind="skipfx", t=215.35, db=-12, sec=2.0, mood="uneasy"),
        dict(kind="ring", t=234.5, db=-18, sec=2.2), dict(kind="vibrate", t=234.5, db=-20, sec=1.5),
        dict(kind="ring", t=237.0, db=-28, sec=2.0),
        dict(kind="press", t=243.25, db=-12, mood="uneasy"),
        dict(kind="ping", t=247.1, db=-20), dict(kind="ping", t=248.4, db=-20),
        dict(kind="skipfx", t=255.1, db=-13, sec=1.1, mood="uneasy"),
        dict(kind="press", t=261.9, db=-12, mood="cold"), dict(kind="skipfx", t=262.0, db=-12, sec=2.4, mood="cold"),
        dict(kind="tap", t=282.5, db=-20), dict(kind="swell", t=285.3, db=-20),
        *[dict(kind="tap", t=x, db=-25) for x in (297.0, 300.5, 304.0, 307.5, 312.0, 313.8, 315.3, 316.5, 318.2)],
        dict(kind="tap", t=329.4, db=-18), dict(kind="ring", t=329.7, db=-28, sec=1.8), dict(kind="ping", t=332.2, db=-22),
        dict(kind="tap", t=335.6, db=-22),
        *[dict(kind="ping", t=354.6 + x, db=-24) for x in (0.8, 2.6, 4.6, 11.6)],
        *[dict(kind="tap", t=399.6 + s + i * 0.07, db=-26, bright=0.6) for s, w in ((0, 6), (0.95, 4), (1.9, 7), (2.8, 8)) for i in range(w)],
        dict(kind="tap", t=408.95, db=-16, bright=0.6),
        dict(kind="heartbeat", t=429.5, db=-30, sec=6.0, bpm=58),
        dict(kind="tap", t=457.1, db=-18, bright=0.3),
        *steps(458.7, 461.6),
        dict(kind="door", t=460.6, db=-18),
        dict(kind="chair", t=465.2, db=-24),
        dict(kind="laugh", t=474.4, db=-24, sec=1.6),
        dict(kind="glove", t=480.0, db=-26), dict(kind="glove", t=482.9, db=-26),
        dict(kind="impact", t=519.7, db=-22, sec=2.0, weight=0.6),
    ]
    return ev, beds
