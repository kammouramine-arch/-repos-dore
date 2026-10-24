"""Shared set-building kit for SOMEONE IS IN THE POOL (helpers inherited from YOUR FOOD IS HERE's apartment builder).
Every set script calls init() first; geometry is built in world coordinates so box-projected textures keep a real-world scale."""
import bpy, bmesh, os, math, random, sys
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
PH = os.path.join(HERE, "..", "assets", "polyhaven")
H = 2.6
DOOR_H = 2.1
R = random.Random(13)
COLS = {}
CUR = [None]
S = None


def init(cols):
    global S, M_STEEL, M_BRASS, M_FRAME, FONT
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    root = bpy.data.collections.new("SET"); S.collection.children.link(root)
    for n in cols:
        c = bpy.data.collections.new(n); root.children.link(c); COLS[n] = c
    CUR[0] = COLS[cols[0]]
    M_STEEL = mat("brushed_steel", (0.6, 0.6, 0.62), 0.3, 1.0)
    M_BRASS = mat("brass", (0.7, 0.52, 0.25), 0.3, 1.0)
    M_FRAME = mat("frame_white", (0.8, 0.79, 0.76), 0.4)
    FONT = None
    for fp in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",):
        if os.path.exists(fp):
            FONT = bpy.data.fonts.load(fp)
    return S


def link(o, c=None):
    for u in list(o.users_collection):
        u.objects.unlink(o)
    (c or CUR[0]).objects.link(o)
    return o


# ------------------------------------------------------------------ materials
MATS = {}


def tex_mat(name, folder, scale=1.0, tint=(1, 1, 1), rough_mul=1.0, bump=0.3, rot90=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    d = os.path.join(PH, folder)
    files = os.listdir(d)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / scale, 1 / scale, 1 / scale)
    if rot90:
        mp.inputs["Rotation"].default_value[2] = math.pi / 2
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])

    def img(key, non_color=False):
        f = [x for x in files if key in x.lower()]
        if not f:
            return None
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = bpy.data.images.load(os.path.join(d, f[0]))
        n.projection = "BOX"; n.projection_blend = 0.25
        if non_color:
            n.image.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n
    di = img("diff")
    if di:
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
        nt.links.new(di.outputs["Color"], mul.inputs["A"]); mul.inputs["B"].default_value = (*tint, 1)
        nt.links.new(mul.outputs["Result"], b.inputs["Base Color"])
    ro = img("rough", True)
    if ro:
        mr = nt.nodes.new("ShaderNodeMath"); mr.operation = "MULTIPLY"; mr.inputs[1].default_value = rough_mul
        nt.links.new(ro.outputs["Color"], mr.inputs[0]); nt.links.new(mr.outputs[0], b.inputs["Roughness"])
    no = img("nor_gl", True)
    if no:
        nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
        nt.links.new(no.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    MATS[name] = m
    return m


def mat(name, color, rough=0.5, metal=0.0, emit=None, emit_s=0.0, alpha=1.0, transmission=0.0, noise=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = emit_s
    if transmission:
        b.inputs["Transmission Weight"].default_value = transmission
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    if noise:
        nt = m.node_tree
        n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 60; n.inputs["Detail"].default_value = 6
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = noise
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    MATS[name] = m
    return m




def box(name, x0, y0, z0, x1, y1, z1, m=None, c=None, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((x0 if v.co.x < 0 else x1, y0 if v.co.y < 0 else y1, z0 if v.co.z < 0 else z1))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); link(o, c)
    if m:
        me.materials.append(m)
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 2
    return o


def cyl(name, x, y, z0, z1, r, m=None, c=None, verts=32, axis="Z"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=z1 - z0)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); link(o, c)
    if axis == "Z":
        o.location = (x, y, (z0 + z1) / 2)
    if m:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    return o


def wall_x(name, y, x0, x1, t, openings=(), m=None, c=None, z0=0.0, z1=H):
    """Wall running along X at centre-line y, thickness t, openings = [(xa, xb, za, zb)]."""
    segs, xs = [], x0
    for (a, b, za, zb) in sorted(openings):
        if a > xs:
            box(f"{name}", xs, y - t / 2, z0, a, y + t / 2, z1, m, c)
        if za > z0:
            box(f"{name}_below", a, y - t / 2, z0, b, y + t / 2, za, m, c)
        if zb < z1:
            box(f"{name}_above", a, y - t / 2, zb, b, y + t / 2, z1, m, c)
        xs = b
    if xs < x1:
        box(f"{name}", xs, y - t / 2, z0, x1, y + t / 2, z1, m, c)


def wall_y(name, x, y0, y1, t, openings=(), m=None, c=None, z0=0.0, z1=H):
    xs = y0
    for (a, b, za, zb) in sorted(openings):
        if a > xs:
            box(f"{name}", x - t / 2, xs, z0, x + t / 2, a, z1, m, c)
        if za > z0:
            box(f"{name}_below", x - t / 2, a, z0, x + t / 2, b, za, m, c)
        if zb < z1:
            box(f"{name}_above", x - t / 2, a, zb, x + t / 2, b, z1, m, c)
        xs = b
    if xs < y1:
        box(f"{name}", x - t / 2, xs, z0, x + t / 2, y1, z1, m, c)


def import_gltf(asset, loc, rot_z=0.0, scale=1.0, c=None, name=None):
    d = os.path.join(PH, asset)
    f = [x for x in os.listdir(d) if x.endswith(".gltf")][0]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(d, f))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name or asset.upper(), None); link(root, c)
    for o in new:
        link(o, c)
        if o.parent is None:
            o.parent = root
    root.location = loc; root.rotation_euler = (0, 0, math.radians(rot_z)); root.scale = (scale,) * 3
    return root


