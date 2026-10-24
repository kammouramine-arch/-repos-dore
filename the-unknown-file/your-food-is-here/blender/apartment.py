"""Builds apartment.blend — Apartment 6A + the 6th-floor corridor. ONE floor plan used by every shot.

Floor plan (metres, +Y = north, +X = east, floor z = 0, ceiling 2.6):
  HALL      x 0.0-1.4  y 0.0-4.2   front door (6A) in the south wall at x 0.25-1.15
  BATH      x 1.4-3.6  y 0.0-4.2   door from the hall at y 2.9-3.7
  BEDROOM   x 3.6-7.4  y 0.0-4.2   door from the living room (north wall) at x 4.2-5.0,
                                    wardrobe/closet on the south wall x 4.0-5.2 (single hinged door)
  KITCHEN   x 0.0-3.0  y 4.2-8.6   (open plan, west half) counters on west + north walls, table at (1.9, 6.3)
  LIVING    x 3.0-7.4  y 4.2-8.6   sofa faces east (TV on east wall), two windows in the north wall
  CORRIDOR  y -2.0-0.0 x -6.0-12.0 doors 6A (ours), 6B (east neighbour), 6C/6D opposite; doorbell camera beside 6A
"""
import bpy, bmesh, os, math, random, sys
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
PH = os.path.join(HERE, "..", "assets", "polyhaven")
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
H = 2.6
R = random.Random(13)

COLS = {}


def coll(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or S.collection).children.link(c) if not isinstance(parent, bpy.types.Collection) else parent.children.link(c)
    COLS[name] = c
    return c


SET = coll("SET")
for n in ("STRUCTURE", "KITCHEN", "LIVING", "BEDROOM", "BATH", "HALL", "CORRIDOR", "WINDOWS", "CURTAINS_N3",
          "LIGHTS_NIGHT", "LIGHTS_ALLON", "LIGHTS_CORRIDOR", "EXTERIOR"):
    c = bpy.data.collections.new(n); SET.children.link(c); COLS[n] = c
CUR = [COLS["STRUCTURE"]]


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


M_WALL = tex_mat("wall_paint", "painted_plaster_wall", 1.6, (0.86, 0.84, 0.8), 1.0, 0.15)
M_WALL_CORR = tex_mat("corridor_wall", "painted_plaster_wall", 1.6, (0.62, 0.66, 0.6), 1.0, 0.25)
M_FLOOR = tex_mat("laminate", "laminate_floor_02", 1.6, (0.95, 0.9, 0.85), 1.0, 0.4)
M_TILE = tex_mat("tiles", "long_white_tiles", 0.9, (0.92, 0.93, 0.94), 0.6, 0.6)
M_CARPET = tex_mat("corridor_carpet", "dirty_carpet", 1.4, (0.55, 0.42, 0.36), 1.0, 0.6)
M_WOODCAB = tex_mat("kitchen_wood", "kitchen_wood", 0.8, (0.85, 0.8, 0.75), 1.0, 0.3)
M_LINEN = tex_mat("linen", "rough_linen", 0.5, (0.55, 0.58, 0.62), 1.0, 0.5)
M_CEIL = mat("ceiling", (0.82, 0.82, 0.8), 0.9)
M_DOOR = mat("door_paint", (0.17, 0.16, 0.15), 0.45, noise=0.02)
M_DOOR_IN = mat("door_interior", (0.78, 0.76, 0.72), 0.5, noise=0.01)
M_FRAME = mat("frame_white", (0.8, 0.79, 0.76), 0.4)
M_STEEL = mat("brushed_steel", (0.6, 0.6, 0.62), 0.3, 1.0)
M_BRASS = mat("brass", (0.7, 0.52, 0.25), 0.3, 1.0)
M_BLACK = mat("black_plastic", (0.015, 0.015, 0.017), 0.35)
M_COUNTER = mat("countertop", (0.75, 0.74, 0.72), 0.25, noise=0.01)
M_WHITE = mat("appliance_white", (0.82, 0.83, 0.84), 0.3)
M_CERAMIC = mat("ceramic", (0.9, 0.9, 0.9), 0.12, coat=0.5)
M_GLASS = mat("glass", (0.8, 0.85, 0.9), 0.02, transmission=1.0)
M_TABLE = mat("table_wood", (0.32, 0.2, 0.12), 0.45, noise=0.05)
M_FABRIC_DARK = mat("fabric_dark", (0.06, 0.065, 0.075), 0.95, noise=0.2)
M_SKIRT = mat("skirting", (0.75, 0.74, 0.7), 0.4)
M_LAMPSHADE = mat("lampshade", (0.85, 0.78, 0.65), 0.8, emit=(1.0, 0.75, 0.45), emit_s=0.6)
M_CURTAIN = mat("blanket", (0.12, 0.1, 0.13), 0.95, noise=0.4)

