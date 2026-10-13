"""SFX cue sheet — WHAT IF? #001 long documentary. Shot times mirror studio/src/long/Long.tsx."""
DURATION = 597.5
NARRATION = "audio/master/long_narration.wav"


def build(find, seq):
    beds = [
        # the night it disappeared
        dict(kind="crickets", t0=0.0, t1=19.3, gain_db=-34, fade=1.5, auto=[(0, 0), (11.2, 0), (12.6, -12), (19.3, -12)]),
        dict(kind="surf", t0=0.0, t1=19.3, gain_db=-40, fade=1.5, period=8.5),
        dict(kind="murmur", t0=23.0, t1=25.0, gain_db=-28, fade=0.4),
        dict(kind="tv", t0=24.9, t1=27.5, gain_db=-30, fade=0.3),
        dict(kind="wind", t0=27.4, t1=31.8, gain_db=-34, fade=0.6),
        dict(kind="wind", t0=31.7, t1=42.8, gain_db=-44, fade=1.5),
        dict(kind="surf", t0=42.7, t1=50.0, gain_db=-30, fade=1.0, period=9.0),
        dict(kind="underwater", t0=49.9, t1=58.0, gain_db=-30, fade=1.0),
        # first morning
        dict(kind="murmur", t0=61.9, t1=73.7, gain_db=-34, fade=1.0, people=6),
        dict(kind="surf", t0=73.6, t1=90.3, gain_db=-30, fade=1.0, period=10.0),
        # the grunion
        dict(kind="surf", t0=104.9, t1=193.6, gain_db=-30, fade=1.5, period=8.0, auto=[(104.9, 0), (149, 0), (149.5, -10), (157, -10), (157.5, 0), (183.1, 0), (183.6, -10), (193.6, -10)]),
        # the reef
        dict(kind="underwater", t0=201.4, t1=327.9, gain_db=-30, fade=1.5),
        # the fishing family
        dict(kind="surf", t0=327.8, t1=342.0, gain_db=-32, fade=1.0, period=9.0),
        dict(kind="engine", t0=339.0, t1=355.0, gain_db=-34, fade=1.0),
        dict(kind="market", t0=354.9, t1=360.1, gain_db=-30, fade=0.5),
        dict(kind="wind", t0=360.0, t1=369.4, gain_db=-44, fade=1.0),
        dict(kind="underwater", t0=369.3, t1=376.7, gain_db=-32, fade=0.6),
        # nights on land
        dict(kind="crickets", t0=387.3, t1=443.3, gain_db=-30, fade=1.5),
        dict(kind="wind", t0=387.3, t1=443.3, gain_db=-40, fade=1.5),
        # distant future
        dict(kind="wind", t0=443.2, t1=505.7, gain_db=-46, fade=2.0),
        # decades later
        dict(kind="crickets", t0=505.6, t1=516.1, gain_db=-38, fade=1.0),
        dict(kind="murmur", t0=516.0, t1=520.4, gain_db=-34, fade=0.5),
        dict(kind="murmur", t0=525.6, t1=530.4, gain_db=-36, fade=0.5, people=6),
        dict(kind="surf", t0=530.3, t1=536.4, gain_db=-34, fade=0.5),
        dict(kind="underwater", t0=543.6, t1=545.7, gain_db=-34, fade=0.4),
        dict(kind="crickets", t0=545.6, t1=554.5, gain_db=-36, fade=0.8),
        dict(kind="underwater", t0=554.4, t1=560.1, gain_db=-34, fade=0.6),
        dict(kind="surf", t0=567.8, t1=573.6, gain_db=-36, fade=0.6),
        dict(kind="underwater", t0=573.5, t1=576.4, gain_db=-36, fade=0.4),
    ]
    ev = []
    E = lambda kind, t, db=0.0, pan=0.0, **kw: ev.append(dict(kind=kind, t=t, db=db, pan=pan, **kw))
    E("vanish", 11.1 - 1.65, -15, sec=3.0)
    E("vanish", 35.8 - 1.65, -22, sec=3.0)
    E("whoosh", 19.0, -26, sec=1.0, lo=600, hi=4000)
    E("impact", 40.3, -22, weight=0.5)
    E("swell", 44.8, -24, sec=4.0)
    E("paper", 58.0, -18, sec=0.8); E("stamp", 59.0, -14); E("paper", 60.4, -20, sec=1.2)
    E("whoosh", 61.7, -24, sec=2.5, lo=150, hi=1500)
    for t in [78.3, 79.3]:
        E("tick", t, -22)
    E("water", 112.0, -24, sec=3.0, density=4)
    E("whoosh", 118.8, -24, sec=1.4, lo=1800, hi=200, up=False)
    E("water", 125.5, -20, sec=10.0, density=8, lo=400, hi=1200)
    E("water", 141.5, -20, sec=5.0, density=8)
    E("swell", 156.5, -24, sec=3.5)
    for t in [164.9, 166.4]:
        E("tick", t, -22)
    E("whoosh", 193.3, -22, sec=3.0, lo=150, hi=1500)
    E("whoosh", 201.2, -22, sec=1.5, lo=1800, hi=200, up=False)
    E("water", 220.0, -26, sec=9.0, density=4, lo=500, hi=1200)
    E("swell", 233.6, -24, sec=2.4)
    for t in [241.6, 242.4, 243.2, 244.0, 244.8, 245.6, 246.4, 247.2]:
        E("tick", t, -26)
    E("swell", 260.0, -24, sec=3.0)
    for t in [279.6, 282.8, 283.9]:
        E("tick", t, -22)
    E("whoosh", 288.0, -26, sec=2.5, lo=150, hi=1500)
    E("glove", 342.6, -20); E("glove", 344.0, -22)
    E("whoosh", 346.0, -26, sec=2.0, lo=150, hi=1500)
    E("owl", 391.0, -22, pan=-0.6); E("owl", 405.0, -24, pan=-0.6); E("owl", 428.0, -26, pan=-0.5)
    E("whoosh", 443.0, -22, sec=3.0, lo=120, hi=1500)
    E("swell", 467.6, -26, sec=3.0)
    E("whoosh", 505.4, -24, sec=3.0, lo=150, hi=1500)
    E("vanish", 522.5 - 1.65, -22, sec=3.0)
    E("whoosh", 560.0, -24, sec=4.0, lo=120, hi=1500)
    E("impact", 578.0, -24, weight=0.5)
    E("paper", 592.5, -18, sec=0.8)
    E("stamp", 592.4 + (DURATION - 592.4) * 0.55, -12)
    return ev, beds
