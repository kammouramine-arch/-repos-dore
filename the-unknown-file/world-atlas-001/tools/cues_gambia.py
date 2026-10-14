"""SFX cue sheet — WORLD ATLAS #001 · THE GAMBIA. Events are keyed to narration phrases (same cues as studio/src/Gambia.tsx)."""
DURATION = 133.6
NARRATION = "audio/master/gambia_narration.wav"


def build(find, seq):
    a = lambda p, after=0.0: find(p, after)[0]
    T = dict(
        zoom=a("Now zoom in"), tiny=a("See this tiny country"), river=a("took a river"), drew=a("drew a border"),
        thisIs=a("This is the Gambia"), closely=a("Look closely"), strip=a("long narrow strip"), surrounded=a("almost completely surrounded"),
        except_=a("except for one opening"), how=a("So how did this happen"), back=a("go back more than"), longBefore=a("Long before these"),
        communities=a("communities lived"), european=a("European empires"), britain=a("Britain established"), meanwhile=a("Meanwhile, France"),
        problem=a("But there was a problem"), both=a("Both empires"), in1889=a("in 1889"), reached=a("reached an agreement"),
        tenKm=a("roughly 10 kilometers"), lookNow=a("Look at the map now"), corridor=a("this narrow corridor"), outline=a("the outline of a future"),
        interesting=a("here's something interesting"), story=a("an old story"), fired=a("fired cannonballs"), noEvidence=a("no reliable evidence"),
        negotiated=a("borders were negotiated"), surveyed=a("and surveyed"), feb=a("February 18th"), independence=a("gained its independence"),
        remained=a("largely remained"), nextTime=a("the next time you look"), ofRiver=a("of a river"), empires=a("two competing empires"),
        worldAtlas=a("World Atlas"), country1=a("Country number one"), gambia=a("The Gambia", 129), unknown=a("The unknown file", 130),
    )
    beds = [
        dict(kind="wind", t0=0.0, t1=DURATION, gain_db=-44, fade=2.0),
        dict(kind="surf", t0=T["except_"] - 0.5, t1=T["how"] + 1.0, gain_db=-34, fade=0.8, period=7.0),
        dict(kind="river", t0=T["longBefore"] + 1.0, t1=T["britain"] + 1.0, gain_db=-36, fade=1.2),
        dict(kind="river", t0=T["interesting"], t1=T["negotiated"], gain_db=-36, fade=1.0),
        dict(kind="wind", t0=T["independence"], t1=T["remained"] + 1.2, gain_db=-34, fade=0.8),
    ]
    ev = []
    E = lambda kind, t, db=0.0, pan=0.0, **kw: ev.append(dict(kind=kind, t=t, db=db, pan=pan, **kw))
    E("swell", 0.0, -26, sec=2.5)
    E("whoosh", T["zoom"] - 0.1, -20, sec=1.6, lo=180, hi=2600)
    E("whoosh", T["tiny"] - 0.1, -22, sec=1.4, lo=200, hi=3000)
    E("impact", T["tiny"] + 0.45, -26, weight=0.35)
    E("hiss", T["river"], -32, sec=1.6)
    E("pen", T["drew"], -20, sec=1.9)
    E("impact", T["thisIs"], -22, weight=0.5)
    E("whoosh", T["closely"] - 0.2, -26, sec=1.2, lo=1600, hi=300, up=False)
    E("whoosh", T["strip"], -30, sec=2.4, lo=200, hi=1200)
    E("swell", T["surrounded"], -26, sec=2.2)
    E("impact", T["how"], -24, weight=0.4)
    E("rewind", T["back"] - 0.1, -18, sec=3.6)
    E("paper", T["longBefore"] - 0.2, -16, sec=0.8)
    for i in range(6):
        E("tick", T["communities"] + 0.1 + i * 0.12, -28, pan=-0.4 + i * 0.16)
    E("whoosh", T["european"], -26, sec=1.8, lo=300, hi=2200)
    for i, d in enumerate([0.2, 0.6, 1.2]):
        E("tick", T["britain"] + d, -18, pan=-0.3 + i * 0.3)
    E("paper", T["britain"] + 1.3, -18, sec=0.7)
    E("whoosh", T["meanwhile"] - 0.1, -22, sec=1.6, lo=1500, hi=250, up=False)
    E("pen", T["meanwhile"] + 0.5, -26, sec=1.7)
    E("paper", T["meanwhile"] + 1.1, -18, sec=0.7)
    E("impact", T["problem"] + 0.4, -26, weight=0.4)
    E("pen", T["both"], -26, sec=2.0)
    E("whoosh", T["in1889"] - 0.4, -22, sec=1.0, lo=400, hi=3200)
    E("impact", T["in1889"] + 0.05, -14, weight=1.0)
    E("paper", T["reached"], -16, sec=0.9)
    E("pen", T["tenKm"] + 0.1, -22, sec=2.0)
    E("pen", T["lookNow"], -18, sec=2.4)
    E("swell", T["corridor"] - 0.4, -24, sec=2.0)
    E("impact", T["outline"] + 1.0, -22, weight=0.6)
    E("whoosh", T["interesting"] - 0.3, -22, sec=1.6, lo=250, hi=2600)
    E("stamp", T["story"] + 0.3, -16)
    for i, d in enumerate([0.0, 0.6, 1.2]):
        E("cannon", T["fired"] + d, -16 - i * 3, pan=(-0.5, 0.5, -0.2)[i])
    E("stamp", T["noEvidence"] + 0.1, -14)
    E("paper", T["negotiated"], -16, sec=0.8)
    for i in range(10):
        E("tick", T["surveyed"] - 0.5 + i * 0.16, -24, pan=-0.6 + i * 0.13)
    E("impact", T["feb"] + 0.1, -14, weight=1.0)
    E("swell", T["independence"] - 0.3, -20, sec=2.4)
    E("whoosh", T["nextTime"], -22, sec=2.2, lo=1800, hi=200, up=False)
    E("hiss", T["ofRiver"] - 0.3, -32, sec=1.5)
    E("impact", T["empires"], -26, weight=0.3)
    E("whoosh", T["worldAtlas"] - 1.5, -20, sec=2.8, lo=120, hi=1600)
    E("impact", T["country1"], -18, weight=0.6)
    E("tick", T["gambia"], -20)
    E("stamp", T["unknown"], -14)
    return ev, beds
