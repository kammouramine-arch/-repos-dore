"""Rig + posing toolkit for YOUR FOOD IS HERE.

Characters are MPFB (MakeHuman) bodies on the 53-bone game_engine skeleton.
`setup_ik` adds two-bone IK chains (arms + legs) with pole targets and joint limits,
hand/foot orientation empties, and a finger rig driven by curl angles.

Conventions (rig space, before the rig object's own transform):
  front of the body = -Y, up = +Z, the character's RIGHT side = -X.
Hand targets are children of the rig object (they travel with the body),
foot targets live in world space (planted feet never slide).
"""
import bpy, math
from mathutils import Vector, Matrix, Quaternion, Euler

FINGERS = ("thumb", "index", "middle", "ring", "pinky")


def _signed_angle(u, v, n):
    a = u.angle(v)
    return -a if u.cross(v).dot(n) < 0 else a


def _pole_angle(rig, base, tip, pole):
    b, t = rig.data.bones[base], rig.data.bones[tip]
    pn = (t.tail_local - b.head_local).cross(pole - b.head_local)
    proj = pn.cross(b.tail_local - b.head_local)
    return _signed_angle(b.matrix_local.to_3x3().col[0], proj, b.tail_local - b.head_local)


def _empty(name, parent=None, size=0.05, shape="PLAIN_AXES"):
    e = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    e.empty_display_type = shape
    e.empty_display_size = size
    if e.name not in bpy.context.scene.collection.all_objects:
        (parent.users_collection[0] if parent else bpy.context.scene.collection).objects.link(e)
    if parent:
        e.parent = parent
        e.matrix_parent_inverse = Matrix.Identity(4)
    return e


def setup_ik(rig, tag):
    """Create IK controls for `rig`; returns dict of control objects."""
    ctl = {}
    pb = rig.pose.bones
    for p in pb:
        p.rotation_mode = "QUATERNION"
    for side, sgn in (("l", 1), ("r", -1)):
        # ---- arm ----
        hb = rig.data.bones[f"hand_{side}"]
        tgt = _empty(f"{tag}.hand_{side}", rig, 0.04, "CUBE")
        tgt.matrix_basis = hb.matrix_local.copy()          # rest: exactly at the wrist, hand orientation
        el = rig.data.bones[f"lowerarm_{side}"].head_local
        pole = _empty(f"{tag}.elbow_{side}", rig, 0.03, "SPHERE")
        pole.location = el + Vector((sgn * 0.15, 0.45, -0.05))   # behind + outside the elbow
        ik = pb[f"lowerarm_{side}"].constraints.new("IK")
        ik.target, ik.pole_target, ik.chain_count = tgt, pole, 2
        ik.pole_angle = _pole_angle(rig, f"upperarm_{side}", f"lowerarm_{side}", pole.location)
        ik.use_stretch = False
        cr = pb[f"hand_{side}"].constraints.new("COPY_ROTATION")
        cr.target = tgt
        # joint limits: elbow is a hinge that can't hyper-extend, shoulder can't twist wildly
        la = pb[f"lowerarm_{side}"]
        la.lock_ik_y = True
        la.ik_stretch = 0.0
        ua = pb[f"upperarm_{side}"]
        ua.use_ik_limit_y, ua.ik_min_y, ua.ik_max_y = True, math.radians(-60), math.radians(60)
        ctl[f"hand_{side}"], ctl[f"elbow_{side}"] = tgt, pole
        # ---- leg ----
        fb = rig.data.bones[f"foot_{side}"]
        ft = _empty(f"{tag}.foot_{side}", None, 0.06, "CUBE")
        rig.users_collection[0].objects.link(ft) if ft.name not in rig.users_collection[0].objects else None
        ft.matrix_world = rig.matrix_world @ fb.matrix_local
        kn = rig.data.bones[f"calf_{side}"].head_local
        kp = _empty(f"{tag}.knee_{side}", rig, 0.03, "SPHERE")
        kp.location = kn + Vector((sgn * 0.05, -0.6, 0))
        ik = pb[f"calf_{side}"].constraints.new("IK")
        ik.target, ik.pole_target, ik.chain_count = ft, kp, 2
        ik.pole_angle = _pole_angle(rig, f"thigh_{side}", f"calf_{side}", kp.location)
        ik.use_stretch = False
        cr = pb[f"foot_{side}"].constraints.new("COPY_ROTATION")
        cr.target = ft
        ca = pb[f"calf_{side}"]
        ca.lock_ik_y = True
        ca.lock_ik_z = True
        ctl[f"foot_{side}"], ctl[f"knee_{side}"] = ft, kp
    rig["ik_tag"] = tag
    _finger_axes(rig)
    return ctl