# window glass with rain droplets (bump) — slightly reflective
M_RAINGLASS = bpy.data.materials.new("rain_glass"); M_RAINGLASS.use_nodes = True
nt = M_RAINGLASS.node_tree; bb = nt.nodes["Principled BSDF"]
bb.inputs["Base Color"].default_value = (0.85, 0.9, 0.95, 1); bb.inputs["Roughness"].default_value = 0.03
bb.inputs["Transmission Weight"].default_value = 1.0
vo = nt.nodes.new("ShaderNodeTexVoronoi"); vo.inputs["Scale"].default_value = 90; vo.feature = "DISTANCE_TO_EDGE" if False else "F1"
mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 0.25
mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = 0.0
nt.links.new(vo.outputs["Distance"], mr.inputs["Value"])
bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.6
nt.links.new(mr.outputs["Result"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], bb.inputs["Normal"])


# ------------------------------------------------------------------ geometry helpers
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


FONT = None
for fp in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
    if os.path.exists(fp):
        FONT = bpy.data.fonts.load(fp); break

# ------------------------------------------------------------------ STRUCTURE
T_EXT, T_IN = 0.25, 0.12
DOOR_H = 2.1
st = COLS["STRUCTURE"]
# floors
box("floor_apartment", 0, 0, -0.05, 7.4, 8.6, 0, M_FLOOR, st)
box("floor_bath", 1.4, 0, -0.049, 3.6, 4.2, 0.002, M_TILE, st)
box("ceiling", -0.2, -0.2, H, 7.6, 8.8, H + 0.05, M_CEIL, st)
# exterior walls (south wall = corridor wall)
wall_x("wall_south", -T_EXT / 2, -0.2, 7.6, T_EXT, [(0.25, 1.15, 0, DOOR_H)], M_WALL, st)
wall_x("wall_north", 8.6 + T_EXT / 2, -0.2, 7.6, T_EXT, [(1.0, 2.2, 1.0, 2.2), (3.8, 5.2, 0.85, 2.3), (5.8, 7.0, 0.85, 2.3)], M_WALL, st)
wall_y("wall_west", -T_EXT / 2, -0.2, 8.8, T_EXT, [], M_WALL, st)
wall_y("wall_east", 7.4 + T_EXT / 2, -0.2, 8.8, T_EXT, [(2.4, 3.6, 0.9, 2.3)], M_WALL, st)
# interior
wall_y("wall_hall_bath", 1.4, 0, 4.2, T_IN, [(2.9, 3.7, 0, DOOR_H)], M_WALL, st)
wall_y("wall_bath_bed", 3.6, 0, 4.2, T_IN, [], M_WALL, st)
wall_x("wall_living_south", 4.2, 1.4, 7.4, T_IN, [(4.2, 5.0, 0, DOOR_H)], M_WALL, st)
box("arch_hall", 0, 4.2 - T_IN / 2, 2.25, 1.4, 4.2 + T_IN / 2, H, M_WALL, st)   # header over the open hall mouth
# bathroom wall tiles
for (x0, y0, x1, y1) in ((1.47, 0.01, 3.54, 0.03), (1.46, 0.0, 1.48, 4.13), (3.52, 0.0, 3.54, 4.13), (1.47, 4.12, 3.54, 4.14)):
    box("bath_tiles", x0, y0, 0, x1, y1, 2.0, M_TILE, st)
# skirting boards
for (x0, y0, x1, y1) in ((0, 0.0, 1.4, 0.015), (0, 0, 0.015, 8.6), (3.0, 8.585, 7.4, 8.6), (7.385, 4.2, 7.4, 8.6), (3.66, 0, 7.4, 0.015)):
    box("skirting", x0, y0, 0, x1, y1, 0.08, M_SKIRT, st)


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
CUR[0] = COLS["HALL"]
hc = COLS["HALL"]
door_frame("frame_6A", 0.25, 1.15, -T_EXT / 2, T_EXT, hc)
# front door: hinge at x=0.25 (west), closed = leaf along +X, swings inward (north, yaw +)
FD = door_leaf("DOOR_6A", (0.25, -0.05, 0), 0.9, 0, M_DOOR, hc, 0.05, plate="6A")
# deadbolt + chain + peephole on the inside face
db = cyl("deadbolt_6A", 0, 0, 0, 0.02, 0.022, M_STEEL, hc); db.rotation_euler = (math.radians(90), 0, 0); db.location = (0.83, 0.04, 1.32); db.parent = FD
ph = cyl("peephole_6A", 0, 0, 0, 0.06, 0.009, M_BRASS, hc); ph.rotation_euler = (math.radians(90), 0, 0); ph.location = (0.45, 0.0, 1.55); ph.parent = FD
for i in range(9):   # door chain links hanging
    lk = bpy.data.objects.new("chain_link", None)
    ring = cyl(f"chain_{i}", 0, 0, 0, 0.003, 0.007, M_STEEL, hc, 8)
    ring.location = (0.86 + 0.0, 0.035, 1.45 - i * 0.012); ring.rotation_euler = (0, math.radians(90 * (i % 2)), 0); ring.parent = FD
box("chain_track", 0.95, 0.0, 1.43, 1.12, 0.02, 1.46, M_STEEL, hc)
# coat hooks + small console in the hall
box("hall_console", 1.02, 1.2, 0.0, 1.34, 2.2, 0.82, M_TABLE, hc, 0.01)
for i in range(3):
    cyl(f"hook_{i}", 0.0, 0.0, 0, 0.06, 0.012, M_BRASS, hc).location = (0.03, 0.6 + i * 0.22, 1.72)
