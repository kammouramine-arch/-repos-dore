"""Actor: high-level posing on top of rigkit (body placement, feet, IK hands, fingers, spine/head, props)."""
import bpy, math
from mathutils import Vector, Matrix, Euler, Quaternion
import rigkit

UP = Vector((0, 0, 1))


class Actor:
    def __init__(self, tag):
        self.tag = tag
        self.rig = bpy.data.objects[f"{tag}.rig"]
        self.ctl = {k: bpy.data.objects[f"{tag}.{k}"] for k in
                    ("hand_l", "hand_r", "elbow_l", "elbow_r", "foot_l", "foot_r", "knee_l", "knee_r")}
        B = self.rig.data.bones
        self.rest_foot = {s: B[f"foot_{s}"].matrix_local.copy() for s in "lr"}
        self.rest_hand = {s: B[f"hand_{s}"].matrix_local.copy() for s in "lr"}
        self.rest_elbow = {s: self.ctl[f"elbow_{s}"].location.copy() for s in "lr"}
        self.rest_knee = {s: self.ctl[f"knee_{s}"].location.copy() for s in "lr"}
        self.props = []

    # ---------------- body
    def place(self, x, y, yaw_deg, dz=0.0):
        """yaw 0 = facing -Y (south); 90 = facing +X (east)."""
        self.rig.location = (x, y, dz)
        self.rig.rotation_mode = "XYZ"
        self.rig.rotation_euler = (0, 0, math.radians(yaw_deg))
        bpy.context.view_layer.update()

    def body_mat(self, x=None, y=None, yaw=None, dz=0.0):
        if x is None:
            return self.rig.matrix_world.copy()
        return Matrix.Translation((x, y, dz)) @ Euler((0, 0, math.radians(yaw))).to_matrix().to_4x4()

    def foot(self, side, x, y, yaw_deg, lift=0.0, pitch=0.0):
        """Plant a foot in world space (ankle above the floor point x,y)."""
        R = self.rest_foot[side]
        rel = Matrix.Translation((0, 0, R.translation.z + lift)) @ Euler((math.radians(pitch), 0, math.radians(yaw_deg))).to_matrix().to_4x4() @ R.to_3x3().to_4x4()
        rel.translation = Vector((x, y, R.translation.z + lift))
        self.ctl[f"foot_{side}"].matrix_world = rel

    def stand(self, spread=0.0, fwd_l=0.0, fwd_r=0.0, turn_l=0.0, turn_r=0.0):
        """Feet planted under the body in its current placement."""
        M = self.rig.matrix_world
        yaw = math.degrees(self.rig.rotation_euler.z)
        for s, sg, fw, tn in (("l", 1, fwd_l, turn_l), ("r", -1, fwd_r, turn_r)):
            p = self.rest_foot[s].translation + Vector((sg * spread, -fw, 0))
            w = M @ Vector((p.x, p.y, 0))
            self.foot(s, w.x, w.y, yaw + sg * tn)

    # ---------------- arms + hands (rig space: front = -Y, the actor's right = -X)
    def hand(self, side, pos, fwd, palm, fingers="relaxed", elbow=None):
        self.ctl[f"hand_{side}"].matrix_basis = rigkit.hand_matrix(self.rig, side, pos, fwd, palm)
        rigkit.pose_fingers(self.rig, side, fingers)
        self.ctl[f"elbow_{side}"].location = elbow if elbow is not None else self.rest_elbow[side]

    def hand_rest(self, side, fingers="relaxed", swing=0.0, out=0.0):
        """Arm hanging naturally at the side; swing>0 moves the hand forward (metres)."""
        sg = 1 if side == "l" else -1
        B = self.rig.data.bones
        sh = B[f"upperarm_{side}"].head_local
        L = (B[f"upperarm_{side}"].length + B[f"lowerarm_{side}"].length) * 0.96
        pos = Vector((sh.x + sg * (0.05 + out), sh.y - swing, sh.z - L + abs(swing) * 0.25))
        fwd = Vector((sg * 0.12, -swing * 0.8, -1))
        palm = Vector((-sg, -0.25, 0))
        self.hand(side, pos, fwd, palm, fingers)

    # ---------------- spine / head  (degrees; pitch>0 bends forward, yaw>0 turns toward the actor's left)
    def spine(self, pitch=0.0, yaw=0.0, roll=0.0):
        for b, k in (("spine_01", 0.3), ("spine_02", 0.35), ("spine_03", 0.35)):
            rigkit.rot(self.rig, b, pitch * k, yaw * k, roll * k)

    def head(self, pitch=0.0, yaw=0.0, roll=0.0):
        rigkit.rot(self.rig, "neck_01", pitch * 0.45, yaw * 0.4, roll * 0.4)
        rigkit.rot(self.rig, "head", pitch * 0.55, yaw * 0.6, roll * 0.6)

    def hips(self, dz=0.0, dx=0.0, dy=0.0):
        self.rig.pose.bones["pelvis"].location = (dx, dz, dy)

    # ---------------- props
    def attach(self, obj, side, along=0.075, out=0.025, sideways=0.0, spin=0.0, screen_out=True, axis="phone"):
        """Parent a prop to the hand bone so it can never float free of the hand."""
        rig = self.rig
        hb = rig.data.bones[f"hand_{side}"]
        R = hb.matrix_local.to_3x3()
        f = R.inverted() @ Vector(rig[f"fwd_{side}"])
        n = R.inverted() @ Vector(rig[f"palm_{side}"])
        f = f.normalized(); n = (n - n.project(f)).normalized(); s = f.cross(n)
        if axis == "phone":
            # long axis turned `spin` degrees from the finger direction, screen facing out of the palm
            a = math.radians(spin)
            L = f * math.cos(a) + s * math.sin(a)
            X = L.cross(n)
            M = Matrix((X, L, n if screen_out else -n)).transposed().to_4x4()
        else:  # bag: hangs below the hand, thin side across the palm
            M = Matrix((s, n, -f)).transposed().to_4x4()
        M.translation = f * along + n * out + s * sideways
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = f"hand_{side}"
        # bone parenting is relative to the bone TAIL in bone space
        tail = Vector((0, hb.length, 0))
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_basis = Matrix.Translation(-tail) @ M
        self.props.append(obj)

    def grip_phone(self, side, center, screen, up, fingers="phone", tilt=18.0, elbow=None):
        """Hold the phone (rig space): palm on its back, fingers wrapped round the far edge, thumb over the screen.
        Returns the phone matrix (rig space)."""
        n = Vector(screen).normalized()
        u = (Vector(up) - Vector(up).project(n)).normalized()
        right = u.cross(n)                      # the viewer's right on the screen
        sg = -1 if side == "r" else 1           # right hand wraps toward the screen's left edge
        a = math.radians(tilt)
        f = (right * sg * math.cos(a) + u * math.sin(a)).normalized()
        B = self.rig.data.bones
        knuck = (B[f"middle_01_{side}"].head_local - B[f"hand_{side}"].head_local).length
        # knuckles sit just behind the far long edge; the palm lies on the phone back
        edge = Vector(center) + right * sg * 0.030 - n * 0.0045
        wrist = edge - f * knuck - n * 0.016 - u * 0.012
        self.hand(side, wrist, f, n, fingers, elbow)
        P = Matrix((right, u, n)).transposed().to_4x4()
        P.translation = Vector(center)
        return P

    def attach_rel(self, obj, side, M_rig):
        """Parent obj to the hand bone so that, with the hand at its current target, obj sits at M_rig (rig space)."""
        hb = self.rig.data.bones[f"hand_{side}"]
        H = self.ctl[f"hand_{side}"].matrix_basis
        rel = H.inverted() @ M_rig
        obj.parent = self.rig
        obj.parent_type = "BONE"
        obj.parent_bone = f"hand_{side}"
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_basis = Matrix.Translation((0, -hb.length, 0)) @ rel
        self.props.append(obj)

    # ---------------- sitting
    def sit(self, x, y, yaw, seat=0.47, feet_fwd=0.50, feet_apart=0.13, knees=0.0):
        """Seat the body: hips just above `seat` (m), feet planted on the floor in front."""
        pel = self.rig.data.bones["pelvis"].head_local
        self.place(x, y, yaw, dz=(seat + 0.06) - pel.z)
        M = self.rig.matrix_world
        for s_, sg in (("l", 1), ("r", -1)):
            w = M @ Vector((sg * feet_apart, -feet_fwd, 0))
            self.foot(s_, w.x, w.y, yaw + sg * 8)
            kp = self.rest_knee[s_].copy()
            self.ctl[f"knee_{s_}"].location = Vector((kp.x + sg * (0.06 + knees), kp.y - 0.4, kp.z + 0.5))

    def eye(self):
        """Posed eye-centre position in rig space (call after posing the spine/head + view_layer.update())."""
        pb = self.rig.pose.bones["head"]
        rest = self.rig.data.bones["head"].matrix_local
        off = rest.inverted() @ (rest.translation + Vector((0, -0.085, 0.085)))
        return pb.matrix @ off

    def world(self, v):
        return self.rig.matrix_world @ Vector(v)

    def local(self, v):
        return self.rig.matrix_world.inverted() @ Vector(v)

    def palm_axes(self, side):
        """current target hand axes (rig space): fingers, palm normal"""
        H = self.ctl[f"hand_{side}"].matrix_basis
        R0 = self.rig.data.bones[f"hand_{side}"].matrix_local.to_3x3().inverted()
        f = (H.to_3x3() @ (R0 @ Vector(self.rig[f"fwd_{side}"]))).normalized()
        n = (H.to_3x3() @ (R0 @ Vector(self.rig[f"palm_{side}"]))).normalized()
        return H.translation.copy(), f, n

    def carry_bag(self, bag, side="l"):
        """paper bag hanging from the curled fingers by its folded top"""
        w, f, n = self.palm_axes(side)
        grip = w + f * 0.085 + n * 0.02
        zz = Vector((0, 0, 1)); yy = (n - n.project(zz)).normalized(); xx = yy.cross(zz)
        M = Matrix((xx, yy, zz)).transposed().to_4x4(); M.translation = grip - zz * 0.13
        self.attach_rel(bag, side, M)

    def hand_world(self, side, pos, fwd, palm, fingers="relaxed", elbow=None):
        """IK hand target given in WORLD space (door handles, buttons on a phone lying on the floor)."""
        Mi = self.rig.matrix_world.inverted()
        R = Mi.to_3x3()
        self.hand(side, Mi @ Vector(pos), R @ Vector(fwd), R @ Vector(palm), fingers, elbow)

    def tip(self, side, finger="index"):
        """world position of a fingertip (tail of the last phalanx) in the current pose"""
        bpy.context.view_layer.update()
        return self.rig.matrix_world @ self.rig.pose.bones[f"{finger}_03_{side}"].tail

    def touch(self, side, target, fwd, palm, fingers="point", finger="index", iters=3):
        """place the hand so that the fingertip lands exactly on `target` (world) — real contact, no floating"""
        target = Vector(target); pos = target - Vector(fwd).normalized() * 0.17
        for _ in range(iters):
            self.hand_world(side, pos, fwd, palm, fingers)
            err = target - self.tip(side, finger)
            pos = pos + err
        self.hand_world(side, pos, fwd, palm, fingers)
        return (target - self.tip(side, finger)).length

    def key(self, frame):
        rigkit.key_all(self.rig, self.ctl, frame)
