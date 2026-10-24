"""NIGHT 1 — SOMEONE IS UNDER THE POOL. 3D shots, timed to the narration (docs/STORYBOARDS.md has the cut list).
blender -b --python p1_shots.py -- [shot ...|all] [--still]
CCTV shots (cc*) render from the set's own CCTV cameras at 8 fps and are graded as CCTV in the edit.
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
from shotkit import *
from poses import *
import fx

OUT = os.path.join(ROOT, "renders", "p1")
HERO = (720, 1280)
STD = (576, 1024)
CCTV = (540, 960)
MON = (640, 360)
WOMAN_SPOT = (24.0, 9.0)          # deep end, on the floor (z -3.2), facing CAM4 (east)
HAND_SPOT = (23.2, 7.6)           # the hand under the tiles (HAND_PATCH centre)
EDGE = (23.3, 3.3)                # where the guard stands at the deep-end edge (coping at y 3.65-4.0), facing north


def feed(name):
    p = os.path.join(OUT, name + ".jpg")
    return p if os.path.exists(p) else None


def feeds(c4="feed_c4_empty", c1="feed_c1", dim=1.0, off=()):
    """the five monitors: 0 CAM3 shallow, 1 CAM1 office, 2 CAM2 corridor, 3 CAM4 deep end, 4 CAM3 again (lobby view)"""
    srcs = ["feed_c3", c1, "feed_c2", c4, "feed_c2"]
    for i, n in enumerate(srcs):
        monitor(i, None if (i in off or n is None) else feed(n), 1.4 * dim)


def cctv_cam(name, lens=None, at=None):
    S = bpy.context.scene
    c = bpy.data.objects[name]
    if lens:
        c.data.lens = lens
    if at is not None:
        c.rotation_euler = (Vector(at) - c.location).to_track_quat("-Z", "Y").to_euler()
    c.data.clip_start = 0.05
    S.camera = c
    return c


def hall_lights(t, on_at, stagger=0.06):
    """fluorescents stutter on after the switch: each fixture blinks then holds; the tube material follows the average."""
    lights = [o for o in bpy.data.objects if o.type == "LIGHT" and o.name.startswith("L_fix")]
    tot = 0.0
    for i, o in enumerate(sorted(lights, key=lambda o: o.name)):
        k = t - on_at - i * stagger
        if k < 0:
            e = 0.0
        elif k < 0.35:
            e = 1.0 if (int(k * 22) % 3 == 0) else 0.08
        else:
            e = 1.0
        o.data.energy = 260 * e; tot += e
    bpy.data.materials["fluoro_tube"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 6.0 * tot / max(1, len(lights))


def dim_hall(k):
    """the hall fluorescents at a fraction (close shots by the water, so the torch reads)"""
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name.startswith("L_fix"):
            o.data.energy *= k
    b = bpy.data.materials["fluoro_tube"].node_tree.nodes["Principled BSDF"]
    b.inputs["Emission Strength"].default_value *= max(k, 0.4)


def torch_at(loc, at, energy=260.0, visible=True):
    fl = bpy.data.objects["FLASHLIGHT"]
    show("FLASHLIGHT", True); fl.hide_render = not visible; bpy.data.objects["FLASHLIGHT.lens"].hide_render = not visible
    fl.parent = None
    fl.location = Vector(loc)
    fl.rotation_euler = (Vector(at) - Vector(loc)).to_track_quat("Z", "Y").to_euler()
    flashlight(True, energy)


# ------------------------------------------------------------------ monitor feeds (stills used as the monitor textures)
def feed_c1():
    S, G, W = open_set("pool", "night", woman=False)
    cctv_cam("CAM1_OFFICE")

    def update(t):
        guard_seated(G, 0.0, hands="desk")
    return {"frames": 1, "update": update, "still": True, "res": MON, "samples": 8}


def feed_c2():
    S, G, W = open_set("pool", "night", guard=False, woman=False)
    cctv_cam("CAM2_CORRIDOR")
    return {"frames": 1, "update": lambda t: None, "still": True, "res": MON, "samples": 8}


def feed_c3():
    S, G, W = open_set("pool", "night", guard=False, woman=False)
    cctv_cam("CAM3_SHALLOW")
    return {"frames": 1, "update": lambda t: water(1.0), "still": True, "res": MON, "samples": 8}


def feed_c4():
    S, G, W = open_set("pool", "night", guard=False)
    cctv_cam("CAM4_POOL", lens=55, at=(24.0, 9.0, -2.4))

    def update(t):
        woman_under(W, *WOMAN_SPOT, 90, 0.0, head_pitch=35)
    return {"frames": 1, "update": update, "still": True, "res": MON, "samples": 8}


def feed_c4_empty():
    S, G, W = open_set("pool", "night", guard=False, woman=False)
    cctv_cam("CAM4_POOL", lens=55, at=(24.0, 9.0, -2.4))
    return {"frames": 1, "update": lambda t: water(1.0), "still": True, "res": MON, "samples": 8}


def feed_c1_woman():
    S, G, W = open_set("pool", "night")
    cctv_cam("CAM1_OFFICE")

    def update(t):
        guard_seated(G, 0.0, hands="desk")
        woman_stand(W, 25.5, -1.98, 218, 0.0, head_pitch=24)
    return {"frames": 1, "update": update, "still": True, "res": MON, "samples": 8}


# ------------------------------------------------------------------ shots
def p1_01():
    """0.00-4.00  The dark pool hall from the shallow-end corner: teal underwater lights, still water. Slow dolly."""
    S, G, W = open_set("pool", "night", guard=False, woman=False)
    cam = camera(lens=24)

    def update(t):
        k = t / 4.0
        aim(cam, lerp(Vector((1.0, 2.4, 1.75)), Vector((2.6, 3.1, 1.6)), smooth(k)), Vector((20.0, 10.5, -0.6)), handheld(t, 0.3)[1])
        water(t, 0.5)
    return {"frames": 50, "fps": 12, "update": update, "res": STD}


def p1_02():
    """4.00-5.90  The office clock: 3:07, the second hand ticking."""
    S, G, W = open_set("pool", "night", guard=False, woman=False)
    cam = camera(lens=60)
    aim(cam, (27.25, -2.05, 1.98), (27.98, -2.2, 2.05))
    dof(cam, bpy.data.objects["CLOCK"], 2.8)

    def update(t):
        set_clock(3, 7, 31 + math.floor(t))
    return {"frames": 26, "fps": 12, "update": update, "res": STD}


def p1_03():
    """5.90-11.40  The building is closed, the lights are off: from the back of the office, the guard alone at the monitors,
    the dark pool glowing teal beyond the window. Slow push."""
    S, G, W = open_set("pool", "night", woman=False)
    cam = camera(lens=26)
    feeds()
    for nm in ("L_office_23.8", "L_office_26.2"):
        bpy.data.objects[nm].data.energy *= 0.35
    for m in ("office_tube_m23.8", "office_tube_m26.2"):
        bpy.data.materials[m].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 1.2

    def update(t):
        guard_seated(G, t, hands="desk", lean=10, look=4 * noise1(t, 1, 0.2))
        k = smooth(t / 5.6)
        aim(cam, lerp(Vector((27.35, -3.65, 1.95)), Vector((26.9, -3.2, 1.85)), k), Vector((24.6, -0.2, 1.1)), handheld(t, 0.25)[1])
        water(t, 0.6)
    return {"frames": 67, "fps": 12, "update": update, "res": STD}


def p1_04():
    """11.40-16.00  Over his shoulder: five dim monitors; monitor 4 (CAM4) flicks on at t=3.4 and his head turns to it."""
    S, G, W = open_set("pool", "night", woman=False)
    cam = camera(lens=32)

    def update(t):
        on = t >= 3.4
        flick = on and (t < 3.55 or 3.62 < t)
        feeds(c4="feed_c4", off=() if flick else (3,), dim=0.75)
        look = -14 * ramp(t, 3.6, 4.3)
        guard_seated(G, t, hands="desk", lean=4 + 8 * ramp(t, 3.7, 4.5), look=look, look_up=-6)
        aim(cam, Vector((25.78, -2.3, 1.58)), Vector((25.3, -0.4, 1.02)), handheld(t, 0.3)[1])
    return {"frames": 56, "fps": 12, "update": update, "res": STD}


def p1_05():
    """19.54-21.44 and 30.70-32.66  His face lit blue by the monitor, leaning in."""
    S, G, W = open_set("pool", "night", woman=False)
    cam = camera(lens=75)
    feeds(c4="feed_c4", dim=1.0)
    bpy.data.objects["L_monitors"].data.energy = 45

    def update(t):
        guard_seated(G, t, hands="desk", lean=8 + 10 * smooth(t / 3.5), look=-8, look_up=6, breath=0.5)
        eye = G.world(G.eye())
        aim(cam, Vector((25.45, -0.5, 1.36)), eye + Vector((0, 0, -0.04)), handheld(t, 0.2)[1])
        dof(cam, (eye - cam.location).length, 2.2)
    return {"frames": 48, "fps": 12, "update": update, "res": STD}


def p1_cc4():
    """21.44-38.98  CAM4: a woman standing upright on the deep-end floor, white clothes, long black hair. Motionless."""
    S, G, W = open_set("pool", "night", guard=False)
    cctv_cam("CAM4_POOL", lens=55, at=(24.0, 9.0, -2.4))

    def update(t):
        woman_under(W, *WOMAN_SPOT, 90, t, head_pitch=36)
        water(t, 0.8)
    return {"frames": 142, "fps": 8, "update": update, "res": CCTV, "samples": 4}


def p1_cc4z():
    """38.98-45.24  CAM4 zoomed (PTZ): she slowly raises her head and looks straight into the lens (t 0.3-3.4)."""
    S, G, W = open_set("pool", "night", guard=False)
    cctv_cam("CAM4_POOL", lens=120, at=(24.0, 9.0, -1.75))

    def update(t):
        k = smoother(ramp(t, 0.3, 3.4))
        woman_under(W, *WOMAN_SPOT, 90, t, head_pitch=36 - 86 * k, spine=4 - 12 * k, sway=1 - 0.7 * k)
        water(t, 0.8)
    return {"frames": 51, "fps": 8, "update": update, "res": CCTV, "samples": 5}


def p1_06():
    """45.24-47.90  His hand snatches the flashlight from the desk; the empty chair rolls back and spins."""
    S, G, W = open_set("pool", "night", woman=False)
    cam = camera(lens=30)
    feeds(c4="feed_c4")
    fl = bpy.data.objects["FLASHLIGHT"]; show("FLASHLIGHT", True); flashlight(False)
    rest = Matrix.Translation((24.35, -0.72, 0.80)) @ Euler((0, math.radians(90), math.radians(-12))).to_matrix().to_4x4()

    def update(t):
        # he has already stood: body behind the chair, leaning in to grab, then pulling back + turning away
        k = ramp(t, 0.15, 0.55); back = ramp(t, 0.7, 1.4)
        G.place(24.75 - 0.05 * back, -1.95 - 0.25 * back, 180 - 60 * back)
        G.stand(spread=0.06)
        G.spine(pitch=28 * (1 - back) + 5, yaw=10)
        G.head(pitch=10, yaw=8)
        G.hand_rest("l")
        grab = Vector((24.35, -0.72, 0.84))
        if t < 0.55:
            p = lerp(Vector((24.7, -1.35, 1.0)), grab + Vector((0.0, -0.06, 0.05)), k)
            G.hand_world("r", p, (0.0, 1, -0.4), (0.3, 0, -1), mix_hand("relaxed", "grip", k))
            fl.parent = None; fl.matrix_world = rest
        else:
            fwd = Vector((0.0, 1, -0.2)).normalized()
            p = lerp(grab + Vector((0.0, -0.06, 0.05)), Vector((24.6, -1.9, 1.15)), back)
            G.hand_world("r", p, fwd, (0.3, 0, -1), "grip")
            if fl.parent is None:
                bpy.context.view_layer.update()
                G.attach_rel(fl, "r", G.rig.matrix_world.inverted() @ rest)
        ch = ramp(t, 0.25, 1.6)
        place_chair(25.0 + 0.15 * ch, -1.35 - 0.55 * ch, 180 + 140 * ch)
        aim(cam, Vector((23.75, -0.5, 1.02)), Vector((24.6, -1.15, 0.85)), handheld(t, 0.8)[1])
    return {"frames": 33, "fps": 12, "update": update, "res": STD}


def p1_07():
    """47.90-49.68  POV: through the glass pool doors into the dark hall; his hand slaps the light switch; the fluorescents stutter on."""
    S, G, W = open_set("pool", "night", woman=False)
    cam = camera(lens=22); cam.data.clip_start = 0.12
    G.rig.hide_render = True
    for o in bpy.data.collections["GUARD"].all_objects:
        o.hide_render = True
    fl = bpy.data.objects["FLASHLIGHT"]; show("FLASHLIGHT", True)
    for k_ in range(3):
        recenter(bpy.data.objects[f"LIGHT_SWITCH_{k_}"])

    def update(t):
        k = smooth(ramp(t, 0.0, 0.9))
        pos = lerp(Vector((18.55, -1.3, 1.62)), Vector((18.85, 0.75, 1.6)), k)
        yaw_look = lerp(Vector((18.6, 6.0, 1.0)), Vector((19.45, 0.5, 1.25)), ramp(t, 0.75, 1.15))
        d, r = handheld(t, 2.5, 4.0)
        bob = Vector((0, 0, 0.025 * math.sin(t * 13) * (1 - ramp(t, 0.9, 1.2))))
        aim(cam, pos + d + bob, yaw_look, r * 2)
        bpy.data.objects["POOL_DOOR_B"].rotation_euler.z = math.pi - math.radians(75) * ramp(t, 0.25, 0.7)
        # torch in the left hand, held low left of camera
        M = cam.matrix_world
        fl.parent = None
        fl.matrix_world = M @ Matrix.Translation((-0.18, -0.28, -0.35)) @ Euler((math.radians(-95), math.radians(-5), 0)).to_matrix().to_4x4()
        flashlight(True, 260)
        # the switch: rocker flips when the (unseen) hand hits it at t=1.2
        for k_ in range(3):
            bpy.data.objects[f"LIGHT_SWITCH_{k_}"].rotation_euler.x = math.radians(-8 if t > 1.2 + 0.05 * k_ else 8)
        if t < 1.2:
            for o in bpy.data.objects:
                if o.type == "LIGHT" and o.name.startswith("L_fix"):
                    o.data.energy = 0
        else:
            hall_lights(t, 1.25, 0.025)
        water(t, 0.5)
    S_ = bpy.context.scene
    bpy.data.collections["LIGHTS_HALL"].hide_render = False
    return {"frames": 27, "fps": 15, "update": update, "res": STD}


def p1_08():
    """49.68-53.76  The hall fully lit: perfectly still water, lane lines to the bottom, nobody."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=26)

    def update(t):
        aim(cam, lerp(Vector((18.8, 1.2, 2.3)), Vector((19.4, 1.7, 2.1)), smooth(t / 4.1)), Vector((23.0, 10.0, -1.6)), handheld(t, 0.4)[1])
        water(t, 0.25)
    return {"frames": 50, "fps": 12, "update": update, "res": STD}


