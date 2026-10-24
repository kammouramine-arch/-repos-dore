"""Reusable body poses and movements for the GUARD and the WOMAN (built on Actor / rigkit IK)."""
import bpy, math
from mathutils import Vector, Matrix
from shotkit import ramp, smooth, smoother, lerp, noise1

CHAIR = (25.0, -1.35)           # office swivel chair (N1/N2), guard faces north (yaw 180) toward the monitors + window
DESK_Z = 0.78


def breathe(t, rate=0.25, amp=1.0):
    return math.sin(t * 2 * math.pi * rate) * amp


# ------------------------------------------------------------------ guard
def guard_seated(G, t, yaw=180.0, look=0.0, look_up=0.0, lean=6.0, hands="desk", chair=CHAIR, breath=1.0, lift_feet=0.0,
                 x=None, y=None):
    """Seated in the office chair. look: head yaw (deg, + = his left); look_up: head pitch up (deg).
    hands: 'desk' (both forearms on the desk), 'lap', 'keys' (typing), or None (caller poses the hands)."""
    cx, cy = (chair if x is None else (x, y))
    if chair is CHAIR and x is None and bpy.data.objects.get("OFFICE_CHAIR"):
        place_chair(cx, cy, yaw)
    G.sit(cx, cy, yaw, seat=0.52, feet_fwd=0.46, feet_apart=0.14)
    if lift_feet:
        for s_ in "lr":
            f = G.ctl[f"foot_{s_}"]; f.location.z += lift_feet
    b = breathe(t, 0.22, 0.8 * breath)
    G.spine(pitch=lean + b, yaw=look * 0.25)
    G.head(pitch=-look_up + b * 0.3, yaw=look * 0.75)
    M = G.rig.matrix_world
    if hands == "desk":
        for s_, sg in (("l", 1), ("r", -1)):
            w = M @ Vector((sg * 0.21, -0.43, 0))
            G.hand_world(s_, (w.x, w.y, DESK_Z + 0.035), M.to_3x3() @ Vector((-sg * 0.25, -1, 0)), (0, 0, -1), "relaxed")
    elif hands == "keys":
        for s_, sg in (("l", 1), ("r", -1)):
            w = M @ Vector((sg * 0.16, -0.47, 0))
            tap = 0.012 * max(0.0, math.sin(t * 19 + (0 if s_ == "l" else 1.7))) if t >= 0 else 0
            G.hand_world(s_, (w.x, w.y, DESK_Z + 0.05 + tap), M.to_3x3() @ Vector((-sg * 0.1, -1, -0.25)), (0, 0, -1), "type")
    elif hands == "lap":
        for s_, sg in (("l", 1), ("r", -1)):
            G.hand(s_, Vector((sg * 0.14, -0.36, 0.58 - 0.0)), Vector((-sg * 0.3, -1, -0.2)), Vector((0, 0, -1)), "relaxed")
    bpy.context.view_layer.update()


def place_chair(x, y, yaw):
    ch = bpy.data.objects["OFFICE_CHAIR"]
    ch.location = (x, y, 0.0); ch.rotation_euler = (0, 0, math.radians(yaw))      # the chair's back is at its local +Y: behind a sitter facing yaw


def guard_stand(G, x, y, yaw, t, spine=3.0, head_pitch=0.0, head_yaw=0.0, breath=1.0, spread=-0.035, arms=True):
    G.place(x, y, yaw)
    G.stand(spread=spread)
    b = breathe(t, 0.25, breath)
    G.spine(pitch=spine + b * 0.6)
    G.head(pitch=head_pitch, yaw=head_yaw)
    if arms:
        G.hand_rest("l", swing=0.02 * b); G.hand_rest("r", swing=-0.02 * b)
    bpy.context.view_layer.update()


def step_to(A, p0, p1, yaw0, yaw1, t, t0, t1, lead="l", lift=0.07):
    """One natural step pair between two standing spots (feet planted, never sliding):
    the lead foot travels in the first half, the body follows, the trailing foot lands in the second half."""
    k = ramp(t, t0, t1, smooth)
    tm = (t0 + t1) / 2
    yaw = lerp(yaw0, yaw1, k)
    bx, by = lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)
    A.place(bx, by, yaw)
    foot0 = {}
    for (pp, yy, key) in ((p0, yaw0, 0), (p1, yaw1, 1)):
        Mb = Matrix.Translation((pp[0], pp[1], 0)) @ Matrix.Rotation(math.radians(yy), 4, "Z")
        for s_ in "lr":
            rp = A.rest_foot[s_].translation
            foot0[(s_, key)] = Mb @ Vector((rp.x, rp.y, 0))
    trail = "r" if lead == "l" else "l"
    for s_, a, b_ in ((lead, t0, tm), (trail, tm, t1)):
        kk = ramp(t, a, b_, smooth)
        q = foot0[(s_, 0)].lerp(foot0[(s_, 1)], kk)
        A.foot(s_, q.x, q.y, lerp(yaw0, yaw1, kk), lift=lift * math.sin(math.pi * kk))
    return k