box("hall_mat", 0.3, 0.12, 0.0, 1.1, 0.72, 0.012, M_FABRIC_DARK, hc)
# ceiling light fitting in the hall
cyl("hall_ceiling_fitting", 0.7, 2.2, H - 0.06, H, 0.16, M_LAMPSHADE, hc)

# ------------------------------------------------------------------ BATH
CUR[0] = COLS["BATH"]
bc = COLS["BATH"]
door_frame("frame_bath", 2.9, 3.7, 1.4, T_IN, bc, axis="y")
BD = door_leaf("DOOR_BATH", (1.4, 2.9, 0), 0.8, 15, M_DOOR_IN, bc, 0.04)
box("bathtub", 1.48, 0.05, 0, 3.5, 0.8, 0.55, M_CERAMIC, bc, 0.03)
box("toilet_base", 3.1, 1.6, 0, 3.5, 2.0, 0.42, M_CERAMIC, bc, 0.04)
box("toilet_tank", 3.36, 1.62, 0.42, 3.52, 1.98, 0.8, M_CERAMIC, bc, 0.02)
box("bath_sink", 1.5, 3.85, 0.78, 2.1, 4.12, 0.88, M_CERAMIC, bc, 0.02)
box("bath_mirror", 1.55, 4.1, 1.2, 2.05, 4.115, 1.9, mat("mirror", (0.9, 0.9, 0.9), 0.02, 1.0), bc)
cyl("bath_light", 2.5, 2.1, H - 0.05, H, 0.14, M_LAMPSHADE, bc)

# ------------------------------------------------------------------ KITCHEN
CUR[0] = COLS["KITCHEN"]
kc = COLS["KITCHEN"]
# base cabinets west wall (y 5.4-8.6) and north wall (x 0-2.6)
box("cab_west", 0.0, 5.4, 0.1, 0.6, 8.0, 0.88, M_WOODCAB, kc, 0.005)
box("cab_end", 0.0, 5.38, 0.0, 0.62, 5.4, 0.92, M_WOODCAB, kc)
box("cab_north", 0.6, 8.0, 0.1, 2.6, 8.6, 0.88, M_WOODCAB, kc, 0.005)
box("plinth", 0.0, 5.4, 0.0, 0.58, 8.6, 0.1, M_BLACK, kc)
box("plinth2", 0.6, 8.02, 0.0, 2.6, 8.6, 0.1, M_BLACK, kc)
box("counter_west", 0.0, 5.38, 0.88, 0.64, 8.6, 0.92, M_COUNTER, kc, 0.004)
box("counter_north", 0.6, 7.96, 0.88, 2.62, 8.6, 0.92, M_COUNTER, kc, 0.004)
for y0 in (5.4, 6.05, 6.7, 7.35):     # door gaps + handles
    box("cab_gap", 0.6, y0, 0.12, 0.605, y0 + 0.005, 0.86, M_BLACK, kc)
    box("cab_handle", 0.605, y0 + 0.28, 0.72, 0.625, y0 + 0.4, 0.735, M_STEEL, kc)
for x0 in (0.6, 1.25, 1.9):
    box("cab_handle_n", x0 + 0.26, 7.98, 0.72, x0 + 0.4, 7.995, 0.735, M_STEEL, kc)
# upper cabinets + backsplash
box("upper_west", 0.0, 5.6, 1.5, 0.36, 7.9, 2.25, M_WOODCAB, kc, 0.005)
box("backsplash_w", 0.0, 5.38, 0.92, 0.012, 8.6, 1.5, M_TILE, kc)
box("backsplash_n", 0.0, 8.588, 0.92, 2.62, 8.6, 1.0, M_TILE, kc)
# sink under the kitchen window (north wall x 1.0-2.2)
box("sink_basin", 1.25, 8.12, 0.78, 1.95, 8.5, 0.921, M_STEEL, kc)
tap = cyl("tap", 1.6, 8.52, 0.92, 1.2, 0.012, M_STEEL, kc)
box("tap_spout", 1.59, 8.36, 1.17, 1.61, 8.53, 1.2, M_STEEL, kc)
# hob + oven on west run
box("hob", 0.06, 6.3, 0.921, 0.58, 6.9, 0.93, M_BLACK, kc)
for (yy, xx) in ((6.45, 0.2), (6.75, 0.2), (6.45, 0.45), (6.75, 0.45)):
    cyl("hob_ring", xx, yy, 0.93, 0.932, 0.08, mat("hob_ring", (0.08, 0.08, 0.08), 0.3), kc)