def p1_09():
    """53.76-56.76  Behind him at the deep-end edge: the torch sweeps the water. Nothing."""
    S, G, W = open_set("pool", "hall", woman=False)
    cam = camera(lens=30)
    show("FLASHLIGHT", True)

    def update(t):
        guard_stand(G, *EDGE, 180, t, spine=14, head_pitch=22, arms=False)
        G.hand_rest("l")
        sweep = math.sin(t * 1.3) * 0.9
        hold_torch(G, "r", Vector((-0.2, -0.35, 1.2)), Vector((sweep * 0.5, -1.0, -0.75)))
        flashlight(True, 300)
        G.head(pitch=24, yaw=-sweep * 18)
        aim(cam, Vector((22.4, 1.55, 1.75)), Vector((23.7, 7.0, -1.2)), handheld(t, 0.6)[1])
        water(t, 0.25)
    return {"frames": 37, "fps": 12, "update": update, "res": STD}


KNOCKS_A = (2.25, 2.85, 3.45)     # p1_10 local times (narration 58.62-61.06 "Three knocks, coming from under water")
KNOCKS_B = (1.55, 2.2, 2.85)      # p1_11 local times (narration 63.32-65.42 "Knock, knock, knock")


def p1_10():
    """56.76-61.88  Close on the surface in the torch disc: three ring waves rise from below, one per knock."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=45)
    rp = fx.RipplePatch((23.3, 7.3), size=5.0, res=260, rings=[(HAND_SPOT[0], HAND_SPOT[1], k, 0.03) for k in KNOCKS_A])
    torch_at((23.1, 4.2, 1.45), (23.25, 7.3, -0.12), 320, visible=False)

    def update(t):
        rp.update(t)
        water(t, 0.2)
        aim(cam, Vector((23.25, 5.05, 1.15)), Vector((23.2, 7.5, -0.12)), handheld(t, 0.4)[1])
    return {"frames": 62, "fps": 12, "update": update, "res": STD}


def p1_11():
    """61.88-66.24  Water-level angle: his shoes step up to the coping; three more rings spread past toward camera."""
    S, G, W = open_set("pool", "hall", woman=False)
    cam = camera(lens=28)
    rp = fx.RipplePatch((23.0, 6.3), size=5.4, res=260, rings=[(HAND_SPOT[0], HAND_SPOT[1], k, 0.03) for k in KNOCKS_B])
    show("FLASHLIGHT", True)

    def update(t):
        step_to(G, (EDGE[0], EDGE[1] - 0.55), (EDGE[0], EDGE[1] + 0.05), 180, 180, t, 0.2, 1.3, lead="r")
        G.spine(pitch=18); G.head(pitch=25)
        G.hand_rest("l", out=0.07)
        hold_torch(G, "r", Vector((-0.2, -0.35, 1.15)), Vector((0.1, -1.0, -0.8)))
        flashlight(True, 300)
        rp.update(t); water(t, 0.2)
        aim(cam, Vector((22.75, 5.6, -0.04)), Vector((23.3, 3.55, 0.3)), handheld(t, 0.3)[1])
        dof(cam, 2.2, 4.0)
    return {"frames": 53, "fps": 12, "update": update, "res": STD}


def p1_12():
    """66.24-68.68  Over his shoulder: the torch points down; the beam cuts a shaft through 3 m of water to the floor."""
    S, G, W = open_set("pool", "hall", woman=False)
    cam = camera(lens=26)
    show("FLASHLIGHT", True)
    dim_hall(0.22)

    def update(t):
        guard_stand(G, EDGE[0], EDGE[1] + 0.05, 180, t, spine=24, head_pitch=30, arms=False)
        G.hand_rest("l", out=0.07)
        a = ramp(t, 0.0, 0.8)
        hold_torch(G, "r", Vector((-0.18, -0.42, 1.15 - 0.1 * a)), lerp(Vector((0.0, -1.0, -0.4)), Vector((0.05, -0.75, -1.0)), a))
        flashlight(True, 900)
        water(t, 0.2)
        aim(cam, Vector((22.35, 2.55, 2.05)), Vector((23.45, 6.6, -2.8)), handheld(t, 0.5)[1])
    return {"frames": 30, "fps": 12, "update": update, "res": STD}


def p1_13():
    """68.68-72.56  POV down the beam: the floor tiles in the light disc; something shifts, the grout lines bend."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=42)
    hf = fx.HandFloor(scale=0.5)
    dim_hall(0.2)

    def update(t):
        torch_at((23.42, 4.05, 1.25), Vector(HAND_SPOT + (-3.2,)) + Vector((0.05 * math.sin(t * 0.9), 0.04 * math.cos(t * 0.7), 0)), 900, visible=False)
        hf.update(t, press=0.012 + 0.03 * smooth(ramp(t, 2.0, 3.6)), drag=(0.0, 0.03 * ramp(t, 2.0, 3.8)), wobble=0.5)
        water(t, 0.2)
        aim(cam, Vector((23.4, 4.15, 1.55)), Vector((23.22, 7.5, -3.2)), handheld(t, 0.5)[1])
    return {"frames": 47, "fps": 12, "update": update, "res": STD}


