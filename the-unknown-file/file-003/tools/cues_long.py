"""SFX cue sheet — FILE #003 4K documentary. Strike times mirror studio/src/long/Long.tsx (same phrase cues).
No music: narration + original sound design only. Thunder gets heavier toward the seventh strike."""
DURATION = 566.4
NARRATION = "audio/master/long_narration.wav"

P = dict(
    struck0="struck by lightning", most="For most people", nowImagine="Now imagine surviving", again1="happen again",
    until="Until one day", seven="Seven lightning strikes", oneMan="One man", roy="Roy Sullivan", guinness="Guinness World Records",
    fileThree="This is File 3", begins="Our story begins", shen="Shenandoah National Park", forYears="For years", hisJob="His job kept him",
    roads="remote roads", weather="and sometimes, dangerous weather", y1942="But in 1942", thatDay="That day", turned="The weather had turned",
    struckTower="Lightning struck the tower", fled="Roy fled", struck1="lightning struck him", boltLeg="The bolt hit", imagineShock="Imagine the shock",
    yet="Yet somehow", after="And after that", perhaps="Perhaps the first", came69="But then came 1969", hit2="hit him",
    consequences="This time, the consequences", lost="He lost consciousness", eyebrows="His eyebrows", second="A second lightning",
    interesting="Now here's something", windows="windows are closed", accounts="And accounts of", noEvidence="There is no reliable",
    outdoors="He was a man who", remarkable="But the number", in1970="Because in 1970", struck3="lightning struck. This",
    beginning="And somehow, the story", april="On April 16th", fourth="And lightning struck him for a fourth", frightening="But this incident",
    extinguish="Roy managed to extinguish", repeated="But repeated experiences", precautions="According to accounts", relevant="And incredibly",
    aug="Because on August", account="According to his account", following="He later described", safe="When Roy thought",
    struck5="lightning struck again", byNow="By now", rod="Human Lightning Rod", spark="Spark Ranger", next="The next incident",
    struck6="lightning struck him again", obvious="By this point", harmless="Because lightning isn't", discharge="It is an enormous",
    heart="It can disrupt", dontKnow="But here's something many", direct="through a direct strike", ground="spreads through the ground",
    nearby="jumps from a nearby object", medical="We do not have enough", final="And now we arrive", june25="June 25, 1977",
    struck7="Lightning struck Roy for the seventh", sevenTimes="Seven times over", whyHim="But why him", physical="Lightning behaves according",
    atmos="Atmospheric electricity", landscape="The surrounding landscape", objects="Nearby objects", paths="And the paths",
    outdoorWork="Roy's outdoor work", weKnow="What we do know", documented="His story was documented", recordNot="The record was not",
    mostStrikes="The most lightning strikes", seven2="7. Roy's final", died="He died in 1983", remains="And his extraordinary record",
    reminder="It's the fact that", worked="He worked among", sevenTimes2="And seven times, those skies", chosen="The story almost sounds",
    truth="Sometimes, the truth", outro="7 lightning strikes. 35 years", royEnd="Roy Sullivan. This", wasFile="This was file 3",
)