box("oven_door", 0.6, 6.3, 0.15, 0.61, 6.9, 0.8, M_BLACK, kc)
box("hood", 0.0, 6.3, 1.65, 0.45, 6.9, 1.85, M_STEEL, kc)
# fridge at the east end of the north counter run (x 2.64-3.34)
box("fridge", 2.64, 7.92, 0.0, 3.34, 8.6, 1.86, M_WHITE, kc, 0.01)
box("fridge_line", 2.64, 7.915, 1.18, 3.34, 7.92, 1.19, M_BLACK, kc)
box("fridge_handle", 2.7, 7.89, 1.25, 2.73, 7.915, 1.6, M_STEEL, kc)
box("fridge_handle2", 2.7, 7.89, 0.75, 2.73, 7.915, 1.1, M_STEEL, kc)
# kettle, chopping board, bowl
cyl("kettle", 0.3, 7.6, 0.92, 1.13, 0.08, M_STEEL, kc)
box("chopping_board", 0.08, 7.9, 0.92, 0.42, 8.4, 0.94, M_TABLE, kc, 0.005)
cyl("fruit_bowl", 2.2, 8.3, 0.92, 0.98, 0.12, M_CERAMIC, kc)
# kitchen table + 2 chairs
box("table_top", 1.45, 5.85, 0.72, 2.45, 6.75, 0.76, M_TABLE, kc, 0.006)
for (xx, yy) in ((1.5, 5.9), (2.4, 5.9), (1.5, 6.7), (2.4, 6.7)):
    box("table_leg", xx - 0.025, yy - 0.025, 0, xx + 0.025, yy + 0.025, 0.72, M_TABLE, kc)
import_gltf("dining_chair_02", (1.95, 5.45, 0), 0, 1.0, kc, "CHAIR_A")
import_gltf("dining_chair_02", (1.95, 7.15, 0), 180, 1.0, kc, "CHAIR_B")
# pendant light over the table
cyl("pendant_cord", 1.95, 6.3, 1.85, H, 0.004, M_BLACK, kc, 8)
pend = bpy.data.objects.new("PENDANT", None); link(pend, kc)
cone = bpy.ops.mesh.primitive_cone_add(radius1=0.2, radius2=0.04, depth=0.2, location=(1.95, 6.3, 1.78), end_fill_type="NOTHING")
pc_ = bpy.context.object; pc_.name = "pendant_shade"; link(pc_, kc); pc_.data.materials.append(M_BLACK)
so = pc_.modifiers.new("s", "SOLIDIFY"); so.thickness = 0.004

# ------------------------------------------------------------------ LIVING
CUR[0] = COLS["LIVING"]
lc = COLS["LIVING"]
import_gltf("sofa_02", (4.3, 6.4, 0), 90, 1.0, lc, "SOFA")
import_gltf("coffee_table_round_01", (5.8, 6.4, 0), 0, 1.0, lc, "COFFEE_TABLE")
box("tv_stand", 7.0, 5.6, 0.0, 7.4, 7.2, 0.45, M_TABLE, lc, 0.008)
import_gltf("television_02", (7.15, 6.4, 0.45), 90, 1.0, lc, "TV")
import_gltf("potted_plant_02", (7.05, 8.2, 0), 0, 1.0, lc, "PLANT")
import_gltf("side_table_01", (4.25, 7.65, 0), 0, 1.0, lc, "SIDE_TABLE")
import_gltf("throw_pillows_01", (4.15, 6.8, 0.45), 90, 1.0, lc, "PILLOWS")
import_gltf("modern_ceiling_lamp_01", (5.4, 6.4, H - 0.96), 0, 1.0, lc, "CEILING_LAMP")
box("rug", 5.0, 5.4, 0.0, 6.7, 7.4, 0.01, M_FABRIC_DARK, lc)
# floor lamp beside the sofa (the only light on at 3 a.m.)
cyl("floorlamp_base", 4.3, 7.75, 0.0, 0.03, 0.14, M_BLACK, lc)
cyl("floorlamp_pole", 4.3, 7.75, 0.03, 1.45, 0.012, M_BLACK, lc, 12)
bpy.ops.mesh.primitive_cone_add(radius1=0.22, radius2=0.15, depth=0.3, location=(4.3, 7.75, 1.52), end_fill_type="NOTHING")
sh = bpy.context.object; sh.name = "floorlamp_shade"; link(sh, lc); sh.data.materials.append(M_LAMPSHADE)
sh.modifiers.new("s", "SOLIDIFY").thickness = 0.004
# bookshelf on the living room south wall + picture
box("shelf_back", 5.4, 4.27, 0.0, 6.9, 4.29, 1.9, M_TABLE, lc)
box("shelf_side_w", 5.4, 4.27, 0.0, 5.42, 4.62, 1.9, M_TABLE, lc)
box("shelf_side_e", 6.88, 4.27, 0.0, 6.9, 4.62, 1.9, M_TABLE, lc)
box("shelf_top", 5.4, 4.27, 1.88, 6.9, 4.62, 1.9, M_TABLE, lc)
for i in range(4):
    box("shelf_board", 5.42, 4.28, 0.35 + i * 0.42, 6.88, 4.6, 0.37 + i * 0.42, M_TABLE, lc)
    for j in range(R.randint(6, 12)):
        x = 5.48 + j * 0.11 + R.uniform(0, 0.02)
        if x > 6.8:
            break
        hb = R.uniform(0.2, 0.3)
        box("book", x, 4.32, 0.37 + i * 0.42, x + R.uniform(0.03, 0.06), 4.56, 0.37 + i * 0.42 + hb,
            mat(f"book{i}{j}", (R.uniform(0.05, 0.4), R.uniform(0.05, 0.3), R.uniform(0.05, 0.3)), 0.6), lc)