def p1_14():
    """72.56-78.20  Looking down through the water: the tiles bulge in the shape of a palm and five fingers pressing up from UNDER the floor."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=95)
    hf = fx.HandFloor(scale=0.5)
    dim_hall(0.2)

    def update(t):
        torch_at((22.9, 4.6, 1.0), Vector((HAND_SPOT[0], HAND_SPOT[1], -3.2)), 900, visible=False)
        press = 0.04 + 0.075 * smooth(ramp(t, 0.2, 3.0)) + 0.012 * math.sin(t * 6.0) * ramp(t, 3.0, 3.5)
        hf.update(t, press=press, drag=(0.0, 0.03), crack=0.25 * ramp(t, 2.0, 5.0), wobble=1.0)
        water(t, 0.2)
        aim(cam, lerp(Vector((23.45, 5.3, 1.05)), Vector((23.4, 5.6, 0.75)), smooth(t / 5.7)), Vector((23.2, 7.6, -3.18)), handheld(t, 0.4)[1])
    return {"frames": 69, "fps": 12, "update": update, "res": HERO}


def p1_15():
    """78.20-83.76  Just above the floor (under water): the hand strains and claws, cracks run through the grout, a thump."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=30)
    hf = fx.HandFloor(scale=0.5)
    dim_hall(0.2)

    def update(t):
        torch_at((23.0, 4.6, 0.9), Vector((HAND_SPOT[0], HAND_SPOT[1], -3.2)), 900, visible=False)
        thump = math.exp(-((t - 3.1) / 0.12) ** 2)
        press = 0.105 + 0.025 * math.sin(t * 2.3) + 0.05 * thump
        hf.update(t, press=press, drag=(0.012 * math.sin(t * 1.1), 0.03 - 0.05 * ramp(t, 1.0, 5.0)), crack=0.3 + 0.7 * ramp(t, 0.5, 3.2), wobble=1.6)
        water(t, 0.3)
        d, r = handheld(t, 0.6)
        sh = Vector((0, 0, 0.015 * thump))
        aim(cam, lerp(Vector((23.85, 8.3, -2.45)), Vector((23.72, 8.12, -2.58)), smooth(t / 5.6)) + d + sh, Vector((23.18, 7.55, -3.12)), r)
    return {"frames": 68, "fps": 12, "update": update, "res": HERO}


