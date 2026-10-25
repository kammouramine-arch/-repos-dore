"""NIGHT 3 — DO NOT CONFIRM. 3D shots. Times in docstrings are ORIGINAL narration seconds;
the episode removes the first 1.50 s ("Night three,"), so the edit time = narration time - 1.50.
blender -b --python n3_shots.py -- [shot ...|all] [--still]
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
from shotkit import *
from rigkit import mix_hand
from n1_shots import (stand_phone, courier_stand, attach_phone, pov, ui, hide_set, _flash, phone_in_hand,
                      SOFA, LIVING, HALLMOUTH, DOOR_SPOT, _doorbell_cam)

SEAT = (1.95, 5.42)               # kitchen chair, facing the table (north)
TABLE_PHONE = (1.98, 6.12, 0.762)  # phone face-up on the kitchen table
FLOOR_PHONE = (1.02, 5.05, 0.004)  # where the phone lands when he drops it (open floor between hall mouth and table)
RECEIPT = (0.62, -0.52, 0.002)     # receipt on the corridor carpet outside 6A


def allon():
    set_lights("allon")
    bpy.data.collections["CURTAINS_N3"].hide_render = False
    for o in bpy.data.objects:
        if o.name == "CHAIR_A":
            o.rotation_euler.z = math.radians(180)


def table_sit(P, t, slump=1.0, head=None):
    """sitting at the kitchen table, forearms on the table top, staring at the phone"""
    P.sit(SEAT[0], SEAT[1], 180, seat=0.47, feet_fwd=0.42)
    b = math.sin(t * 1.3) * 0.8
    P.spine(pitch=16 * slump + b)
    P.head(pitch=(30 if head is None else head) + 4 * slump)
    P.hand("r", Vector((-0.13, -0.42, 0.79 - P.rig.location.z)), Vector((0.35, -1, 0)), Vector((0, 0, -1)), "relaxed")
    P.hand("l", Vector((0.15, -0.40, 0.79 - P.rig.location.z)), Vector((-0.4, -1, 0)), Vector((0, 0, -1)), "relaxed")


def phone_flat(loc, yaw=0.0, screen=None, strength=2.6, glow=3.0):
    ph = bpy.data.objects["PHONE"]
    ph.hide_render = False; bpy.data.objects["PHONE.screen"].hide_render = False
    ph.parent = None
    ph.matrix_world = Matrix.Translation(loc) @ Euler((0, 0, math.radians(yaw))).to_matrix().to_4x4()
    phone_screen(screen, strength, glow)
    return ph


def screen_point(ph, u, v, lift=0.0):
    """world point on the phone screen; u,v in 0..1 (v=1 top of the screen)"""
    return ph.matrix_world @ Vector(((u - 0.5) * 0.066, (v - 0.5) * 0.145, 0.0047 + lift))


# ------------------------------------------------------------------ shots
def n3_01():
    """1.50-5.94  All lights on. He hasn't slept: at the kitchen table, the phone face-up in front of him."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=34)
    phone_flat(TABLE_PHONE, 8, None)

    def update(t):
        table_sit(P, t)
        loc = lerp(Vector((2.35, 7.35, 1.5)), Vector((2.28, 7.15, 1.47)), smooth(t / 4.5))
        aim(cam, loc, P.world(P.eye()) + Vector((0, 0.1, -0.22)), handheld(t, 0.3)[1])
    return {"frames": 54, "fps": 12, "update": update}


