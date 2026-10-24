"""NIGHT 1 — THE WRONG DRIVER. 3D shots, timed to the narration (docs/PRODUCTION_BIBLE.md has the cut list).
blender -b --python n1_shots.py -- [shot ...|all] [--still]
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
from shotkit import *

UI = os.path.join(ROOT, "renders", "ui")
SOFA = (4.36, 5.98)            # he sits here, facing east (TV)
HALLMOUTH = (0.95, 4.95)        # where he stands to watch the doorbell feed, facing the front door (south)
LIVING = (3.4, 6.2)             # where he ends the night, facing the kitchen (west)
DOOR_SPOT = (0.62, -1.05)       # courier, outside 6A, facing the door (north)


def ui(name):
    p = os.path.join(UI, name + ".png")
    return p if os.path.exists(p) else None


# ------------------------------------------------------------------ poses
def phone_in_hand(P, dist=0.30, drop=0.24, side_off=0.035, tilt=16, up=(0, -0.45, 1.0)):
    bpy.context.view_layer.update()
    eye = P.eye()
    pc = eye + Vector((side_off, -dist, -drop))
    n = (eye - pc).normalized()
    return P.grip_phone("r", pc, n, up, "phone", tilt=tilt)


def sofa_phone(P, t, look=0.0, lift=0.0, lean=-6.0, head_pitch=24.0, dist=0.30, drop=0.24):
    P.sit(SOFA[0], SOFA[1], 90, seat=0.46, feet_fwd=0.52)
    b = math.sin(t * 1.6) * 0.6
    P.spine(pitch=lean + b, yaw=look * 0.3)
    P.head(pitch=head_pitch - lift * 30, yaw=look * 0.7)
    M = phone_in_hand(P, dist, drop)
    P.hand("l", Vector((0.17, -0.42, 0.53)), Vector((0.1, -1, -0.15)), Vector((0, 0, -1)), "relaxed")
    return M


def stand_phone(P, x, y, yaw, t, look=0.0, head_yaw=0.0, dist=0.17, drop=0.31, breathe=1.0, spine=4.0, spread=0.03):
    """Standing, phone held at chest height in the right hand; look=1 lifts the eyes off the phone."""
    P.place(x, y, yaw); P.stand(spread=spread)
    b = math.sin(t * 1.9) * 0.8 * breathe
    P.spine(pitch=spine + b, yaw=head_yaw * 0.2)
    P.head(pitch=36 - look * 38, yaw=head_yaw * 0.8)
    M = phone_in_hand(P, dist, drop)
    P.hand_rest("l", "relaxed", swing=0.02)
    return M


def courier_stand(C, x, y, yaw, t, head=58.0, sway=1.0, bag=True):
    C.place(x, y, yaw); C.stand(spread=0.0)
    C.spine(pitch=10 + 0.8 * math.sin(t * 0.7) * sway, roll=1.2 * math.sin(t * 0.45) * sway)
    C.head(pitch=head, roll=3 * math.sin(t * 0.5) * sway, yaw=2 * math.sin(t * 0.33) * sway)
    C.hand_rest("r", "relaxed", out=0.01)
    C.hand_rest("l", "grip", out=0.03)
    bpy.data.objects["BAG"].hide_render = not bag
    if bag:
        C.carry_bag(bpy.data.objects["BAG"], "l")


def attach_phone(P, M):
    P.attach_rel(bpy.data.objects["PHONE"], "r", M)


def pov(cam, P, M, t, amp=1.0, lens=30, drift=0.0):
    """first-person camera at his eyes looking at the phone (near clip hides his own head)"""
    eye_w = P.world(P.eye())
    ph = P.rig.matrix_world @ M
    d, r = handheld(t, amp)
    aim(cam, eye_w + Vector((0, 0, 0.0)) + d, ph.translation + Vector((0, 0, drift)), r, lens)
    cam.data.clip_start = 0.13


def hide_set(names):
    for n in names:
        for o in bpy.data.collections[n].all_objects:
            o.hide_render = True


# ------------------------------------------------------------------ shots
def n1_01():
    """0.00-2.00  Medium close: him on the sofa at 3:13, face lit by the phone, rain window behind."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=42)
    phone_screen(ui("n1_order"), 2.2, 2.5)

    def update(t):
        M = sofa_phone(P, t); attach_phone(P, M)
        loc = lerp(Vector((5.40, 5.72, 1.52)), Vector((5.30, 5.76, 1.50)), smooth(t / 2.2))
        at = P.world(P.eye()) + Vector((0, 0.02, -0.08))
        d, r = handheld(t, 0.5)
        aim(cam, loc + d, at, r)
        dof(cam, (at - cam.location).length, 2.2)
    return {"frames": 27, "fps": 12, "update": update}