def p1_16():
    """83.76-87.46  POV: he stumbles back from the edge; the torch whips across the ceiling; he turns and runs for the office."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=22)
    fl = bpy.data.objects["FLASHLIGHT"]; show("FLASHLIGHT", True)

    def update(t):
        back = smooth(ramp(t, 0.0, 0.9))
        turn = smooth(ramp(t, 1.1, 1.9))
        run = ramp(t, 1.9, 3.7)
        pos = Vector((23.35, 3.25 - 1.1 * back, 1.6 - 0.18 * math.sin(math.pi * ramp(t, 0.2, 1.1))))
        pos = pos + Vector((-4.3 * run, -1.6 * run, 0.03 * math.sin(t * 15) * (run > 0)))
        look_edge = Vector((23.3, 8.0, -2.5)); look_up = Vector((23.0, 6.0, 7.0)); look_door = Vector((18.0, -1.0, 1.4))
        tgt = lerp(look_edge, look_up, smooth(ramp(t, 0.2, 0.9)))
        tgt = lerp(tgt, look_door, turn)
        d, r = handheld(t, 3.5, 2.0)
        aim(cam, pos + d, tgt, r * 3)
        fl.parent = None
        fl.matrix_world = cam.matrix_world @ Matrix.Translation((0.2, -0.25, -0.3)) @ Euler((math.radians(-80 + 40 * math.sin(t * 7)), math.radians(15 * math.sin(t * 5)), 0)).to_matrix().to_4x4()
        flashlight(True, 300)
        water(t, 0.3)
    return {"frames": 56, "fps": 15, "update": update, "res": STD}


def p1_cc4_gone():
    """87.46-91.38  CAM4 again: the deep end, empty (hall lights now on)."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cctv_cam("CAM4_POOL", lens=55, at=(24.0, 9.0, -2.4))

    def update(t):
        water(t, 0.4)
    return {"frames": 32, "fps": 8, "update": update, "res": CCTV, "samples": 4}