def build(find, seq):
    T = {}
    cur = 0.0
    for k, p in P.items():  # narration order, like seq() in Long.tsx
        T[k] = find(p, cur)[0]; cur = T[k] + 0.01
    T["again2"] = find("And again", T["again1"])[0]
    T["again3"] = find("And again", T["again2"] + 0.01)[0]
    end = DURATION
    beds = [
        dict(kind="rain", t0=0, t1=T["most"], gain_db=-30, fade=0.5, heavy=0.5),
        dict(kind="gusts", t0=0, t1=T["oneMan"], gain_db=-34, fade=0.8),
        dict(kind="stormbed", t0=T["most"] - 0.2, t1=T["oneMan"], gain_db=-28, fade=0.8, seed=31),
        dict(kind="rain", t0=T["nowImagine"] - 0.2, t1=T["seven"], gain_db=-32, fade=0.8, heavy=0.6),
        dict(kind="rain", t0=T["oneMan"], t1=T["fileThree"], gain_db=-42, fade=1.5, heavy=0.2),
        dict(kind="wind", t0=T["begins"], t1=T["weather"], gain_db=-36, fade=1.5),
        dict(kind="crickets", t0=T["hisJob"], t1=T["roads"], gain_db=-42, fade=0.8),
        dict(kind="gusts", t0=T["weather"] - 0.1, t1=T["thatDay"], gain_db=-32, fade=0.8),
        dict(kind="stormbed", t0=T["weather"] - 0.1, t1=T["turned"], gain_db=-28, fade=0.8, seed=41),
        dict(kind="rain", t0=T["y1942"] - 0.2, t1=T["imagineShock"], gain_db=-30, fade=0.8, heavy=0.6),
        dict(kind="wind", t0=T["thatDay"], t1=T["turned"], gain_db=-34, fade=0.5),
        dict(kind="fire", t0=T["struckTower"] + 0.3, t1=T["imagineShock"], gain_db=-30, fade=1.5),
        dict(kind="stormbed", t0=T["imagineShock"] - 0.2, t1=T["after"], gain_db=-28, fade=0.8, seed=51),
        dict(kind="rain", t0=T["came69"] - 0.1, t1=T["consequences"], gain_db=-30, fade=0.5),
        dict(kind="truck", t0=T["came69"] - 0.1, t1=T["lost"], gain_db=-30, fade=0.5),
        dict(kind="roofrain", t0=T["consequences"] - 0.3, t1=T["lost"] + 0.4, gain_db=-28, fade=0.2),
        dict(kind="rain", t0=T["accounts"] - 0.2, t1=T["noEvidence"], gain_db=-32, fade=0.5),
        dict(kind="truck", t0=T["accounts"] - 0.2, t1=T["noEvidence"], gain_db=-34, fade=0.5, rev=0.4),
        dict(kind="stormbed", t0=T["noEvidence"] - 0.2, t1=T["outdoors"], gain_db=-30, fade=0.6, seed=61),
        dict(kind="truck", t0=T["outdoors"], t1=T["remarkable"], gain_db=-40, fade=0.8, rev=0.6),
        dict(kind="wind", t0=T["remarkable"], t1=T["in1970"], gain_db=-38, fade=0.8),
        dict(kind="gusts", t0=T["in1970"] - 0.1, t1=T["beginning"], gain_db=-32, fade=0.6),
        dict(kind="rain", t0=T["in1970"] - 0.1, t1=T["beginning"], gain_db=-38, fade=0.6, heavy=0.3),
        dict(kind="wind", t0=T["beginning"], t1=T["april"], gain_db=-38, fade=0.8),
        dict(kind="roofrain", t0=T["april"] - 0.15, t1=T["repeated"], gain_db=-34, fade=0.6),
        dict(kind="fire", t0=T["fourth"] + 0.75, t1=T["extinguish"] + 1.4, gain_db=-36, fade=0.6, size=0.4),
        dict(kind="rain", t0=T["repeated"] - 0.1, t1=T["relevant"], gain_db=-38, fade=1.0, heavy=0.3),
        dict(kind="gusts", t0=T["relevant"] - 0.2, t1=T["safe"], gain_db=-30, fade=0.8),
        dict(kind="stormbed", t0=T["relevant"] - 0.2, t1=T["safe"], gain_db=-28, fade=0.8, seed=71, density=0.25),
        dict(kind="rain", t0=T["safe"] - 0.2, t1=T["byNow"], gain_db=-30, fade=0.5, heavy=0.7),
        dict(kind="fire", t0=T["struck5"] + 0.55, t1=T["byNow"], gain_db=-36, fade=0.5, size=0.4),
        dict(kind="rain", t0=T["next"] - 0.2, t1=T["obvious"], gain_db=-30, fade=0.5, heavy=0.7),
        dict(kind="crickets", t0=T["next"] - 0.2, t1=T["struck6"], gain_db=-42, fade=0.5),
        dict(kind="stormbed", t0=T["medical"] - 0.2, t1=T["final"], gain_db=-32, fade=0.8, seed=81),
        dict(kind="brook", t0=T["final"] - 0.2, t1=T["struck7"] - 0.2, gain_db=-30, fade=1.0),
        dict(kind="gusts", t0=T["final"] - 0.2, t1=T["struck7"] - 0.2, gain_db=-32, fade=1.0, auto=[(T["final"], -10), (T["struck7"] - 1.0, 3)]),
        dict(kind="rain", t0=T["june25"], t1=T["struck7"] - 0.2, gain_db=-28, fade=2.0, heavy=0.85, auto=[(T["june25"], -14), (T["struck7"] - 1.0, 0)]),
        dict(kind="brook", t0=T["struck7"] + 4, t1=T["sevenTimes"], gain_db=-38, fade=1.5),
        dict(kind="stormbed", t0=T["whyHim"] - 0.2, t1=T["physical"], gain_db=-36, fade=1.0, seed=91),
        dict(kind="wind", t0=T["remains"] - 0.1, t1=T["sevenTimes2"], gain_db=-34, fade=1.5),
        dict(kind="brook", t0=T["worked"] - 0.2, t1=T["sevenTimes2"], gain_db=-42, fade=1.5),
        dict(kind="rain", t0=T["sevenTimes2"] - 0.2, t1=T["truth"], gain_db=-32, fade=1.0, heavy=0.5),
        dict(kind="gusts", t0=T["sevenTimes2"] - 0.2, t1=T["truth"], gain_db=-34, fade=1.0),
        dict(kind="wind", t0=T["truth"] - 0.2, t1=T["wasFile"], gain_db=-38, fade=1.5),
    ]
    ev = []
    E = lambda kind, t, db=0.0, pan=0.0, **kw: ev.append(dict(kind=kind, t=t, db=db, pan=pan, **kw))
    seed = [100]
    def TH(t, db, dist, pan=0.0, sec=7.0, crack=1.0):
        seed[0] += 1; E("thunder", t, db, pan=pan, sec=sec, dist=dist, seed=seed[0], crack=crack)
    # cold open
    o = T["struck0"] + 0.25
    TH(o - 0.9 + 1.4, -20, 0.85, -0.4, 6)
    TH(o + 0.03, -8, 0.25, 0.1)
    TH(o + 2.4 + 1.2, -18, 0.75, 0.6, 6)
    for x in (T["most"] + 1.0, T["most"] + 3.2):
        TH(x, -20, 0.7, -0.3, 6)
    TH(T["nowImagine"] + 0.3 + 0.6, -16, 0.55, 0.5, 6)
    for i, x in enumerate((T["again1"], T["again2"], T["again3"])):
        TH(x + 0.04, -9 + i * 1.5, 0.3 - i * 0.1, (-0.4, 0.4, 0.0)[i], 6)
    d = (T["oneMan"] - 0.1) - (T["seven"] - 0.3) - 0.6
    for i in range(7):
        E("impact", T["seven"] - 0.3 + 0.15 + i * d / 7, -24 + i, sec=1.4, weight=0.6 + 0.06 * i)
    E("swell", T["roy"] - 0.6, -26, sec=2.5)
    E("stamp", T["guinness"] - 0.3, -22)
    # brand open
    E("paper", T["fileThree"] - 0.2 + 0.3, -20); E("stamp", T["fileThree"] - 0.2 + 1.0, -16)
    E("whoosh", T["begins"] - 1.6, -24, sec=1.4, lo=300, hi=3000)
    E("whoosh", T["shen"] - 1.2, -28, sec=1.6, lo=2400, hi=300, up=False)
    # 1942
    TH(T["y1942"] + 0.8, -18, 0.7, -0.5, 6)
    TH(T["struckTower"] + 0.17, -5, 0.12, 0.2, 8)
    TH(T["struckTower"] + 2.75 + 0.9, -20, 0.7, -0.6, 6)
    TH(T["struck1"] + 0.6, -3, 0.0, 0.0, 8)
    E("tinnitus", T["struck1"] + 0.9, -34, sec=3.0)
    E("tick", T["boltLeg"] + 0.3, -26)
    for x in (T["imagineShock"] + 0.8, T["imagineShock"] + 3.5, T["imagineShock"] + 6.0):
        TH(x, -18, 0.6, 0.3, 6)
    for k in range(int((T["perhaps"] - T["after"]) / 0.5)):
        E("tick", T["after"] + 0.3 + k * 0.5, -32)
    # 1969
    TH(T["came69"] + 0.9 + 1.0, -20, 0.8, -0.5, 6)
    TH(T["hit2"] - 0.1 + 0.25, -12, 0.45, 0.5)
    TH(T["lost"] - 0.4, -4, 0.05, 0.0, 6)
    E("tinnitus", T["lost"] - 0.2, -26, sec=5.0)
    E("tick", T["eyebrows"] + 0.6, -24)
    for i in range(7):
        E("tick", T["second"] - 0.2 + 0.3 + i * 0.3, -28)
    TH(T["windows"] - 1.5, -16, 0.45, 0.0, 6)
    TH(T["noEvidence"] + 1.2, -22, 0.85, 0.4, 6)
    # 1970
    TH(T["in1970"] + 0.8 + 1.0, -22, 0.85, -0.6, 6)
    E("arc", T["struck3"] + 0.22, -12, pan=0.3, sec=0.8)
    TH(T["struck3"] + 0.24, -6, 0.2, 0.0)
    # 1972
    TH(T["fourth"] + 0.63, -7, 0.18, 0.0)
    E("whoosh", T["fourth"] + 0.75, -26, sec=0.7, lo=300, hi=2500)
    E("hiss", T["extinguish"] + 0.6, -30, sec=1.2, rise=False)
    for x in (T["precautions"] + 1.5, T["precautions"] + 5.0):
        TH(x, -20, 0.6, 0.4, 6)
    # 1973
    for i, x in enumerate((T["account"] + 2.0, T["following"] + 1.0, T["following"] + 3.6)):
        TH(x, -20 + i * 2, 0.75 - i * 0.08, (-0.6, 0.2, 0.6)[i], 6)
    TH(T["safe"] + 1.0 + 1.0, -20, 0.8, -0.6, 6)
    TH(T["struck5"] + 0.41, -3, 0.03, 0.0, 8)
    E("whoosh", T["struck5"] + 0.52, -26, sec=0.6, lo=300, hi=2500)
    E("paper", T["rod"] - 0.3, -22); E("paper", T["spark"] - 0.3, -22, pan=0.2)
    # 1976
    TH(T["next"] + 0.9 + 1.0, -22, 0.85, 0.6, 6)
    TH(T["struck6"] + 0.2, -4, 0.06, 0.0, 8)
    # science
    TH(T["harmless"] + 1.0, -8, 0.3, 0.0, 6)
    E("heartbeat", T["heart"] - 0.1, -22, sec=4.0, bpm=60)
    for x in (T["direct"] + 0.3, T["ground"] + 0.1, T["nearby"] - 0.4):
        TH(x, -14, 0.35, 0.0, 4)
    for x in (T["medical"] + 1.0, T["medical"] + 5.5):
        TH(x, -22, 0.7, 0.3, 6)
    # 1977 — the build, a breath of silence, then the biggest strike of the film
    TH(T["struck7"] + 0.4 - 2.6 + 1.4, -18, 0.75, -0.5, 6)
    TH(T["struck7"] + 0.4 - 1.2 + 0.7, -14, 0.6, 0.5, 5)
    TH(T["struck7"] + 0.4, 0, 0.0, 0.0, 11, 1.4)
    E("tinnitus", T["struck7"] + 0.8, -24, sec=7.0)
    E("heartbeat", T["struck7"] + 5.5, -26, sec=4.0, bpm=54)
    for i in range(7):
        E("tick", T["sevenTimes"] - 0.3 + 0.3 + i * 0.25, -28)
    for x in (T["atmos"], T["landscape"], T["objects"], T["paths"]):
        E("tick", x - 0.2, -28)
    E("stamp", T["documented"] + 0.5, -22)
    E("stamp", T["mostStrikes"] - 0.6, -18)
    for i in range(7):
        E("impact", T["seven2"] - 0.3 + 0.1 + i * 1.2 / 7, -26 + i, sec=1.2, weight=0.5)
    TH(T["sevenTimes2"] - 0.2 + 2.35, -8, 0.3, 0.0)
    TH(T["chosen"] - 0.2 + 3.0 + 0.8, -20, 0.6, 0.4, 6)
    E("swell", T["royEnd"] - 1.0, -26, sec=3)
    E("paper", T["wasFile"] - 0.2 + 0.2, -22)
    E("stamp", T["wasFile"] - 0.2 + (end - T["wasFile"] + 0.2) * 0.55, -16)
    return ev, beds