def n1_02():
    """2.00-3.94  POV: the order screen in his hand, legs + dark living room below."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=30)
    phone_screen(ui("n1_order"), 2.0, 2.5)

    def update(t):
        M = sofa_phone(P, t, dist=0.30, drop=0.26); attach_phone(P, M)
        pov(cam, P, M, t, 0.7, 34, drift=-0.03)
    return {"frames": 25, "fps": 12, "update": update}


def n1_03():
    """3.94-8.72  Wide from the kitchen: the living room at 3 a.m., him small on the sofa, rain on the windows."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=22)
    phone_screen(ui("n1_order"), 2.0, 2.5)

    def update(t):
        M = sofa_phone(P, t); attach_phone(P, M)
        loc = lerp(Vector((1.45, 7.95, 1.72)), Vector((1.85, 7.7, 1.68)), smooth(t / 5.0))
        aim(cam, loc, Vector((5.0, 6.2, 1.0)), 0.0)
    return {"frames": 59, "fps": 12, "update": update}


def n1_04():
    """14.00-18.90  Sofa: relaxed, phone lowered; DING DONG (t=1.94) — he sits up and looks back toward the hall."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=34)
    phone_screen(ui("n1_track"), 2.0, 2.0)

    def update(t):
        k = ramp(t, 2.05, 2.6)          # startle (the doorbell rings at t=1.94)
        look = -95 * ramp(t, 2.25, 3.4)  # head turns over his right shoulder (toward the hall, south-west)
        M = sofa_phone(P, t, look=look, lean=-12 + 14 * k, head_pitch=26 - 18 * k, dist=0.28 + 0.04 * k, drop=0.32 - 0.1 * k)
        attach_phone(P, M)
        loc = Vector((5.45, 6.75, 1.25))
        at = P.world(P.eye()) + Vector((0, -0.05, -0.15))
        d, r = handheld(t, 0.6)
        aim(cam, loc + d, at, r)
    return {"frames": 59, "fps": 12, "update": update}


def n1_05():
    """16.90-18.90  The dark hallway to the front door; corridor light under the door, two feet cutting it."""
    S, P, C = open_set("night", protagonist=False)
    cam = camera(lens=26)
    courier_stand(C, DOOR_SPOT[0], -0.55, 180, 0, head=58)
    door_leak([(0.47, 0.6), (0.68, 0.82)])

    def update(t):
        aim(cam, Vector((0.72, 5.2, 1.55)), Vector((0.7, 0.0, 0.85)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n1_06():
    """30.80-32.20  'You freeze.' Close on his face at the mouth of the hall, phone light from below."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=55)
    phone_screen(ui("n1_chat"), 2.4, 3.0)

    def update(t):
        M = stand_phone(P, HALLMOUTH[0], HALLMOUTH[1], 0, t, look=0.15, breathe=0.3)
        attach_phone(P, M)
        eye = P.world(P.eye())
        aim(cam, eye + Vector((0.18, -0.85, -0.05)), eye + Vector((0, 0, -0.05)), handheld(t, 0.3)[1])
        dof(cam, 0.86, 2.0)
    return {"frames": 19, "fps": 12, "update": update}


def n1_07():
    """32.20-37.00  Over his shoulder down the hall: three slow knocks (t=3.25, 3.85, 4.45) — the door jumps in its frame."""
    S, P, C = open_set("night")
    cam = camera(lens=30)
    phone_screen(ui("n1_chat"), 2.0, 2.0)
    courier_stand(C, DOOR_SPOT[0], -0.55, 180, 0, head=58)
    door_leak([(0.47, 0.6), (0.68, 0.82)])
    knocks = (3.25, 3.85, 4.45)

    def update(t):
        M = stand_phone(P, HALLMOUTH[0], HALLMOUTH[1], 0, t, look=1.0, breathe=0.2)
        attach_phone(P, M)
        j = sum(math.exp(-((t - k) / 0.05) ** 2) for k in knocks)
        door("DOOR_6A", 0.12 * j)
        eye = P.world(P.eye())
        aim(cam, eye + Vector((0.32, 0.55, 0.1)), Vector((0.7, 0.0, 1.0)), 0.0)
    return {"frames": 59, "fps": 12, "update": update}


