"""SFX cue sheet — FILE #002 vertical short. Times come from the narration (phrase lookups), shot cuts mirror Short.tsx."""
DURATION = 100.0
NARRATION = "audio/master/short_narration.wav"


def build(find, seq):
    T = {}
    for k, p in [
        ("drowned", "drowned"), ("notOcean", "Not in the ocean"), ("floating", "He was floating"), ("space1", "space"),
        ("strange", "felt something strange"), ("water", "Water"), ("inside", "Inside his helmet"), ("drinking", "drinking bag"),
        ("kept", "kept coming"), ("zeroG", "And in zero gravity"), ("spreading", "It began spreading"), ("ears", "ears"),
        ("eyes", "eyes"), ("nose", "nose"), ("nasa", "NASA ordered"), ("problem", "but there was a problem"), ("barely", "He could barely see"),
        ("radio", "His radio communication"), ("started", "started making his way back"), ("darkness", "the station moved into darkness"),
        ("imagine", "Imagine being"), ("waterFace", "with water covering your face"), ("tether", "safety tether"), ("followed", "He followed it"),
        ("feeling", "feeling his way"), ("airlock", "toward the airlock"), ("after", "After reaching safety"), ("removed", "removed his helmet"),
        ("investigators", "Investigators later"), ("blocked", "a blocked component"), ("cooling", "cooling system"), ("ventilation", "ventilation system"),
        ("liters", "Around one and a half liters"), ("disturbing", "And here's the most disturbing"), ("warning", "warning signs"),
        ("earlier", "earlier spacewalk"), ("survived", "Luca survived"), ("space2", "space"), ("file", "File 2"), ("unknown", "The unknown file"),
    ]:
        T[k] = seq(p)

    beds = [
        # inside-the-suit air: under the 3D and helmet shots; pulled almost to silence as the station enters darkness
        dict(kind="fan", t0=0.0, t1=3.95, gain_db=-34, fade=0.6),
        dict(kind="water", t0=3.85, t1=6.9, gain_db=-30, fade=0.4),
        dict(kind="fan", t0=6.8, t1=9.5, gain_db=-34, fade=0.5),
        dict(kind="fan", t0=13.2, t1=37.2, gain_db=-33, fade=1.0, auto=[(13.2, -6), (17.0, 0), (T["ears"], 0), (T["ears"] + 0.6, -5), (37.2, -6)]),
        dict(kind="room", t0=37.05, t1=41.2, gain_db=-32, fade=0.4),
        dict(kind="fan", t0=41.05, t1=50.4, gain_db=-33, fade=0.4,
             auto=[(41.0, -2), (T["darkness"], -2), (T["darkness"] + 1.2, -16), (50.4, -20)]),
        dict(kind="static", t0=T["radio"] - 0.15, t1=47.75, gain_db=-24, fade=0.25, fail=0.65),
        dict(kind="fan", t0=50.3, t1=64.9, gain_db=-40, fade=1.2),
        dict(kind="fan", t0=67.3, t1=69.1, gain_db=-38, fade=0.4),
        dict(kind="fan", t0=86.8, t1=95.4, gain_db=-38, fade=1.5),
    ]
    ev = []
    E = lambda kind, t, db=0.0, pan=0.0, **kw: ev.append(dict(kind=kind, t=t, db=db, pan=pan, **kw))
    # hook
    E("impact", T["drowned"] + 0.05, -9)
    E("whoosh", 3.55, -24, sec=0.6, lo=500, hi=4000)
    E("whoosh", T["floating"] - 0.45, -16, sec=1.3, lo=180, hi=2600)
    E("impact", T["space1"] - 0.02, -20, weight=0.6)
    # Luca, EVA 23
    E("whoosh", 9.1, -26, sec=0.7, lo=900, hi=5000)
    E("swell", T["strange"] - 0.8, -21, sec=2.0)
    # water inside the helmet
    E("water", T["water"] - 0.15, -18, sec=1.4, density=7, lo=500, hi=1300)
    for i, t in enumerate([18.3, 21.6, 25.0]):
        E("breath", t, -22, sec=3.4, tense=0.1 * i)
    E("water", T["kept"] - 0.2, -18, sec=2.2, density=9)
    E("drip", T["zeroG"] + 0.95, -14, pan=-0.25)
    E("water", T["zeroG"] + 1.0, -20, sec=2.4, density=5, lo=380, hi=900, pan=0.2)
    for i, t in enumerate([30.1, 33.0, 35.6]):
        E("breath", t, -20, sec=2.8 - 0.3 * i, tense=0.4 + 0.25 * i)
    E("water", T["spreading"] + 0.2, -17, sec=6.6, density=10, lo=300, hi=1100)
    E("water", T["ears"] - 0.1, -16, sec=1.6, density=12, muffled=True)
    # mission control
    E("quindar", T["nasa"] - 0.15, -18, f=2525.0)
    E("stamp", T["nasa"] + 0.8, -16)
    E("quindar", T["problem"] + 0.6, -18, f=2475.0)
    # no visibility: muffled water + breath
    E("water", 41.05, -16, sec=1.8, density=8, muffled=True)
    E("breath", 41.1, -18, sec=2.4, tense=0.9)
    # into darkness: everything recedes
    E("whoosh", T["darkness"] - 0.2, -26, sec=2.2, lo=2400, hi=160, up=False)
    # night: one slow breath, the water on his face
    E("breath", 51.0, -24, sec=3.8, tense=0.6)
    E("water", T["waterFace"], -18, sec=2.4, density=6, muffled=True)
    # tether and the way back
    E("click", T["tether"] + 0.2, -15, pan=0.2)
    E("glove", T["followed"] + 0.4, -15, pan=-0.2)
    E("glove", T["feeling"] + 0.2, -16, pan=0.15)
    E("glove", T["feeling"] + 1.0, -17, pan=-0.1)
    E("click", T["airlock"] + 0.3, -20, pan=-0.3)
    # airlock
    E("hatch", T["after"] - 0.1, -11)
    E("latch", T["after"] + 0.9, -17, pan=0.3)
    E("hiss", T["after"] + 0.4, -20, sec=2.6)
    E("latch", T["removed"] + 0.1, -17, pan=-0.2)
    E("whoosh", T["removed"] + 0.4, -24, sec=0.8, lo=1500, hi=6000)
    # investigation: clean technical sounds
    E("whoosh", 68.7, -26, sec=0.7, lo=900, hi=5000)
    for t in [T["investigators"] + 0.2, T["blocked"] + 0.05, T["blocked"] + 0.35, T["cooling"] + 0.1, T["ventilation"] - 0.2]:
        E("tick", t, -17)
    E("water", T["cooling"] + 0.5, -24, sec=2.6, density=4, lo=500, hi=900)
    E("impact", T["liters"] + 0.62, -18, weight=0.7)
    for t in [T["disturbing"] + 0.2, T["earlier"] + 0.35]:
        E("tick", t, -17)
    E("swell", T["warning"] - 0.4, -22, sec=2.2)
    # pull-back to orbit
    E("whoosh", 86.9, -20, sec=3.2, lo=120, hi=1800)
    E("impact", T["space2"] - 0.03, -15, weight=0.8)
    # case file
    E("paper", 95.35, -18, sec=0.8)
    E("stamp", 95.3 + (100.0 - 95.3) * 0.55, -12)
    return ev, beds
