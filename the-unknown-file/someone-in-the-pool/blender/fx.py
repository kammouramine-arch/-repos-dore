"""Story effects for SOMEONE IS IN THE POOL (all procedural, all driven by time t so a shot can be rendered or baked frame by frame).

  RipplePatch   dense water surface patch with physically shaped ring waves (the knocks from under the water)
  HandFloor     the deep-end floor patch bulging in the shape of a hand pressing up from UNDER the tiles, with grout cracks
  HangingHair   wet black hair strands hanging under gravity from the woman's scalp (used when she is upside-down / bent over)
  Drips         falling water drops from fixed emitters (hair ends, ceiling hole, gown hem)
  decal()       image-masked wet decals: footprints, handprints, wet spots, glass crack
  invert()      turn an actor upside-down onto a ceiling (rotation, not mirror: hands stay hands)
"""
import bpy, bmesh, math, os, random
import numpy as np
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "..", "assets", "textures")


def _img(name):
    return bpy.data.images.load(os.path.join(TEX, name), check_existing=True)


def _img_array(name):
    im = _img(name)
    w, h = im.size
    a = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[:, :, 0], w, h


def _sample(arr, u, v):
    """bilinear sample of a 2D array at normalised coords (u right, v up), arrays of any shape"""
    h, w = arr.shape
    x = np.clip(u, 0, 1) * (w - 1); y = np.clip(v, 0, 1) * (h - 1)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
    x1 = np.minimum(x0 + 1, w - 1); y1 = np.minimum(y0 + 1, h - 1)
    fx, fy = x - x0, y - y0
    return (arr[y0, x0] * (1 - fx) * (1 - fy) + arr[y0, x1] * fx * (1 - fy) + arr[y1, x0] * (1 - fx) * fy + arr[y1, x1] * fx * fy)


# ------------------------------------------------------------------ water rings
class RipplePatch:
    """A square of water surface (replaces WATER_SURFACE locally) with ring waves.
    rings: list of (x, y, t0, amp)  — a disturbance that rises from below at time t0."""

    def __init__(self, center, size=6.0, res=240, z=-0.12, rings=(), hide_main=True):
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=res, y_subdivisions=res, size=size, location=(center[0], center[1], z))
        o = bpy.context.object; o.name = "RIPPLE_PATCH"
        for u in list(o.users_collection):
            u.objects.unlink(o)
        bpy.data.collections["WATER"].objects.link(o)
        o.data.materials.append(bpy.data.materials["pool_water"]); o.visible_shadow = False
        for p in o.data.polygons:
            p.use_smooth = True
        self.o = o; self.rings = list(rings)
        n = len(o.data.vertices)
        self.co = np.empty(n * 3, dtype=np.float32); o.data.vertices.foreach_get("co", self.co)
        self.co = self.co.reshape(n, 3)
        self.wx = self.co[:, 0] + center[0]; self.wy = self.co[:, 1] + center[1]
        # close-ups only: the patch replaces the main surface, which is hidden (it would double the Fresnel layer)
        bpy.data.objects["WATER_SURFACE"].hide_render = hide_main

    def update(self, t):
        z = np.zeros(len(self.co), dtype=np.float32)
        for (x, y, t0, amp) in self.rings:
            age = t - t0
            if age <= 0:
                continue
            r = np.hypot(self.wx - x, self.wy - y)
            c = 0.55                                   # front speed m/s (capillary-gravity, ~5 cm wavelength)
            front = c * age
            env = np.exp(-((r - front) ** 2) / (2 * (0.06 + 0.12 * age) ** 2))   # the packet widens as it travels
            decay = amp * math.exp(-age * 0.9) / (1 + 2.5 * front)
            z += (decay * env * np.cos((r - front) * 2 * math.pi / 0.09)).astype(np.float32)
            # the central bump where the knock lifts the water
            z += (amp * 0.6 * math.exp(-age * 5) * np.exp(-(r ** 2) / 0.02)).astype(np.float32)
        co = self.co.copy(); co[:, 2] = z
        self.o.data.vertices.foreach_set("co", co.ravel()); self.o.data.update()