def p1_17():
    """91.38-93.24  He lets out a breath and sinks back in the chair."""
    S, G, W = open_set("pool", "hall", woman=False)
    cam = camera(lens=70)
    feeds(c4="feed_c4_empty")
    bpy.data.objects["L_monitors"].data.energy = 40

    def update(t):
        k = smooth(ramp(t, 0.2, 1.6))
        guard_seated(G, t, hands="desk", lean=10 - 18 * k, look_up=-4 + 10 * k, breath=0.3)
        eye = G.world(G.eye())
        aim(cam, Vector((25.15, -0.5, 1.36)), eye + Vector((0, 0, -0.06)), handheld(t, 0.2)[1])
        dof(cam, (eye - cam.location).length, 2.4)
    return {"frames": 24, "fps": 12, "update": update, "res": STD}


def p1_18():
    """93.24-95.32  Push past his shoulder into the monitor bank, toward monitor 2 (CAM1, the office)."""
    S, G, W = open_set("pool", "hall", woman=False)
    cam = camera(lens=35)
    feeds(c4="feed_c4_empty", c1="feed_c1_woman")

    def update(t):
        guard_seated(G, t, hands="desk", lean=-2, look=6, breath=0.4)
        k = smooth(t / 2.2)
        aim(cam, lerp(Vector((25.45, -2.05, 1.5)), Vector((24.6, -1.05, 1.22)), k), lerp(Vector((24.9, -0.4, 1.05)), Vector((24.11, -0.42, 1.05)), k), handheld(t, 0.3)[1])
    return {"frames": 27, "fps": 12, "update": update, "res": STD}


