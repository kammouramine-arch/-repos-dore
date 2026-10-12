"""SFX cue sheet — FILE #002 long documentary. Times from the joined narration (Part 1 + 0.75 s + Part 2); shot cuts mirror Long.tsx."""
DURATION = 677.0
NARRATION = "audio/master/long_narration.wav"


def build(find, seq):
    a = lambda p, after=0.0: find(p, after)[0]
    T = dict(
        below=a("Below you"), around=a("Around you"), suddenly=a("And suddenly"), back=a("touching the back of your head"), bag0=a("Maybe your drinking bag"),
        spread0=a("the water begins to spread"), ears0=a("It reaches your ears"), barely0=a("you can barely see"), contact=a("You try to contact"),
        outside0=a("and you're still outside"), scifi=a("This isn't a science fiction"), july=a("On July 16th"), ocean=a("you don't need an ocean"),
        fileTwo=a("This is File Two"), begins=a("Our story begins"), mission=a("The mission involved"), oxygen=a("It supplies oxygen"),
        pressure=a("maintains pressure"), co2=a("removes carbon dioxide"), regulate=a("helps regulate"), m44=a("approximately 44 minutes"),
        feel=a("He could feel water"), bag=a("One possibility was his drinking bag"), sweat=a("Another possibility was sweat"), cold=a("The water felt unusually cold"),
        mcc=a("Luca continued communicating"), cassidy=a("His fellow astronaut, Chris Cassidy"), collecting=a("Water was collecting"), onEarth=a("On Earth, spilled water"),
        cling=a("Water can cling"), think=a("Think about that"), vacuum=a("You're surrounded by the vacuum"), endEarly=a("decided to end the spacewalk early"),
        instructed=a("Luca was instructed"), nightmare=a("But getting back was about"), shifted=a("the water shifted"), eyes=a("It began covering his eyes"),
        ears=a("Then, water reached his ears"), navigate=a("Now imagine trying to navigate"), handholds=a("Every movement involves handholds"),
        worse=a("Then, something happened"), night=a("The station moved into the night side"), sunlight=a("The sunlight disappeared"), nose=a("the water moved over his nose"),
        breath=a("his next breath"), direction=a("which direction"), moment=a("This was the moment"), tether=a("He remembered his safety tether"),
        guide=a("He began using it as a guide"), slowly=a("moving slowly"), lastResort=a("At one point, he considered"), vent=a("could he partially vent"),
        continued=a("So he continued moving"), final=a("Finally, through the water"), entrance=a("part of the airlock entrance"), inside=a("Luca moved inside"),
        cassidyReturn=a("Chris Cassidy still needed"), closed=a("The airlock had to be closed"), pressurized=a("the chamber had to be pressurized"),
        lostAudio=a("he lost audio contact"), waited=a("So he waited"), safe=a("the airlock reached a safe pressure"), hatch=a("The inner hatch opened"),
        removed=a("They removed his helmet"), survived=a("He had survived"), m100=a("Approximately 100 minutes"), question=a("NASA faced another question"),
        engineers=a("Engineers began investigating"), examined=a("They examined the helmet"), cooling=a("The spacesuit contained a cooling system"),
        blocked=a("had become blocked"), silica=a("silica and silicate"), result=a("As a result, cooling water"), carried=a("the ventilation system carried"),
        liters=a("one and a half liters"), somethingElse=a("revealed something else"), earlier=a("There had been an earlier warning"),
        replaced=a("So the drinking bag was replaced"), neither=a("neither drinking bag had been leaking"), findings=a("NASA's investigation identified"),
        corrective=a("The incident led to extensive"), improved=a("improved procedures"), himself=a("is Luca himself"), outside=a("You're outside the space station"),
        filling=a("Your helmet is filling"), calm=a("you have no choice but to stay calm"), closeCall=a("NASA would later classify"), meteorite=a("isn't a meteorite"),
        explosion=a("or a spacecraft explosion"), endless=a("or the endless vacuum"), water=a("Sometimes it's water"), veryThing=a("The very thing that makes life"),
        wasFile=a("This was file two"),
    )

    beds = [
        # suit air under the cold open; water and static where the story is inside the helmet
        dict(kind="fan", t0=0.0, t1=10.0, gain_db=-36, fade=2.0),
        dict(kind="fan", t0=15.4, t1=43.3, gain_db=-34, fade=1.0, auto=[(15.4, -4), (T["ears0"], 0), (T["ears0"] + 0.8, -6), (43.3, -8)]),
        dict(kind="static", t0=T["contact"], t1=40.4, gain_db=-27, fade=0.4, fail=0.5),
        dict(kind="fan", t0=64.1, t1=72.0, gain_db=-40, fade=2.0),
        dict(kind="fan", t0=102.7, t1=109.8, gain_db=-38, fade=1.0),
        dict(kind="room", t0=123.2, t1=142.1, gain_db=-40, fade=1.5),
        dict(kind="fan", t0=142.0, t1=253.6, gain_db=-36, fade=2.0, auto=[(142, -3), (163, 0), (230, 0), (253.6, -3)]),
        dict(kind="room", t0=192.1, t1=196.6, gain_db=-33, fade=0.5),
        dict(kind="room", t0=253.5, t1=259.1, gain_db=-33, fade=0.5),
        dict(kind="fan", t0=263.9, t1=304.7, gain_db=-35, fade=1.0, auto=[(263.9, 0), (T["ears"], 0), (T["ears"] + 1, -6), (304.7, -6)]),
        dict(kind="static", t0=T["ears"] + 0.4, t1=291.1, gain_db=-26, fade=0.4, fail=0.75),
        # orbital night: the sound world thins out to almost nothing
        dict(kind="fan", t0=304.7, t1=415.0, gain_db=-36, fade=1.5,
             auto=[(304.7, 0), (T["night"], 0), (T["sunlight"] + 1.5, -14), (330, -14), (T["moment"], -10), (415, -10)]),
        dict(kind="room", t0=415.0, t1=470.5, gain_db=-42, fade=2.0),
        dict(kind="static", t0=429.6, t1=T["lostAudio"] + 0.6, gain_db=-28, fade=0.3, fail=0.85),
        dict(kind="room", t0=470.4, t1=534.6, gain_db=-41, fade=2.0),
        dict(kind="room", t0=540.5, t1=606.3, gain_db=-42, fade=2.0),
        dict(kind="fan", t0=614.2, t1=626.0, gain_db=-40, fade=1.5),
        dict(kind="room", t0=633.7, t1=641.9, gain_db=-36, fade=0.5),
        dict(kind="water", t0=T["water"] - 0.4, t1=663.5, gain_db=-30, fade=0.6),
        dict(kind="fan", t0=663.4, t1=671.0, gain_db=-42, fade=2.0),
    ]
    ev = []
    E = lambda kind, t, db=0.0, pan=0.0, **kw: ev.append(dict(kind=kind, t=t, db=db, pan=pan, **kw))

    # ── cold open
    E("whoosh", T["below"] - 0.4, -28, sec=2.4, lo=150, hi=1400)
    E("water", T["suddenly"] + 0.2, -18, sec=1.6, density=6)
    for i, t in enumerate([16.0, 19.6, 23.0, 26.4, 29.4, 32.0]):
        E("breath", t, -24 + i, sec=3.4 - 0.25 * i, tense=min(1, 0.15 * i))
    E("water", T["spread0"], -17, sec=6.0, density=10)
    E("water", T["ears0"], -16, sec=1.6, density=12, muffled=True)
    E("quindar", T["contact"] + 0.1, -20)
    E("whoosh", 43.0, -26, sec=0.8, lo=1600, hi=200, up=False)
    E("impact", T["july"] + 0.1, -14, weight=0.8)
    E("water", T["ocean"] + 0.2, -22, sec=2.6, density=3, lo=300, hi=700)
    E("paper", 60.2, -18, sec=0.8)
    E("stamp", 61.2, -14)
    E("paper", 62.6, -20, sec=1.2)
    # ── the mission
    E("whoosh", 64.0, -26, sec=3.0, lo=120, hi=900)
    for t in [T["oxygen"] + 0.2, T["pressure"] + 0.2, T["co2"] + 0.2, T["regulate"] + 0.3]:
        E("tick", t, -18)
    E("glove", T["mission"] + 0.6, -24, pan=-0.2)
    E("click", T["mission"] + 2.0, -26, pan=0.3)
    # ── water
    for t in [156.9, 158.0, 159.0, 160.0]:
        E("tick", t, -22)
    E("tick", T["m44"] + 2.6, -15)
    E("water", T["feel"] - 0.1, -17, sec=2.0, density=6, lo=500, hi=1300)
    E("water", T["cold"], -18, sec=4.0, density=6)
    E("quindar", T["mcc"] - 0.1, -20)
    E("quindar", T["mcc"] + 3.0, -20, f=2475.0)
    E("glove", T["cassidy"] + 1.2, -20, pan=0.3)
    E("water", T["collecting"], -17, sec=3.0, density=8)
    E("drip", T["onEarth"] + 0.9, -14, pan=-0.3)
    E("water", T["onEarth"] + 1.0, -21, sec=3.0, density=5, lo=380, hi=900, pan=0.3)
    E("water", T["cling"], -18, sec=5.0, density=7)
    for i, t in enumerate([234.0, 238.0, 242.0, 246.5, 250.0]):
        E("breath", t, -23, sec=3.6, tense=0.3 + 0.1 * i)
    # ── the way back
    E("quindar", T["endEarly"] - 0.4, -18)
    E("stamp", T["endEarly"] + 0.8, -14)
    E("tick", 259.2, -18); E("tick", 260.2, -20)
    E("glove", T["nightmare"] + 1.0, -20)
    E("water", T["shifted"], -15, sec=3.5, density=10)
    E("breath", T["eyes"], -18, sec=3.0, tense=0.8)
    E("water", 274.7, -16, sec=2.6, density=8, muffled=True)
    E("water", T["ears"], -15, sec=2.0, density=12, muffled=True)
    for t, p in [(T["navigate"] + 0.5, -0.2), (T["navigate"] + 2.5, 0.2), (T["handholds"] + 0.3, -0.1), (T["handholds"] + 2.0, 0.15)]:
        E("glove", t, -19, pan=p)
    E("whoosh", T["night"] - 0.2, -28, sec=4.0, lo=2400, hi=140, up=False)
    E("breath", T["sunlight"] + 2.0, -26, sec=4.2, tense=0.5)
    E("breath", 321.0, -25, sec=4.0, tense=0.7)
    E("water", T["nose"], -15, sec=3.0, density=10, muffled=True)
    E("breath", T["breath"] - 0.4, -18, sec=2.6, tense=1.0)
    E("breath", 340.0, -22, sec=3.0, tense=0.9)
    E("breath", 346.0, -23, sec=3.2, tense=0.8)
    E("swell", T["moment"] - 1.2, -24, sec=2.5)
    E("click", T["tether"] + 0.6, -14, pan=0.2)
    for i, t in enumerate([T["guide"] + 0.4, T["slowly"] + 0.2, T["slowly"] + 1.6, 376.0, 378.2, 380.0]):
        E("glove", t, -18 - (i % 2), pan=(-0.2 if i % 2 else 0.2))
    E("breath", 375.6, -21, sec=4.0, tense=0.6)
    E("swell", T["vent"] - 0.6, -23, sec=2.4)
    for i, t in enumerate([T["continued"] + 0.4, 402.0, 404.0, 406.0]):
        E("glove", t, -19, pan=(0.2 if i % 2 else -0.2))
    E("click", T["entrance"] + 0.4, -18, pan=-0.3)
    # ── the airlock
    E("glove", T["inside"] + 0.2, -16)
    E("hatch", T["closed"] + 0.6, -10)
    E("latch", T["closed"] + 1.6, -16, pan=0.3)
    E("hiss", T["pressurized"] + 0.5, -24, sec=6.0)
    E("hiss", 448.4, -21, sec=3.4)
    E("breath", T["waited"] + 0.2, -22, sec=3.6, tense=0.7)
    E("breath", 444.6, -22, sec=3.4, tense=0.6)
    E("latch", T["hatch"] + 0.1, -14, pan=-0.2)
    E("hatch", T["hatch"] + 0.3, -18)
    E("latch", T["removed"] + 0.1, -15, pan=0.2)
    E("whoosh", T["removed"] + 0.4, -24, sec=0.8, lo=1500, hi=6000)
    for t in [462.8, 464.0, 465.2, 466.4]:
        E("tick", t, -22)
    E("tick", T["m100"] + 2.2, -15)
    # ── investigation
    E("whoosh", 470.2, -26, sec=0.8, lo=900, hi=5000)
    for t in [T["engineers"] + 0.2, T["examined"] + 0.4, T["examined"] + 1.2, T["examined"] + 3.0]:
        E("tick", t, -18)
    E("water", T["cooling"] + 0.5, -26, sec=4.0, density=3, lo=500, hi=900)
    E("tick", T["blocked"] + 0.3, -15); E("tick", T["blocked"] + 0.6, -17)
    E("tick", T["silica"] + 0.8, -18)
    E("water", T["result"] + 0.4, -22, sec=5.0, density=5, lo=400, hi=1000)
    E("impact", T["liters"] - 0.1, -16, weight=0.8)
    # ── earlier warning
    E("impact", T["somethingElse"] + 0.5, -20, weight=0.6)
    E("tick", 541.0, -18); E("tick", 556.4, -18)
    E("stamp", T["neither"] + 0.4, -18)
    E("paper", 570.0, -20, sec=0.9)
    for t in [T["findings"] + 1.6, 578.0, 583.0, 587.0, 590.0]:
        E("tick", t, -20)
    E("tick", T["improved"] - 1.5, -18); E("tick", T["improved"] + 1.5, -18)
    # ── closing the file
    E("whoosh", 606.0, -26, sec=0.8, lo=900, hi=5000)
    E("breath", T["outside"], -24, sec=4.0, tense=0.6)
    E("water", T["filling"], -21, sec=2.2, density=6, muffled=True)
    E("quindar", 633.9, -22)
    E("stamp", T["closeCall"] + 1.4, -14)
    E("impact", T["water"] + 0.35, -13, weight=0.9)
    E("whoosh", 663.4, -22, sec=4.0, lo=120, hi=1600)
    E("paper", T["wasFile"], -18, sec=0.8)
    E("stamp", 670.9 + (DURATION - 670.9) * 0.55, -12)
    return ev, beds