def n1_08():
    """36.10-38.10  POV: he opens the doorbell app."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=30)
    phone_screen(ui("n1_doorbell"), 2.2, 2.5)

    def update(t):
        M = stand_phone(P, HALLMOUTH[0], HALLMOUTH[1], 0, t, look=0.0, breathe=0.5, dist=0.19, drop=0.29)
        attach_phone(P, M)
        pov(cam, P, M, t, 0.8, 28)
    return {"frames": 25, "fps": 12, "update": update}


# --- doorbell camera feed (corridor, wide lens; fisheye + noise added in the edit)
def _doorbell_cam():
    cam = camera("DBCAM", lens=10.5)
    aim(cam, Vector((1.35, -0.31, 1.37)), Vector((0.55, -1.6, 0.95)), 0.0)
    cam.data.clip_start = 0.02
    return cam


def db_01():
    """38.10-53.60  Feed: the man in the yellow raincoat standing still, head hanging, paper bag."""
    S, P, C = open_set("corridor", protagonist=False)
    hide_set(["LIGHTS_NIGHT"])
    cam = _doorbell_cam()

    def update(t):
        courier_stand(C, DOOR_SPOT[0], DOOR_SPOT[1], 180, t, head=60, sway=1.0)
    return {"frames": 233, "fps": 15, "res": (540, 720), "samples": 4, "update": update}


def db_02():
    """53.60-67.30  Feed: very slowly his head begins tilting upward (face stays in the hood shadow)."""
    S, P, C = open_set("corridor", protagonist=False)
    cam = _doorbell_cam()

    def update(t):
        h = 60 - 52 * smooth(t / 9.5)
        courier_stand(C, DOOR_SPOT[0], DOOR_SPOT[1], 180, t + 15.5, head=h, sway=0.4)
    return {"frames": 206, "fps": 15, "res": (540, 720), "samples": 4, "update": update}


def db_03():
    """67.30-69.30  Feed: he slams his face into the camera on 'slams' (t=1.30; 24 fps, motion blur)."""
    S, P, C = open_set("corridor", protagonist=False)
    cam = _doorbell_cam()
    S.render.use_motion_blur = True
    lens = Vector((1.35, -0.31, 1.37))

    def update(t):
        k = smoother(ramp(t, 0.98, 1.30))
        x = lerp(Vector((DOOR_SPOT[0], DOOR_SPOT[1])), Vector((1.08, -0.62)), k)
        courier_stand(C, x[0], x[1], 180 - 18 * k, t + 29, head=8 - 30 * k, sway=0.0)
        C.spine(pitch=10 + 26 * k, yaw=-10 * k)
        C.hand("r", Vector((-0.25, -0.35 - 0.25 * k, 1.25 + 0.2 * k)), Vector((0, -1, 0.2)), Vector((1, 0, 0)), "claw")
        bpy.context.view_layer.update()
        if k > 0:
            eye = C.world(C.eye())
            target = lens + Vector((-0.02, -0.075, -0.02))
            off = (target - eye) * k
            C.rig.location += Vector((off.x, off.y, 0))
            C.rig.location.z += off.z
            # feet stay planted where they were
    return {"frames": 48, "fps": 24, "res": (540, 720), "samples": 4, "update": update}


def n1_09():
    """65.90-67.30  He steps backward from the hall, away from the door."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=32)
    phone_screen(ui("n1_doorbell"), 2.0, 2.0)

    def update(t):
        k = smoother(ramp(t, 0.15, 0.85))
        y = HALLMOUTH[1] + 0.42 * k
        M = stand_phone(P, HALLMOUTH[0], y, 0, t, look=0.4, breathe=0.2, spine=4 - 6 * k)
        # feet: right foot steps back first, left follows
        kr, kl = smoother(ramp(t, 0.1, 0.55)), smoother(ramp(t, 0.45, 0.95))
        P.foot("r", HALLMOUTH[0] - 0.10, HALLMOUTH[1] + 0.02 + 0.45 * kr, 0, lift=0.06 * math.sin(math.pi * kr))
        P.foot("l", HALLMOUTH[0] + 0.10, HALLMOUTH[1] + 0.02 + 0.42 * kl, 0, lift=0.06 * math.sin(math.pi * kl))
        attach_phone(P, M)
        aim(cam, Vector((2.35, 4.75, 1.35)), P.world(P.eye()) + Vector((0, 0, -0.35)), handheld(t, 0.8)[1])
    return {"frames": 20, "fps": 14, "update": update}


