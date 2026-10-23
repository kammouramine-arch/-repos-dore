"""THE LAST BUS HOME — Blender set builder (Blender 4.2 LTS, Cycles).

Builds every recurring location procedurally so the geometry is identical in all three nights:
  BUS (interior + exterior shell), STATION platform, STREET / bus stop by his apartment,
  APARTMENT kitchen + living room, BATHROOM. Saves sets.blend and renders named camera plates.

Units: metres. Bus axis: +X = front of the bus, +Y = left side (driver side), Z up, floor at z = 0.
Characters are NOT modelled here: they are 2D rig characters composited over these plates.

Usage:  blender -b --python build_sets.py -- [plate names ...|all] [--res 1440x2560] [--samples 96]
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("LB_OUT", os.path.join(HERE, "plates"))
os.makedirs(OUT, exist_ok=True)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RES = (1440, 2560)
SAMPLES = 96
want = []
i = 0
while i < len(argv):
    if argv[i] == "--res":
        w, h = argv[i + 1].split("x"); RES = (int(w), int(h)); i += 2; continue
    if argv[i] == "--samples":
        SAMPLES = int(argv[i + 1]); i += 2; continue
    want.append(argv[i]); i += 1

# ───────────────────────────────────────────── helpers
def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def coll(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c

MATS = {}
def mat(name, color=(0.5, 0.5, 0.5), rough=0.5, metal=0.0, emit=None, strength=0.0, alpha=1.0, transmission=0.0, ior=1.45, coat=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["IOR"].default_value = ior
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    MATS[name] = m
    return m

def pattern_mat(name, base, dots, scale=60.0, rough=0.9):
    """bus-seat moquette: dark base with small coloured flecks (voronoi)."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    v = nt.nodes.new("ShaderNodeTexVoronoi"); v.inputs["Scale"].default_value = scale
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (*dots, 1)
    ramp.color_ramp.elements[1].position = 0.08; ramp.color_ramp.elements[1].color = (*base, 1)
    nt.links.new(v.outputs["Distance"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    MATS[name] = m
    return m

def stripe_mat(name, a, b_, scale=40.0, rough=0.8):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = scale; w.wave_type = 'BANDS'
    w.inputs["Distortion"].default_value = 0.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*a, 1); ramp.color_ramp.elements[1].color = (*b_, 1)
    ramp.color_ramp.elements[1].position = 0.55
    nt.links.new(w.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    MATS[name] = m
    return m

def noise_mat(name, a, b_, scale=8.0, rough=0.8, bump=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = 8
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*a, 1); ramp.color_ramp.elements[1].color = (*b_, 1)
    nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    if bump > 0:
        bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = bump
        nt.links.new(nz.outputs["Fac"], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], b.inputs["Normal"])
    MATS[name] = m
    return m

def wet_mat(name, base, rough_lo=0.05, rough_hi=0.5, scale=3.0):
    """wet asphalt / platform: patchy roughness so lights make streaky reflections."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = 6
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = rough_lo; mr.inputs["To Max"].default_value = rough_hi
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    b.inputs["Base Color"].default_value = (*base, 1)
    MATS[name] = m
    return m

def box(name, loc, size, m, c=None, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        bv = o.modifiers.new("bev", "BEVEL"); bv.width = bevel; bv.segments = 3
    o.data.materials.append(m)
    if c: move(o, c)
    return o

def cyl(name, loc, r, depth, m, c=None, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    if c: move(o, c)
    return o

def move(o, c):
    for cc in o.users_collection: cc.objects.unlink(o)
    c.objects.link(o)

def area_light(name, loc, size, energy, color=(1, 1, 1), rot=(0, 0, 0), c=None, shape='RECTANGLE', size_y=None):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    o.data.shape = shape; o.data.size = size; o.data.size_y = size_y or size
    o.data.energy = energy; o.data.color = color
    if c: move(o, c)
    return o

def point_light(name, loc, energy, color=(1, 1, 1), radius=0.1, c=None):
    bpy.ops.object.light_add(type='POINT', location=loc)
    o = bpy.context.object; o.name = name; o.data.energy = energy; o.data.color = color; o.data.shadow_soft_size = radius
    if c: move(o, c)
    return o

def spot(name, loc, rot, energy, color=(1, 1, 1), angle=60, blend=0.6, c=None, radius=0.1):
    bpy.ops.object.light_add(type='SPOT', location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.energy = energy; o.data.color = color
    o.data.spot_size = math.radians(angle); o.data.spot_blend = blend; o.data.shadow_soft_size = radius
    if c: move(o, c)
    return o

def camera(name, loc, look_at, lens=24.0, c=None, roll=0.0):
    bpy.ops.object.camera_add(location=loc)
    o = bpy.context.object; o.name = name
    d = Vector(look_at) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    o.rotation_euler.rotate_axis('Z', math.radians(roll))
    o.data.lens = lens; o.data.sensor_width = 36
    o.data.clip_start = 0.05; o.data.clip_end = 400
    if c: move(o, c)
    return o

def seven_seg(name, text, origin, digit_h, m, c, axis=('-Y', 'Z')):
    """Red 7-segment clock face — the recurring 2:16 clock. Built from bars so it never changes font."""
    segs = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg"}
    w = digit_h * 0.55; t = digit_h * 0.11
    x0, y0, z0 = origin
    cursor = 0.0
    parts = []
    for ch in text:
        if ch == ":":
            for dz in (digit_h * 0.28, -digit_h * 0.28):
                parts.append(box(f"{name}_colon", (x0, y0 - cursor - t, z0 + dz), (0.004, t, t), m, c))
            cursor += t * 3; continue
        if ch == " ":
            cursor += w * 0.6; continue
        on = segs.get(ch, "")
        cx = cursor + w / 2
        defs = {
            "a": (cx, digit_h / 2, w, t), "g": (cx, 0, w, t), "d": (cx, -digit_h / 2, w, t),
            "f": (cursor, digit_h / 4, t, digit_h / 2), "b": (cursor + w, digit_h / 4, t, digit_h / 2),
            "e": (cursor, -digit_h / 4, t, digit_h / 2), "c": (cursor + w, -digit_h / 4, t, digit_h / 2),
        }
        for s in on:
            px, pz, sw, sh = defs[s]
            parts.append(box(f"{name}_{s}", (x0, y0 - px, z0 + pz), (0.004, sw, sh), m, c))
        cursor += w + t * 3
    return parts

def text_obj(name, body, loc, rot, size, m, c, align='CENTER', extrude=0.0):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    o.data.body = body; o.data.size = size; o.data.align_x = align; o.data.extrude = extrude
    o.data.materials.append(m)
    move(o, c)
    return o

# ───────────────────────────────────────────── world / render
def setup_render(scene):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.max_bounces = 4; scene.cycles.glossy_bounces = 2; scene.cycles.transmission_bounces = 4; scene.cycles.diffuse_bounces = 2
    scene.cycles.adaptive_threshold = 0.03; scene.render.use_persistent_data = True
    scene.cycles.caustics_reflective = False; scene.cycles.caustics_refractive = False
    scene.cycles.sample_clamp_indirect = 6.0
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_depth = '8'

def world(scene, color=(0.004, 0.006, 0.014), strength=1.0):
    w = bpy.data.worlds.new("World"); scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (*color, 1); bg.inputs["Strength"].default_value = strength

# ───────────────────────────────────────────── palette
NAVY = (0.010, 0.014, 0.030)
M = {}
# ───────────────────────────────────────────── palette / materials
M = {}
def materials():
    M["floor"] = stripe_mat("bus_floor", (0.03, 0.032, 0.036), (0.045, 0.048, 0.054), 70, 0.6)
    M["panel"] = mat("bus_panel", (0.13, 0.145, 0.17), 0.45)
    M["panel_dark"] = mat("bus_panel_dark", (0.035, 0.04, 0.05), 0.5)
    M["ceiling"] = mat("bus_ceiling", (0.16, 0.17, 0.19), 0.6)
    M["seat"] = pattern_mat("bus_seat", (0.02, 0.026, 0.06), (0.25, 0.09, 0.32), 70)
    M["seat_frame"] = mat("bus_seat_frame", (0.09, 0.1, 0.115), 0.35, 0.6)
    M["pole"] = mat("bus_pole", (0.62, 0.48, 0.08), 0.3, 0.7)
    M["cord"] = mat("bus_cord", (0.9, 0.68, 0.04), 0.5, 0.0, emit=(0.9, 0.62, 0.04), strength=0.25)
    M["glass"] = mat("bus_glass", (0.85, 0.9, 0.95), 0.02, 0.0, transmission=1.0, ior=1.52)
    M["frame"] = mat("bus_window_frame", (0.04, 0.04, 0.05), 0.4, 0.3)
    M["tube"] = mat("bus_light", (0.9, 0.95, 1.0), 0.4, emit=(0.70, 0.88, 1.0), strength=5.0)
    M["tube_dim"] = mat("bus_light_dim", (0.9, 0.95, 1.0), 0.4, emit=(0.70, 0.88, 1.0), strength=1.0)
    M["tube_red"] = mat("bus_light_red", (0.3, 0.02, 0.02), 0.4, emit=(1.0, 0.06, 0.04), strength=0.3)
    M["red_led"] = mat("clock_led", (0.3, 0.0, 0.0), 0.4, emit=(1.0, 0.06, 0.03), strength=30.0)
    M["led_off"] = mat("clock_led_off", (0.05, 0.0, 0.0), 0.4, emit=(0.25, 0.01, 0.0), strength=0.4)
    M["amber_led"] = mat("amber_led", (0.3, 0.15, 0.0), 0.4, emit=(1.0, 0.45, 0.05), strength=18.0)
    M["black"] = mat("matte_black", (0.01, 0.01, 0.012), 0.6)
    M["dash"] = mat("dashboard", (0.03, 0.035, 0.04), 0.5)
    M["rubber"] = mat("rubber", (0.015, 0.015, 0.017), 0.8)
    M["void"] = mat("outside_void", (0.0, 0.0, 0.0), 1.0, emit=(0.004, 0.006, 0.014), strength=1.0)
    M["exterior"] = noise_mat("night_city", (0.002, 0.003, 0.008), (0.008, 0.01, 0.024), 2.0, 1.0)
    M["mask_white"] = mat("MASK_WHITE", (0, 0, 0), 1.0, emit=(1, 1, 1), strength=1.0)
    M["mask_black"] = mat("MASK_BLACK", (0, 0, 0), 1.0)
    for k in ("mask_black", "mask_white"):
        M[k].node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.0
    M["seat_metal"] = noise_mat("seat_metal", (0.07, 0.075, 0.08), (0.16, 0.165, 0.17), 3.0, 0.4, 0.05)
    M["seat_metal"].node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.75
    M["mirror"] = mat("mirror", (0.9, 0.92, 0.95), 0.03, 1.0)

WORLDS = {}
def mkworld(name, color, strength=1.0):
    w = bpy.data.worlds.new(name); w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (*color, 1); bg.inputs["Strength"].default_value = strength
    WORLDS[name] = w
    return w

def empty(name, loc, c, parent=None):
    o = bpy.data.objects.new(name, None); o.location = loc
    c.objects.link(o)
    if parent: o.parent = parent
    return o

def parent_keep(child, parent):
    """parent without moving: child keeps its world location (parents are unrotated when built)."""
    child.parent = parent
    child.location = child.location - parent.location

# ───────────────────────────────────────────── THE BUS — one model used by every shot
# Local coordinates: +X = front, +Y = driver (left) side, -Y = door (kerb) side, floor at z = 0.
BUS = dict(x0=-5.6, x1=5.6, w=2.5, h=2.25, win_lo=0.88, win_hi=1.86, door_mid=(0.55, 1.75), door_front=(4.35, 5.45))
SEAT_ROWS_L = [-4.5, -3.65, -2.8, -1.95, -1.1, -0.25, 0.6, 1.45, 2.3, 3.15]
SEAT_ROWS_R = [-4.5, -3.65, -2.8, -1.95, -1.1, -0.25, 2.3, 3.15]   # gap at the middle door
HIS_ROW = -1.95                                                     # his seat: kerb side, 4th row, window
WALL_GAP, PAIR_W, CUSH_TOP = 0.08, 0.86, 0.45
def seat_y(side, which):
    """centre y of the window / aisle seat of a pair."""
    s = -1 if side == "R" else 1
    out = s * (BUS["w"] / 2 - WALL_GAP)
    return out - s * PAIR_W * (0.25 if which == "window" else 0.75)

def seat_pair(c, x, side):
    s = -1 if side == "R" else 1
    y_out = s * (BUS["w"] / 2 - WALL_GAP); y_in = y_out - s * PAIR_W
    yc = (y_out + y_in) / 2
    tag = f"{side}{x:+.2f}"
    box(f"seat_cush_{tag}", (x, yc, CUSH_TOP - 0.05), (0.46, PAIR_W, 0.11), M["seat"], c, bevel=0.035)
    box(f"seat_back_{tag}", (x - 0.25, yc, CUSH_TOP + 0.33), (0.09, PAIR_W, 0.62), M["seat"], c, bevel=0.035, rot=(0, math.radians(-8), 0))
    box(f"seat_shell_{tag}", (x - 0.31, yc, CUSH_TOP + 0.31), (0.03, PAIR_W + 0.02, 0.66), M["seat_frame"], c, bevel=0.01, rot=(0, math.radians(-8), 0))
    box(f"seat_base_{tag}", (x, yc, (CUSH_TOP - 0.1) / 2), (0.3, PAIR_W - 0.06, CUSH_TOP - 0.1), M["seat_metal"], c, bevel=0.01)
    cyl(f"seat_rail_{tag}", (x - 0.27, yc, CUSH_TOP + 0.67), 0.016, PAIR_W - 0.04, M["seat_frame"], c, rot=(math.radians(90), 0, 0))

def door_leaves(c, prefix, x0, x1):
    """two glass leaves that fold inward about hinges at the door edges; returns the hinge empties."""
    W = BUS["w"]; piv = []
    lw = (x1 - x0) / 2
    for k, hx in enumerate((x0, x1)):
        p = empty(f"{prefix}_hinge{k}", (hx, -W / 2 - 0.02, 0.0), c)
        d = 1 if k == 0 else -1
        parts = [box(f"{prefix}_glass{k}", (hx + d * lw / 2, -W / 2 - 0.02, 1.0), (lw - 0.04, 0.02, 1.84), M["glass"], c)]
        for (dx, dz, sx, sz) in ((lw / 2, 1.0, lw, 0.06), (lw / 2, 0.08, lw, 0.16), (lw / 2, 1.92, lw, 0.06), (0.02, 1.0, 0.05, 1.9), (lw - 0.02, 1.0, 0.05, 1.9), (lw / 2, 1.05, lw - 0.1, 0.03)):
            parts.append(box(f"{prefix}_fr{k}_{dx:.2f}{dz:.2f}", (hx + d * dx, -W / 2 - 0.035, dz), (sx, 0.025, sz), M["frame"], c))
        for o in parts: parent_keep(o, p)
        piv.append(p)
    return piv

def set_doors(mid=0.0, front=0.0, frame=None):
    """open fraction 0..1 → leaves rotate 0..85° inward. Optionally keyframe at `frame`."""
    for pre, k_open in (("door_mid", mid), ("door_front", front)):
        for k in (0, 1):
            p = bpy.data.objects.get(f"{pre}_hinge{k}")
            if not p: continue
            a = math.radians(85 * k_open) * (1 if k == 0 else -1)
            p.rotation_euler = (0, 0, a)
            if frame is not None: p.keyframe_insert("rotation_euler", frame=frame)

def build_bus_interior():
    c = coll("BUS_INTERIOR")
    L, W, H = BUS["x1"] - BUS["x0"], BUS["w"], BUS["h"]
    box("floor", (0, 0, -0.02), (L, W, 0.04), M["floor"], c)
    box("ceiling", (0, 0, H + 0.02), (L, W, 0.04), M["ceiling"], c)
    for side, y in (("L", W / 2), ("R", -W / 2)):
        s = 1 if side == "L" else -1
        # lower wall (kerb side has gaps at both doors)
        segs = [(BUS["x0"], BUS["x1"])] if side == "L" else [(BUS["x0"], BUS["door_mid"][0]), (BUS["door_mid"][1], BUS["door_front"][0]), (BUS["door_front"][1], BUS["x1"])]
        for a, b in segs:
            box(f"wall_lo_{side}{a:+.1f}", ((a + b) / 2, y, BUS["win_lo"] / 2), (b - a, 0.06, BUS["win_lo"]), M["panel"], c)
            box(f"sill_{side}{a:+.1f}", ((a + b) / 2, y - s * 0.05, BUS["win_lo"] - 0.01), (b - a, 0.12, 0.04), M["panel_dark"], c)
        box(f"wall_hi_{side}", (0, y, (BUS["win_hi"] + H) / 2), (L, 0.06, H - BUS["win_hi"]), M["panel"], c)
        xs = [BUS["x0"] + 0.4 + k * 1.15 for k in range(10)]
        for k, x in enumerate(xs[:-1]):
            x2 = xs[k + 1]
            if side == "R" and (x < BUS["door_mid"][1] and x2 > BUS["door_mid"][0]): continue
            if x2 > 4.3: continue
            box(f"glass_{side}{k}", ((x + x2) / 2, y, (BUS["win_lo"] + BUS["win_hi"]) / 2), (x2 - x - 0.06, 0.012, BUS["win_hi"] - BUS["win_lo"]), M["glass"], c)
            box(f"mull_{side}{k}", (x, y - s * 0.01, (BUS["win_lo"] + BUS["win_hi"]) / 2), (0.07, 0.07, BUS["win_hi"] - BUS["win_lo"]), M["frame"], c)
        box(f"mull_{side}_end", (xs[-2] + 1.15 if side == "L" else 4.3, y - s * 0.01, (BUS["win_lo"] + BUS["win_hi"]) / 2), (0.07, 0.07, BUS["win_hi"] - BUS["win_lo"]), M["frame"], c)
        # the yellow stop-request cord, just above the windows, full length
        cyl(f"cord_{side}", (-0.5, y - s * 0.09, BUS["win_hi"] + 0.06), 0.009, L - 2.2, M["cord"], c, rot=(0, math.radians(90), 0), verts=12)
        for k in range(9):
            cyl(f"cordclip_{side}{k}", (BUS["x0"] + 1.0 + k * 1.15, y - s * 0.05, BUS["win_hi"] + 0.06), 0.012, 0.09, M["frame"], c, rot=(math.radians(90), 0, 0), verts=8)
        for k in range(7):
            box(f"ad_{side}{k}", (BUS["x0"] + 1.2 + k * 1.3, y - s * 0.035, 2.07), (1.0, 0.01, 0.24), M["panel_dark"], c)
    # doors: frames + folding leaves
    for pre, (d0, d1) in (("door_mid", BUS["door_mid"]), ("door_front", BUS["door_front"])):
        box(f"{pre}_post0", (d0 - 0.03, -W / 2, H / 2), (0.06, 0.09, H), M["frame"], c)
        box(f"{pre}_post1", (d1 + 0.03, -W / 2, H / 2), (0.06, 0.09, H), M["frame"], c)
        box(f"{pre}_step", ((d0 + d1) / 2, -W / 2 + 0.1, 0.005), (d1 - d0, 0.2, 0.01), mat("step_edge", (0.6, 0.5, 0.08), 0.6), c)
        door_leaves(c, pre, d0, d1)
    # rear bench + rear wall
    box("rear_bench", (BUS["x0"] + 0.5, 0, 0.62), (0.5, W - 0.2, 0.16), M["seat"], c, bevel=0.04)
    box("rear_back", (BUS["x0"] + 0.18, 0, 1.05), (0.12, W - 0.2, 0.7), M["seat"], c, bevel=0.04)
    box("rear_wall_lo", (BUS["x0"] - 0.03, 0, 0.65), (0.06, W, 1.3), M["panel"], c)
    box("rear_wall_hi", (BUS["x0"] - 0.03, 0, 2.08), (0.06, W, 0.34), M["panel"], c)
    for yy in (0.97, -0.97):
        box(f"rear_wall_side{yy}", (BUS["x0"] - 0.03, yy, 1.6), (0.06, 0.56, 0.6), M["panel"], c)
    box("rear_window", (BUS["x0"] - 0.01, 0, 1.6), (0.012, 1.4, 0.6), M["glass"], c)
    for x in SEAT_ROWS_L: seat_pair(c, x, "L")
    for x in SEAT_ROWS_R: seat_pair(c, x, "R")
    # yellow poles + overhead rails
    for x, y in ((-3.65, -0.36), (-1.1, 0.36), (0.45, -0.4), (1.85, -0.4), (2.3, 0.36), (4.1, -0.36)):
        cyl(f"pole_{x:+.2f}_{y:+.2f}", (x, y, H / 2), 0.02, H, M["pole"], c)
    cyl("hand_rail_L", (-0.4, 0.42, 2.0), 0.018, L - 2.6, M["pole"], c, rot=(0, math.radians(90), 0))
    cyl("hand_rail_R", (-0.4, -0.42, 2.0), 0.018, L - 2.6, M["pole"], c, rot=(0, math.radians(90), 0))
    # ceiling light strips — tube R1 (above his row) is weak: it is the one that flickers in the edit
    for side, y in (("L", 0.62), ("R", -0.62)):
        for k in range(5):
            x = BUS["x0"] + 1.2 + k * 2.0
            box(f"tube_{side}{k}", (x, y, H - 0.02), (1.6, 0.14, 0.03), M["tube_dim"] if (side == "R" and k == 1) else M["tube"], c)
            box(f"tubehous_{side}{k}", (x, y, H - 0.005), (1.7, 0.2, 0.02), M["ceiling"], c)
    for k in range(4):  # red emergency strips (dark until Night 3)
        box(f"redstrip_{k}", (BUS["x0"] + 2.2 + k * 2.6, 0, H - 0.01), (0.5, 0.06, 0.02), M["tube_red"], c)
    # front: driver cabin (left), front door (right), windscreen, header, the clock
    fx = BUS["x1"]
    box("front_wall_lo", (fx + 0.03, 0, 0.5), (0.06, W, 1.0), M["panel_dark"], c)
    box("windscreen", (fx + 0.05, 0, 1.52), (0.012, W - 0.1, 1.04), M["glass"], c)
    box("front_header", (fx + 0.02, 0, 2.15), (0.08, W, 0.22), M["panel_dark"], c)
    box("driver_partition", (4.3, 0.9, 0.55), (0.04, 0.62, 1.1), M["panel_dark"], c)
    box("driver_partition_glass", (4.3, 0.9, 1.5), (0.012, 0.62, 0.8), M["glass"], c)
    box("driver_partition_top", (4.3, 0.9, 1.92), (0.05, 0.64, 0.04), M["frame"], c)
    box("driver_seat", (4.85, 0.72, 0.5), (0.5, 0.5, 0.12), M["black"], c, bevel=0.04)
    box("driver_seatback", (4.58, 0.72, 0.92), (0.1, 0.5, 0.75), M["black"], c, bevel=0.04)
    box("driver_seatpost", (4.85, 0.72, 0.22), (0.12, 0.12, 0.44), M["seat_frame"], c)
    box("dash", (5.35, 0.7, 0.9), (0.45, 1.1, 0.25), M["dash"], c, bevel=0.03)
    box("dash_glow", (5.14, 0.75, 1.03), (0.02, 0.3, 0.06), mat("dash_lcd", (0, 0, 0), 0.4, emit=(0.2, 0.7, 0.9), strength=2.5), c)
    bpy.ops.mesh.primitive_torus_add(location=(5.22, 0.72, 1.12), rotation=(0, math.radians(55), 0), major_radius=0.22, minor_radius=0.02)
    sw = bpy.context.object; sw.name = "steering"; sw.data.materials.append(M["black"]); move(sw, c)
    box("farebox", (4.42, 0.12, 0.55), (0.25, 0.25, 1.1), M["seat_frame"], c, bevel=0.02)
    # THE CLOCK: black box under the ceiling at the front, facing back down the aisle (always 2:16)
    box("clock_box", (fx - 0.25, 0.0, 2.05), (0.12, 0.62, 0.22), M["black"], c, bevel=0.01)
    box("clock_face", (fx - 0.31, 0.0, 2.05), (0.005, 0.56, 0.18), mat("clock_glass", (0.02, 0.0, 0.0), 0.15), c)
    seven_seg("clock", "2:16", (fx - 0.318, 0.20, 2.05), 0.12, M["red_led"], c)
    box("stopsign_box", (fx - 0.25, -0.66, 2.05), (0.1, 0.5, 0.14), M["black"], c, bevel=0.01)
    text_obj("stopsign_text", "STOP REQUESTED", (fx - 0.31, -0.66, 2.032), (math.radians(90), 0, math.radians(-90)), 0.045, M["led_off"], c)
    # bell speaker grille next to it
    cyl("bell", (fx - 0.31, -1.0, 2.05), 0.04, 0.02, M["frame"], c, rot=(0, math.radians(90), 0))
    # physical lights matching the tubes
    for k in range(5):
        x = BUS["x0"] + 1.2 + k * 2.0
        area_light(f"busarea_{k}", (x, 0, H - 0.08), 1.6, 50 if k != 1 else 18, (0.72, 0.88, 1.0), c=c, size_y=1.1)
    for k in range(4):
        point_light(f"busred_{k}", (BUS["x0"] + 2.2 + k * 2.6, 0, H - 0.12), 0.0, (1.0, 0.05, 0.03), 0.15, c)
    point_light("bus_clock_glow", (fx - 0.45, 0, 2.0), 2.5, (1.0, 0.08, 0.04), 0.05, c)
    return c

def build_bus_surround():
    """what is outside the windows in interior shots: darkness, a few far blurred city lights."""
    c = coll("BUS_SURROUND")
    for side, y in (("L", 6.0), ("R", -6.0)):
        box(f"outside_{side}", (0, y, 1.5), (60, 0.1, 12), M["exterior"], c)
    box("outside_front", (14, 0, 1.5), (0.1, 30, 12), M["exterior"], c)
    box("outside_back", (-14, 0, 1.5), (0.1, 30, 12), M["exterior"], c)
    box("door_void_mid", (sum(BUS["door_mid"]) / 2, -BUS["w"] / 2 - 0.45, 1.0), (1.4, 0.02, 2.4), M["void"], c)
    box("door_void_front", (sum(BUS["door_front"]) / 2, -BUS["w"] / 2 - 0.45, 1.0), (1.3, 0.02, 2.4), M["void"], c)
    for k in range(14):
        x = -22 + k * 3.4
        for side, y in (("L", 5.6), ("R", -5.6)):
            m = mat(f"street_glow_{k % 3}", (0, 0, 0), 1.0, emit=[(1.0, 0.55, 0.2), (0.4, 0.6, 1.0), (0.9, 0.3, 0.6)][k % 3], strength=1.5)
            cyl(f"far_light_{side}{k}", (x, y, 2.4 + (k % 4) * 0.7), 0.08, 0.05, m, c, rot=(math.radians(90), 0, 0), verts=12)
    return c

def build_bus_shell():
    """exterior skin wrapped exactly around the interior (same local frame; ground at z = -0.35)."""
    c = coll("BUS_SHELL")
    paint = mat("bus_paint", (0.10, 0.12, 0.16), 0.35, 0.3, coat=0.6)
    stripe = mat("bus_stripe", (0.30, 0.035, 0.045), 0.4, 0.2, coat=0.4)
    head = mat("headlight", (1, 1, 1), 0.2, emit=(1.0, 0.92, 0.75), strength=40.0)
    tail = mat("taillight", (0.4, 0, 0), 0.3, emit=(1.0, 0.05, 0.02), strength=12.0)
    sign = mat("dest_sign_blank", (0.004, 0.004, 0.005), 0.15, emit=(0.03, 0.012, 0.0), strength=0.4)
    G = -0.35; W = BUS["w"]; ys = W / 2 + 0.045
    X0, X1 = BUS["x0"] - 0.1, BUS["x1"] + 0.12
    box("shell_under", (0, 0, G + 0.25), (X1 - X0, W + 0.08, 0.36), M["black"], c)
    for side, y in (("L", ys), ("R", -ys)):
        segs = [(X0, X1)] if side == "L" else [(X0, BUS["door_mid"][0] - 0.06), (BUS["door_mid"][1] + 0.06, BUS["door_front"][0] - 0.06), (BUS["door_front"][1] + 0.06, X1)]
        for a, b in segs:
            box(f"shell_lo_{side}{a:+.1f}", ((a + b) / 2, y, (G + 0.15 + BUS["win_lo"]) / 2), (b - a, 0.04, BUS["win_lo"] - G - 0.15), paint, c, bevel=0.01)
            box(f"shell_stripe_{side}{a:+.1f}", ((a + b) / 2, y * 1.004, 0.45), (b - a, 0.04, 0.12), stripe, c)
        box(f"shell_hi_{side}", (0, y, (BUS["win_hi"] + 2.62) / 2), (X1 - X0, 0.04, 2.62 - BUS["win_hi"]), paint, c, bevel=0.01)
    box("shell_roof", (0, 0, 2.55), (X1 - X0, W + 0.12, 0.2), paint, c, bevel=0.08)
    box("shell_roofbox", (-2.5, 0, 2.72), (3.0, 1.6, 0.2), paint, c, bevel=0.06)
    # front mask
    box("shell_front_lo", (X1, 0, (G + 0.15 + 1.0) / 2), (0.06, W + 0.08, 1.0 - G - 0.15), paint, c, bevel=0.03)
    box("shell_front_hi", (X1, 0, (2.04 + 2.62) / 2), (0.06, W + 0.08, 2.62 - 2.04), paint, c, bevel=0.03)
    box("dest_sign", (X1 + 0.035, 0, 2.33), (0.01, W - 0.5, 0.26), sign, c)
    box("bumper", (X1 + 0.04, 0, G + 0.35), (0.1, W + 0.1, 0.22), M["black"], c, bevel=0.03)
    for y in (0.92, -0.92):
        box(f"head{y:+.1f}", (X1 + 0.035, y, 0.35), (0.01, 0.34, 0.14), head, c)
        box(f"tail{y:+.1f}", (X0 - 0.035, y, 0.6), (0.01, 0.2, 0.4), tail, c)
    # rear mask with the rear window opening
    box("shell_rear_lo", (X0, 0, (G + 0.15 + 1.3) / 2), (0.06, W + 0.08, 1.3 - G - 0.15), paint, c)
    box("shell_rear_hi", (X0, 0, (1.9 + 2.62) / 2), (0.06, W + 0.08, 0.72), paint, c)
    for yy in (0.98, -0.98):
        box(f"shell_rear_side{yy:+.1f}", (X0, yy, 1.6), (0.06, 0.6, 0.6), paint, c)
    for x in (-3.7, 3.3):
        for y in (W / 2 - 0.05, -W / 2 + 0.05):
            cyl(f"wheel{x:+.1f}{y:+.1f}", (x, y, G + 0.5), 0.5, 0.3, M["rubber"], c, rot=(math.radians(90), 0, 0))
            cyl(f"hub{x:+.1f}{y:+.1f}", (x, y * 1.13, G + 0.5), 0.22, 0.02, mat("hub", (0.3, 0.3, 0.32), 0.3, 0.8), c, rot=(math.radians(90), 0, 0))
    spot("beamL", (X1 + 0.1, 0.92, 0.35), (math.radians(92), 0, math.radians(-90)), 1800, (1.0, 0.92, 0.78), 50, 0.5, c)
    spot("beamR", (X1 + 0.1, -0.92, 0.35), (math.radians(92), 0, math.radians(-90)), 1800, (1.0, 0.92, 0.78), 50, 0.5, c)
    return c

def bus_group():
    g = bpy.data.collections.new("BUS_ALL")
    bpy.context.scene.collection.children.link(g)
    for n in ("BUS_INTERIOR", "BUS_SHELL"):
        cc = bpy.data.collections[n]
        bpy.context.scene.collection.children.unlink(cc)
        g.children.link(cc)
    return g

def place_bus(c, name, loc, rotz):
    o = bpy.data.objects.new(name, None)
    o.instance_type = 'COLLECTION'; o.instance_collection = bpy.data.collections["BUS_ALL"]
    o.location = (loc[0], loc[1], 0.35); o.rotation_euler = (0, 0, rotz)
    c.objects.link(o)
    return o

# ───────────────────────────────────────────── STATION platform
def build_station():
    c = coll("STATION")
    conc_wet = wet_mat("platform_wet", (0.04, 0.042, 0.048), 0.06, 0.5, 2.0)
    yellow = mat("platform_edge", (0.7, 0.55, 0.05), 0.6)
    rail = mat("rail_steel", (0.4, 0.4, 0.42), 0.3, 1.0)
    canopy = mat("canopy", (0.06, 0.07, 0.09), 0.6)
    lamp = mat("station_lamp", (1, 1, 1), 0.3, emit=(0.72, 0.88, 1.0), strength=12.0)
    box("platform", (0, 0, -0.5), (90, 6, 1.0), conc_wet, c)
    box("platform_edge", (0, -2.85, 0.005), (90, 0.3, 0.01), yellow, c)
    box("platform_lip", (0, -3.0, -0.6), (90, 0.05, 1.2), noise_mat("lip", (0.05, 0.05, 0.055), (0.08, 0.08, 0.09), 9, 0.7), c)
    box("trackbed", (0, -7.5, -1.25), (90, 9, 0.2), noise_mat("ballast", (0.02, 0.02, 0.022), (0.05, 0.047, 0.043), 40, 0.9, 0.4), c)
    for y in (-4.9, -6.3, -8.2, -9.6):
        box(f"rail{y}", (0, y, -1.08), (90, 0.08, 0.14), rail, c)
    for k in range(45):
        box(f"sleeper{k}", (-45 + k * 2, -7.25, -1.14), (0.3, 6.0, 0.08), noise_mat("sleeper", (0.04, 0.035, 0.03), (0.07, 0.065, 0.06), 10, 0.9), c)
    box("far_wall", (0, -12.5, 2.0), (90, 0.3, 7), noise_mat("far_wall", (0.02, 0.022, 0.03), (0.04, 0.042, 0.05), 3, 0.8), c)
    box("canopy_roof", (0, 0.3, 4.5), (90, 7.4, 0.25), canopy, c)
    for k in range(16):
        x = -30 + k * 4.0
        box(f"pillar{k}", (x, 1.9, 2.25), (0.25, 0.25, 4.5), canopy, c)
        on = k % 5 != 3
        box(f"lamp{k}", (x + 2.0, -0.4, 4.33), (1.4, 0.16, 0.06), lamp if on else M["tube_dim"], c)
        area_light(f"lamp_light{k}", (x + 2.0, -0.4, 4.25), 1.2, 160 if on else 25, (0.72, 0.86, 1.0), c=c, size_y=0.3)
    box("back_wall", (0, 3.1, 2.2), (90, 0.2, 4.4), noise_mat("station_wall", (0.045, 0.05, 0.065), (0.075, 0.08, 0.095), 3, 0.6), c)
    for k in range(10):  # tiled band + posters on the back wall
        box(f"poster{k}", (-26 + k * 6.0, 2.98, 1.9), (1.2, 0.02, 1.6), mat(f"poster{k % 3}", [(0.12, 0.05, 0.06), (0.05, 0.08, 0.12), (0.1, 0.1, 0.06)][k % 3], 0.5), c)
    box("bench_seat", (-2.0, 2.4, 0.45), (2.0, 0.45, 0.06), mat("bench_wood", (0.14, 0.08, 0.05), 0.6), c)
    for x in (-2.8, -1.2):
        box(f"bench_leg{x}", (x, 2.4, 0.22), (0.06, 0.4, 0.44), canopy, c)
    cyl("bin", (1.0, 2.6, 0.45), 0.25, 0.9, mat("bin", (0.04, 0.09, 0.06), 0.5), c)
    # departure board (amber LED) hung from the canopy, facing the platform
    box("board", (6.0, 0.9, 3.4), (3.4, 0.12, 0.9), mat("dep_board", (0.01, 0.01, 0.015), 0.3), c)
    for k, (txt, z) in enumerate((("01:58   LAST TRAIN   DEPARTED", 3.58), ("NO FURTHER SERVICE TONIGHT", 3.22))):
        text_obj(f"board_l{k}", txt, (6.0, 0.83, z), (math.radians(90), 0, 0), 0.15, M["amber_led"], c)
    point_light("board_glow", (6.0, 0.4, 3.3), 6, (1.0, 0.45, 0.05), 0.3, c)
    # tail lights of the last train, far down the line
    for dy in (-0.5, 0.5):
        point_light(f"train_tail{dy}", (75, -7.25 + dy, 0.4), 30, (1.0, 0.05, 0.03), 0.06, c)
        cyl(f"train_tailbulb{dy}", (75, -7.25 + dy, 0.4), 0.08, 0.02, tail_mat(), c, rot=(0, math.radians(90), 0), verts=12)
    return c

def tail_mat():
    return mat("train_tail", (0.4, 0, 0), 0.3, emit=(1.0, 0.04, 0.02), strength=40.0)

# ───────────────────────────────────────────── STREETS (station forecourt / his building)
def build_street(building):
    c = coll("STREET_BLDG" if building else "STREET")
    asphalt = wet_mat("asphalt_wet", (0.018, 0.019, 0.022), 0.03, 0.4, 1.6)
    curb = noise_mat("curb", (0.07, 0.07, 0.075), (0.11, 0.11, 0.12), 8, 0.6)
    walk = wet_mat("sidewalk", (0.05, 0.05, 0.055), 0.08, 0.5, 2.5)
    box("road", (0, 0, -0.05), (140, 12, 0.1), asphalt, c)
    box("sidewalk", (0, 8.6, 0.07), (140, 5.2, 0.14), walk, c)
    box("sidewalk_far", (0, -8.6, 0.07), (140, 5.2, 0.14), walk, c)
    box("curb", (0, 6.0, 0.07), (140, 0.25, 0.16), curb, c)
    box("curb_far", (0, -6.0, 0.07), (140, 0.25, 0.16), curb, c)
    for k in range(24):
        box(f"lane{k}", (-70 + k * 6, 0, 0.003), (3.0, 0.15, 0.005), mat("lane_paint", (0.5, 0.5, 0.46), 0.6), c)
    box("busbay_paint", (2.0, 5.0, 0.003), (14.0, 0.12, 0.005), mat("bay_paint", (0.55, 0.45, 0.08), 0.6), c)
    lampcol = (1.0, 0.58, 0.22)
    for k in range(7):
        x = -36 + k * 14
        if building and x < -30: continue
        cyl(f"lamp_pole{k}", (x, 6.6, 3.5), 0.08, 7.0, mat("pole_dark", (0.03, 0.03, 0.035), 0.5, 0.6), c)
        box(f"lamp_head{k}", (x, 5.9, 6.95), (0.7, 1.4, 0.15), mat("lamp_head", (0.03, 0.03, 0.035), 0.5), c)
        box(f"lamp_bulb{k}", (x, 5.6, 6.86), (0.5, 0.6, 0.02), mat("sodium", (1, 0.6, 0.2), 0.3, emit=lampcol, strength=25), c)
        spot(f"lamp_spot{k}", (x, 5.6, 6.75), (0, 0, 0), 2200 if k != 4 else 350, lampcol, 95, 0.8, c, 0.4)
    # bus shelter + stop pole
    glassm = mat("shelter_glass", (0.8, 0.9, 1.0), 0.05, transmission=1.0)
    frame = mat("shelter_frame", (0.04, 0.045, 0.05), 0.4, 0.5)
    box("shelter_roof", (2.0, 8.7, 2.55), (4.0, 1.8, 0.08), frame, c)
    box("shelter_back", (2.0, 9.55, 1.3), (4.0, 0.03, 2.4), glassm, c)
    box("shelter_side", (0.05, 8.7, 1.3), (0.03, 1.7, 2.4), glassm, c)
    for x in (0.05, 3.95):
        box(f"shelter_post{x}", (x, 9.55, 1.3), (0.06, 0.06, 2.6), frame, c)
    box("shelter_bench", (2.0, 9.2, 0.48), (2.6, 0.4, 0.06), frame, c)
    box("shelter_light", (2.0, 8.7, 2.49), (3.4, 0.1, 0.02), mat("shelter_tube", (1, 1, 1), 0.3, emit=(0.7, 0.85, 1.0), strength=6), c)
    area_light("shelter_area", (2.0, 8.7, 2.45), 3.4, 60, (0.7, 0.85, 1.0), c=c, size_y=0.6)
    box("shelter_ad", (2.0, 9.53, 1.35), (1.4, 0.01, 1.9), mat("shelter_ad", (0.1, 0.12, 0.16), 0.4, emit=(0.5, 0.6, 0.75), strength=0.3), c)
    cyl("stop_pole", (4.7, 6.5, 1.6), 0.04, 3.2, frame, c)
    box("stop_sign", (4.7, 6.5, 3.0), (0.6, 0.03, 0.6), mat("stop_sign_plate", (0.75, 0.75, 0.72), 0.4), c)
    text_obj("stop_sign_text", "BUS", (4.7, 6.47, 2.92), (math.radians(90), 0, 0), 0.22, mat("sign_ink", (0.04, 0.06, 0.25), 0.5), c)
    if building:
        brick = noise_mat("brick", (0.06, 0.03, 0.025), (0.1, 0.05, 0.04), 25, 0.85, 0.2)
        litw = mat("win_lit", (1, 0.8, 0.5), 0.3, emit=(1.0, 0.7, 0.4), strength=3.0)
        darkw = mat("win_dark", (0.01, 0.012, 0.02), 0.08, 0.3)
        box("bldg", (2.0, 15.5, 9.0), (64, 7, 18), brick, c)   # block from x=-30 to 34 (corner at x = -30)
        for fl in range(5):
            for k in range(20):
                x = -27 + k * 3.0
                lit_ = (fl, k) in ((1, 8), (3, 11), (2, 13), (4, 6), (0, 3), (2, 17))
                box(f"bw{fl}_{k}", (x, 11.97, 2.6 + fl * 3.3), (1.4, 0.05, 1.8), litw if lit_ else darkw, c)
        box("entrance", (5.0, 11.96, 1.3), (2.0, 0.05, 2.6), mat("entrance_door", (0.03, 0.03, 0.035), 0.3, 0.6), c)
        box("entrance_glass", (5.0, 11.95, 1.4), (1.6, 0.02, 2.0), mat("entr_glass", (0.2, 0.15, 0.1), 0.1, emit=(1.0, 0.7, 0.4), strength=0.6), c)
        box("entrance_lamp", (6.4, 11.9, 2.9), (0.2, 0.1, 0.3), mat("entr_lamp", (1, 0.8, 0.5), 0.3, emit=(1.0, 0.75, 0.45), strength=20), c)
        point_light("entrance_light", (6.4, 11.5, 2.8), 60, (1.0, 0.72, 0.42), 0.1, c)
        text_obj("bldg_number", "47", (5.0, 11.9, 2.85), (math.radians(90), 0, 0), 0.3, mat("number_plate", (0.8, 0.8, 0.8), 0.4), c)
        # side street at the corner (x < -30) and the building beyond it
        box("side_road", (-34, 30, -0.05), (8, 40, 0.1), asphalt, c)
        box("bldg_beyond", (-50, 22, 8), (24, 20, 16), brick, c)
    else:
        box("station_front", (2.0, 16.0, 6.0), (60, 7, 12), noise_mat("station_front", (0.04, 0.045, 0.06), (0.07, 0.075, 0.09), 3, 0.7), c)
        text_obj("station_name", "CENTRAL STATION", (8.0, 12.45, 7.5), (math.radians(90), 0, 0), 0.8, mat("station_sign", (0.9, 0.9, 1), 0.3, emit=(0.6, 0.75, 1.0), strength=3), c)
        box("station_entrance", (8.0, 12.47, 2.0), (6.0, 0.05, 4.0), mat("station_entr", (0.1, 0.12, 0.15), 0.2, emit=(0.5, 0.65, 0.85), strength=0.8), c)
        area_light("station_entr_light", (8.0, 11.8, 4.0), 5.0, 300, (0.6, 0.75, 1.0), c=c, size_y=1.0, rot=(math.radians(30), 0, 0))
    # opposite side of the road: dark row of buildings
    box("bldg_far", (0, -15.5, 8.0), (140, 7, 16), noise_mat("far_bldg", (0.025, 0.025, 0.035), (0.045, 0.045, 0.06), 6, 0.8), c)
    for k in range(12):
        box(f"farw{k}", (-50 + k * 9.5, -11.97, 3 + (k * 7 % 4) * 3), (1.3, 0.05, 1.7), mat("win_lit_far", (1, 0.8, 0.5), 0.3, emit=(0.9, 0.6, 0.35), strength=2.0) if k % 3 == 0 else mat("win_dark", (0.01, 0.012, 0.02), 0.08, 0.3), c)
    return c

# ───────────────────────────────────────────── APARTMENT + BATHROOM
def build_apartment():
    c = coll("APARTMENT")
    wall = noise_mat("apt_wall", (0.22, 0.21, 0.2), (0.25, 0.24, 0.23), 2, 0.8)
    floor = stripe_mat("apt_floor", (0.09, 0.055, 0.035), (0.11, 0.07, 0.045), 9, 0.45)
    wood = mat("table_wood", (0.16, 0.09, 0.05), 0.45)
    cab = mat("cabinet", (0.35, 0.37, 0.37), 0.5)
    counter = mat("counter", (0.08, 0.08, 0.09), 0.3)
    box("apt_floor", (0, 0, -0.02), (10, 8, 0.04), floor, c)
    box("apt_wall_back", (0, 4.0, 1.4), (10, 0.1, 2.8), wall, c)
    box("apt_wall_left", (-5.0, 0, 1.4), (0.1, 8, 2.8), wall, c)
    box("apt_wall_right_a", (5.0, 1.5, 1.4), (0.1, 5.0, 2.8), wall, c)
    box("apt_wall_right_b", (5.0, -3.6, 1.4), (0.1, 0.8, 2.8), wall, c)
    box("apt_wall_right_top", (5.0, -1.8, 2.5), (0.1, 1.0, 0.6), wall, c)
    box("apt_wall_front", (0, -4.0, 1.4), (10, 0.1, 2.8), wall, c)
    box("apt_ceiling", (0, 0, 2.82), (10, 8, 0.04), mat("apt_ceiling", (0.3, 0.29, 0.28), 0.8), c)
    box("counter_base", (-1.5, 3.65, 0.45), (4.0, 0.6, 0.9), cab, c)
    box("counter_top", (-1.5, 3.62, 0.92), (4.04, 0.66, 0.04), counter, c)
    box("upper_cabs", (-2.7, 3.78, 1.95), (1.6, 0.35, 0.8), cab, c)
    box("kitchen_window", (-0.6, 3.96, 1.65), (1.3, 0.02, 1.0), mat("night_window", (0.01, 0.015, 0.03), 0.05, emit=(0.02, 0.03, 0.07), strength=1.0), c)
    box("fridge", (1.2, 3.6, 0.9), (0.75, 0.7, 1.8), mat("fridge", (0.6, 0.61, 0.62), 0.3, 0.2), c)
    box("kettle", (-2.6, 3.55, 1.05), (0.18, 0.15, 0.22), mat("kettle", (0.6, 0.6, 0.62), 0.2, 0.8), c)
    for k in range(3):
        box(f"mugs{k}", (-1.0 + k * 0.16, 3.5, 0.99), (0.09, 0.09, 0.1), mat(f"mug{k}", [(0.5, 0.12, 0.1), (0.15, 0.25, 0.4), (0.8, 0.8, 0.75)][k], 0.4), c)
    # table + two chairs: the far chair faces the camera (the double sits there)
    box("table_top", (-0.8, 1.3, 0.76), (1.3, 0.85, 0.04), wood, c)
    for dx in (-0.55, 0.55):
        for dy in (-0.35, 0.35):
            box(f"table_leg{dx:+.2f}{dy:+.2f}", (-0.8 + dx, 1.3 + dy, 0.37), (0.05, 0.05, 0.74), wood, c)
    for k, (cx, cy, bdx, bdy) in enumerate(((-0.8, 2.05, 0, 0.21), (-1.75, 1.3, -0.21, 0))):
        box(f"chair{k}_seat", (cx, cy, 0.46), (0.45, 0.45, 0.04), wood, c)
        box(f"chair{k}_back", (cx + bdx, cy + bdy, 0.9), (0.45 if bdy else 0.04, 0.04 if bdy else 0.45, 0.85), wood, c)
        for dx in (-0.19, 0.19):
            for dy in (-0.19, 0.19):
                box(f"chair{k}_leg{dx:+.2f}{dy:+.2f}", (cx + dx, cy + dy, 0.23), (0.035, 0.035, 0.46), wood, c)
    box("table_plate", (-0.8, 1.55, 0.79), (0.24, 0.24, 0.01), mat("plate", (0.75, 0.75, 0.72), 0.3), c)
    cyl("pendant_cord", (-0.8, 1.3, 2.42), 0.006, 0.8, M["black"], c)
    bpy.ops.mesh.primitive_cone_add(radius1=0.25, radius2=0.05, depth=0.2, location=(-0.8, 1.3, 1.95))
    sh = bpy.context.object; sh.name = "pendant_shade"; sh.data.materials.append(mat("shade", (0.05, 0.05, 0.05), 0.4)); move(sh, c)
    point_light("pendant_light", (-0.8, 1.3, 1.82), 70, (1.0, 0.7, 0.42), 0.08, c)
    sofa = mat("sofa", (0.06, 0.075, 0.1), 0.9)
    box("sofa_base", (3.0, 0.2, 0.25), (2.0, 0.9, 0.5), sofa, c, bevel=0.06)
    box("sofa_back", (3.0, 0.62, 0.65), (2.0, 0.22, 0.6), sofa, c, bevel=0.06)
    for dx in (-1.0, 1.0):
        box(f"sofa_arm{dx:+.0f}", (3.0 + dx, 0.2, 0.42), (0.2, 0.9, 0.35), sofa, c, bevel=0.05)
    box("tv", (3.0, -3.9, 1.1), (1.3, 0.05, 0.75), mat("tv_screen", (0.02, 0.03, 0.05), 0.1, emit=(0.25, 0.4, 0.75), strength=1.4), c)
    point_light("tv_glow", (3.0, -3.4, 1.1), 70, (0.35, 0.55, 1.0), 0.6, c)
    box("side_lamp_shade", (4.4, 0.6, 1.1), (0.3, 0.3, 0.3), mat("lampshade", (0.9, 0.8, 0.6), 0.6, emit=(1.0, 0.75, 0.45), strength=2.0), c)
    point_light("side_lamp", (4.4, 0.6, 1.1), 70, (1.0, 0.72, 0.45), 0.15, c)
    # front door (hinged on its left jamb) in the right wall; hallway light behind it
    p = empty("apt_door_hinge", (5.0, -2.28, 0.0), c)
    d = box("apt_door", (5.0, -1.8, 1.05), (0.05, 0.94, 2.1), mat("apt_door", (0.15, 0.13, 0.11), 0.5), c)
    kn = box("apt_door_knob", (4.96, -1.43, 1.0), (0.04, 0.04, 0.04), mat("knob", (0.6, 0.55, 0.4), 0.3, 1.0), c)
    parent_keep(d, p); parent_keep(kn, p)
    box("hall_floor", (6.5, -1.8, -0.02), (3, 3, 0.04), floor, c)
    box("hall_wall", (8.0, -1.8, 1.4), (0.1, 3, 2.8), wall, c)
    point_light("hall_light", (6.5, -1.8, 2.5), 80, (0.85, 0.9, 1.0), 0.2, c)
    return c

def build_bathroom():
    c = coll("BATHROOM")
    tile = noise_mat("tile", (0.3, 0.33, 0.35), (0.36, 0.39, 0.41), 30, 0.25)
    box("bath_floor", (0, 0, -0.02), (3, 3, 0.04), noise_mat("bath_floor", (0.08, 0.08, 0.09), (0.13, 0.13, 0.14), 18, 0.4), c)
    box("bath_wall_back", (0, 1.5, 1.35), (3, 0.06, 2.7), tile, c)
    box("bath_wall_l", (-1.5, 0, 1.35), (0.06, 3, 2.7), tile, c)
    box("bath_wall_r", (1.5, 0, 1.35), (0.06, 3, 2.7), tile, c)
    box("bath_wall_front", (0, -2.2, 1.35), (3, 0.06, 2.7), tile, c)
    box("bath_ceiling", (0, 0, 2.72), (3, 4.4, 0.04), mat("bath_ceiling", (0.4, 0.4, 0.4), 0.8), c)
    box("vanity", (0, 1.25, 0.42), (1.2, 0.48, 0.84), mat("vanity", (0.15, 0.16, 0.17), 0.5), c)
    box("sink_top", (0, 1.22, 0.86), (1.24, 0.52, 0.04), mat("sink", (0.75, 0.75, 0.75), 0.15), c)
    cyl("tap", (0, 1.42, 0.95), 0.02, 0.18, mat("chrome", (0.8, 0.8, 0.82), 0.1, 1.0), c)
    box("mirror_frame", (0, 1.465, 1.65), (1.0, 0.03, 0.85), M["black"], c)
    box("mirror_glass", (0, 1.445, 1.65), (0.92, 0.01, 0.77), M["mirror"], c)
    box("vanity_light", (0, 1.4, 2.15), (0.8, 0.08, 0.06), mat("vanity_tube", (1, 1, 1), 0.3, emit=(0.85, 0.9, 1.0), strength=7.0), c)
    area_light("vanity_area", (0, 1.2, 2.1), 0.8, 40, (0.85, 0.9, 1.0), c=c, size_y=0.15)
    box("towel", (1.44, 0.4, 1.2), (0.04, 0.5, 0.7), mat("towel", (0.25, 0.3, 0.35), 0.9), c)
    box("bath_door_open", (-0.9, -2.15, 1.05), (0.8, 0.02, 2.1), mat("hall_dark", (0.0, 0.0, 0.0), 1.0, emit=(0.05, 0.06, 0.08), strength=1.0), c)
    hs = point_light("bath_hall_spill", (-0.9, -1.8, 1.9), 3, (0.6, 0.7, 0.9), 0.3, c); hs.visible_glossy = False
    return c

# ───────────────────────────────────────────── states
def set_stopsign(on):
    t = bpy.data.objects.get("stopsign_text")
    if t: t.data.materials[0] = M["red_led"] if on else M["led_off"]

def set_red(level):
    """Night 3 emergency mood: the white strips fade, red strips and red lamps take over."""
    for o in bpy.data.objects:
        if o.name.startswith("busarea_"): o.data.energy = (50 if o.name != "busarea_1" else 18) * (1 - 0.92 * level)
        if o.name.startswith("busred_"): o.data.energy = 90 * level
    M["tube"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 5.0 * (1 - 0.9 * level)
    M["tube_dim"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 1.0 * (1 - 0.9 * level)
    M["tube_red"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.3 + 30.0 * level

def set_bath_light(on):
    a = bpy.data.objects.get("vanity_area"); a.data.energy = 40 if on else 0
    M_ = bpy.data.materials["vanity_tube"].node_tree.nodes["Principled BSDF"]; M_.inputs["Emission Strength"].default_value = 7.0 if on else 0.0
    bpy.data.objects["bath_hall_spill"].data.energy = 3 if on else 6

def set_apt_door(k, frame=None):
    p = bpy.data.objects["apt_door_hinge"]; p.rotation_euler = (0, 0, math.radians(-95 * k))
    if frame is not None: p.keyframe_insert("rotation_euler", frame=frame)

def reset_states():
    for o in bpy.data.objects:
        if o.name.startswith("BUS_AT"): o.hide_render = False
    set_doors(0, 0); set_stopsign(False); set_red(0.0)
    if bpy.data.objects.get("vanity_area"): set_bath_light(True)
    if bpy.data.objects.get("apt_door_hinge"): set_apt_door(0)

# ───────────────────────────────────────────── plates
OFFSETS = {"STATION": (0, 200, 0), "STREET": (0, 400, 0), "STREET_BLDG": (0, 600, 0), "APARTMENT": (0, 800, 0), "BATHROOM": (0, 1000, 0)}
PLATES = {}
def plate(name, colls, loc, look, lens=24, prep=None, world="night", fg=None, mask=None, anim=None):
    PLATES[name] = dict(colls=colls, loc=loc, look=look, lens=lens, prep=prep, world=world, fg=fg, mask=mask, anim=anim)

def layer_visibility(names):
    vl = bpy.context.view_layer
    def walk(lc):
        for ch in lc.children:
            if ch.name == "BUS_ALL":
                ch.exclude = "BUS_INTERIOR" not in names   # interior plates use it directly; street plates use instances
                if not ch.exclude:
                    for sub in ch.children: sub.exclude = sub.name not in names
                continue
            ch.exclude = ch.name not in names
    walk(vl.layer_collection)

def cam_for(name, p):
    off = Vector(OFFSETS.get(p["colls"][0], (0, 0, 0)))
    cam = camera(f"CAM_{name}", tuple(Vector(p["loc"]) + off), tuple(Vector(p["look"]) + off), lens=p["lens"])
    move(cam, bpy.context.scene.collection)
    return cam

CAMS = {}
def export_cam(name, cam):
    # matrix_world is stale until a depsgraph update: build it from loc/rot directly
    CAMS[name] = dict(loc=list(cam.location), rot=[list(r) for r in cam.rotation_euler.to_matrix()], lens=cam.data.lens, sensor=cam.data.sensor_width,
                      res=list(RES), offset=list(OFFSETS.get(PLATES[name]["colls"][0], (0, 0, 0))))

def swap_materials(white_prefixes):
    saved = {}
    for o in bpy.data.objects:
        if o.type not in ('MESH', 'FONT') or not o.data.materials: continue
        saved[o.name] = [m for m in o.data.materials]
        w = any(o.name.startswith(pre) for pre in white_prefixes)
        for i in range(len(o.data.materials)): o.data.materials[i] = M["mask_white"] if w else M["mask_black"]
    return saved

def restore_materials(saved):
    for n, ms in saved.items():
        o = bpy.data.objects[n]
        for i, m in enumerate(ms): o.data.materials[i] = m

def render_plate(name):
    p = PLATES[name]; scene = bpy.context.scene
    layer_visibility(p["colls"] + (["BUS_SURROUND"] if "BUS_INTERIOR" in p["colls"] else []))
    reset_states()
    scene.world = WORLDS[p["world"]]
    if p["prep"]: p["prep"]()
    cam = cam_for(name, p); scene.camera = cam
    export_cam(name, cam)
    scene.render.film_transparent = False
    scene.cycles.samples = SAMPLES
    scene.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    if p["fg"]:
        # foreground layer: only the named objects, everything else held out → RGBA overlay
        scene.render.film_transparent = True; scene.cycles.film_transparent_glass = True
        held = []
        for o in bpy.data.objects:
            if o.type in ('MESH', 'FONT') and not any(o.name.startswith(pre) for pre in p["fg"]):
                o.is_holdout = True; held.append(o)
        scene.render.filepath = os.path.join(OUT, f"{name}__fg.png")
        bpy.ops.render.render(write_still=True)
        for o in held: o.is_holdout = False
        scene.render.film_transparent = False
    if p["mask"]:
        saved = swap_materials(p["mask"])
        vt, lk = scene.view_settings.view_transform, scene.view_settings.look
        scene.view_settings.view_transform = 'Standard'; scene.view_settings.look = 'None'
        w0 = scene.world; scene.world = WORLDS["black"]
        scene.cycles.samples = 4; scene.cycles.use_denoising = False
        scene.render.filepath = os.path.join(OUT, f"{name}__mask.png")
        bpy.ops.render.render(write_still=True)
        scene.cycles.samples = SAMPLES; scene.cycles.use_denoising = True
        scene.view_settings.view_transform = vt; scene.view_settings.look = lk; scene.world = w0
        restore_materials(saved)
    print("PLATE", name, "done", flush=True)

# --- interior plates (bus local frame) ---
HX = HIS_ROW
WIN_Y, AISLE_Y = seat_y("R", "window"), seat_y("R", "aisle")
BI = ["BUS_INTERIOR"]
red = lambda: set_red(1.0)
plate("bus_aisle_front", BI, (-5.05, 0.0, 1.6), (5.6, 0.0, 1.5), 20)
plate("bus_aisle_front_red", BI, (-5.05, 0.0, 1.6), (5.6, 0.0, 1.5), 20, red)
plate("bus_aisle_back", BI, (4.0, -0.05, 1.62), (-5.6, 0.0, 1.2), 20)
plate("bus_seat_side", BI, (HX + 0.15, 1.05, 1.3), (HX + 0.05, -1.25, 0.95), 20)
plate("bus_seat_side_red", BI, (HX + 0.15, 1.05, 1.3), (HX + 0.05, -1.25, 0.95), 20, red)
ROWFG = [f"seat_{p}_R{HX + 0.85:+.2f}" for p in ("cush", "back", "shell", "base", "rail")]
RW = ((HX + 1.5, 0.24, 1.66), (HX + 0.0, -0.8, 0.86), 22)
plate("bus_row", BI, *RW, fg=ROWFG, mask=["glass_R"])
plate("bus_row_red", BI, *RW, red, fg=ROWFG, mask=["glass_R"])
plate("bus_seat_window", BI, (HX - 0.55, -0.15, 1.38), (HX + 0.25, -1.25, 1.32), 24, mask=["glass_R"])
plate("bus_seat_window_red", BI, (HX - 0.55, -0.15, 1.38), (HX + 0.25, -1.25, 1.32), 24, red, mask=["glass_R"])
MD = ((1.15, 0.22, 1.5), (1.15, -1.3, 1.0), 16)
plate("bus_middoor", BI, *MD, mask=["door_void_mid"])
plate("bus_middoor_open", BI, *MD, lambda: set_doors(mid=1), mask=["door_void_mid"])
plate("bus_middoor_red", BI, *MD, red, mask=["door_void_mid"])
plate("bus_middoor_open_red", BI, *MD, lambda: (set_doors(mid=1), set_red(1.0)))
DV = ((3.45, -0.2, 1.62), (5.0, 0.62, 1.3), 24)
plate("bus_driver", BI, *DV, fg=["driver_partition"])
plate("bus_driver_red", BI, *DV, red, fg=["driver_partition"])
plate("bus_clock", BI, (4.1, -0.25, 1.7), (5.35, 0.0, 2.05), 50)
CS = ((3.85, -0.05, 1.7), (5.35, -0.36, 2.05), 30)
plate("bus_clock_stop", BI, *CS, lambda: set_stopsign(True))
plate("bus_clock_stop_red", BI, *CS, lambda: (set_stopsign(True), set_red(1.0)))
plate("bus_underseat", BI + ["FILL_UNDERSEAT"], (HX + 0.62, -0.62, 0.24), (HX + 0.15, -0.68, 0.2), 30)
CD = ((HX + 0.05, -0.62, 1.5), (HX + 1.6, -1.16, 1.93), 26)
plate("bus_cord", BI, *CD)
plate("bus_cord_red", BI, *CD, red)
plate("bus_front_door", BI, (3.2, 0.12, 1.6), (5.0, -1.3, 1.05), 20, lambda: set_doors(front=1), mask=["door_void_front"])
# --- exterior plates ---
plate("station_wide", ["STATION"], (-11.0, -1.6, 1.65), (10.0, 0.4, 1.5), 22)
plate("station_close", ["STATION"], (0.2, -1.6, 1.6), (6.0, 0.9, 2.7), 28)
nobus = lambda: hide_bus_in("STREET"); nobus_b = lambda: hide_bus_in("STREET_BLDG")
plate("street_station", ["STREET"], (-3.5, 9.2, 1.55), (16.0, 3.0, 1.5), 22, nobus)
plate("street_station_door", ["STREET"], (0.6, 8.8, 1.55), (2.0, 5.65, 1.35), 20, lambda: set_doors(front=1))
plate("street_station_sign", ["STREET"], (-3.0, 3.0, 0.9), (1.2, 4.4, 2.5), 26)
plate("street_bldg_bus", ["STREET_BLDG"], (-2.4, 9.7, 1.5), (4.0, 5.2, 1.6), 22, lambda: set_doors(mid=1))
plate("street_bldg_bus_closed", ["STREET_BLDG"], (-2.4, 9.7, 1.5), (4.0, 5.2, 1.6), 22, red)
plate("street_bldg_window", ["STREET_BLDG"], (5.2, 8.4, 1.7), (5.45, 5.6, 1.75), 30, red, mask=["glass_R"])
plate("bldg_from_bus", ["STREET_BLDG"], (13.0, 4.8, 2.0), (6.0, 12.0, 3.6), 20, nobus_b)
plate("bldg_stop_from_door", ["STREET_BLDG"], (2.0, 3.9, 1.75), (2.0, 9.5, 1.3), 18, nobus_b)
plate("street_bldg_empty", ["STREET_BLDG"], (8.0, 8.2, 1.6), (-30.0, 7.0, 2.4), 22, nobus_b)
plate("apt_kitchen_photo", ["APARTMENT"], (-0.8, -0.9, 1.45), (-0.8, 2.3, 0.95), 26, fg=["table_", "chair1_"])
plate("apt_kitchen_cam", ["APARTMENT"], (1.8, -1.2, 2.45), (-0.8, 1.9, 0.7), 16, fg=["table_", "chair1_"])
plate("apt_living", ["APARTMENT"], (-2.4, -2.9, 1.55), (3.3, 0.0, 1.0), 22)
plate("apt_living_open", ["APARTMENT"], (-2.4, -2.9, 1.55), (3.3, 0.0, 1.0), 22, lambda: set_apt_door(0.8))
BO = ((0.55, -1.25, 1.66), (-0.12, 1.45, 1.55), 30)
plate("bath_mirror_os", ["BATHROOM"], *BO, mask=["mirror_glass"])
plate("bath_mirror_os_dark", ["BATHROOM"], *BO, lambda: set_bath_light(False))
plate("street_bldg_bus_red", ["STREET_BLDG"], (-2.4, 9.7, 1.5), (4.0, 5.2, 1.6), 22, lambda: (set_doors(mid=1), set_red(1.0)))
plate("bath_mirror", ["BATHROOM"], (0.0, -1.75, 1.62), (0.0, 1.45, 1.55), 26, mask=["mirror_glass"])
plate("bath_mirror_dark", ["BATHROOM"], (0.0, -1.75, 1.62), (0.0, 1.45, 1.55), 26, lambda: set_bath_light(False))

# bus placements in the street sets: N1 front door at the shelter, N3 middle door at the shelter
STATION_BUS = (2.0 + 4.9, 4.4)
BLDG_BUS = (2.0 + 1.15, 4.4)

def build_all():
    clear()
    scene = bpy.context.scene
    setup_render(scene)
    mkworld("night", (0.003, 0.005, 0.012)); mkworld("black", (0, 0, 0), 0.0)
    materials()
    build_bus_interior(); build_bus_shell(); build_bus_surround(); bus_group()
    fill = coll("FILL_UNDERSEAT")
    point_light("underseat_fill", (HIS_ROW + 0.5, -0.5, 0.3), 1.2, (0.6, 0.75, 1.0), 0.2, fill)
    build_station(); build_street(False); build_street(True); build_apartment(); build_bathroom()
    for name, off in OFFSETS.items():
        for o in bpy.data.collections[name].objects:
            if o.parent is None: o.location += Vector(off)
    so = OFFSETS["STREET"]; bo = OFFSETS["STREET_BLDG"]
    place_bus(bpy.data.collections["STREET"], "BUS_AT_STATION", (STATION_BUS[0] + so[0], STATION_BUS[1] + so[1]), math.pi)
    place_bus(bpy.data.collections["STREET_BLDG"], "BUS_AT_BLDG", (BLDG_BUS[0] + bo[0], BLDG_BUS[1] + bo[1]), math.pi)
    scene.world = WORLDS["night"]

def hide_bus_in(coll_name, hide=True):
    for o in bpy.data.collections[coll_name].objects:
        if o.name.startswith("BUS_AT"): o.hide_render = hide

# ───────────────────────────────────────────── animated plates (real 3D motion)
def anim_arrive_station(path, frames=75):
    """bus drives in from the right, brakes to a stop at the shelter, front door folds open."""
    scene = bpy.context.scene; so = Vector(OFFSETS["STREET"])
    layer_visibility(["STREET"]); reset_states(); scene.world = WORLDS["night"]
    bus = bpy.data.objects["BUS_AT_STATION"]
    stop_x = STATION_BUS[0] + so[0]
    stop_f = 56
    for f in range(1, frames + 1):
        if f <= stop_f:
            u = (f - 1) / (stop_f - 1)
            x = stop_x + 28 * (1 - u) ** 1.8        # decelerating approach (~50 km/h → 0)
        else:
            x = stop_x
        bus.location.x = x; bus.keyframe_insert("location", frame=f)
        # nose dips under braking then settles
        dip = 0.0
        if stop_f - 7 < f <= stop_f + 8: dip = math.sin((f - (stop_f - 7)) / 15 * math.pi) * math.radians(1.2)
        bus.rotation_euler = (0, dip, math.pi); bus.keyframe_insert("rotation_euler", frame=f)
    set_doors(front=0, frame=stop_f + 4); set_doors(front=1, frame=stop_f + 13)
    cam = camera("CAM_anim_arrive", tuple(Vector((-1.2, 8.4, 1.35)) + so), tuple(Vector((9.0, 4.6, 1.6)) + so), lens=20)
    scene.camera = cam
    run_anim(path, frames, "anim_arrive_station", cam, OFFSETS["STREET"])

def anim_depart_bldg(path, frames=66):
    """bus pulls away from his building, drives off and turns right around the corner."""
    scene = bpy.context.scene; bo = Vector(OFFSETS["STREET_BLDG"])
    layer_visibility(["STREET_BLDG"]); reset_states(); set_red(1.0); scene.world = WORLDS["night"]
    bus = bpy.data.objects["BUS_AT_BLDG"]
    x0 = BLDG_BUS[0] + bo[0]; y0 = BLDG_BUS[1] + bo[1]
    # path: straight along -x, then a right turn (heading +y) around x = -33
    import mathutils
    pts = []
    for f in range(1, frames + 1):
        u = (f - 1) / (frames - 1)
        s = 52 * u ** 1.7                          # distance along the path (accelerating)
        straight = (x0 - (-31.0 + bo[0]))
        if s <= straight:
            x, y, h = x0 - s, y0, math.pi
        else:
            r = 5.0; a = min((s - straight) / r, math.pi / 2)
            cx, cy = -31.0 + bo[0], y0 + r
            x = cx - r * math.sin(a); y = cy - r * math.cos(a); h = math.pi - a
            if (s - straight) > r * math.pi / 2:
                extra = (s - straight) - r * math.pi / 2
                x = cx - r; y = cy + extra; h = math.pi / 2
        bus.location = (x, y, 0.35); bus.rotation_euler = (0, 0, h)
        bus.keyframe_insert("location", frame=f); bus.keyframe_insert("rotation_euler", frame=f)
    cam = camera("CAM_anim_depart", tuple(Vector((8.5, 8.6, 1.6)) + bo), tuple(Vector((-28.0, 6.5, 2.3)) + bo), lens=24)
    scene.camera = cam
    run_anim(path, frames, "anim_depart_bldg", cam, OFFSETS["STREET_BLDG"])

def anim_apt_door(path, frames=45):
    scene = bpy.context.scene; ao = Vector(OFFSETS["APARTMENT"])
    layer_visibility(["APARTMENT"]); reset_states(); scene.world = WORLDS["night"]
    set_apt_door(0, frame=1); set_apt_door(0, frame=6); set_apt_door(0.82, frame=frames)
    p = PLATES["apt_living"]
    cam = camera("CAM_anim_door", tuple(Vector(p["loc"]) + ao), tuple(Vector(p["look"]) + ao), lens=p["lens"])
    scene.camera = cam
    run_anim(path, frames, "anim_apt_door", cam)

def run_anim(path, frames, name, cam, offset=(0, 0, 0)):
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, frames
    scene.render.fps = 15
    scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
    scene.cycles.samples = ANIM_SAMPLES
    os.makedirs(path, exist_ok=True)
    scene.render.filepath = os.path.join(path, "f_")
    CAMS[name] = dict(loc=list(cam.location), rot=[list(r) for r in cam.rotation_euler.to_matrix()], lens=cam.data.lens, sensor=cam.data.sensor_width, res=list(RES), offset=list(offset))
    bpy.ops.render.render(animation=True)
    scene.render.use_motion_blur = False

ANIM_SAMPLES = 24
if __name__ == "__main__":
    import json
    build_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "sets.blend"))
    names = list(PLATES) if (not want or want == ["all"]) else want
    camfile = os.path.join(OUT, "cams.json")
    if os.path.exists(camfile): CAMS.update(json.load(open(camfile)))
    for n in names:
        if n.startswith("anim_"):
            fn = globals()[n]; fn(os.path.join(OUT, n))
        else:
            render_plate(n)
        json.dump(CAMS, open(camfile, "w"), indent=1)
