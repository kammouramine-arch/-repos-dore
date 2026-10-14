"""SFX cue sheet — FILE #003 vertical short. Strike times mirror studio/src/short/Short.tsx (same phrase cues).
No music: narration + original sound design only."""
DURATION = 102.4
NARRATION = "audio/master/short_narration.wav"


def build(find, seq):
    a = lambda p, after=0.0: find(p, after)[0]
    T = {k: a(p) for k, p in dict(
        struck0="struck by lightning", surviving="surviving", six="happen six more times", times="times.", fiction="This isn't fiction",
        roy="Roy Sullivan", y1942="1942", ranger="park ranger", struck1="struck a lookout", ran="Roy ran", struck1b="struck his right leg",
        survived1="He survived but", later="27 years later", struck2="struck again", driving="driving his truck", knocked="It knocked",
        then3="Then, in", struck3="struck him in his garden", in72="In 1972", struck4="struck him inside", crazier="But it gets even crazier",
        in73="In 1973", struck5="struck him for the fifth", afraid="Roy had become so afraid", came="Then came 1976", number6="strike number six",
        june="on June 25", struck7="struck him for the seventh", chest="It burned his chest", somehow="but somehow", seven="Seven lightning strikes",
        story="His story earned", guinness="Guinness World Records", never="Roy was never recorded", file="File 3").items()}
    T["times"] = a("times", T["six"])
    end = DURATION
    beds = [
        dict(kind="rain", t0=0.0, t1=T["fiction"], gain_db=-30, fade=0.6, heavy=0.5),
        dict(kind="gusts", t0=0.0, t1=T["fiction"], gain_db=-34, fade=0.6),
        dict(kind="stormbed", t0=T["y1942"] - 0.4, t1=T["struck1"] - 0.8, gain_db=-30, fade=0.8),
        dict(kind="rain", t0=T["struck1"] - 1.0, t1=T["later"] - 0.2, gain_db=-30, fade=0.6, heavy=0.6),
        dict(kind="fire", t0=T["struck1"] + 0.2, t1=T["later"] - 0.2, gain_db=-30, fade=1.2),
        dict(kind="rain", t0=T["struck2"] - 0.7, t1=T["driving"] - 0.6, gain_db=-30, fade=0.4),
        dict(kind="truck", t0=T["struck2"] - 0.7, t1=T["knocked"] - 0.2, gain_db=-30, fade=0.5),
        dict(kind="roofrain", t0=T["driving"] - 0.6, t1=T["knocked"] + 0.15, gain_db=-28, fade=0.2),
        dict(kind="gusts", t0=T["then3"], t1=T["in72"], gain_db=-32, fade=0.5),
        dict(kind="rain", t0=T["then3"], t1=T["in72"], gain_db=-36, fade=0.5, heavy=0.3),
        dict(kind="roofrain", t0=T["in72"], t1=T["crazier"], gain_db=-34, fade=0.4),
        dict(kind="fire", t0=T["struck4"] + 0.2, t1=T["crazier"], gain_db=-36, fade=0.4, size=0.4),
        dict(kind="gusts", t0=T["crazier"] - 0.1, t1=T["afraid"], gain_db=-30, fade=0.5),
        dict(kind="rain", t0=T["in73"], t1=T["afraid"], gain_db=-30, fade=0.4, heavy=0.7),
        dict(kind="fire", t0=T["struck5"] + 0.15, t1=T["afraid"], gain_db=-36, fade=0.4, size=0.4),
        dict(kind="rain", t0=T["afraid"] - 0.2, t1=T["came"], gain_db=-38, fade=0.8, heavy=0.3),
        dict(kind="stormbed", t0=T["afraid"] - 0.2, t1=T["came"], gain_db=-34, fade=0.8),
        dict(kind="rain", t0=T["came"] - 0.15, t1=T["june"], gain_db=-30, fade=0.5, heavy=0.7),
        dict(kind="crickets", t0=T["came"] - 0.15, t1=T["number6"] - 0.5, gain_db=-40, fade=0.5),
        dict(kind="brook", t0=T["june"] - 0.2, t1=T["struck7"] - 0.6, gain_db=-30, fade=0.8),
        dict(kind="gusts", t0=T["june"] - 0.2, t1=T["struck7"] - 0.6, gain_db=-34, fade=0.8, auto=[(T["june"], -8), (T["struck7"] - 1.0, 2)]),
        dict(kind="rain", t0=T["june"] + 1.0, t1=T["struck7"] - 0.6, gain_db=-30, fade=1.5, heavy=0.8, auto=[(T["june"], -12), (T["struck7"] - 1.0, 0)]),
        dict(kind="brook", t0=T["chest"] + 0.8, t1=T["somehow"] + 0.9, gain_db=-36, fade=1.0),
        dict(kind="rain", t0=T["chest"] + 0.5, t1=T["somehow"] + 0.9, gain_db=-40, fade=1.0, heavy=0.2),
        dict(kind="wind", t0=T["never"] - 0.3, t1=T["file"], gain_db=-34, fade=1.0),
        dict(kind="brook", t0=T["never"] - 0.3, t1=T["file"], gain_db=-42, fade=1.0),
    ]
    ev = []
    E = lambda kind, t, db=0.0, pan=0.0, **kw: ev.append(dict(kind=kind, t=t, db=db, pan=pan, **kw))
    # opening storm
    o = T["struck0"] + 0.2
    E("thunder", o - 0.9 + 1.4, -20, pan=-0.4, sec=6, dist=0.85, seed=11)
    E("thunder", o + 0.03, -8, pan=0.1, sec=7, dist=0.25, seed=12)
    E("thunder", o + 2.4 + 1.2, -18, pan=0.6, sec=6, dist=0.75, seed=13)
    E("thunder", T["surviving"] + 0.4, -16, pan=0.5, sec=6, dist=0.55, seed=14)
    # the 7: seven restrained low hits, one per strike
    st = (T["times"] + 0.4 - T["six"]) / 7
    for i in range(7):
        E("impact", T["six"] - 0.05 + i * st, -24 + i * 1.2, sec=1.4, weight=0.6 + 0.06 * i)
    E("swell", T["roy"] - 0.6, -26, sec=2.5)
    E("whoosh", T["ranger"] - 0.6, -28, sec=1.4, lo=1800, hi=300, up=False)
    # 1942
    E("thunder", T["struck1"] + 0.02, -5, sec=8, dist=0.12, seed=21)
    E("thunder", T["struck1"] + 2.6 + 0.9, -20, pan=-0.6, sec=6, dist=0.7, seed=22)
    E("thunder", T["struck1b"] - 0.1 + 0.01, -3, sec=8, dist=0.0, seed=23)
    E("tinnitus", T["struck1b"] + 0.2, -36, sec=3.0)
    E("tick", T["survived1"] + 0.1, -26)
    for k in range(12):
        E("tick", T["later"] + 0.3 + k * 0.17, -32 + k * 0.4)
    # 1969
    E("thunder", T["struck2"] - 0.7 + 1.0 + 1.0, -20, pan=-0.5, sec=6, dist=0.8, seed=31)
    E("thunder", T["struck2"] + 0.25, -12, pan=0.5, sec=7, dist=0.45, seed=32)
    E("thunder", T["knocked"] - 0.35, -4, sec=6, dist=0.05, seed=33)
    E("tinnitus", T["knocked"] + 0.1, -28, sec=4.5)
    E("tick", T["knocked"] + 0.9, -24)
    # 1970
    E("thunder", T["then3"] + 0.9 + 1.0, -22, pan=-0.6, sec=6, dist=0.85, seed=41)
    E("arc", T["struck3"] + 0.02, -12, pan=0.3, sec=0.8)
    E("thunder", T["struck3"] + 0.04, -6, sec=7, dist=0.2, seed=42)
    # 1972 (inside: heard through walls)
    E("thunder", T["struck4"] + 0.03, -7, sec=7, dist=0.18, seed=51)
    E("whoosh", T["struck4"] + 0.15, -26, sec=0.7, lo=300, hi=2500)
    # crazier
    E("thunder", T["crazier"] + 0.3, -18, sec=7, dist=0.7, seed=55)
    # 1973
    E("thunder", T["in73"] - 0.1 + 1.2 + 1.0, -20, pan=-0.6, sec=6, dist=0.8, seed=61)
    E("thunder", T["struck5"] + 0.01, -4, sec=8, dist=0.03, seed=62)
    E("whoosh", T["struck5"] + 0.12, -26, sec=0.6, lo=300, hi=2500)
    # 1976
    E("thunder", T["came"] - 0.15 + 1.1 + 1.0, -22, pan=0.6, sec=6, dist=0.85, seed=71)
    E("thunder", T["number6"] - 0.1, -5, sec=8, dist=0.08, seed=72)
    # 1977 — rising tension, a breath of silence, then the biggest strike
    E("thunder", T["struck7"] - 2.6 + 1.4, -18, pan=-0.5, sec=6, dist=0.75, seed=81)
    E("thunder", T["struck7"] - 1.2 + 0.7, -14, pan=0.5, sec=5, dist=0.6, seed=82)
    E("thunder", T["struck7"], -1, sec=10, dist=0.0, seed=83, crack=1.3)
    E("tinnitus", T["struck7"] + 0.4, -26, sec=6.0)
    E("heartbeat", T["somehow"] - 0.2, -24, sec=3.2, bpm=56)
    # payoff + recognition + close
    for i in range(7):
        E("tick", T["seven"] - 0.2 + 0.25 + i * 0.22, -26)
    E("stamp", T["guinness"] - 0.1, -20)
    E("swell", T["never"] - 0.2, -30, sec=3)
    E("paper", T["file"] - 0.2, -22)
    E("stamp", T["file"] - 0.35 + (end - T["file"] + 0.35) * 0.55, -16)
    return ev, beds
