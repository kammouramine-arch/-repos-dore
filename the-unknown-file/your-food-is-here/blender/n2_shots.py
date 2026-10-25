"""NIGHT 2 — THE DELIVERY PHOTO. 3D shots, timed to the narration (docs/PRODUCTION_BIBLE.md).
blender -b --python n2_shots.py -- [shot ...|all] [--still]
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
from shotkit import *
from n1_shots import (sofa_phone, stand_phone, courier_stand, attach_phone, pov, ui, hide_set, _flash, phone_in_hand,
                      SOFA, LIVING, HALLMOUTH, DOOR_SPOT)

CLOSET_IN = (4.6, 0.34)        # courier standing inside the wardrobe, facing out (north)
BEDSIDE = (3.95, 4.55)         # beside the bedroom door (living-room side)
KITCHEN = (2.05, 5.25)         # by the kitchen table


def bedroom_moon(e=1.0):
    S = bpy.context.scene
    L = bpy.data.lights.new("MOON_BED", "AREA"); L.size = 1.2; L.energy = 60 * e; L.color = (0.55, 0.65, 0.95); L.use_shadow = True
    o = bpy.data.objects.new("MOON_BED", L); S.collection.objects.link(o); o.location = (7.0, 3.0, 1.7)
    o.rotation_euler = (Vector((4.6, 0.4, 1.0)) - o.location).to_track_quat("-Z", "Y").to_euler()
    L2 = bpy.data.lights.new("BED_BOUNCE", "AREA"); L2.size = 1.5; L2.energy = 8 * e; L2.color = (0.5, 0.58, 0.8); L2.use_shadow = False
    o2 = bpy.data.objects.new("BED_BOUNCE", L2); S.collection.objects.link(o2); o2.location = (4.6, 2.2, 2.5)


def closet(deg):
    """open the wardrobe door by `deg` (0 = shut)."""
    door("CLOSET_DOOR", deg)


def clothes_clear():
    """hide the hanging clothes where the courier stands"""
    for o in bpy.data.objects:
        if o.name.startswith("hanging_cloth") and 4.3 < (o.matrix_world @ Vector(o.bound_box[0])).x < 4.85:
            o.hide_render = True


def bath_floor(P, t, slump=1.0):
    """sitting on the bathroom floor, back against the locked door, knees up, phone in his lap"""
    P.sit(1.66, 3.3, 90, seat=0.12, feet_fwd=0.30, feet_apart=0.17)
    P.spine(pitch=-14 + 3 * math.sin(t * 1.2), roll=4 * slump)
    P.head(pitch=34 * slump, roll=8 * slump)
    bpy.context.view_layer.update()
    eye = P.eye()
    pc = eye + Vector((0.02, -0.28, -0.42))
    M = P.grip_phone("r", pc, (eye - pc).normalized(), (0, -0.6, 0.8), "phone", tilt=14)
    P.hand("l", Vector((0.2, -0.35, 0.42)), Vector((0.2, -1, -0.3)), Vector((0, 0.2, -1)), "relaxed")
    return M


def ear_phone(P, x, y, yaw, t, scared=1.0):
    """standing, phone pressed to the right ear, left hand clutching his own arm"""
    P.place(x, y, yaw); P.stand(spread=0.02)
    P.spine(pitch=6 + 1.5 * math.sin(t * 2.4) * scared, roll=-3)
    P.head(pitch=8, roll=-10, yaw=-4)
    bpy.context.view_layer.update()
    eye = P.eye()
    ear = eye + Vector((-0.085, 0.085, -0.035))
    pc = ear + Vector((-0.012, -0.03, -0.035))
    M = P.grip_phone("r", pc, Vector((1, -0.15, 0.05)), Vector((0, 0.55, 1)), "phone", tilt=10, elbow=Vector((-0.45, 0.2, 1.05)))
    P.hand("l", Vector((-0.06, -0.16, 1.05)), Vector((-1, -0.2, 0.1)), Vector((0, 1, 0)), "grip")
    return M


# ------------------------------------------------------------------ shots
def n2_01():
    """0.00-7.78  Dawn after Night 1: on the bathroom floor, back against the locked door (still; slow push in the edit)."""
    S, P, C = open_set("dark", courier=False)
    set_lights("dark")
    door("DOOR_BATH", 75)                        # shut
    L = bpy.data.lights.new("BATH_TUBE", "AREA"); L.size = 0.9; L.size_y = 0.12; L.energy = 11; L.color = (0.82, 0.92, 1.0)
    lo = bpy.data.objects.new("BATH_TUBE", L); S.collection.objects.link(lo); lo.location = (2.6, 2.4, 2.55)
    cam = camera(lens=26)
    phone_screen(ui("black"), 0.3, 0.2)
    M = bath_floor(P, 0); attach_phone(P, M)

    def update(t):
        aim(cam, Vector((3.35, 1.25, 1.35)), Vector((1.75, 3.25, 0.62)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n2_03():
    """7.78-10.90  Morning: the hall and the locked front door in grey daylight (still)."""
    S, P, C = open_set("morning", courier=False, protagonist=False)
    cam = camera(lens=24)

    def update(t):
        aim(cam, Vector((0.9, 5.6, 1.6)), Vector((0.7, 0.0, 1.0)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n2_04():
    """14.80-17.42  'You told yourself it was over.' Night again; him on the sofa in TV light (still)."""
    S, P, C = open_set("night", courier=False)
    L = bpy.data.lights.new("TV_GLOW", "AREA"); L.size = 0.4; L.energy = 18; L.color = (0.55, 0.7, 1.0)
    lo = bpy.data.objects.new("TV_GLOW", L); S.collection.objects.link(lo); lo.location = (7.0, 6.4, 0.7); lo.rotation_euler = (0, math.radians(-90), 0)
    cam = camera(lens=32)
    phone_screen(None)
    M = sofa_phone(P, 0, lean=-14, head_pitch=4, dist=0.3, drop=0.5); attach_phone(P, M)

    def update(t):
        aim(cam, Vector((6.3, 5.3, 1.25)), P.world(P.eye()) + Vector((0, 0, -0.2)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def _clock_cam(cam, lens=85):
    aim(cam, Vector((3.25, 5.55, 1.85)), Vector((3.25, 4.27, 1.95)), 0.0, lens)
    # the floor lamp's spill catches the clock face (otherwise it is lost in the dark)
    L = bpy.data.lights.new("CLOCK_SPILL", "AREA"); L.energy = 7.0; L.size = 0.5; L.color = (1.0, 0.8, 0.55)
    o = bpy.data.objects.new("CLOCK_SPILL", L); bpy.context.scene.collection.objects.link(o); o.location = (3.9, 5.0, 1.4)
    o.rotation_euler = (Vector((3.25, 4.27, 1.95)) - o.location).to_track_quat("-Z", "Y").to_euler()


def n2_05():
    """17.40-21.90  The wall clock: 3:13, second hand ticking (only the clock face is re-rendered)."""
    S, P, C = open_set("night", courier=False, protagonist=False)
    cam = camera(lens=85); _clock_cam(cam)
    dof(cam, 1.3, 2.8)

    def update(t):
        set_clock(3, 13, 12 + math.floor(t))
    return {"frames": 55, "fps": 12, "update": update}


def n2_06():
    """21.90-24.80  Low in the hall: the doorbell rings; corridor light under the door, cut by two feet (still)."""
    S, P, C = open_set("night", protagonist=False)
    courier_stand(C, DOOR_SPOT[0], -0.55, 180, 0, head=58)
    door_leak([(0.47, 0.6), (0.68, 0.82)])
    cam = camera(lens=30)

    def update(t):
        aim(cam, Vector((0.55, 3.6, 0.35)), Vector((0.72, 0.0, 0.25)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def _table_phone(on):
    ph = bpy.data.objects["PHONE"]
    ph.parent = None
    ph.matrix_world = Matrix.Translation((5.62, 6.12, 0.497)) @ Euler((0, 0, math.radians(100))).to_matrix().to_4x4()
    phone_screen(ui("n2_lock") if on else None, 2.6, 3.5)


def n2_07():
    """24.80-28.62  The phone face-up on the coffee table — dark, then it lights up by itself (two stills: _off/_on)."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=40)
    M = sofa_phone(P, 0, lean=-10, head_pitch=10, dist=0.4, drop=0.6)
    P.hand("r", Vector((-0.2, -0.38, 0.55)), Vector((-0.1, -1, -0.1)), Vector((0, 0, -1)), "relaxed")
    _table_phone(True)

    def update(t):
        aim(cam, Vector((6.15, 5.7, 0.78)), Vector((5.55, 6.15, 0.5)), 0.0)
        dof(cam, 0.76, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n2_07b():
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=40)
    M = sofa_phone(P, 0, lean=-10, head_pitch=10, dist=0.4, drop=0.6)
    P.hand("r", Vector((-0.2, -0.38, 0.55)), Vector((-0.1, -1, -0.1)), Vector((0, 0, -1)), "relaxed")
    _table_phone(False)

    def update(t):
        aim(cam, Vector((6.15, 5.7, 0.78)), Vector((5.55, 6.15, 0.5)), 0.0)
        dof(cam, 0.76, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n2_07c():
    """30.40-31.90  'You don't move.' — frozen on the sofa, lit by the phone on the table (still)."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=50)
    sofa_phone(P, 0, lean=-4, head_pitch=30, dist=0.4, drop=0.6)
    P.hand("r", Vector((-0.2, -0.38, 0.55)), Vector((-0.1, -1, -0.1)), Vector((0, 0, -1)), "relaxed")
    _table_phone(True)

    def update(t):
        eye = P.world(P.eye())
        aim(cam, eye + Vector((1.2, -0.25, -0.15)), eye + Vector((0, 0, -0.06)), 0.0)
        dof(cam, 1.22, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def photo_d():
    """Proof-of-delivery photo: his bedroom, the wardrobe open, the man in the yellow raincoat standing inside."""
    S, P, C = open_set("dark", protagonist=False)
    closet(100); clothes_clear()
    cam = camera("PHOTO", lens=26); aim(cam, Vector((4.62, 3.85, 1.68)), Vector((4.6, 0.3, 1.15)), 0.0)
    _flash()
    courier_stand(C, CLOSET_IN[0], CLOSET_IN[1], 180, 0, head=55, sway=0, bag=False)

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


def n2_08():
    """46.24-48.84  On the sofa he slowly turns his head toward the bedroom."""
    S, P, C = open_set("night", courier=False)
    bedroom_moon()
    cam = camera(lens=38)
    phone_screen(ui("n2_photo_ui"), 2.2, 2.6)

    def update(t):
        k = smoother(ramp(t, 0.2, 2.2))
        M = sofa_phone(P, t, look=-85 * k, lift=0.6 * k, lean=-6 + 6 * k); attach_phone(P, M)
        eye = P.world(P.eye())
        aim(cam, Vector((5.55, 6.9, 1.32)), eye + Vector((0, 0, -0.12)), handheld(t, 0.4)[1])
    return {"frames": 32, "fps": 12, "update": update}


def n2_09():
    """48.84-50.86  POV from the sofa through the bedroom door: the wardrobe is CLOSED (still)."""
    S, P, C = open_set("night", courier=False, protagonist=False)
    closet(0)
    bedroom_moon()
    cam = camera(lens=34)

    def update(t):
        aim(cam, Vector((4.45, 5.95, 1.18)), Vector((4.6, 0.3, 1.05)), 0.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def photo_e():
    """Another photo: him beside the bedroom door — behind him, through the doorway, the wardrobe is opening."""
    S, P, C = open_set("dark")
    closet(22); clothes_clear()
    cam = camera("PHOTO", lens=28); aim(cam, Vector((5.35, 6.9, 1.72)), Vector((4.35, 3.2, 1.15)), 0.0)
    _flash()
    phone_screen(ui("n2_photo_ui"), 2.0, 2.0)
    M = stand_phone(P, BEDSIDE[0], BEDSIDE[1], 160, 0, breathe=0); attach_phone(P, M)
    courier_stand(C, CLOSET_IN[0] - 0.25, CLOSET_IN[1], 180, 0, head=40, sway=0, bag=False)
    C.hand("l", Vector((0.25, -0.42, 1.25)), Vector((0.2, -0.3, 0.9)), Vector((-1, 0, 0)), "claw")

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


def n2_11():
    """73.82-75.76  He backs away from the bedroom door toward the kitchen."""
    S, P, C = open_set("night", courier=False)
    bedroom_moon()
    cam = camera(lens=30)
    phone_screen(ui("n2_photo_ui"), 2.0, 2.0)
    x0, y0 = 4.1, 5.0

    def update(t):
        k = smoother(ramp(t, 0.1, 1.6))
        x, y = x0 - 0.75 * k, y0 + 0.25 * k
        M = stand_phone(P, x, y, 165, t, look=0.9, breathe=0.3)
        for s_, sg, a, b in (("r", -1, 0.05, 0.9), ("l", 1, 0.6, 1.55)):
            kk = smoother(ramp(t, a, b))
            fx, fy = x0 - 0.75 * kk, y0 + 0.25 * kk
            P.foot(s_, fx + sg * 0.1 * math.cos(math.radians(165)), fy + sg * 0.1 * math.sin(math.radians(165)), 165, lift=0.07 * math.sin(math.pi * kk))
        attach_phone(P, M)
        aim(cam, Vector((5.8, 6.6, 1.5)), P.world(P.eye()) + Vector((0, 0, -0.3)), handheld(t, 0.8)[1])
    return {"frames": 24, "fps": 12, "update": update}


def photo_f():
    """The photo changes: now he is in the kitchen — and in the dark of the hall behind him, the man."""
    S, P, C = open_set("dark")
    cam = camera("PHOTO", lens=26); aim(cam, Vector((4.0, 7.6, 1.75)), Vector((1.2, 4.6, 1.15)), 0.0)
    _flash()
    phone_screen(ui("n2_photo_ui"), 2.0, 2.0)
    M = stand_phone(P, KITCHEN[0], KITCHEN[1], 125, 0, breathe=0); attach_phone(P, M)
    courier_stand(C, 0.7, 4.0, 0, 0, head=48, sway=0, bag=False)

    def update(t):
        pass
    return {"frames": 1, "fps": 12, "res": (1080, 1440), "samples": 16, "update": update, "still": True}


def n2_12():
    """79.20-83.92  In the kitchen, phone in hand, he looks around the dark apartment."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=30)
    phone_screen(ui("n2_photo_ui"), 2.0, 2.2)

    def update(t):
        hy = 40 * math.sin(t * 0.9) * ramp(t, 0.3, 1.2)
        M = stand_phone(P, KITCHEN[0], KITCHEN[1], 125, t, look=0.9, head_yaw=hy, breathe=0.8); attach_phone(P, M)
        aim(cam, Vector((3.55, 7.5, 1.62)), P.world(P.eye()) + Vector((0, 0, -0.2)), handheld(t, 0.6)[1])
    return {"frames": 57, "fps": 12, "update": update}


def n2_13():
    """83.92-88.90  Realisation: close on his face in the kitchen, phone light from below (still; push in the edit)."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=60)
    phone_screen(ui("n2_photo_ui"), 2.4, 3.2)
    M = stand_phone(P, KITCHEN[0], KITCHEN[1], 125, 0, look=0.2, breathe=0); attach_phone(P, M)

    def update(t):
        eye = P.world(P.eye())
        aim(cam, eye + Vector((0.7, 0.5, -0.04)), eye + Vector((0, 0, -0.05)), 0.0)
        dof(cam, 0.86, 2.0)
    return {"frames": 1, "fps": 12, "update": update, "still": True}


def n2_14():
    """93.30-97.20  The clock: 3:13:56 ... the minute hand clicks to 3:14 (t=2.2)."""
    S, P, C = open_set("night", courier=False, protagonist=False)
    cam = camera(lens=85); _clock_cam(cam)
    dof(cam, 1.3, 2.8)

    def update(t):
        s = 54 + math.floor(t * 2) / 2 * 2
        set_clock(3, 13 + (1 if t >= 2.2 else 0), (s % 60))
    return {"frames": 48, "fps": 12, "update": update}


def n2_15():
    """97.16-104.60  Through the bedroom door: three slow knocks from INSIDE the wardrobe, then the door shakes (static camera)."""
    S, P, C = open_set("night", courier=False, protagonist=False)
    closet(0)
    bedroom_moon()
    cam = camera(lens=40)
    aim(cam, Vector((4.72, 7.25, 1.5)), Vector((4.6, 0.3, 1.05)), 0.0)
    knocks = (1.55, 2.25, 2.95)

    def update(t):
        j = sum(math.exp(-((t - k) / 0.05) ** 2) for k in knocks) * 0.8
        shake = 0.0
        if t > 5.25:
            a = min(1.0, (t - 5.25) / 0.4)
            shake = a * (2.2 * math.sin(t * 43) + 1.4 * math.sin(t * 71 + 1.3)) * (0.6 + 0.4 * abs(math.sin(t * 5.1)))
        closet(j + shake)
    return {"frames": 90, "fps": 12, "update": update}


def n2_16():
    """109.26-117.42  On the phone in the kitchen: breathing on the line, then the whisper. He doesn't move."""
    S, P, C = open_set("night", courier=False)
    cam = camera(lens=50)
    phone_screen(ui("n2_call"), 1.6, 1.2)

    def update(t):
        M = ear_phone(P, KITCHEN[0], KITCHEN[1], 125, t, scared=1.0 + ramp(t, 3.8, 4.4)); attach_phone(P, M)
        eye = P.world(P.eye())
        aim(cam, eye + Vector((0.55, 0.62, -0.02)) + Vector((0, 0, 0)) * smooth(t / 8), eye + Vector((0, 0, -0.07)), handheld(t, 0.35)[1])
        dof(cam, 0.83, 2.0)
    return {"frames": 49, "fps": 6, "update": update}


def n2_17():
    """118.60-131.60  The 'photo' of the delivery man's face — no eyes — that starts to move: his head turns to camera, then snaps (t=4.25)."""
    S, P, C = open_set("dark", protagonist=False)
    closet(100); clothes_clear()
    cam = camera("PHOTO", lens=60)
    _flash()
    bpy.data.objects["FLASH"].data.energy = 70

    def update(t):
        k = smooth(ramp(t, 0.0, 4.2))
        snap = smoother(ramp(t, 4.25, 4.45))
        courier_stand(C, CLOSET_IN[0], CLOSET_IN[1], 180, t, head=18 - 8 * snap, sway=0, bag=False)
        C.head(pitch=18 - 10 * snap, yaw=70 - 55 * k - 15 * snap, roll=-6 * (1 - snap))
        bpy.context.view_layer.update()
        e = C.world(C.eye())
        aim(cam, e + Vector((0.0, 0.78 - 0.12 * snap, 0.03)), e + Vector((0, 0, -0.03)), 0.0)
        bpy.data.objects["FLASH"].matrix_world = cam.matrix_world
    return {"frames": 82, "fps": 15, "res": (720, 960), "update": update}


def cover2():
    """COVER — his phone shows the courier inside the open wardrobe; behind the phone, through the door, the real wardrobe is shut."""
    S, P, C = open_set("night", courier=False)
    bedroom_moon(1.3)
    closet(0)
    cam = camera(lens=30)
    phone_screen(ui("n2_photo_ui"), 2.4, 2.0)
    P.place(4.58, 5.45, 0); P.stand(spread=0.03)
    P.spine(pitch=4); P.head(pitch=12)
    bpy.context.view_layer.update()
    eye = P.eye()
    pc = eye + Vector((0.06, -0.27, -0.13))
    M = P.grip_phone("r", pc, (eye - pc).normalized(), (0, -0.2, 1.0), "phone", tilt=14)
    attach_phone(P, M)
    P.hand_rest("l", "relaxed")

    def update(t):
        e = P.world(P.eye())
        ph = bpy.data.objects["PHONE"].matrix_world.translation
        aim(cam, e + Vector((0.0, 0.0, 0.02)), ph + (Vector((4.6, 0.4, 1.05)) - ph) * 0.02 + Vector((0, 0, 0.06)), 0.0)
        cam.data.clip_start = 0.13
        dof(cam, (ph - e).length, 2.2)
    return {"frames": 1, "fps": 12, "res": (1080, 1920), "samples": 16, "update": update, "still": True}


SHOTS = {"__episode__": "n2"}
for _n in ("n2_01", "n2_03", "n2_04", "n2_05", "n2_06", "n2_07", "n2_07b", "n2_07c", "photo_d", "n2_08", "n2_09", "photo_e",
           "n2_11", "photo_f", "n2_12", "n2_13", "n2_14", "n2_15", "n2_16", "n2_17", "cover2"):
    SHOTS[_n] = globals()[_n]

if __name__ == "__main__":
    run_cli(SHOTS)