def area_light(name, loc, size, energy, color, rot=(0, 0, 0), c=None, shape="RECTANGLE", sy=None):
    L = bpy.data.lights.new(name, "AREA"); L.energy = energy; L.color = color; L.shape = shape
    L.size = size; L.size_y = sy or size
    o = bpy.data.objects.new(name, L); link(o, c); o.location = loc; o.rotation_euler = rot
    return o


def point_light(name, loc, energy, color, radius=0.05, c=None):
    L = bpy.data.lights.new(name, "POINT"); L.energy = energy; L.color = color; L.shadow_soft_size = radius
    o = bpy.data.objects.new(name, L); link(o, c); o.location = loc
    return o


def text(name, body, loc, size, m, rot=(math.pi / 2, 0, 0), c=None, extrude=0.002, align="CENTER", font=None):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = body; cu.size = size; cu.extrude = extrude
    cu.align_x = align; cu.align_y = "CENTER"
    if font:
        cu.font = font
    o = bpy.data.objects.new(name, cu); link(o, c); o.location = loc; o.rotation_euler = rot
    cu.materials.append(m)
    return o




def door_leaf(name, hinge, width, yaw0, m, c, thick=0.045, handle_side=1, h=DOOR_H - 0.01, plate=None, handle_out=True):
    """A hinged door: pivot empty at the hinge, leaf extends along +X of the pivot."""
    piv = bpy.data.objects.new(name, None); link(piv, c); piv.location = hinge; piv.rotation_euler = (0, 0, math.radians(yaw0))
    leaf = box(name + "_leaf", 0.005, -thick / 2, 0.018, width - 0.005, thick / 2, h, m, c, 0.004)
    leaf.parent = piv
    # panel grooves
    for (z0, z1) in ((0.25, 0.95), (1.15, 1.9)):
        g = box(name + "_panel", 0.12, -thick / 2 - 0.002, z0, width - 0.12, thick / 2 + 0.002, z1, m, c, 0.01)
        g.parent = piv
    for sgn in (-1, 1):
        if sgn == -1 and not handle_out:
            continue
        hx = width - 0.07
        rose = cyl(name + "_rose", 0, 0, 0, 0.012, 0.028, M_STEEL, c)
        rose.rotation_euler = (math.radians(90), 0, 0); rose.location = (hx, sgn * (thick / 2 + 0.006), 1.0); rose.parent = piv
        lever = box(name + f"_handle{'_out' if sgn < 0 else '_in'}", -0.13, -0.009, -0.011, 0.0, 0.009, 0.011, M_STEEL, c, 0.004)
        hp = bpy.data.objects.new(name + f"_handlepivot{'_out' if sgn < 0 else '_in'}", None); link(hp, c)
        hp.location = (hx, sgn * (thick / 2 + 0.035), 1.0); hp.parent = piv
        lever.parent = hp
        neck = cyl(name + "_neck", 0, 0, 0, 0.03, 0.008, M_STEEL, c)
        neck.rotation_euler = (math.radians(90), 0, 0); neck.location = (hx, sgn * (thick / 2 + 0.02), 1.0); neck.parent = piv
    if plate:
        text(name + "_number", plate, (width / 2, -thick / 2 - 0.004, 1.62), 0.085, M_BRASS, (math.pi / 2, 0, 0), c, 0.004, font=FONT).parent = piv
    return piv


def door_frame(name, x0, x1, y, t, c, h=DOOR_H, axis="x"):
    w = 0.06
    if axis == "x":
        box(name, x0 - w, y - t / 2 - 0.01, 0, x0, y + t / 2 + 0.01, h + w, M_FRAME, c)
        box(name, x1, y - t / 2 - 0.01, 0, x1 + w, y + t / 2 + 0.01, h + w, M_FRAME, c)
        box(name, x0, y - t / 2 - 0.01, h, x1, y + t / 2 + 0.01, h + w, M_FRAME, c)
    else:
        box(name, y - t / 2 - 0.01, x0 - w, 0, y + t / 2 + 0.01, x0, h + w, M_FRAME, c)
        box(name, y - t / 2 - 0.01, x1, 0, y + t / 2 + 0.01, x1 + w, h + w, M_FRAME, c)
        box(name, y - t / 2 - 0.01, x0, h, y + t / 2 + 0.01, x1, h + w, M_FRAME, c)


# ------------------------------------------------------------------ HALL + FRONT DOOR 6A