# ------------------------------------------------------------------ woman
def woman_under(W, x, y, yaw, t, head_pitch=35.0, floor=-3.2, sway=1.0, spine=4.0, arm_float=1.0, head_yaw=0.0, head_roll=0.0):
    """Standing on the pool floor, perfectly upright, the water barely moving her: arms drift a little away from the body."""
    W.place(x, y, yaw, floor=floor)
    W.stand(spread=-0.03)
    s = noise1(t, 2.0, 0.25) * sway
    W.hips(dx=0.006 * s)
    W.spine(pitch=spine + 0.8 * s, roll=0.6 * s)
    W.head(pitch=head_pitch, yaw=head_yaw, roll=head_roll + 1.2 * s)
    W.hand_rest("l", out=0.05 + 0.02 * arm_float * (1 + noise1(t, 5.0, 0.3)), swing=0.02 * arm_float * noise1(t, 7.0, 0.2))
    W.hand_rest("r", out=0.05 + 0.02 * arm_float * (1 + noise1(t, 9.0, 0.3)), swing=0.02 * arm_float * noise1(t, 3.0, 0.2))
    bpy.context.view_layer.update()


def woman_stand(W, x, y, yaw, t, head_pitch=20.0, head_roll=0.0, head_yaw=0.0, spine=6.0, floor=0.0, locks=True, arms=True):
    """Standing motionless (dry land), head hanging, hair forward over the face (front locks)."""
    W.place(x, y, yaw, floor=floor)
    W.stand(spread=-0.035)
    W.spine(pitch=spine)
    W.head(pitch=head_pitch, roll=head_roll, yaw=head_yaw)
    if arms:
        W.hand_rest("l", out=0.02); W.hand_rest("r", out=0.02)
    for i in range(6):
        o = bpy.data.objects.get(f"Wom.lock_{i}")
        if o:
            o.hide_render = not locks
    bpy.context.view_layer.update()


def void_eyes(on=True):
    eye = bpy.data.objects.get("Wom.high-poly")
    if eye and on:
        for ms in eye.material_slots:
            ms.material = bpy.data.materials["Wom.eyes_void"]


def hold_torch(G, side, pos_rig, aim_rig, torch="FLASHLIGHT"):
    """torch in the hand, pointing along aim (rig space). The beam is a real spot light at the lens."""
    M = G.grip_torch(side, pos_rig, aim_rig)
    G.attach_rel(bpy.data.objects[torch], side, M)
    return M


def phone_in_hand(A, dist=0.30, drop=0.24, side_off=0.035, tilt=16, up=(0, -0.45, 1.0), side="r"):
    """hold the phone in front of the face, screen toward the eyes. Returns the phone matrix (rig space)."""
    bpy.context.view_layer.update()
    eye = A.eye()
    pc = eye + Vector((side_off, -dist, -drop))
    n = (eye - pc).normalized()
    return A.grip_phone(side, pc, n, up, "phone", tilt=tilt)


def attach_phone(A, M, side="r"):
    A.attach_rel(bpy.data.objects["PHONE"], side, M)


def crouch(A, x, y, yaw, t, depth=0.5, spine=40.0, head_pitch=-40.0, head_roll=0.0, hands_fwd=0.42, spread=0.12):
    """a low crouch on the floor (used on the virtual floor before fx.invert puts her on a ceiling): hips dropped, knees out,
    both palms flat on the floor in front of the feet."""
    A.place(x, y, yaw, dz=-depth)
    M = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(math.radians(yaw), 4, "Z")
    for s_, sg in (("l", 1), ("r", -1)):
        rp = A.rest_foot[s_].translation
        w = M @ Vector((rp.x + sg * spread, rp.y, 0))
        A.foot(s_, w.x, w.y, yaw + sg * 12)
        kp = A.rest_knee[s_].copy()
        A.ctl[f"knee_{s_}"].location = Vector((kp.x + sg * 0.25, kp.y - 0.5, kp.z + 0.2))
    A.spine(pitch=spine)
    A.head(pitch=head_pitch, roll=head_roll)
    for s_, sg in (("l", 1), ("r", -1)):
        w = M @ Vector((sg * 0.16, -hands_fwd, 0))
        A.hand_world(s_, (w.x, w.y, A.floor + 0.045), M.to_3x3() @ Vector((sg * 0.15, -1, 0)), (0, 0, -1), "flat")
    bpy.context.view_layer.update()
