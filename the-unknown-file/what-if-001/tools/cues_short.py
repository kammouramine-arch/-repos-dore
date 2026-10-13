"""SFX cue sheet — WHAT IF? #001 vertical short. Shot times mirror studio/src/short/Short.tsx."""
DURATION = 117.5
NARRATION = "audio/master/short_narration.wav"


def build(find, seq):
    a = lambda p, after=0.0: find(p, after)[0]
    disappears = a("the moon disappears")
    gone = a("it's gone")
    beds = [
        dict(kind="crickets", t0=0.0, t1=5.5, gain_db=-34, fade=0.8, auto=[(0, 0), (disappears + 0.5, 0), (disappears + 1.5, -10), (5.5, -10)]),
        dict(kind="surf", t0=0.0, t1=5.5, gain_db=-38, fade=0.8),
        dict(kind="crickets", t0=5.4, t1=9.1, gain_db=-34, fade=0.4, auto=[(5.4, 0), (gone + 0.3, 0), (gone + 1, -12), (9.1, -12)]),
        dict(kind="murmur", t0=9.0, t1=11.1, gain_db=-28, fade=0.4),
        dict(kind="wind", t0=11.0, t1=13.1, gain_db=-34, fade=0.3),
        dict(kind="surf", t0=13.0, t1=44.3, gain_db=-30, fade=1.0, period=8.0, auto=[(13, -4), (18.1, 0), (36.6, 0), (44.3, -6)]),
        dict(kind="underwater", t0=44.2, t1=67.9, gain_db=-30, fade=1.0),
        dict(kind="surf", t0=67.8, t1=71.5, gain_db=-34, fade=0.5),
        dict(kind="engine", t0=71.4, t1=75.0, gain_db=-34, fade=0.4),
        dict(kind="market", t0=74.9, t1=78.8, gain_db=-30, fade=0.4),
        dict(kind="crickets", t0=78.7, t1=88.9, gain_db=-30, fade=0.6),
        dict(kind="wind", t0=88.8, t1=95.5, gain_db=-40, fade=1.0),
        dict(kind="murmur", t0=95.4, t1=100.1, gain_db=-34, fade=0.6, people=6),
        dict(kind="surf", t0=100.0, t1=103.2, gain_db=-36, fade=0.5),
        dict(kind="underwater", t0=103.1, t1=106.8, gain_db=-32, fade=0.5),
        dict(kind="crickets", t0=106.7, t1=110.6, gain_db=-38, fade=0.6),
    ]
    ev = []
    E = lambda kind, t, db=0.0, pan=0.0, **kw: ev.append(dict(kind=kind, t=t, db=db, pan=pan, **kw))
    E("vanish", disappears + 0.45 - 1.65, -16, sec=3.0)
    E("vanish", gone + 0.15 - 1.65, -20, sec=3.0, pan=0.2)
    E("whoosh", 12.8, -26, sec=1.6, lo=2400, hi=200, up=False)
    E("swell", a("But the real danger") + 0.3, -22, sec=3.0)
    E("whoosh", 17.8, -24, sec=1.0, lo=500, hi=4000)
    E("water", 26.8, -22, sec=3.0, density=6)
    for t in [27.6, 28.8, 30.1]:
        E("tick", t, -22)
    E("swell", 36.4, -24, sec=3.5)
    E("whoosh", 44.0, -22, sec=1.4, lo=1800, hi=200, up=False)
    E("water", 50.0, -26, sec=5.0, density=4, lo=500, hi=1200)
    E("swell", 55.2, -24, sec=3.0)
    for t in [60.6, 62.8, 64.9, 66.0]:
        E("tick", t, -24)
    E("whoosh", 67.6, -26, sec=1.0, lo=400, hi=3000)
    E("glove", 72.6, -20)
    E("owl", 80.6, -22, pan=-0.5)
    E("owl", 86.0, -26, pan=-0.6)
    E("whoosh", 88.6, -22, sec=2.2, lo=150, hi=1800)
    E("swell", 95.6, -24, sec=2.0)
    E("impact", a("never be born") + 0.2, -22, weight=0.5)
    E("whoosh", 110.4, -24, sec=2.4, lo=120, hi=1500)
    E("paper", 113.6, -18, sec=0.8)
    E("stamp", 113.5 + (DURATION - 113.5) * 0.55, -12)
    return ev, beds