# ------------------------------------------------------------------ the hand under the floor
class HandFloor:
    """Displaces HAND_PATCH (1.4 m square at (23.2, 7.6), floor z -3.2) with the hand height map.
    update(t, press, drag=(dx,dy), crack, spread_wobble) — press in metres of bulge (0.0-0.07)."""

    def __init__(self, name="HAND_PATCH", scale=0.62, rot_deg=-20):
        self.o = bpy.data.objects[name]
        me = self.o.data
        for p in me.polygons:
            p.use_smooth = True
        n = len(me.vertices)
        co = np.empty(n * 3, dtype=np.float32); me.vertices.foreach_get("co", co)
        self.co = co.reshape(n, 3)
        # the patch's transform was applied at build time: vertices are in world space; work relative to its centre
        self.cx, self.cy = float(self.co[:, 0].mean()), float(self.co[:, 1].mean())
        self.h, _, _ = _img_array("hand_height.png")
        self.c, _, _ = _img_array("hand_crack.png")
        self.scale, self.rot = scale, math.radians(rot_deg)
        m = me.materials[0].copy(); me.materials[0] = m; self.m = m
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        # crack mask darkens the tiles (dark wet grout fissures), driven by CRACK value
        tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
        # same transform as uv(): u = R(-rot)(p - c) / scale + 0.5
        a = -self.rot; ca, sa = math.cos(a), math.sin(a)
        lx = -(ca * self.cx - sa * self.cy) / scale + 0.5; ly = -(sa * self.cx + ca * self.cy) / scale + 0.5
        mp.inputs["Scale"].default_value = (1 / scale, 1 / scale, 1); mp.inputs["Rotation"].default_value = (0, 0, a)
        mp.inputs["Location"].default_value = (lx, ly, 0)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        self.mp = mp
        ci = nt.nodes.new("ShaderNodeTexImage"); ci.image = _img("hand_crack.png"); ci.extension = "CLIP"; ci.image.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], ci.inputs["Vector"])
        cv = nt.nodes.new("ShaderNodeValue"); cv.name = "CRACK"; cv.outputs[0].default_value = 0.0
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.use_clamp = True
        nt.links.new(ci.outputs["Color"], mul.inputs[0]); nt.links.new(cv.outputs[0], mul.inputs[1])
        src = b.inputs["Base Color"].links[0].from_socket
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs["B"].default_value = (0.01, 0.015, 0.015, 1)
        nt.links.new(mul.outputs[0], mx.inputs["Factor"]); nt.links.new(src, mx.inputs["A"]); nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
        if b.inputs["Emission Color"].links:
            nt.links.new(mx.outputs["Result"], b.inputs["Emission Color"])
        self.cv = cv

    def uv(self, dx=0.0, dy=0.0, rot_extra=0.0):
        x = self.co[:, 0] - self.cx - dx; y = self.co[:, 1] - self.cy - dy
        a = self.rot + rot_extra
        xr = x * math.cos(a) + y * math.sin(a); yr = -x * math.sin(a) + y * math.cos(a)
        return xr / self.scale + 0.5, yr / self.scale + 0.5

    def update(self, t, press=0.05, drag=(0.0, 0.0), crack=0.0, wobble=0.0):
        u, v = self.uv(drag[0], drag[1], wobble * 0.05 * math.sin(t * 3.1))
        inside = (u > 0) & (u < 1) & (v > 0) & (v < 1)
        hh = np.where(inside, _sample(self.h, u, v), 0.0)
        # fingers strain: a travelling pulse along the hand height adds a "pushing" tremor
        trem = 1.0 + wobble * 0.08 * np.sin(t * 17.0 + u * 9.0)
        co = self.co.copy(); co[:, 2] = self.co[:, 2] + (press * hh * trem).astype(np.float32)
        self.o.data.vertices.foreach_set("co", co.ravel()); self.o.data.update()
        self.cv.outputs[0].default_value = crack