box("picture", 7.37, 5.0, 1.3, 7.39, 5.6, 1.75, M_BLACK, lc)

# WALL CLOCK (hands are separate objects, rotate about Y in local space): on the wall left of the bedroom door, facing north
CLK = bpy.data.objects.new("CLOCK", None); link(CLK, lc); CLK.location = (3.25, 4.2 + T_IN / 2 + 0.01, 1.95)
CLK.rotation_euler = (math.radians(90), 0, math.radians(180))     # local +Z faces north (-Y local after rot)
face = cyl("clock_face", 0, 0, 0.0, 0.02, 0.17, mat("clock_face", (0.92, 0.91, 0.88), 0.4), lc, 48); face.location = (0, 0, 0.01); face.parent = CLK
rim = cyl("clock_rim", 0, 0, 0.0, 0.035, 0.18, M_BLACK, lc, 48); rim.location = (0, 0, 0.0); rim.parent = CLK
face.location.z = 0.012
for i in range(12):
    a = math.radians(i * 30)
    tk = box("clock_tick", -0.004, 0.13, 0.03, 0.004, 0.155 if i % 3 else 0.16, 0.034, M_BLACK, lc)
    tk.parent = CLK; tk.rotation_euler = (0, 0, -a)
    if i % 3 == 0:
        tk.scale = (2, 1, 1)
hh = box("CLOCK_hour", -0.006, -0.015, 0.035, 0.006, 0.085, 0.039, M_BLACK, lc); hh.parent = CLK
mm = box("CLOCK_minute", -0.004, -0.02, 0.039, 0.004, 0.125, 0.042, M_BLACK, lc); mm.parent = CLK
sc = box("CLOCK_second", -0.0015, -0.03, 0.042, 0.0015, 0.135, 0.044, mat("clock_red", (0.6, 0.05, 0.04), 0.4), lc); sc.parent = CLK
cap = cyl("clock_cap", 0, 0, 0.034, 0.046, 0.008, M_BLACK, lc, 16); cap.parent = CLK; cap.location = (0, 0, 0.04)
cover = cyl("clock_glass", 0, 0, 0.046, 0.05, 0.172, M_GLASS, lc, 48); cover.parent = CLK; cover.location = (0, 0, 0.048)


def set_clock(h, m, s=0):
    bpy.data.objects["CLOCK_hour"].rotation_euler = (0, 0, -math.radians((h % 12) * 30 + m * 0.5))
    bpy.data.objects["CLOCK_minute"].rotation_euler = (0, 0, -math.radians(m * 6 + s * 0.1))
    bpy.data.objects["CLOCK_second"].rotation_euler = (0, 0, -math.radians(s * 6))


set_clock(3, 13, 0)

# ------------------------------------------------------------------ BEDROOM
CUR[0] = COLS["BEDROOM"]
brc = COLS["BEDROOM"]
door_frame("frame_bed", 4.2, 5.0, 4.2, T_IN, brc)
BRD = door_leaf("DOOR_BEDROOM", (4.2, 4.2, 0), 0.8, -100, M_DOOR_IN, brc, 0.04)       # held open into the bedroom
# WARDROBE / CLOSET on the south wall, x 4.0-5.2, depth 0.62; single hinged door, hinge on the west side
box("wardrobe_carcass_back", 4.0, 0.0, 0.0, 5.2, 0.03, 2.3, M_WOODCAB, brc)
box("wardrobe_side_w", 4.0, 0.0, 0.0, 4.03, 0.62, 2.3, M_WOODCAB, brc)
box("wardrobe_side_e", 5.17, 0.0, 0.0, 5.2, 0.62, 2.3, M_WOODCAB, brc)
box("wardrobe_top", 4.0, 0.0, 2.27, 5.2, 0.62, 2.3, M_WOODCAB, brc)
box("wardrobe_bottom", 4.0, 0.0, 0.0, 5.2, 0.62, 0.06, M_WOODCAB, brc)
box("wardrobe_interior", 4.03, 0.03, 0.06, 5.17, 0.035, 2.27, mat("wardrobe_dark", (0.05, 0.045, 0.04), 0.8), brc)
cyl("wardrobe_rail", 4.6, 0.33, 1.9, 1.92, 0.012, M_STEEL, brc).rotation_euler = (0, math.radians(90), 0)
bpy.data.objects["wardrobe_rail"].scale = (1, 1, 50)
for i in range(6):     # hanging shirts (dark shapes)
    box("hanging_cloth", 4.15 + i * 0.16, 0.12, 1.0, 4.27 + i * 0.16, 0.55, 1.88, mat(f"cloth{i}", (R.uniform(0.04, 0.2),) * 3, 0.9), brc, 0.02)
# closet door: pivot at (4.03, 0.63), closed = leaf along +X; open = rotate to +100 deg (into the room)
CL = door_leaf("CLOSET_DOOR", (4.03, 0.645, 0.0), 1.14, 0, M_WOODCAB, brc, 0.025, h=2.27, handle_out=False)
for o in bpy.data.objects:
    if o.name.startswith("CLOSET_DOOR_handle") or o.name.startswith("CLOSET_DOOR_rose") or o.name.startswith("CLOSET_DOOR_neck"):
        o.location.y = 0.02 if o.location.y > 0 else -0.02