def n3_02():
    """5.94-7.40  The front door: deadbolt thrown, chain on — in hard white light (still)."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=40)

    def update(t):
        aim(cam, Vector((0.95, 1.25, 1.42)), Vector((0.78, 0.0, 1.28)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_03():
    """7.40-8.70  Windows covered with blankets (still)."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=28)

    def update(t):
        aim(cam, Vector((4.6, 6.4, 1.5)), Vector((4.5, 8.6, 1.5)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def _phone_table_close(P, on):
    table_sit(P, 0, slump=1.2, head=36)
    ph = phone_flat(TABLE_PHONE, 8, ui("n3_lock") if on else None, 2.4, 3.0)
    return ph


def n3_04():
    """8.70-13.52  Close: the phone on the table, his hands either side, screen dark (still)."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=45)
    _phone_table_close(P, False)

    def update(t):
        aim(cam, Vector((2.1, 6.62, 1.12)), Vector((1.98, 6.05, 0.76)), 0.0)
        dof(cam, 0.72, 2.4)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_05():
    """13.52-16.00  Same: at 3:12 the screen turns on by itself (still, screen lit)."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=45)
    _phone_table_close(P, True)

    def update(t):
        aim(cam, Vector((2.1, 6.62, 1.12)), Vector((1.98, 6.05, 0.76)), 0.0)
        dof(cam, 0.72, 2.4)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def photo_n3():
    """The final-attempt photo: his living room 'one minute in the future' — the man standing right next to the sofa."""
    S, P, C = open_set("allon", protagonist=False); allon()
    cam = camera("PHOTO", lens=24); aim(cam, Vector((2.4, 7.9, 1.75)), Vector((4.6, 6.0, 1.05)), 0.0)
    _flash(energy=60)
    courier_stand(C, 4.85, 5.35, -65, 0, head=40, sway=0, bag=True)

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


def n3_06():
    """50.54-53.08 / 59.28-62.14  'And suddenly you understand.' Close on his face over the phone (still)."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=70)
    table_sit(P, 0, slump=0.6, head=34)
    phone_flat(TABLE_PHONE, 8, ui("n3_final"), 2.4, 3.5)

    def update(t):
        eye = P.world(P.eye())
        aim(cam, eye + Vector((0.25, 1.0, -0.12)), eye + Vector((0, 0, -0.04)), 0.0)
        dof(cam, 1.05, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_07():
    """62.14-66.98  The wall clock under every light: 3:12:57 -> 3:13 (t=1.45); the doorbell rings at t=3.8."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=85)
    aim(cam, Vector((3.25, 5.55, 1.85)), Vector((3.25, 4.27, 1.95)), 0.0)
    dof(cam, 1.3, 2.8)

    def update(t):
        s = 57 + math.floor(t)
        set_clock(3, 12 + (s // 60), s % 60)
    return {"frames": 58, "fps": 12, "update": update}


def n3_08():
    """66.98-72.94  Low on the hall floor: slow heavy wet footsteps outside; two shadows stop in the light under the door."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    for o in bpy.data.objects:
        if o.name in ("L_on_hall",):
            o.data.energy = 25
    cam = camera(lens=32)
    aim(cam, Vector((0.72, 1.9, 0.22)), Vector((0.7, 0.0, 0.12)), 0.0)
    steps_ = [(0.9, 2.35), (2.1, 1.55), (3.35, 0.95), (4.55, 0.7)]   # (time, distance of the feet from the door centre in x)

    def update(t):
        gaps = []
        for i, (ts, dx) in enumerate(steps_):
            if t >= ts:
                x = 0.7 - dx * (1 if i % 2 == 0 else -0.2)
        k = smoother(ramp(t, 0.9, 4.6))
        cx = lerp(2.6, 0.7, k)
        if 0.2 < cx < 1.2:
            gaps = [(max(0.27, cx - 0.24), max(0.28, cx - 0.1)), (min(1.12, cx + 0.03), min(1.13, cx + 0.17))]
        door_leak(gaps)
    return {"frames": 72, "fps": 12, "update": update}


def n3_09():
    """73.44-75.46  Close on the inside handle: it begins turning, slowly, by itself."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=55)
    aim(cam, Vector((1.18, 0.62, 1.12)), Vector((1.02, 0.04, 1.0)), 0.0)
    dof(cam, 0.6, 2.8)

    def update(t):
        handle("DOOR_6A", -38 * smooth(ramp(t, 0.1, 1.9)))
    return {"frames": 25, "fps": 12, "update": update}


def n3_10():
    """75.46-83.26  At the mouth of the hall he listens: the voice outside sounds exactly like the real driver (still)."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=45)
    P.place(1.55, 5.05, 30); P.stand(spread=0.04)
    P.spine(pitch=-2); P.head(pitch=6, yaw=22)
    P.hand_rest("r", "fist"); P.hand_rest("l", "relaxed")

    def update(t):
        eye = P.world(P.eye())
        aim(cam, eye + Vector((-0.55, -1.45, -0.15)), eye + Vector((0.0, 0.0, -0.12)), 0.0)
        dof(cam, 1.55, 2.2)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_11():
    """83.26-85.00  His hand reaches for the phone on the table and picks it up — fingers close round it."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=40)
    ph = phone_flat(TABLE_PHONE, 8, ui("n3_final"), 2.4, 3.0)
    P.place(2.24, 5.78, 221); P.stand(spread=0.04); P.spine(pitch=26); P.head(pitch=38)
    P.hand_rest("l", "relaxed")
    start = Vector((2.12, 5.86, 1.02))

    def update(t):
        k = smoother(ramp(t, 0.0, 1.0))
        g = smoother(ramp(t, 1.0, 1.35))
        lift = smoother(ramp(t, 1.4, 1.75))
        # grasp: palm comes down over the phone, fingers wrap its far edge
        tgt = Vector(TABLE_PHONE) + Vector((0.03, -0.035, 0.07 * (1 - k) + 0.035))
        pos = lerp(start, tgt, k)
        P.hand_world("r", pos, Vector((-0.45, 0.85, -0.25)), Vector((0, 0, -1)), mix_hand("relaxed", "grip", g))
        if t >= 1.35:
            if ph.parent is None:
                M = ph.matrix_world.copy()
                P.attach_rel(ph, "r", P.rig.matrix_world.inverted() @ M)
            P.hand_world("r", pos + Vector((0, 0, 0.18 * lift)), Vector((-0.45, 0.85, -0.25 + 0.6 * lift)), Vector((0, -0.4 * lift, -1)), "grip")
        aim(cam, Vector((1.35, 6.75, 1.22)), Vector((2.05, 6.0, 0.86)), 0.0)
    return {"frames": 22, "fps": 12, "update": update}


def n3_12():
    """85.00-89.40  The front door from the hall: violent pounding; the door bucks in its frame, the chain jumps (static camera)."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=28)
    aim(cam, Vector((0.78, 3.2, 1.45)), Vector((0.7, 0.0, 1.05)), 0.0)

    def update(t):
        a = ramp(t, 0.05, 0.35) * (1 - ramp(t, 4.05, 4.25))
        v = a * (0.55 * abs(math.sin(t * 26)) + 0.35 * abs(math.sin(t * 41 + 1.1))) * (0.7 + 0.3 * math.sin(t * 7))
        door("DOOR_6A", v)
        handle("DOOR_6A", -10 * a * abs(math.sin(t * 19)))
    return {"frames": 66, "fps": 15, "update": update}


def db_n3a():
    """92.92-98.44  Doorbell feed: the corridor is empty. Held."""
    S, P, C = open_set("corridor", protagonist=False, courier=False)
    cam = _doorbell_cam()

    def update(t):
        pass
    return {"frames": 1, "fps": 15, "res": (540, 720), "samples": 8, "update": update, "still": True}


def db_n3b():
    """98.44-104.68  Feed: his face is suddenly right in the lens — filling the camera, breathing, twitching."""
    S, P, C = open_set("corridor", protagonist=False)
    cam = _doorbell_cam()
    lens_ = Vector((1.35, -0.31, 1.37))
    L = bpy.data.lights.new("LENS_IR", "POINT"); L.energy = 2.5; L.color = (0.85, 0.95, 1.0); L.shadow_soft_size = 0.02
    lo = bpy.data.objects.new("LENS_IR", L); S.collection.objects.link(lo); lo.location = lens_ + Vector((0.0, -0.03, 0.05))

    def update(t):
        jit = 0.6 * math.sin(t * 31) * math.sin(t * 7.3)
        courier_stand(C, 1.12, -0.66, 190, t, head=-30 + jit, sway=0.0, bag=False)
        C.spine(pitch=34, yaw=-8)
        C.head(pitch=-34 + jit, yaw=jit * 2, roll=8 + 3 * math.sin(t * 2.1))
        bpy.context.view_layer.update()
        e = C.world(C.eye())
        target = lens_ + Vector((-0.005, -0.15 - 0.008 * math.sin(t * 2.4), -0.035))
        C.rig.location += target - e
    return {"frames": 94, "fps": 15, "res": (540, 720), "samples": 4, "update": update}


def n3_14():
    """104.68-105.88  He drops it: the phone falls past the camera, hits the kitchen floor and skids, screen up."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=24)
    F = Vector(FLOOR_PHONE)
    aim(cam, F + Vector((-0.32, -0.42, 0.24)), F + Vector((-0.04, -0.06, 0.0)), 0.0)
    S.render.use_motion_blur = True
    ph = phone_flat(FLOOR_PHONE, 25, ui("n3_final"), 2.4, 3.0)
    p0 = F + Vector((0.2, 0.35, 1.05)); p1 = Vector(FLOOR_PHONE)

    def update(t):
        T = 0.42
        if t < T:
            k = (t / T) ** 2
            pos = p0.lerp(p1 + Vector((0, 0, 0.01)), k); rot = Euler((math.radians(70 * (1 - k)), math.radians(-30 * (1 - k)), math.radians(25 + 140 * k)))
        else:
            u = t - T
            b = abs(math.sin(u * 18)) * 0.03 * math.exp(-u * 9)
            slide = (1 - math.exp(-u * 7)) * 0.12
            pos = p1 + Vector((-slide * 0.6, -slide, b)); rot = Euler((math.radians(4 * math.exp(-u * 8) * math.sin(u * 30)), 0, math.radians(165 + 20 * (1 - math.exp(-u * 6)))))
        ph.matrix_world = Matrix.Translation(pos) @ rot.to_matrix().to_4x4()
    return {"frames": 30, "fps": 24, "update": update}


def _floor_phone(P=None):
    ph = phone_flat(Vector(FLOOR_PHONE) + Vector((-0.072, -0.12, 0)), 185, ui("n3_final"), 2.6, 3.5)
    return ph


def n3_15():
    """105.88-110.46  On the floor the screen is still glowing: CONFIRM DELIVERY (still, low)."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=50)
    ph = _floor_phone()
    c = ph.matrix_world.translation

    def update(t):
        aim(cam, c + Vector((0.05, -0.42, 0.3)), c + Vector((0, 0.0, 0.0)), 0.0)
        dof(cam, 0.52, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_15b():
    """116.48-118.42  The screen turns black (same angle, screen off)."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=50)
    ph = _floor_phone(); phone_screen(None)
    c = ph.matrix_world.translation

    def update(t):
        aim(cam, c + Vector((0.05, -0.42, 0.3)), c + Vector((0, 0.0, 0.0)), 0.0)
        dof(cam, 0.52, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_16():
    """110.46-116.48  His hand comes down; the index finger hovers over CONFIRM… then moves and presses THAT'S NOT MY ORDER. (t=5.0)."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=42)
    ph = _floor_phone()
    c = ph.matrix_world.translation
    # he is crouched beside the phone
    P.place(c.x + 0.1, c.y - 0.40, 180, dz=-0.66); P.stand(spread=0.16, fwd_l=0.12)
    P.spine(pitch=62); P.head(pitch=30)
    P.hand_rest("l", "relaxed", swing=0.15)
    conf = screen_point(ph, 0.5, 0.283, 0.012)      # hover above the CONFIRM button
    notm = screen_point(ph, 0.5, 0.218, 0.0)        # the small "THAT'S NOT MY ORDER." text (contact)
    fwd = (ph.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized() * 0.45 + Vector((0, 0, -0.9))
    palm = Vector((0, 0, -1))
    hi = conf + Vector((0.0, -0.05, 0.12))

    def update(t):
        a = smoother(ramp(t, 0.0, 1.6))            # hand descends to hover over CONFIRM
        b = smoother(ramp(t, 3.3, 4.6))            # slides down to the small text
        p = smoother(ramp(t, 4.75, 5.0)) * (1 - smoother(ramp(t, 5.35, 5.8)))   # press and release
        tgt = hi.lerp(conf, a)
        tgt = tgt.lerp(notm + Vector((0, 0, 0.008)), b)
        tgt = tgt + Vector((0, 0, -0.008 * p))
        tremble = Vector((math.sin(t * 23) * 0.0012, math.cos(t * 19) * 0.0012, 0)) * (1 - p)
        P.touch("r", tgt + tremble, fwd, palm, "point")
        phone_screen(ui("n3_final_not") if t >= 5.0 else ui("n3_final"), 2.6, 3.5)
        aim(cam, c + Vector((0.36, 0.22, 0.36)), c + Vector((0.0, -0.03, 0.03)), 0.0)
        dof(cam, 0.55, 2.4)
    return {"frames": 72, "fps": 12, "update": update}


def n3_18():
    """118.42-120.90  Wide from the kitchen: every light in the apartment goes out (two stills: _on, then this one — dark)."""
    S, P, C = open_set("dark", courier=False); allon(); set_lights("dark")
    bpy.data.collections["CURTAINS_N3"].hide_render = False
    cam = camera(lens=22)
    P.place(1.6, 5.3, 40, dz=-0.38); P.stand(spread=0.12); P.spine(pitch=35); P.head(pitch=20)
    P.hand_rest("r", "relaxed", swing=0.2); P.hand_rest("l", "relaxed", swing=0.1)
    W = bpy.context.scene.world.node_tree.nodes["Background"]; W.inputs[1].default_value = 0.4
    S.view_settings.exposure = 3.6          # blackout, but the eye adjusts: shapes stay readable in the dark

    def update(t):
        aim(cam, Vector((3.4, 7.6, 1.8)), Vector((1.4, 4.6, 0.6)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_18on():
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=22)
    P.place(1.6, 5.3, 40, dz=-0.38); P.stand(spread=0.12); P.spine(pitch=35); P.head(pitch=20)
    P.hand_rest("r", "relaxed", swing=0.2); P.hand_rest("l", "relaxed", swing=0.1)
    _floor_phone(); phone_screen(None)

    def update(t):
        aim(cam, Vector((3.4, 7.6, 1.8)), Vector((1.4, 4.6, 0.6)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_19():
    """120.90-125.28  Darkness. Close on him, barely there — and right beside his ear, the edge of a hood (still)."""
    S, P, C = open_set("dark"); allon(); set_lights("dark")
    bpy.data.collections["CURTAINS_N3"].hide_render = False
    W = bpy.context.scene.world.node_tree.nodes["Background"]; W.inputs[1].default_value = 0.25
    S.view_settings.exposure = 3.6
    cam = camera(lens=55)
    P.place(1.6, 5.3, 40, dz=-0.38); P.stand(spread=0.12); P.spine(pitch=28); P.head(pitch=4, yaw=-10)
    P.hand_rest("r", "relaxed", swing=0.2); P.hand_rest("l", "relaxed", swing=0.1)
    bpy.context.view_layer.update()
    eye = P.world(P.eye())
    courier_stand(C, eye.x + 0.18, eye.y + 0.34, 220, 0, head=40, sway=0, bag=False)
    C.rig.location.z -= 0.55
    C.spine(pitch=40)
    L = bpy.data.lights.new("FAINT", "AREA"); L.size = 1.2; L.energy = 1.6; L.color = (0.45, 0.55, 0.85)
    lo = bpy.data.objects.new("FAINT", L); S.collection.objects.link(lo); lo.location = eye + Vector((-0.8, -0.5, 0.9))
    lo.rotation_euler = (eye - lo.location).to_track_quat("-Z", "Y").to_euler()

    def update(t):
        aim(cam, eye + Vector((-0.75, -0.55, 0.0)), eye + Vector((0.08, 0.12, -0.02)), 0.0)
        dof(cam, 0.95, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_20():
    """127.26-130.78  The lights come back on. The front door is locked (still)."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=30)

    def update(t):
        aim(cam, Vector((0.8, 2.8, 1.5)), Vector((0.7, 0.0, 1.1)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_21():
    """130.78-132.70  The hallway is empty (still, from the kitchen)."""
    S, P, C = open_set("allon", courier=False, protagonist=False); allon()
    cam = camera(lens=24)

    def update(t):
        aim(cam, Vector((0.98, 8.25, 1.72)), Vector((0.72, 0.0, 1.05)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_22():
    """135.28-136.86  'You survived.' On the kitchen floor against the cabinets, head back, eyes closed (still)."""
    S, P, C = open_set("allon", courier=False); allon()
    cam = camera(lens=35)
    P.sit(0.85, 6.4, -90, seat=0.07, feet_fwd=0.45, feet_apart=0.18)
    P.spine(pitch=-16); P.head(pitch=-20, roll=10)
    P.hand("r", Vector((-0.2, -0.3, 0.35)), Vector((0, -1, -0.3)), Vector((0, 0.3, -1)), "relaxed")
    P.hand("l", Vector((0.2, -0.3, 0.35)), Vector((0, -1, -0.3)), Vector((0, 0.3, -1)), "relaxed")

    def update(t):
        aim(cam, Vector((2.3, 5.9, 1.05)), P.world(P.eye()) + Vector((0, 0, -0.25)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def _grip_handle(P, piv_name="DOOR_6A_handlepivot_in"):
    """right hand wrapped round the inside lever of the front door (world space, follows the lever + door)"""
    piv = bpy.data.objects[piv_name]
    bpy.context.view_layer.update()
    M = piv.matrix_world
    grip = M @ Vector((-0.06, 0.0, 0.0))
    lever_dir = (M.to_3x3() @ Vector((-1, 0, 0))).normalized()
    out = (M.to_3x3() @ Vector((0, 1, 0))).normalized()           # away from the door face, toward him
    down = lever_dir.cross(out).normalized()
    if down.z > 0:
        down = -down
    fwd = (-out * 0.85 + down * 0.5).normalized()                 # fingers go over the lever and curl under
    palm = down
    wrist = grip - fwd * 0.075 + out * 0.035 - down * 0.02
    P.hand_world("r", wrist, fwd, palm, "handle")


def n3_23():
    """136.86-141.36  Morning. He finally opens the front door: hand on the lever, lever down, the door swings in."""
    S, P, C = open_set("morning", courier=False); allon(); set_lights("morning")
    bpy.data.collections["LIGHTS_CORRIDOR"].hide_render = False
    cam = camera(lens=30)
    P.place(1.05, 0.95, 20); P.stand(spread=0.03)

    def update(t):
        lev = smooth(ramp(t, 0.9, 1.5)) * (1 - smooth(ramp(t, 2.6, 3.0)))
        sw = smoother(ramp(t, 1.5, 3.8))
        handle("DOOR_6A", -40 * lev)
        door("DOOR_6A", 52 * sw)
        back = 0.3 * sw
        P.place(1.06 + 0.1 * sw, 0.92 + back, 20 + 15 * sw); P.stand(spread=0.03, fwd_l=0.05)
        P.spine(pitch=8 - 4 * sw, yaw=-6); P.head(pitch=4 - 6 * sw, yaw=-8 + 12 * sw)
        reach = smoother(ramp(t, 0.0, 0.85))
        if reach < 1:
            # hand travels from his side to the lever
            P.hand_rest("r", "relaxed")
            rest = P.ctl["hand_r"].matrix_basis.copy()
            _grip_handle(P)
            g = P.ctl["hand_r"].matrix_basis.copy()
            M = rest.lerp(g, reach) if hasattr(rest, "lerp") else g
            loc = rest.translation.lerp(g.translation, reach)
            q = rest.to_quaternion().slerp(g.to_quaternion(), reach)
            P.ctl["hand_r"].matrix_basis = Matrix.Translation(loc) @ q.to_matrix().to_4x4()
            rigkit.pose_fingers(P.rig, "r", mix_hand("relaxed", "handle", reach))
        else:
            _grip_handle(P)
        P.hand_rest("l", "relaxed", swing=0.03)
        aim(cam, Vector((1.2, 2.9, 1.62)), Vector((0.72, 0.0, 1.05)), handheld(t, 0.4)[1])
    return {"frames": 54, "fps": 12, "update": update}


def _receipt():
    rc = bpy.data.objects["RECEIPT"]; rc.hide_render = False
    m = bpy.data.materials.new("receipt"); m.use_nodes = True
    tx = m.node_tree.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(os.path.join(ROOT, "assets", "textures", "receipt_6B.png"))
    b = m.node_tree.nodes["Principled BSDF"]; m.node_tree.links.new(tx.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.6
    rc.data.materials.clear(); rc.data.materials.append(m)
    # receipt plane 0.075 x 0.16 m, slightly curled, lying on the carpet outside the door
    rc.parent = None
    rc.matrix_world = Matrix.Translation(RECEIPT) @ Euler((math.radians(2), math.radians(-3), math.radians(168))).to_matrix().to_4x4()
    if not rc.modifiers.get("curl"):
        sd = rc.modifiers.new("curl", "SIMPLE_DEFORM"); sd.deform_method = "BEND"; sd.angle = math.radians(14); sd.deform_axis = "X"
    return rc


def n3_24():
    """141.36-145.20  Nothing outside — except a small paper receipt lying on the floor (still)."""
    S, P, C = open_set("morning", courier=False, protagonist=False); set_lights("morning")
    bpy.data.collections["LIGHTS_CORRIDOR"].hide_render = False
    door("DOOR_6A", 70)
    rc = _receipt()
    cam = camera(lens=26)

    def update(t):
        aim(cam, Vector((0.85, 0.9, 1.6)), Vector((0.62, -0.7, 0.2)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n3_25():
    """145.20-149.90  Close: the receipt — APARTMENT 6B (still; push to the number in the edit)."""
    S, P, C = open_set("morning", courier=False, protagonist=False); set_lights("morning")
    bpy.data.collections["LIGHTS_CORRIDOR"].hide_render = False
    door("DOOR_6A", 70)
    rc = _receipt()
    cam = camera(lens=50)

    def update(t):
        aim(cam, Vector((RECEIPT[0] + 0.03, RECEIPT[1] + 0.12, 0.36)), Vector((RECEIPT[0], RECEIPT[1] - 0.005, 0.0)), 0.0)
        dof(cam, 0.37, 4.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True, "res": (1080, 1920), "samples": 12}


def n3_26():
    """149.90-157.00  From his doorway he looks down the corridor at 6B. Three slow knocks from behind it (t=4.5, 5.15, 5.8). Hold."""
    S, P, C = open_set("corridor", courier=False); set_lights("corridor")
    door("DOOR_6A", 70)
    bpy.data.objects["DOOR_6B"].location.y -= 0.035     # the leaf sat inside the wall skin (z-fighting stripes)
    cam = camera(lens=34)
    P.place(0.95, -0.35, 112); P.stand(spread=0.03)
    P.spine(pitch=4); P.head(pitch=6, yaw=10)
    P.hand_rest("r", "relaxed"); P.hand_rest("l", "relaxed")
    knocks = (4.5, 5.15, 5.8)

    def update(t):
        j = sum(math.exp(-((t - k) / 0.05) ** 2) for k in knocks)
        door("DOOR_6B", 0.12 * j)
        aim(cam, Vector((0.95, -1.72, 1.7)), Vector((8.65, -0.15, 1.2)), 0.0, 42)   # from his doorway across the corridor: 6B faces us down the hall
        dof(cam, 7.8, 4.0)
    return {"frames": 85, "fps": 12, "update": update}


def cover3():
    """COVER — the CONFIRM DELIVERY screen in his hand; at the far end of the hall, a dark figure in the doorway."""
    S, P, C = open_set("night"); set_lights("night")
    door("DOOR_6A", 35)
    cam = camera(lens=32)
    phone_screen(ui("n3_final"), 2.6, 2.4)
    P.place(0.95, 5.3, 0); P.stand(spread=0.03); P.spine(pitch=4); P.head(pitch=14)
    bpy.context.view_layer.update()
    eye = P.eye()
    pc = eye + Vector((0.05, -0.26, -0.17))
    M = P.grip_phone("r", pc, (eye - pc).normalized(), (0, -0.25, 1.0), "phone", tilt=14)
    attach_phone(P, M)
    P.hand_rest("l", "relaxed")
    courier_stand(C, 0.72, 0.35, 0, 0, head=20, sway=0, bag=False)
    for o in bpy.data.collections["LIGHTS_CORRIDOR"].objects:
        o.data.energy *= 1.6

    def update(t):
        e = P.world(P.eye())
        ph = bpy.data.objects["PHONE"].matrix_world.translation
        aim(cam, e + Vector((0.0, 0.0, 0.02)), ph + Vector((0, 0, 0.07)), 0.0)
        cam.data.clip_start = 0.13
        dof(cam, (ph - e).length, 2.4)
    return {"frames": 1, "fps": 12, "res": (1080, 1920), "samples": 16, "update": update, "still": True}


SHOTS = {"__episode__": "n3"}
for _n in ("n3_01", "n3_02", "n3_03", "n3_04", "n3_05", "photo_n3", "n3_06", "n3_07", "n3_08", "n3_09", "n3_10", "n3_11", "n3_12",
           "db_n3a", "db_n3b", "n3_14", "n3_15", "n3_15b", "n3_16", "n3_18on", "n3_18", "n3_19", "n3_20", "n3_21", "n3_22",
           "n3_23", "n3_24", "n3_25", "n3_26", "cover3"):
    SHOTS[_n] = globals()[_n]

if __name__ == "__main__":
    run_cli(SHOTS)