# ------------------------------------------------------------------ hair hanging under gravity
class HangingHair:
    def __init__(self, actor, n=150, length=(0.55, 0.95), seed=3, hide_mesh_hair=True, parted=0.0):
        self.a = actor; self.n = n; R = random.Random(seed)
        self.roots = []
        for i in range(n):
            # scalp points on the upper/back hemisphere of the head bone (rig space offsets from the head bone head)
            th = R.uniform(0, 2 * math.pi); ph = R.uniform(0.0, 1.15)
            self.roots.append((th, ph, R.uniform(*length), R.uniform(0, 6.28), R.uniform(0.6, 1.2)))
        cu = bpy.data.curves.new("Wom.hair_hanging", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.0028; cu.bevel_resolution = 1
        self.K = 8
        for _ in range(n):
            sp = cu.splines.new("POLY"); sp.points.add(self.K - 1)
        self.o = bpy.data.objects.new("Wom.hair_hanging", cu); bpy.data.collections["WOMAN"].objects.link(self.o)
        cu.materials.append(bpy.data.materials["Wom.locks"])
        if hide_mesh_hair:
            for o in bpy.data.objects:
                if o.name.startswith(("Wom.long01", "Wom.lock_")):
                    o.hide_render = True
        self.parted = parted

    def update(self, t, sway=1.0, gravity=Vector((0, 0, -1)), wet_clump=0.5):
        a = self.a; bpy.context.view_layer.update()
        pb = a.rig.pose.bones["head"]
        Mh = a.rig.matrix_world @ pb.matrix
        center = Mh @ Vector((0, 0.11, 0.0))          # head bone: +Y runs up the head
        g = gravity.normalized()
        for i, (th, ph, ln, sd, sw) in enumerate(self.roots):
            # point on the skull (bone space: y up the head, -z forward/face? use x,z as the ring)
            loc = Vector((math.sin(ph) * math.cos(th) * 0.095, 0.11 + math.cos(ph) * 0.09, math.sin(ph) * math.sin(th) * 0.1))
            root = Mh @ loc
            out = (root - center).normalized()
            sp = self.o.data.splines[i]
            p = root.copy()
            for k in range(self.K):
                f = k / (self.K - 1)
                if k:
                    # leave the scalp along its normal first, then fall under gravity; clump toward the hanging axis
                    d = (out * (1 - f) ** 3 * 0.6 + g).normalized()
                    p = p + d * (ln / (self.K - 1))
                    drift = Vector((math.sin(t * 0.9 * sw + sd + f * 2), math.cos(t * 0.7 * sw + sd * 1.3 + f * 1.5), 0)) * 0.012 * f * sway
                    p = p + drift
                    p = p.lerp(Vector((center.x, center.y, p.z)) + (p - Vector((center.x, center.y, p.z))) * (1 - 0.35 * wet_clump), f * wet_clump * 0.15)
                sp.points[k].co = (*p, 1)
        self.o.data.update_tag()


# ------------------------------------------------------------------ drips
class Drips:
    """emitters: list of (point, period, phase). Drops fall from each emitter with gravity and vanish at floor_z."""

    def __init__(self, emitters, floor_z, size=0.006, name="DRIP", coll="PROPS"):
        self.e = emitters; self.floor = floor_z; self.objs = []
        m = bpy.data.materials.get("drip_water")
        if not m:
            m = bpy.data.materials.new("drip_water"); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
            b.inputs["Base Color"].default_value = (0.8, 0.9, 0.95, 1); b.inputs["Roughness"].default_value = 0.0
            b.inputs["Coat Weight"].default_value = 1.0; b.inputs["Alpha"].default_value = 0.6
            b.inputs["Emission Color"].default_value = (0.8, 0.9, 1.0, 1); b.inputs["Emission Strength"].default_value = 0.4
            m.surface_render_method = "BLENDED"
        for i in range(len(emitters) * 3):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=size)
            o = bpy.context.object; o.name = f"{name}_{i}"
            for u in list(o.users_collection):
                u.objects.unlink(o)
            bpy.data.collections[coll].objects.link(o); o.data.materials.append(m); o.visible_shadow = False
            o.scale = (1, 1, 1.6)
            self.objs.append(o)

    def update(self, t):
        k = 0
        for (p, period, phase) in self.e:
            p = Vector(p); fall = math.sqrt(2 * max(0.01, p.z - self.floor) / 9.81)
            for j in range(3):
                o = self.objs[k]; k += 1
                age = ((t + phase + j * period) % (3 * period)) - 2 * period     # the three drops take turns, one per period
                if 0 <= age <= fall:
                    o.hide_render = False
                    o.location = p - Vector((0, 0, 0.5 * 9.81 * age * age))
                    o.scale = (1, 1, 1.0 + 3.0 * min(1.0, age * 6))
                elif -0.25 <= age < 0:     # the drop swelling at the emitter
                    o.hide_render = False; o.location = p; s = 0.4 + 0.6 * (1 + age / 0.25); o.scale = (s, s, s * 1.3)
                else:
                    o.hide_render = True