WOMAN_BEHIND = (25.5, -1.98)          # right behind his chair, on the CAM1 line, facing his back


def _office_drips(W):
    return fx.Drips([((25.6, -1.95, 0.35), 0.9, 0.0), ((25.4, -1.9, 0.32), 1.3, 0.4), ((25.5, -2.06, 0.4), 1.1, 0.7)], 0.0, 0.007)


def p1_cc1():
    """95.32-105.64  CAM1, the office: him in the chair watching the monitors; standing directly behind him, the woman in white, dripping."""
    S, G, W = open_set("pool", "hall")
    cctv_cam("CAM1_OFFICE")
    feeds(c4="feed_c4_empty", c1="feed_c1_woman")
    dr = _office_drips(W)

    def update(t):
        guard_seated(G, t, hands="desk", lean=2, breath=0.5)
        woman_stand(W, *WOMAN_BEHIND, 218, t, head_pitch=24, spine=5)
        dr.update(t)
    return {"frames": 84, "fps": 8, "update": update, "res": CCTV, "samples": 4}


def p1_cc1b():
    """110.06-111.48  CAM1: she is closer, right behind the chair, bent toward his head."""
    S, G, W = open_set("pool", "hall")
    cctv_cam("CAM1_OFFICE")
    feeds(c4="feed_c4_empty", c1="feed_c1_woman")

    def update(t):
        guard_seated(G, t, hands="desk", lean=2, breath=0.3)
        woman_stand(W, 25.32, -1.78, 216, t, head_pitch=30, spine=22)
    return {"frames": 16, "fps": 8, "update": update, "res": CCTV, "samples": 4}