def n1_10():
    """70.90-74.40  POV: the screen is black — the phone jolts out of his grip and he catches it."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=28)
    phone_screen(ui("n1_lost"), 1.6, 1.5)

    def update(t):
        jolt = math.exp(-((t - 0.35) / 0.18) ** 2)
        M = stand_phone(P, 3.4, 6.0, -60, t, look=0.0, breathe=1.5, dist=0.19 - 0.04 * jolt, drop=0.29 + 0.16 * jolt)
        attach_phone(P, M)
        pov(cam, P, M, t, 1.8 + 3 * jolt, 28)
    return {"frames": 42, "fps": 12, "update": update}


def n1_11():
    """78.70-81.80  Inside the front door: deadbolt thrown, chain on. (still; push in the edit)"""
    S, P, C = open_set("night", courier=False, protagonist=False)
    cam = camera(lens=40)
    door_leak([])
    L = bpy.data.lights.new("SPILL", "AREA"); L.size = 0.6; L.energy = 30; L.color = (1.0, 0.8, 0.6)
    lo = bpy.data.objects.new("SPILL", L); S.collection.objects.link(lo); lo.location = (1.2, 2.2, 1.9)
    lo.rotation_euler = (Vector((0.75, 0.0, 1.3)) - lo.location).to_track_quat("-Z", "Y").to_euler()

    def update(t):
        aim(cam, Vector((0.95, 1.25, 1.42)), Vector((0.78, 0.0, 1.28)), 0.0)
        dof(cam, 1.25, 2.8)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def _photo_cam(lens=24):
    cam = camera("PHOTO", lens=lens)
    aim(cam, Vector((0.98, 8.25, 1.72)), Vector((0.72, 0.0, 1.05)), 0.0)
    return cam


def _flash(on=True, energy=170):
    """on-camera flash for the 'proof of delivery' photos (strong falloff: near things blown out, far things in the dark)"""
    bpy.context.view_layer.update()
    cam = bpy.context.scene.camera
    L = bpy.data.lights.new("FLASH", "SPOT"); L.energy = energy if on else 0; L.spot_size = math.radians(95); L.spot_blend = 0.6
    L.color = (1.0, 0.97, 0.92); L.shadow_soft_size = 0.02
    o = bpy.data.objects.new("FLASH", L); bpy.context.scene.collection.objects.link(o)
    o.matrix_world = cam.matrix_world


def photo_a():
    """Proof-of-delivery photo: his kitchen from inside, the man at the far end of the hallway."""
    S, P, C = open_set("dark", protagonist=False)
    cam = _photo_cam(24); _flash()
    courier_stand(C, 0.72, 0.85, 0, 0, head=30, sway=0)

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


def photo_b():
    """The same photo, looked at again: he is closer (half-way up the hall)."""
    S, P, C = open_set("dark", protagonist=False)
    cam = _photo_cam(24); _flash()
    courier_stand(C, 0.74, 2.85, 0, 0, head=22, sway=0)

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


def n1_12():
    """97.60-100.40  He turns toward the kitchen. Nothing there."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=24)
    phone_screen(ui("n1_delivered"), 2.0, 2.0)

    def update(t):
        k = smoother(ramp(t, 0.2, 1.4))
        yaw = -150 + 60 * k            # from facing the sofa/south-east to facing west (kitchen)
        M = stand_phone(P, LIVING[0], LIVING[1], yaw, t, look=0.9 * k, head_yaw=-25 * (1 - k), breathe=0.6)
        attach_phone(P, M)
        aim(cam, Vector((4.6, 6.75, 1.68)), Vector((1.0, 5.3, 1.25)), handheld(t, 0.5)[1])
    return {"frames": 34, "fps": 12, "update": update}