knob = cyl("closet_knob", 0, 0, 0, 0.03, 0.015, M_STEEL, brc); knob.rotation_euler = (math.radians(90), 0, 0); knob.location = (1.06, 0.03, 1.05); knob.parent = CL
# bed (head against the south wall, x 5.55-7.15)
box("bed_frame", 5.55, 0.05, 0.0, 7.15, 2.15, 0.32, M_TABLE, brc, 0.01)
box("headboard", 5.55, 0.02, 0.0, 7.15, 0.08, 1.05, M_TABLE, brc, 0.01)
box("mattress", 5.6, 0.1, 0.32, 7.1, 2.1, 0.52, mat("mattress", (0.85, 0.85, 0.83), 0.9), brc, 0.04)
box("duvet", 5.57, 0.6, 0.5, 7.13, 2.13, 0.6, M_LINEN, brc, 0.05)
box("pillow_a", 5.7, 0.15, 0.52, 6.3, 0.55, 0.66, M_LINEN, brc, 0.05)
box("pillow_b", 6.4, 0.15, 0.52, 7.0, 0.55, 0.66, M_LINEN, brc, 0.05)
import_gltf("drawer_cabinet", (6.6, 3.88, 0), 180, 1.0, brc, "DRAWERS")
import_gltf("side_table_01", (5.25, 0.35, 0), 0, 0.8, brc, "NIGHTSTAND")
cyl("bedroom_light", 5.5, 2.1, H - 0.05, H, 0.15, M_LAMPSHADE, brc)

# ------------------------------------------------------------------ WINDOWS + exterior city
CUR[0] = COLS["WINDOWS"]
wc = COLS["WINDOWS"]
for (nm, x0, x1, z0, z1) in (("win_kitchen", 1.0, 2.2, 1.0, 2.2), ("win_living_a", 3.8, 5.2, 0.85, 2.3), ("win_living_b", 5.8, 7.0, 0.85, 2.3)):
    yy = 8.6 + T_EXT / 2
    box(nm + "_glass", x0 + 0.04, yy - 0.01, z0 + 0.04, x1 - 0.04, yy + 0.01, z1 - 0.04, M_RAINGLASS, wc)
    for (a, b, c_, d) in ((x0, yy - 0.07, z0, z0 + 0.05), (x0, yy - 0.07, z1 - 0.05, z1)):
        box(nm + "_frame", x0, yy - 0.07, c_, x1, yy + 0.05, d, M_FRAME, wc)
    box(nm + "_frame", x0, yy - 0.07, z0, x0 + 0.05, yy + 0.05, z1, M_FRAME, wc)
    box(nm + "_frame", x1 - 0.05, yy - 0.07, z0, x1, yy + 0.05, z1, M_FRAME, wc)
    box(nm + "_mullion", (x0 + x1) / 2 - 0.02, yy - 0.06, z0, (x0 + x1) / 2 + 0.02, yy + 0.04, z1, M_FRAME, wc)
    box(nm + "_sill", x0 - 0.05, yy - 0.2, z0 - 0.03, x1 + 0.05, yy - 0.05, z0, M_FRAME, wc)
# bedroom window (east)
xx = 7.4 + T_EXT / 2
box("win_bed_glass", xx - 0.01, 2.44, 0.94, xx + 0.01, 3.56, 2.26, M_RAINGLASS, wc)
box("win_bed_frame", xx - 0.07, 2.4, 0.9, xx + 0.05, 3.6, 0.95, M_FRAME, wc)
box("win_bed_frame", xx - 0.07, 2.4, 2.25, xx + 0.05, 3.6, 2.3, M_FRAME, wc)
box("win_bed_mullion", xx - 0.06, 2.98, 0.9, xx + 0.04, 3.02, 2.3, M_FRAME, wc)
# N3: windows covered with blankets/towels (separate collection, off by default)
CUR[0] = COLS["CURTAINS_N3"]
for (nm, x0, x1, z0, z1) in (("cover_kitchen", 0.95, 2.25, 0.95, 2.28), ("cover_living_a", 3.75, 5.25, 0.8, 2.36), ("cover_living_b", 5.75, 7.05, 0.8, 2.36)):
    o = box(nm, x0, 8.6 - 0.02, z0, x1, 8.6 - 0.005, z1, M_CURTAIN, COLS["CURTAINS_N3"])
box("cover_bed", 7.4 - 0.02, 2.35, 0.85, 7.4 - 0.005, 3.65, 2.35, M_CURTAIN, COLS["CURTAINS_N3"])