def p1_cc1z():
    """111.48-114.72  CAM1 zoomed: her face almost touching the back of his head, wet hair hanging."""
    S, G, W = open_set("pool", "hall")
    cam = cctv_cam("CAM1_OFFICE", lens=42, at=(25.12, -1.55, 1.3))
    feeds(c4="feed_c4_empty", c1="feed_c1_woman")

    def update(t):
        guard_seated(G, t, hands="desk", lean=2, breath=0.3)
        woman_stand(W, 25.3, -1.76, 216, t, head_pitch=26 + 2 * math.sin(t), spine=26)
    return {"frames": 27, "fps": 8, "update": update, "res": CCTV, "samples": 5}


def p1_19():
    """105.64-107.24  He spins the chair round to face the room (and the camera). Reversed copy: 108.22-110.06."""
    S, G, W = open_set("pool", "hall", woman=False)
    cam = camera(lens=32)
    feeds(c4="feed_c4_empty")

    def update(t):
        k = smoother(ramp(t, 0.15, 0.9))
        yaw = 180 + 175 * k
        guard_seated(G, t, yaw=yaw, hands="lap", lean=4 - 10 * k, look=-10 * (1 - k), look_up=4 * k, lift_feet=0.05 * math.sin(math.pi * k))
        place_chair(CHAIR[0], CHAIR[1], yaw)
        eye = G.world(G.eye())
        aim(cam, Vector((25.25, -3.45, 1.4)), Vector((25.0, -1.4, 1.05)) + Vector((0, 0, 0.1 * k)), handheld(t, 0.5)[1])
    return {"frames": 26, "fps": 15, "update": update, "res": STD}


def p1_20():
    """107.24-108.22  POV from the chair: the empty office. Nobody."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=24)
    place_chair(CHAIR[0], CHAIR[1], 0)

    def update(t):
        aim(cam, Vector((25.0, -1.25, 1.22)), Vector((24.7, -4.0, 1.0)), 2.0)
    return {"frames": 1, "fps": 12, "update": update, "res": STD, "still": True, "samples": 10}


def p1_21():
    """114.72-118.78  Extreme close-up: a single drop falls on his shoulder, splashes, the slate cloth darkens."""
    S, G, W = open_set("pool", "hall", woman=False)
    cam = camera(lens=85)
    feeds(c4="feed_c4_empty", c1="feed_c1_woman")
    state = {}

    def update(t):
        guard_seated(G, 0.0, hands="desk", lean=6, breath=0.0)
        bpy.context.view_layer.update()
        if "pt" not in state:
            sh = G.rig.matrix_world @ G.rig.pose.bones["clavicle_r"].tail
            state["pt"] = sh + Vector((0.0, 0.03, 0.075))
            state["drop"] = fx.Drips([(state["pt"] + Vector((0, 0, 1.6)), 9.0, 7.85)], state["pt"].z, 0.0065)
            o, op = fx.decal("wet_spot", "handprint.png", state["pt"] + Vector((0, 0, 0.004)), 0.05, color=(0.06, 0.07, 0.08), alpha=0.0, rough=0.3, coat=0.5)
            state["spot"] = (o, op)
        pt = state["pt"]
        state["drop"].update(t)
        o, op = state["spot"]
        k = ramp(t, 1.72, 2.2)          # the drop lands at t=1.72 (emitter 1.6 m above, released at 1.15)
        op.outputs[0].default_value = 0.85 * k
        o.scale = (0.4 + 0.6 * k, 0.4 + 0.6 * k, 1)
        aim(cam, pt + Vector((0.32, -0.42, 0.12)), pt + Vector((0, 0, 0.03)), handheld(t, 0.15)[1])
        dof(cam, 0.54, 2.8)
    return {"frames": 49, "fps": 12, "update": update, "res": STD}


def p1_22():
    """118.78-122.54  POV: tilting slowly up past the monitors into the ceiling; one tile is missing — a black hole, dripping."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=24)
    feeds(c4="feed_c4_empty", c1="feed_c1_woman")
    show("OFFICE_CEIL_TILE", False)
    dr = fx.Drips([((25.0, -1.3, 2.68), 0.8, 0.1), ((24.9, -1.25, 2.68), 1.15, 0.5)], 1.0, 0.007)

    def update(t):
        k = smoother(ramp(t, 0.1, 3.7))
        eye = Vector((25.0, -1.42, 1.22))
        at = lerp(Vector((25.0, -0.4, 1.0)), Vector((25.0, -1.25, 3.0)), k)
        aim(cam, eye, at, handheld(t, 0.3)[1])
        dr.update(t)
    return {"frames": 46, "fps": 12, "update": update, "res": STD}