# ------------------------------------------------------------------ decals
def decal(name, image, loc, size, rot=(0, 0, 0), color=(0.02, 0.025, 0.025), alpha=0.75, rough=0.03, coat=1.0, emit=0.0,
          coll="PROPS", flip_x=False):
    """image-masked plane. Returns (object, opacity Value node) — set node.outputs[0].default_value per frame to reveal."""
    m = bpy.data.materials.new(name + "_mat"); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1); b.inputs["Emission Strength"].default_value = emit
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = _img(image); tx.extension = "CLIP"; tx.image.colorspace_settings.name = "Non-Color"
    if flip_x:
        uvn = nt.nodes.new("ShaderNodeUVMap"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (-1, 1, 1); mp.inputs["Location"].default_value = (1, 0, 0)
        nt.links.new(uvn.outputs["UV"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], tx.inputs["Vector"])
    op = nt.nodes.new("ShaderNodeValue"); op.name = "OPACITY"; op.outputs[0].default_value = alpha
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.use_clamp = True
    nt.links.new(tx.outputs["Color"], mul.inputs[0]); nt.links.new(op.outputs[0], mul.inputs[1])
    nt.links.new(mul.outputs[0], b.inputs["Alpha"])
    m.surface_render_method = "BLENDED"
    sx, sy = size if isinstance(size, (tuple, list)) else (size, size)
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-sx / 2, -sy / 2, 0), (sx / 2, -sy / 2, 0), (sx / 2, sy / 2, 0), (-sx / 2, sy / 2, 0)], [], [(0, 1, 2, 3)])
    me.uv_layers.new(); uv = me.uv_layers[0].data
    for k, c in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv[k].uv = c
    me.materials.append(m)
    o = bpy.data.objects.new(name, me); bpy.data.collections[coll].objects.link(o); o.location = loc; o.rotation_euler = rot
    o.visible_shadow = False
    return o, op


# ------------------------------------------------------------------ upside-down actor
def invert(actor, pivot_z, pivot_y=None):
    """Rotate a fully posed actor 180° about a horizontal X axis at height pivot_z: the floor z=0 maps to z = 2*pivot_z.
    Call AFTER posing on the virtual floor (actor.floor = 0). Feet controls live in world space, so they are carried too."""
    bpy.context.view_layer.update()
    y0 = actor.rig.location.y if pivot_y is None else pivot_y
    F = Matrix.Translation((0, y0, pivot_z)) @ Matrix.Rotation(math.pi, 4, "X") @ Matrix.Translation((0, -y0, -pivot_z))
    feet = [actor.ctl["foot_l"], actor.ctl["foot_r"]]
    fm = [f.matrix_world.copy() for f in feet]
    actor.rig.matrix_world = F @ actor.rig.matrix_world
    for f, M in zip(feet, fm):
        f.matrix_world = F @ M
    bpy.context.view_layer.update()