# exterior: night city backdrop (procedural window lights) + rain
CUR[0] = COLS["EXTERIOR"]
ex = COLS["EXTERIOR"]
city = bpy.data.materials.new("city_night"); city.use_nodes = True
nt = city.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"])
out = nt.nodes["Material Output"]
em = nt.nodes.new("ShaderNodeEmission")
tc = nt.nodes.new("ShaderNodeTexCoord")
br = nt.nodes.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 26; br.inputs["Mortar Size"].default_value = 0.35
br.inputs["Color1"].default_value = (1.0, 0.72, 0.4, 1); br.inputs["Color2"].default_value = (0.5, 0.6, 0.8, 1); br.inputs["Mortar"].default_value = (0, 0, 0, 1)
nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 9
nt.links.new(tc.outputs["Object"], ns.inputs["Vector"])
th = nt.nodes.new("ShaderNodeMapRange"); th.inputs["From Min"].default_value = 0.55; th.inputs["From Max"].default_value = 0.6
nt.links.new(ns.outputs["Fac"], th.inputs["Value"])
mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
nt.links.new(br.outputs["Color"], mul.inputs["A"])
cr = nt.nodes.new("ShaderNodeCombineColor"); nt.links.new(th.outputs["Result"], cr.inputs[0]); nt.links.new(th.outputs["Result"], cr.inputs[1]); nt.links.new(th.outputs["Result"], cr.inputs[2])
nt.links.new(cr.outputs["Color"], mul.inputs["B"])
sky = nt.nodes.new("ShaderNodeMix"); sky.data_type = "RGBA"; sky.inputs["Factor"].default_value = 0.85
sky.inputs["A"].default_value = (0.03, 0.04, 0.07, 1)
nt.links.new(mul.outputs["Result"], sky.inputs["B"])
nt.links.new(sky.outputs["Result"], em.inputs["Color"]); em.inputs["Strength"].default_value = 1.5
nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
box("city_north", -20, 40, -30, 30, 40.5, 40, city, ex)
box("city_east", 40, -20, -30, 40.5, 30, 40, city, ex)
box("city_west", -40.5, -20, -30, -40, 30, 40, city, ex)

# ------------------------------------------------------------------ CORRIDOR (6th floor)
CUR[0] = COLS["CORRIDOR"]
cc = COLS["CORRIDOR"]
y0c, y1c = -2.0, -T_EXT
box("corr_floor", -6.0, -2.15, -0.05, 12.0, -0.0, 0.0, M_CARPET, cc)
box("corr_ceiling", -6.0, -2.15, 2.5, 12.0, 0.0, 2.55, M_CEIL, cc)
wall_x("corr_wall_n", -T_EXT / 2, -6.0, -0.2, T_EXT, [], M_WALL_CORR, cc)
wall_x("corr_wall_n", -T_EXT / 2, 7.6, 12.0, T_EXT, [(8.2, 9.1, 0, DOOR_H)], M_WALL_CORR, cc)
wall_x("corr_wall_s", -2.0 - 0.1, -6.0, 12.0, 0.2, [(-3.5, -2.6, 0, DOOR_H), (3.0, 3.9, 0, DOOR_H)], M_WALL_CORR, cc)
wall_y("corr_end_w", -6.0, -2.2, 0.0, 0.2, [], M_WALL_CORR, cc)
wall_y("corr_end_e", 12.0, -2.2, 0.0, 0.2, [], M_WALL_CORR, cc)
# the corridor face of our wall gets the corridor paint (thin skin)
box("corr_skin_6A_w", -0.2, -T_EXT - 0.002, 0, 0.25, -T_EXT, 2.5, M_WALL_CORR, cc)
box("corr_skin_6A_e", 1.15, -T_EXT - 0.002, 0, 7.6, -T_EXT, 2.5, M_WALL_CORR, cc)
box("corr_skin_6A_top", 0.25, -T_EXT - 0.002, DOOR_H, 1.15, -T_EXT, 2.5, M_WALL_CORR, cc)
# skirting + dado rail
for (xa, xb, yy) in ((-6, 12, -0.255), (-6, 12, -1.995)):
    box("corr_skirt", xa, yy - 0.012, 0, xb, yy + 0.012, 0.1, mat("corr_skirt", (0.2, 0.18, 0.16), 0.5), cc)
    box("corr_rail", xa, yy - 0.015, 0.95, xb, yy + 0.015, 0.99, mat("corr_rail", (0.3, 0.26, 0.2), 0.5), cc)
# neighbour doors (same model as ours, seen from the corridor)
door_frame("frame_6B", 8.2, 9.1, -T_EXT / 2, T_EXT, cc)
door_leaf("DOOR_6B", (8.2, -0.05, 0), 0.9, 0, M_DOOR, cc, 0.05, plate="6B")
for (nm, xa) in (("6C", 3.0), ("6D", -3.5)):
    door_frame("frame_" + nm, xa, xa + 0.9, -2.1, 0.2, cc)
    d = door_leaf("DOOR_" + nm, (xa + 0.9, -2.0 + 0.0, 0), 0.9, 180, M_DOOR, cc, 0.05, plate=nm)