def p1_23():
    """122.54-125.80  FINAL SCARE. Looking up into the hole: her upside-down face drops out of the dark, wet hair hanging straight down,
    water dripping onto the lens; at t=2.75 her face lurches down at the camera. (Edit hard-cuts to black at 125.8.)"""
    S, G, W = open_set("pool", "hall", guard=False)
    cam = camera(lens=26); cam.data.clip_start = 0.02
    show("OFFICE_CEIL_TILE", False)
    void_eyes(True)
    hair = fx.HangingHair(W, n=170, length=(0.55, 0.85))
    state = {}

    def update(t):
        # pose her upright on a virtual floor (z=0), looking up, then rotate her onto the ceiling
        W.floor = 0.0
        W.place(25.0, -1.3, 0, floor=0.0)
        W.stand(spread=0.02)
        W.spine(pitch=-14); W.head(pitch=-62)
        W.hand_rest("l", out=0.0); W.hand_rest("r", out=0.0)
        descend = 0.22 * smooth(ramp(t, 0.0, 1.6)) + 0.5 * smoother(ramp(t, 2.75, 3.05))
        fx.invert(W, pivot_z=(2.62 - descend + 1.58) / 2)
        hair.update(t, sway=0.6)
        if "dr" not in state:
            bpy.context.view_layer.update()
            tips = []
            for i in range(0, 170, 34):
                p = hair.o.data.splines[i].points[-1].co
                tips.append(((p.x, p.y, p.z - 0.01), 0.55 + 0.1 * (i % 3), 0.13 * i % 0.5))
            state["dr"] = fx.Drips(tips, 1.0, 0.006)
        state["dr"].update(t)
        eye = Vector((25.0, -1.45, 1.24))
        d, r = handheld(t, 0.6 + 1.5 * ramp(t, 2.75, 2.9))
        aim(cam, eye + d, Vector((25.0, -1.3, 2.7)), r)
    return {"frames": 40, "fps": 12, "update": update, "res": HERO}


def cover1():
    """Cover NIGHT 1: from just above the black water, looking straight down the torch beam at her upturned face on the deep-end floor;
    beside her the floor tiles bulge in the shape of a hand pressing up from underneath."""
    S, G, W = open_set("pool", "night", guard=False)
    cam = camera(lens=55)
    void_eyes(True)
    hf = fx.HandFloor(scale=0.5)
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name.startswith("L_uw"):
            o.data.energy *= 0.5

    def update(t):
        woman_under(W, 23.9, 8.4, 200, 0.0, head_pitch=-55, spine=-12, sway=0)
        hf.update(0.0, press=0.11, crack=0.6, wobble=0)
        torch_at((23.75, 7.2, 2.6), Vector((23.6, 8.1, -3.2)), 1400, visible=False)
        aim(cam, Vector((23.55, 7.0, 1.6)), Vector((23.6, 8.15, -2.4)), 0)
        water(2.0, 0.5)
    return {"frames": 1, "update": update, "still": True, "res": (1080, 1920), "samples": 16}


SHOTS = {
    "__episode__": "p1", "cover1": cover1,
    "feed_c1": feed_c1, "feed_c2": feed_c2, "feed_c3": feed_c3, "feed_c4": feed_c4, "feed_c4_empty": feed_c4_empty, "feed_c1_woman": feed_c1_woman,
    "p1_cc4": p1_cc4, "p1_cc4z": p1_cc4z, "p1_cc4_gone": p1_cc4_gone, "p1_cc1": p1_cc1, "p1_cc1b": p1_cc1b, "p1_cc1z": p1_cc1z,
    "p1_14": p1_14, "p1_15": p1_15, "p1_23": p1_23,
    "p1_01": p1_01, "p1_02": p1_02, "p1_03": p1_03, "p1_04": p1_04, "p1_05": p1_05, "p1_06": p1_06, "p1_07": p1_07, "p1_08": p1_08,
    "p1_09": p1_09, "p1_10": p1_10, "p1_11": p1_11, "p1_12": p1_12, "p1_13": p1_13, "p1_16": p1_16, "p1_17": p1_17, "p1_18": p1_18,
    "p1_19": p1_19, "p1_20": p1_20, "p1_21": p1_21, "p1_22": p1_22,
}

if __name__ == "__main__":
    run_cli(SHOTS)