def n1_13():
    """110.90-115.90  Close on his face. A camera shutter + flash goes off right behind his head (t=2.1)."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=60)
    phone_screen(ui("n1_delivered"), 2.2, 3.0)
    L = bpy.data.lights.new("SHUTTER_FLASH", "POINT"); L.color = (1, 0.97, 0.93); L.shadow_soft_size = 0.02
    fo = bpy.data.objects.new("SHUTTER_FLASH", L); S.collection.objects.link(fo)

    def update(t):
        M = stand_phone(P, LIVING[0], LIVING[1], -90, t, look=0.2 + 0.5 * ramp(t, 2.5, 2.9), breathe=0.15 if t > 2.4 else 0.6)
        attach_phone(P, M)
        eye = P.world(P.eye())
        fo.location = eye + Vector((0.55, 0.05, 0.12))
        L.energy = 600 * math.exp(-max(0, t - 2.4) / 0.06) if t >= 2.4 else 0
        aim(cam, eye + Vector((-0.9, -0.08, -0.04)), eye + Vector((0, 0, -0.04)), handheld(t, 0.25)[1])
        dof(cam, 0.9, 1.8)
    return {"frames": 60, "fps": 12, "update": update}


def n1_14():
    """115.90-120.20  POV: he slowly looks down at the phone — a new photo is loading."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=30)
    phone_screen(ui("n1_new_photo"), 2.2, 2.5)

    def update(t):
        M = stand_phone(P, LIVING[0], LIVING[1], -90, t, breathe=0.4, dist=0.19, drop=0.29)
        attach_phone(P, M)
        pov(cam, P, M, t, 0.6, 28)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def photo_c():
    """The new photo: him, standing exactly where he is — and the delivery man right behind him."""
    S, P, C = open_set("dark")
    cam = camera("PHOTO", lens=30); aim(cam, Vector((1.45, 5.75, 1.6)), Vector((3.55, 6.25, 1.45)), 0.0)
    _flash()
    phone_screen(ui("n1_delivered"), 2.0, 2.0)
    M = stand_phone(P, LIVING[0], LIVING[1], -90, 0, look=0.0, breathe=0)
    attach_phone(P, M)
    courier_stand(C, LIVING[0] + 0.40, LIVING[1] + 0.16, -90, 0, head=24, sway=0, bag=False)
    C.spine(pitch=18, roll=-8)

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


def n1_15():
    """124.50-127.70  FINAL REVEAL: close on him; directly behind, the courier leans out of the dark into the phone light."""
    S, P, C = open_set("night")
    cam = camera(lens=45)
    phone_screen(ui("n1_delivered"), 2.6, 3.5)
    L = bpy.data.lights.new("REVEAL_FILL", "AREA"); L.size = 0.2; L.color = (0.75, 0.85, 1.0)
    fo = bpy.data.objects.new("REVEAL_FILL", L); S.collection.objects.link(fo)

    def update(t):
        M = stand_phone(P, LIVING[0], LIVING[1], -90, t, look=0.85, breathe=0.15)
        attach_phone(P, M)
        k = smoother(ramp(t, 0.5, 2.0))
        courier_stand(C, LIVING[0] + 0.42, LIVING[1] + 0.02 + 0.13 * k, -90, t, head=26 - 12 * k, sway=0.0, bag=False)
        C.rig.location.z = -0.10 * k
        C.spine(pitch=22 + 10 * k, roll=-14 * k)
        bpy.context.view_layer.update()
        eye = P.world(P.eye())
        ce = C.world(C.eye())
        fo.location = eye + Vector((-0.45, 0.25, -0.4))
        fo.rotation_euler = (ce - fo.location).to_track_quat("-Z", "Y").to_euler()
        L.energy = 1.8 * k
        aim(cam, eye + Vector((-0.95, -0.05, 0.02)), eye + Vector((0.2, 0.09, 0.06)), handheld(t, 0.2)[1])
        dof(cam, 1.0, 2.4)
    return {"frames": 39, "fps": 12, "update": update}


def cover1():
    """COVER — the man in the yellow raincoat at the door, through the doorbell camera (head hanging, bag)."""
    S, P, C = open_set("corridor", protagonist=False)
    cam = _doorbell_cam()
    courier_stand(C, DOOR_SPOT[0] + 0.12, DOOR_SPOT[1] + 0.25, 180, 1.0, head=52, sway=0)

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


SHOTS = {"__episode__": "n1"}
for _n in ("n1_01", "n1_02", "n1_03", "n1_04", "n1_05", "n1_06", "n1_07", "n1_08", "db_01", "db_02", "db_03", "n1_09", "n1_10",
           "n1_11", "photo_a", "photo_b", "n1_12", "n1_13", "n1_14", "photo_c", "n1_15", "cover1"):
    SHOTS[_n] = globals()[_n]

if __name__ == "__main__":
    run_cli(SHOTS)