# fix: plates on 6C/6D face north (they were built facing -Y of a rotated pivot, which is +Y world) — fine.
# doorbell camera unit beside 6A (corridor side, east of the door)
DB = box("DOORBELL_CAM", 1.31, -T_EXT - 0.035, 1.22, 1.39, -T_EXT, 1.42, M_BLACK, cc, 0.01)
lens = cyl("doorbell_lens", 0, 0, 0, 0.01, 0.014, mat("lens", (0.0, 0.0, 0.0), 0.02, coat=1.0), cc, 24)
lens.rotation_euler = (math.radians(90), 0, 0); lens.location = (1.35, -T_EXT - 0.038, 1.37)
ring_ = cyl("doorbell_button", 0, 0, 0, 0.006, 0.016, mat("doorbell_ring", (0.2, 0.5, 1.0), 0.3, emit=(0.3, 0.6, 1.0), emit_s=4.0), cc, 24)
ring_.rotation_euler = (math.radians(90), 0, 0); ring_.location = (1.35, -T_EXT - 0.037, 1.27)
cam_db = bpy.data.cameras.new("DOORBELL"); cam_db.type = "PANO"
try:
    cam_db.panorama_type = "FISHEYE_EQUISOLID"; cam_db.fisheye_fov = math.radians(160); cam_db.fisheye_lens = 4.0
except Exception:
    pass
cam_db.lens = 9
DBC = bpy.data.objects.new("CAM_DOORBELL", cam_db); link(DBC, cc)
DBC.location = (1.35, -T_EXT - 0.05, 1.37); DBC.rotation_euler = (math.radians(84), 0, math.radians(180 + 12))
# corridor ceiling light boxes (fluorescent panels)
for i, xl in enumerate((-4.0, -1.0, 2.0, 5.0, 8.0, 11.0)):
    box(f"corr_panel_{i}", xl - 0.5, -1.3, 2.47, xl + 0.5, -0.95, 2.5, mat(f"corr_panel_m{i}", (0.9, 0.95, 0.85), 0.3, emit=(0.85, 1.0, 0.8), emit_s=3.0), cc)
# exit sign + stair door at west end
box("stair_door", -5.99, -1.6, 0, -5.95, -0.6, DOOR_H, mat("stair_door", (0.35, 0.05, 0.04), 0.5), cc)
box("exit_sign", -5.98, -1.35, 2.2, -5.95, -0.85, 2.38, mat("exit", (0.1, 0.8, 0.2), 0.4, emit=(0.1, 1.0, 0.25), emit_s=6.0), cc)

# ------------------------------------------------------------------ LIGHTS
CUR[0] = COLS["LIGHTS_NIGHT"]
ln = COLS["LIGHTS_NIGHT"]
point_light("L_floorlamp", (4.3, 7.75, 1.45), 14, (1.0, 0.72, 0.45), 0.12, ln)
_sp = bpy.data.lights.new("L_floorlamp_down", "SPOT"); _sp.energy = 70; _sp.color = (1.0, 0.72, 0.45); _sp.spot_size = math.radians(130); _sp.spot_blend = 0.8; _sp.shadow_soft_size = 0.12
_spo = bpy.data.objects.new("L_floorlamp_down", _sp); link(_spo, ln); _spo.location = (4.3, 7.75, 1.42)
area_light("L_window_living", (5.4, 8.45, 1.6), 2.4, 70, (0.5, 0.62, 0.95), (math.radians(90), 0, 0), ln, sy=1.4)
area_light("L_window_kitchen", (1.6, 8.45, 1.6), 1.2, 32, (0.5, 0.62, 0.95), (math.radians(90), 0, 0), ln)
area_light("L_window_bed", (7.25, 3.0, 1.6), 1.2, 22, (0.5, 0.6, 0.9), (math.radians(90), 0, math.radians(90)), ln)
area_light("L_hall_fill", (0.7, 2.6, 2.5), 1.0, 5, (0.55, 0.62, 0.8), (0, 0, 0), ln, sy=3.0)
area_light("L_undercab", (0.25, 6.7, 1.45), 0.2, 6, (1.0, 0.8, 0.55), (0, 0, 0), ln, sy=2.0)
CUR[0] = COLS["LIGHTS_ALLON"]
la = COLS["LIGHTS_ALLON"]
for (nm, x, y, e, sz) in (("L_on_hall", 0.7, 2.2, 90, 0.6), ("L_on_kitchen", 1.6, 6.5, 220, 1.2), ("L_on_living", 5.3, 6.4, 260, 1.4),
                          ("L_on_bed", 5.5, 2.1, 160, 1.0), ("L_on_bath", 2.5, 2.1, 110, 0.8)):
    area_light(nm, (x, y, H - 0.08), sz, e, (1.0, 0.92, 0.8), (0, 0, 0), la)
CUR[0] = COLS["LIGHTS_CORRIDOR"]
for i, xl in enumerate((-4.0, -1.0, 2.0, 5.0, 8.0, 11.0)):
    area_light(f"L_corr_{i}", (xl, -1.12, 2.44), 1.0, 70, (0.85, 1.0, 0.82), (0, 0, 0), COLS["LIGHTS_CORRIDOR"], sy=0.35)

# world: very dark blue night
w = bpy.data.worlds.new("night"); S.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.010, 0.013, 0.022, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 1.0

S.render.engine = "BLENDER_EEVEE_NEXT"
S.eevee.use_shadows = True
try:
    S.eevee.use_raytracing = True
except Exception:
    pass
S.view_settings.view_transform = "AgX"
S.view_settings.look = "AgX - Medium High Contrast"
S.render.resolution_x, S.render.resolution_y = 1080, 1920
S.render.fps = 30
S["floorplan"] = __doc__
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "apartment.blend"))
print("SAVED apartment.blend")