def _finger_axes(rig):
    """Store, per finger bone, the local axis that curls it toward the palm (computed from rest geometry)."""
    for side in ("l", "r"):
        B = rig.data.bones
        wrist = B[f"hand_{side}"].head_local
        idx, pky = B[f"index_01_{side}"].head_local, B[f"pinky_01_{side}"].head_local
        mid = B[f"middle_01_{side}"].head_local
        across = (pky - idx).normalized()                     # knuckle line, index -> pinky
        fwd = (mid - wrist).normalized()
        palm = fwd.cross(across).normalized()                  # palm normal (sign fixed below)
        # palm faces the thumb side of the knuckle line: thumb tip lies on the palm side
        th = B[f"thumb_02_{side}"].head_local - wrist
        if th.dot(palm) < 0:
            palm = -palm
        rig[f"palm_{side}"] = list(palm)
        rig[f"fwd_{side}"] = list(fwd)
        for f in FINGERS:
            for k in (1, 2, 3):
                b = B[f"{f}_0{k}_{side}"]
                d = (b.tail_local - b.head_local).normalized()
                ax = d.cross(palm).normalized()
                loc = b.matrix_local.to_3x3().inverted() @ ax
                b["curl_axis"] = list(loc.normalized())
                # spread axis: around the palm normal
                b["spread_axis"] = list((b.matrix_local.to_3x3().inverted() @ palm).normalized())


# finger presets: per finger (curl1, curl2, curl3, spread) degrees
HANDS = {
    "relaxed": {"thumb": (10, 10, 8, 0), "index": (12, 14, 8, -2), "middle": (16, 18, 10, 0), "ring": (20, 20, 10, 2), "pinky": (24, 22, 12, 4)},
    "phone":   {"thumb": (8, 12, 12, 0), "index": (35, 50, 30, 0), "middle": (45, 55, 30, 0), "ring": (55, 55, 30, 0), "pinky": (60, 55, 30, 0)},
    "type":    {"thumb": (12, 22, 22, 0), "index": (35, 50, 30, 0), "middle": (45, 55, 30, 0), "ring": (55, 55, 30, 0), "pinky": (60, 55, 30, 0)},
    "point":   {"thumb": (25, 30, 20, 0), "index": (4, 6, 4, 0), "middle": (70, 85, 50, 0), "ring": (75, 85, 50, 0), "pinky": (80, 80, 50, 0)},
    "fist":    {"thumb": (25, 30, 30, 0), "index": (80, 95, 55, 0), "middle": (85, 95, 55, 0), "ring": (85, 95, 55, 0), "pinky": (85, 90, 55, 0)},
    "grip":    {"thumb": (20, 20, 15, 0), "index": (55, 60, 35, 0), "middle": (60, 62, 35, 0), "ring": (62, 62, 35, 0), "pinky": (64, 60, 35, 0)},
    "handle":  {"thumb": (15, 10, 10, 0), "index": (60, 55, 25, 0), "middle": (62, 55, 25, 0), "ring": (64, 55, 25, 0), "pinky": (66, 55, 25, 0)},
    "flat":    {"thumb": (2, 2, 2, 0), "index": (2, 3, 2, -3), "middle": (2, 3, 2, 0), "ring": (3, 3, 2, 3), "pinky": (4, 4, 2, 6)},
    "claw":    {"thumb": (15, 20, 25, 0), "index": (25, 55, 45, -4), "middle": (25, 55, 45, 0), "ring": (28, 55, 45, 4), "pinky": (30, 55, 45, 8)},
}


def mix_hand(a, b, k):
    A, Bh = HANDS[a] if isinstance(a, str) else a, HANDS[b] if isinstance(b, str) else b
    return {f: tuple(A[f][i] + (Bh[f][i] - A[f][i]) * k for i in range(4)) for f in FINGERS}


def pose_fingers(rig, side, pose):
    P = HANDS[pose] if isinstance(pose, str) else pose
    for f in FINGERS:
        c1, c2, c3, sp = P[f]
        for k, c in ((1, c1), (2, c2), (3, c3)):
            b = rig.data.bones[f"{f}_0{k}_{side}"]
            q = Quaternion(Vector(b["curl_axis"]), math.radians(c))
            if k == 1 and sp:
                q = Quaternion(Vector(b["spread_axis"]), math.radians(sp * (1 if side == "l" else -1))) @ q
            rig.pose.bones[b.name].rotation_quaternion = q


def hand_matrix(rig, side, pos, fwd, palm):
    """Rig-space matrix for a hand target: wrist at `pos`, fingers pointing `fwd`, palm facing `palm`."""
    hb = rig.data.bones[f"hand_{side}"]
    R0 = hb.matrix_local.to_3x3()
    f0, n0 = Vector(rig[f"fwd_{side}"]), Vector(rig[f"palm_{side}"])
    def basis(f, n):
        f = Vector(f).normalized(); n = (Vector(n) - Vector(n).project(f)).normalized()
        return Matrix((f, n, f.cross(n))).transposed()
    Rw = basis(fwd, palm) @ basis(f0, n0).inverted() @ R0
    M = Rw.to_4x4()
    M.translation = Vector(pos)
    return M


def rot(rig, bone, x=0.0, y=0.0, z=0.0):
    """Local euler (degrees) applied as quaternion on a pose bone."""
    rig.pose.bones[bone].rotation_quaternion = Euler((math.radians(x), math.radians(y), math.radians(z)), "XYZ").to_quaternion()


def key_all(rig, ctl, frame):
    for p in rig.pose.bones:
        p.keyframe_insert("rotation_quaternion", frame=frame)
        p.keyframe_insert("location", frame=frame)
    rig.keyframe_insert("location", frame=frame)
    rig.keyframe_insert("rotation_euler", frame=frame)
    for o in ctl.values():
        o.keyframe_insert("location", frame=frame)
        o.keyframe_insert("rotation_euler", frame=frame)
