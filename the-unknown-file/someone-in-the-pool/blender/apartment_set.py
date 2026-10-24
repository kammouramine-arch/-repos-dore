"""Builds apartment.blend — the guard's flat (3rd floor), the building corridor + stairwell, the street and his car (Night 3).

Floor plan (metres, +Y north, +X east; flat floor z = 0, ceiling 2.55):
  HALL        x 0.0-1.6  y 0.0-3.4   front door (3C) in the south wall at x 0.3-1.2 (lever handle, deadbolt).
  BATHROOM    x 1.6-4.2  y 0.0-2.8   door in its NORTH wall at x 2.5-3.3 (opens inward), mirror + sink on the west wall,
                                      bathtub along the south wall, toilet east; light over the mirror.
  LANDING     x 1.6-4.2  y 2.8-3.4   between the bathroom door and the living room; MAIN WATER VALVE on the wall at (1.62, 3.1).
  BEDROOM     x 4.2-9.0  y 0.0-3.4   door in its north wall (kept closed).
  LIVING      x 0.0-6.0  y 3.4-8.0   sofa facing west; window north; lamp.
  KITCHEN     x 6.0-9.0  y 3.4-8.0   counters along the east wall.
  CORRIDOR    y -2.0-0.0, x -8.0-10.0; doors 3A, 3B, 3C (his), 3D; STAIRWELL at the west end x -8.0 to -5.0
              (stairs down: two flights). Ground floor exit leads to the STREET.
  STREET      separate area at x 30-50 (ground level z = -9): building entrance, pavement, road, street lamp,
              his parked car (driver door on the pavement side? no — kerbside passenger), heading east.
"""
import bpy, bmesh, os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
import setkit as K
from setkit import box, cyl, wall_x, wall_y, tex_mat, mat, area_light, point_light, import_gltf, door_leaf, door_frame, text, link

S = K.init(["FLAT", "BATHROOM", "WET", "CORRIDOR", "STAIRS", "STREET", "CAR", "LIGHTS_WARM", "LIGHTS_BATH", "LIGHTS_CORRIDOR",
            "LIGHTS_STREET", "EXTERIOR"])
C = K.COLS
H = 2.55
T_EXT, T_IN = 0.25, 0.12

M_FLOOR = tex_mat("flat_floor", "laminate_floor_02", 1.6, (0.85, 0.78, 0.7), 1.0, 0.4)
M_WALL = tex_mat("flat_wall", "painted_plaster_wall", 1.6, (0.86, 0.82, 0.74), 1.0, 0.15)
M_BTILE = tex_mat("bath_tiles", "interior_tiles", 0.9, (0.85, 0.88, 0.88), 0.6, 0.5)
M_CORR_FLOOR = tex_mat("corr_floor", "concrete_floor_painted", 1.6, (0.5, 0.5, 0.47), 0.9, 0.3)
M_CORR_WALL = tex_mat("corr_wall", "painted_plaster_wall", 1.6, (0.6, 0.62, 0.58), 1.0, 0.25)
M_ASPH = tex_mat("asphalt", "asphalt_floor", 2.0, (0.6, 0.6, 0.62), 0.8, 0.6)
M_CABS = tex_mat("cabinets", "kitchen_wood", 0.8, (0.8, 0.75, 0.7), 1.0, 0.3)
M_CEIL = mat("ceiling", (0.82, 0.81, 0.78), 0.9)
M_DOOR = mat("door", (0.78, 0.76, 0.72), 0.45, noise=0.01)
M_FRONT = mat("front_door", (0.2, 0.22, 0.25), 0.45, noise=0.02)
M_STEEL = K.M_STEEL
M_CERAMIC = mat("ceramic", (0.92, 0.92, 0.91), 0.12, coat=0.5)
M_MIRROR = mat("mirror", (0.92, 0.92, 0.92), 0.02, 1.0)
M_DARK = mat("dark", (0.04, 0.04, 0.045), 0.5)
M_RED = mat("valve_red", (0.6, 0.05, 0.03), 0.4)
M_FABRIC = mat("sofa_fabric", (0.18, 0.2, 0.24), 0.95, noise=0.2)
M_CONC = mat("stair_concrete", (0.45, 0.45, 0.43), 0.8, noise=0.2)


def glass_mat(name, tint=(0.85, 0.9, 0.92), refl=0.12):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (*tint, 1)
    gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.02
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.2
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = refl * 0.4; mr.inputs["To Max"].default_value = min(1.0, refl * 4)
    nt.links.new(lw.outputs["Fresnel"], mr.inputs["Value"])
    ms = nt.nodes.new("ShaderNodeMixShader"); nt.links.new(mr.outputs["Result"], ms.inputs[0]); nt.links.new(tr.outputs[0], ms.inputs[1]); nt.links.new(gl.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out.inputs["Surface"])
    m.surface_render_method = "BLENDED"
    return m


M_GLASS = glass_mat("glass")

# ------------------------------------------------------------------ FLAT structure
K.CUR[0] = C["FLAT"]
fc = C["FLAT"]
box("floor", 0, 0, -0.05, 9.0, 8.0, 0, M_FLOOR, fc)
box("ceiling", -0.2, -0.2, H, 9.2, 8.2, H + 0.05, M_CEIL, fc)
wall_x("wall_s", -T_EXT / 2, -0.2, 9.2, T_EXT, [(0.3, 1.2, 0, 2.1)], M_WALL, fc, 0, H)
wall_x("wall_n", 8.0 + T_EXT / 2, -0.2, 9.2, T_EXT, [(2.0, 4.0, 0.9, 2.2)], M_WALL, fc, 0, H)
wall_y("wall_w", -T_EXT / 2, -0.2, 8.2, T_EXT, [], M_WALL, fc, 0, H)
wall_y("wall_e", 9.0 + T_EXT / 2, -0.2, 8.2, T_EXT, [(1.0, 2.4, 0.9, 2.2)], M_WALL, fc, 0, H)
wall_y("wall_hall_bath", 1.6, 0.0, 2.8, T_IN, [], M_WALL, fc, 0, H)
wall_x("wall_bath_n", 2.8, 1.6, 4.2, T_IN, [(2.5, 3.3, 0, 2.1)], M_WALL, fc, 0, H)
wall_y("wall_bath_bed", 4.2, 0.0, 3.4, T_IN, [], M_WALL, fc, 0, H)
wall_x("wall_bed_n", 3.4, 4.2, 9.0, T_IN, [(5.0, 5.8, 0, 2.1)], M_WALL, fc, 0, H)
box("bath_floor", 1.66, 0.06, -0.049, 4.14, 2.74, 0.003, M_BTILE, C["BATHROOM"])
for (x0, y0, x1, y1) in ((1.66, 0.06, 4.14, 0.08), (1.66, 0.06, 1.68, 2.74), (4.12, 0.06, 4.14, 2.74), (1.66, 2.72, 4.14, 2.74)):
    box("bath_wall_tiles", x0, y0, 0, x1, y1, 1.9, M_BTILE, C["BATHROOM"])
# front door 3C (inward, hinge west) + frame + deadbolt
door_frame("frame_front", 0.3, 1.2, -T_EXT / 2, T_EXT, fc)
FD = door_leaf("FRONT_DOOR", (0.3, -0.05, 0), 0.9, 0, M_FRONT, fc, 0.05, plate="3C")
db = cyl("deadbolt", 0, 0, 0, 0.02, 0.022, M_STEEL, fc); db.rotation_euler = (math.radians(90), 0, 0); db.location = (0.83, 0.04, 1.32); db.parent = FD
# bathroom door (north wall, hinge east, opens into the bathroom)
door_frame("frame_bath", 2.5, 3.3, 2.8, T_IN, fc)
BD = door_leaf("BATH_DOOR", (3.3, 2.8, 0), 0.8, 180, M_DOOR, fc, 0.04)
door_frame("frame_bed", 5.0, 5.8, 3.4, T_IN, fc)
door_leaf("BED_DOOR", (5.0, 3.4, 0), 0.8, 0, M_DOOR, fc, 0.04)
# main water valve (wall-mounted pipe + red wheel) beside the bathroom door
cyl("valve_pipe", 1.70, 3.05, 0.0, 1.1, 0.02, M_STEEL, fc, 12)
VW = bpy.data.objects.new("VALVE", None); link(VW, fc); VW.location = (1.74, 3.05, 0.62); VW.rotation_euler = (0, math.radians(90), 0)
bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.01, major_segments=24, minor_segments=8)
vt = bpy.context.object; vt.name = "valve_wheel"; link(vt, fc); vt.data.materials.append(M_RED); vt.parent = VW; vt.location = (0, 0, 0)
for k in range(3):
    sp_ = box(f"valve_spoke_{k}", -0.07, -0.006, -0.006, 0.07, 0.006, 0.006, M_RED, fc); sp_.parent = VW; sp_.rotation_euler = (0, 0, math.radians(60 * k))

# ------------------------------------------------------------------ BATHROOM fittings
K.CUR[0] = C["BATHROOM"]
bc = C["BATHROOM"]
box("bathtub", 1.7, 0.1, 0, 3.6, 0.85, 0.56, M_CERAMIC, bc, 0.03)
box("toilet_base", 3.7, 1.0, 0, 4.1, 1.4, 0.42, M_CERAMIC, bc, 0.04)
box("toilet_tank", 3.95, 1.02, 0.42, 4.11, 1.38, 0.8, M_CERAMIC, bc, 0.02)
box("sink", 1.7, 1.55, 0.78, 2.15, 2.15, 0.88, M_CERAMIC, bc, 0.02)
box("sink_pedestal", 1.75, 1.75, 0.0, 1.95, 1.95, 0.78, M_CERAMIC, bc, 0.02)
cyl("tap", 1.73, 1.85, 0.88, 1.06, 0.012, M_STEEL, bc, 12)
box("tap_spout", 1.73, 1.84, 1.03, 1.86, 1.86, 1.06, M_STEEL, bc)
MIR = box("MIRROR", 1.685, 1.45, 1.1, 1.70, 2.25, 1.85, M_MIRROR, bc)
# fog + message layer on the mirror (shader driven per shot: FOG amount, TEXT reveal)
fm = bpy.data.materials.new("mirror_fog"); fm.use_nodes = True; nt = fm.node_tree; nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (0.75, 0.78, 0.78, 1)
tr = nt.nodes.new("ShaderNodeBsdfTransparent")
fog = nt.nodes.new("ShaderNodeValue"); fog.name = "FOG"; fog.outputs[0].default_value = 0.0
tx = nt.nodes.new("ShaderNodeTexImage"); tx.name = "MSG"
uvn = nt.nodes.new("ShaderNodeUVMap")
nt.links.new(uvn.outputs["UV"], tx.inputs["Vector"])
rev = nt.nodes.new("ShaderNodeValue"); rev.name = "REVEAL"; rev.outputs[0].default_value = 0.0
# fog density = FOG * (1 - text_mask * REVEAL) * breakup noise
ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 18; ns.inputs["Detail"].default_value = 6
nt.links.new(uvn.outputs["UV"], ns.inputs["Vector"])
nm = nt.nodes.new("ShaderNodeMapRange"); nm.inputs["To Min"].default_value = 0.65; nm.inputs["To Max"].default_value = 1.0
nt.links.new(ns.outputs["Fac"], nm.inputs["Value"])
tm = nt.nodes.new("ShaderNodeMath"); tm.operation = "MULTIPLY"; nt.links.new(tx.outputs["Color"], tm.inputs[0]); nt.links.new(rev.outputs[0], tm.inputs[1])
inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; nt.links.new(tm.outputs[0], inv.inputs[1])
f1 = nt.nodes.new("ShaderNodeMath"); f1.operation = "MULTIPLY"; nt.links.new(fog.outputs[0], f1.inputs[0]); nt.links.new(inv.outputs[0], f1.inputs[1])
f2 = nt.nodes.new("ShaderNodeMath"); f2.operation = "MULTIPLY"; f2.use_clamp = True; nt.links.new(f1.outputs[0], f2.inputs[0]); nt.links.new(nm.outputs["Result"], f2.inputs[1])
ms = nt.nodes.new("ShaderNodeMixShader"); nt.links.new(f2.outputs[0], ms.inputs[0]); nt.links.new(tr.outputs[0], ms.inputs[1]); nt.links.new(dif.outputs[0], ms.inputs[2])
nt.links.new(ms.outputs[0], out.inputs["Surface"])
fm.surface_render_method = "BLENDED"
me = bpy.data.meshes.new("MIRROR_FOG")
# plane on the mirror face (facing +X, into the room); seen from inside (looking west) the viewer's right is +Y, so u runs south->north
me.from_pydata([(1.702, 1.45, 1.1), (1.702, 2.25, 1.1), (1.702, 2.25, 1.85), (1.702, 1.45, 1.85)], [], [(0, 3, 2, 1)])
me.uv_layers.new(); uvd = me.uv_layers[0].data
for k, c in enumerate(((0, 0), (0, 1), (1, 1), (1, 0))):
    uvd[k].uv = c
me.materials.append(fm)
FOGO = bpy.data.objects.new("MIRROR_FOG", me); link(FOGO, bc); FOGO.visible_shadow = False
box("towel_rail", 4.12, 1.6, 1.0, 4.14, 2.3, 1.03, M_STEEL, bc)
box("towel", 4.08, 1.7, 0.7, 4.11, 2.2, 1.03, mat("towel", (0.3, 0.42, 0.5), 0.95, noise=0.3), bc)
box("bath_mat", 2.2, 0.95, 0.003, 2.9, 1.4, 0.012, mat("bathmat", (0.55, 0.6, 0.62), 0.95, noise=0.4), bc)
box("bath_light", 1.71, 1.6, 1.95, 1.78, 2.1, 2.02, mat("bath_bulb", (0.95, 0.92, 0.85), 0.3, emit=(1.0, 0.92, 0.8), emit_s=4.0), bc)

# water seeping under the bathroom door: a thin, growing sheet (shape keys/scale driven per shot)
K.CUR[0] = C["WET"]
wm = bpy.data.materials.new("floor_water"); wm.use_nodes = True; b = wm.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.05, 0.06, 0.06, 1); b.inputs["Roughness"].default_value = 0.02; b.inputs["Coat Weight"].default_value = 1.0
b.inputs["Alpha"].default_value = 0.55
nt = wm.node_tree; ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 30; ns.name = "WATER_RIPPLE"
ns.noise_dimensions = "4D"
bp_ = nt.nodes.new("ShaderNodeBump"); bp_.inputs["Strength"].default_value = 0.05
nt.links.new(ns.outputs["Fac"], bp_.inputs["Height"]); nt.links.new(bp_.outputs["Normal"], b.inputs["Normal"])
wm.surface_render_method = "BLENDED"
bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=40, size=1.0)
puddle = bpy.context.object; puddle.name = "DOOR_WATER"; link(puddle, C["WET"])
puddle.scale = (1.6, 1.2, 1); puddle.location = (2.9, 3.35, 0.003)
bpy.ops.object.transform_apply(scale=True)
puddle.data.materials.append(wm)
# irregular outline: a mask texture via a displace-free vertex alpha is overkill; use a tapered shape + noise
for v in puddle.data.vertices:
    dx, dy = (v.co.x - 2.9) / 0.8, (v.co.y - 3.35) / 0.6
    v.co.z = 0.003
puddle.modifiers.new("smooth", "SMOOTH")
# wet footprints (N3 bathroom): pre-built decals, revealed per shot
M_PRINT = bpy.data.materials.new("wet_print"); M_PRINT.use_nodes = True; bp2 = M_PRINT.node_tree.nodes["Principled BSDF"]
bp2.inputs["Base Color"].default_value = (0.03, 0.035, 0.035, 1); bp2.inputs["Roughness"].default_value = 0.02; bp2.inputs["Coat Weight"].default_value = 1.0; bp2.inputs["Alpha"].default_value = 0.7
M_PRINT.surface_render_method = "BLENDED"

# ------------------------------------------------------------------ LIVING + KITCHEN
K.CUR[0] = C["FLAT"]
import_gltf("sofa_03", (3.6, 5.9, 0), -90, 1.0, fc, "SOFA")     # faces west, toward the TV
box("coffee_table", 1.7, 5.2, 0.0, 2.7, 6.4, 0.42, mat("ctable", (0.25, 0.17, 0.1), 0.45), fc, 0.01)
box("tv_unit", 0.0, 5.0, 0.0, 0.45, 6.8, 0.5, mat("tvunit", (0.12, 0.12, 0.13), 0.5), fc, 0.01)
box("tv", 0.05, 5.3, 0.55, 0.12, 6.5, 1.25, M_DARK, fc)
box("rug", 1.2, 4.8, 0.0, 3.3, 7.0, 0.01, mat("rug", (0.35, 0.22, 0.18), 0.95, noise=0.4), fc)
box("counter", 8.4, 3.8, 0.0, 9.0, 7.6, 0.9, M_CABS, fc, 0.005)
box("counter_top", 8.35, 3.8, 0.9, 9.0, 7.6, 0.94, mat("ctop", (0.7, 0.7, 0.68), 0.3), fc)
box("fridge", 8.3, 7.0, 0.0, 9.0, 7.95, 1.85, mat("fridge", (0.82, 0.83, 0.84), 0.3), fc, 0.01)
box("kitchen_table", 6.6, 5.0, 0.72, 7.6, 6.0, 0.76, mat("ktable", (0.4, 0.3, 0.2), 0.5), fc, 0.006)
for (xx, yy) in ((6.65, 5.05), (7.55, 5.05), (6.65, 5.95), (7.55, 5.95)):
    box("ktable_leg", xx - 0.025, yy - 0.025, 0, xx + 0.025, yy + 0.025, 0.72, mat("ktable", (0.4, 0.3, 0.2), 0.5), fc)
cyl("lamp_pole", 4.6, 7.6, 0.0, 1.5, 0.012, M_DARK, fc, 10)
bpy.ops.mesh.primitive_cone_add(radius1=0.22, radius2=0.15, depth=0.3, location=(4.6, 7.6, 1.55), end_fill_type="NOTHING")
ls = bpy.context.object; ls.name = "lamp_shade"; link(ls, fc); ls.data.materials.append(mat("lampshade", (0.9, 0.8, 0.6), 0.8, emit=(1.0, 0.75, 0.45), emit_s=1.2))
box("win_n_glass", 2.04, 8.11, 0.94, 3.96, 8.13, 2.16, M_GLASS, fc).visible_shadow = False
box("win_n_curtain_l", 1.8, 7.95, 0.8, 2.3, 8.0, 2.45, mat("curtain", (0.3, 0.32, 0.36), 0.95, noise=0.3), fc)
box("win_n_curtain_r", 3.7, 7.95, 0.8, 4.2, 8.0, 2.45, mat("curtain", (0.3, 0.32, 0.36), 0.95, noise=0.3), fc)
box("coat_hooks", 0.02, 1.2, 1.7, 0.05, 2.2, 1.75, M_STEEL, fc)
box("hall_jacket", 0.03, 1.4, 1.0, 0.18, 1.85, 1.72, mat("jacket", (0.12, 0.14, 0.18), 0.9, noise=0.3), fc)
# phone on the coffee table / keys
CLK = bpy.data.objects.new("CLOCK", None); link(CLK, fc); CLK.location = (5.9, 3.47, 1.95); CLK.rotation_euler = (math.radians(90), 0, math.radians(180))
cyl("clock_face", 0, 0, 0.012, 0.03, 0.15, mat("clock_face", (0.92, 0.91, 0.88), 0.4), fc, 48).parent = CLK
cyl("clock_rim", 0, 0, 0.0, 0.035, 0.16, M_DARK, fc, 48).parent = CLK
box("CLOCK_hour", -0.006, -0.015, 0.035, 0.006, 0.075, 0.039, M_DARK, fc).parent = CLK
box("CLOCK_minute", -0.004, -0.02, 0.039, 0.004, 0.11, 0.042, M_DARK, fc).parent = CLK
box("CLOCK_second", -0.0015, -0.03, 0.042, 0.0015, 0.12, 0.044, mat("clock_red", (0.6, 0.05, 0.04), 0.4), fc).parent = CLK

# ------------------------------------------------------------------ BUILDING CORRIDOR + STAIRWELL
K.CUR[0] = C["CORRIDOR"]
cc = C["CORRIDOR"]
box("corr_floor", -8.0, -2.15, -0.05, 10.0, 0.0, 0.0, M_CORR_FLOOR, cc)
box("corr_ceiling", -8.0, -2.15, 2.5, 10.0, 0.0, 2.55, M_CEIL, cc)
box("corr_skin_n_a", -5.0, -0.14, 0, 0.3, -0.125, 2.5, M_CORR_WALL, cc)
box("corr_skin_n_b", 1.2, -0.14, 0, 10.0, -0.125, 2.5, M_CORR_WALL, cc)
box("corr_skin_n_top", 0.3, -0.14, 2.1, 1.2, -0.125, 2.5, M_CORR_WALL, cc)
wall_x("corr_wall_s", -2.25, -8.0, 10.0, 0.2, [(3.0, 3.9, 0, 2.1), (-3.0, -2.1, 0, 2.1)], M_CORR_WALL, cc, 0, 2.5)
wall_y("corr_end_e", 10.0, -2.2, 0.0, 0.2, [], M_CORR_WALL, cc, 0, 2.5)
for (nm_, x0_, yy, flip) in (("3A", -3.0, -2.25, True), ("3B", 3.0, -2.25, True), ("3D", 6.0, 0.0, False)):
    if flip:
        door_frame("frame_" + nm_, x0_, x0_ + 0.9, yy, 0.2, cc)
        door_leaf("DOOR_" + nm_, (x0_ + 0.9, yy + 0.08, 0), 0.9, 180, M_FRONT, cc, 0.05, plate=nm_)
    else:
        box("door_" + nm_ + "_flat", x0_, -0.16, 0.0, x0_ + 0.9, -0.13, 2.1, M_FRONT, cc)
        text("plate_" + nm_, nm_, (x0_ + 0.45, -0.165, 1.62), 0.085, K.M_BRASS, (math.pi / 2, 0, 0), cc, 0.004, font=K.FONT)
# stairwell (west end): opening at x -5, two flights down to a landing
K.CUR[0] = C["STAIRS"]
sc = C["STAIRS"]
box("stair_wall_n", -8.0, -0.14, -9.0, -5.0, 0.0, 2.5, M_CORR_WALL, sc)
box("stair_wall_s", -8.0, -2.3, -9.0, -5.0, -2.15, 2.5, M_CORR_WALL, sc)
box("stair_wall_w", -8.2, -2.3, -9.0, -8.0, 0.0, 2.5, M_CORR_WALL, sc)
box("stair_landing_top", -6.0, -2.15, -0.05, -5.0, 0.0, 0.0, M_CONC, sc)
n_steps, TR, RS = 9, 0.22, 0.165
for k in range(n_steps):      # flight 1: west along the north half, down from the corridor (z 0) to the mid landing
    x = -6.0 - k * TR
    box(f"step1_{k}", x - TR, -1.08, -1.6, x, 0.0, -(k + 1) * RS, M_CONC, sc)
box("stair_landing_mid", -8.0, -2.15, -1.6, -7.98, 0.0, -n_steps * RS, M_CONC, sc)
box("stair_landing_mid2", -7.98 - 0.0, -2.15, -1.6, -6.98 - 0.0, -1.08, -n_steps * RS, M_CONC, sc)
for k in range(n_steps):      # flight 2: east along the south half, down to the floor below
    x = -6.98 + k * TR
    box(f"step2_{k}", x, -2.15, -3.2, x + TR, -1.1, -n_steps * RS - (k + 1) * RS, M_CONC, sc)
box("stair_spine", -8.0, -1.1, -3.2, -6.0, -1.06, -0.4, M_CONC, sc)
for k, (z0, z1) in enumerate(((-0.05, -1.5), (-1.55, -3.0))):
    cu = bpy.data.curves.new(f"stair_rail_{k}", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.02
    spl = cu.splines.new("POLY"); spl.points.add(1)
    x0, x1 = (-6.0, -7.98) if k == 0 else (-6.98, -5.0)
    spl.points[0].co = (x0, -1.05, z0 + 0.9, 1); spl.points[1].co = (x1, -1.05, z1 + 0.9, 1)
    ro = bpy.data.objects.new(f"stair_rail_{k}", cu); link(ro, sc); cu.materials.append(M_STEEL)
box("stair_exit_sign", -5.15, -1.4, 2.15, -5.05, -0.8, 2.35, mat("exit", (0.1, 0.8, 0.2), 0.4, emit=(0.1, 1.0, 0.25), emit_s=6.0), sc)

# ------------------------------------------------------------------ STREET + CAR (ground level, separate area)
K.CUR[0] = C["STREET"]
stc = C["STREET"]
GZ = -9.0
box("pavement", 28.0, -6.0, GZ - 0.15, 52.0, 0.0, GZ + 0.12, M_CORR_FLOOR, stc)
box("kerb", 28.0, -6.2, GZ - 0.15, 52.0, -6.0, GZ + 0.12, M_CONC, stc)
box("road", 28.0, -14.0, GZ - 0.2, 52.0, -6.2, GZ, M_ASPH, stc)
box("facade", 28.0, 0.0, GZ, 52.0, 0.4, GZ + 12.0, mat("brick_facade", (0.32, 0.2, 0.16), 0.85, noise=0.4), stc)
box("entrance_door", 33.0, -0.02, GZ + 0.12, 34.6, 0.02, GZ + 2.5, M_GLASS, stc).visible_shadow = False
box("entrance_frame", 32.9, -0.06, GZ + 0.12, 34.7, 0.0, GZ + 2.6, M_DARK, stc)
for k, x in enumerate((30.0, 37.0, 44.0, 50.0)):
    for j in range(3):
        box(f"facade_window_{k}_{j}", x, -0.01, GZ + 3.0 + j * 3.0, x + 1.4, 0.0, GZ + 4.6 + j * 3.0,
            mat(f"fw{k}{j}", (0.05, 0.06, 0.08), 0.2, emit=(1.0, 0.75, 0.45), emit_s=0.6 if (k + j) % 3 == 0 else 0.0), stc)
import_gltf("street_lamp_01", (38.5, -5.7, GZ + 0.12), 180, 1.0, stc, "STREETLAMP")
# the car: compact hatchback, dark grey, parked heading east at the kerb (driver side = road side, north = kerb = passenger)
K.CUR[0] = C["CAR"]
car = bpy.data.objects.new("CAR", None); link(car, C["CAR"]); car.location = (40.0, -7.15, GZ)
M_PAINT = mat("car_paint", (0.08, 0.09, 0.1), 0.25, 0.6, coat=1.0)
M_TRIM = mat("car_trim", (0.02, 0.02, 0.02), 0.5)
M_SEAT = mat("car_seat", (0.06, 0.06, 0.065), 0.85, noise=0.3)
M_SEAT_WET = mat("car_seat_wet", (0.025, 0.026, 0.028), 0.08, coat=1.0, noise=0.15)
M_DASH = mat("dashboard", (0.03, 0.03, 0.032), 0.6, noise=0.1)
M_CARGLASS = glass_mat("car_glass", (0.6, 0.65, 0.7), 0.15)


def cpart(nm, a, m, bev=0.02):
    o = box(nm, *a, m, C["CAR"], bev); o.parent = car; return o


# body (local: +x forward, +y left/kerb, z up); length 4.15, width 1.75. Built from side profiles so the cabin is hollow
# (interior cameras see seats, dash and the real windows) and the silhouette reads as a hatchback.
def prof(nm, pts, y0, y1, m, bev=0.0):
    """extrude a closed (x, z) polygon across y0..y1, parented to the car"""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y0, z)) for (x, z) in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.y = y1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nm, me); link(o, C["CAR"]); me.materials.append(m); o.parent = car
    if bev:
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bev; bv.segments = 3; bv.limit_method = "ANGLE"
    for pg in me.polygons:
        pg.use_smooth = True
    return o


BELT = 0.97
SIDE = [(-2.02, 0.26), (-1.62, 0.26), (-1.6, 0.5), (-1.1, 0.5), (-1.08, 0.26), (1.08, 0.26), (1.1, 0.5), (1.6, 0.5), (1.62, 0.26),
        (2.02, 0.28), (2.08, 0.55), (2.04, 0.78), (1.85, 0.86), (0.95, BELT), (-1.9, BELT + 0.02), (-2.06, 0.95), (-2.1, 0.6)]
for sgn in (1, -1):
    prof(f"car_side_{'l' if sgn > 0 else 'r'}", SIDE, sgn * 0.835, sgn * 0.875, M_PAINT, 0.012)
prof("car_bonnet", [(0.95, 0.4), (1.08, 0.4), (1.1, 0.5), (1.6, 0.5), (1.62, 0.3), (2.02, 0.3), (2.08, 0.55), (2.04, 0.78), (1.85, 0.86), (0.95, BELT)], -0.84, 0.84, M_PAINT, 0.04)
prof("car_boot", [(-2.06, 0.3), (-1.62, 0.3), (-1.6, 0.5), (-1.45, 0.5), (-1.45, BELT + 0.02), (-1.9, BELT + 0.02), (-2.06, 0.95), (-2.1, 0.6)], -0.84, 0.84, M_PAINT, 0.04)
ROOF = [(0.44, 1.43), (-1.15, 1.47)]
prof("car_roof", [(0.48, 1.42), (0.44, 1.46), (-1.15, 1.5), (-1.22, 1.46), (-1.15, 1.44), (0.42, 1.4)], -0.74, 0.74, M_PAINT, 0.02)
# pillars: A along the windscreen edge, B, C along the rear window edge
for sgn in (1, -1):
    y0, y1 = sgn * 0.70, sgn * 0.80
    prof(f"car_pillar_a_{sgn}", [(0.98, BELT), (0.92, BELT), (0.4, 1.42), (0.47, 1.43)], min(y0, y1), max(y0, y1), M_PAINT, 0.01)
    prof(f"car_pillar_b_{sgn}", [(-0.32, BELT), (-0.22, BELT), (-0.22, 1.46), (-0.32, 1.46)], min(y0, y1), max(y0, y1), M_PAINT, 0.01)
    prof(f"car_pillar_c_{sgn}", [(-1.92, BELT + 0.02), (-1.8, BELT + 0.02), (-1.12, 1.47), (-1.2, 1.48)], min(y0, y1), max(y0, y1), M_PAINT, 0.01)
# glass: windscreen + rear window (slanted quads), side windows following the profile
def quad(nm, ps, m):
    me = bpy.data.meshes.new(nm); me.from_pydata(ps, [], [list(range(len(ps)))])
    o = bpy.data.objects.new(nm, me); link(o, C["CAR"]); me.materials.append(m); o.parent = car; o.visible_shadow = False
    return o
quad("glass_windscreen", [(0.95, -0.7, BELT), (0.95, 0.7, BELT), (0.43, 0.68, 1.42), (0.43, -0.68, 1.42)], M_CARGLASS)
quad("glass_rear", [(-1.86, -0.66, BELT + 0.03), (-1.86, 0.66, BELT + 0.03), (-1.16, 0.66, 1.46), (-1.16, -0.66, 1.46)], M_CARGLASS)
for sgn, sd in ((1, "l"), (-1, "r")):
    yy = sgn * 0.76
    quad(f"glass_front_{sd}", [(0.9, yy, BELT + 0.01), (-0.24, yy, BELT + 0.01), (-0.24, yy, 1.44), (0.44, yy, 1.42)], M_CARGLASS)
    if sd == "l":
        quad(f"glass_back_{sd}", [(-0.33, yy, BELT + 0.01), (-1.8, yy, BELT + 0.03), (-1.17, yy, 1.45), (-0.33, yy, 1.45)], M_CARGLASS)
    else:
        quad(f"glass_back_{sd}", [(-0.33, yy, BELT + 0.01), (-1.8, yy, BELT + 0.03), (-1.17, yy, 1.45), (-0.33, yy, 1.45)], M_CARGLASS)
for (x, y) in ((1.35, 0.78), (1.35, -0.78), (-1.35, 0.78), (-1.35, -0.78)):
    w = cyl("car_wheel", 0, 0, -0.1, 0.1, 0.31, M_TRIM, C["CAR"], 32); w.rotation_euler = (math.radians(90), 0, 0); w.location = (x, y, 0.31); w.parent = car
    rim = cyl("car_rim", 0, 0, -0.102, 0.102, 0.19, mat("rim", (0.35, 0.36, 0.38), 0.3, 1.0), C["CAR"], 24); rim.rotation_euler = (math.radians(90), 0, 0); rim.location = (x, y, 0.31); rim.parent = car
for sgn in (1, -1):
    cpart(f"car_headlight_{sgn}", (2.03, sgn * 0.48 - 0.16, 0.66, 2.07, sgn * 0.48 + 0.16, 0.74), mat("headlight", (0.8, 0.82, 0.85), 0.05, emit=(1.0, 0.95, 0.85), emit_s=0.0), 0.01)
    cpart(f"car_taillight_{sgn}", (-2.1, sgn * 0.62 - 0.1, 0.72, -2.06, sgn * 0.62 + 0.1, 0.86), mat("taillight", (0.4, 0.02, 0.02), 0.1, emit=(1.0, 0.05, 0.03), emit_s=0.0), 0.01)
    cpart(f"car_mirror_{sgn}", (0.75, sgn * 0.88 - 0.06, 1.0, 0.88, sgn * 0.88 + 0.06, 1.1), M_PAINT, 0.02)
cpart("car_bumper_f", (2.0, -0.84, 0.3, 2.1, 0.84, 0.48), M_TRIM, 0.03)
cpart("car_bumper_r", (-2.12, -0.84, 0.3, -2.02, 0.84, 0.48), M_TRIM, 0.03)
cpart("car_headliner", (-1.2, -0.72, 1.4, 0.44, 0.72, 1.42), mat("headliner", (0.32, 0.32, 0.3), 0.9), 0.0)
cpart("car_door_trim_l", (-1.6, 0.8, 0.35, 0.9, 0.835, BELT), M_SEAT, 0.01)
cpart("car_door_trim_r", (-1.6, -0.835, 0.35, 0.9, -0.8, BELT), M_SEAT, 0.01)
# interior
cpart("car_floor_in", (-1.4, -0.7, 0.3, 0.6, 0.7, 0.35), M_TRIM, 0.0)
cpart("dashboard", (0.45, -0.72, 0.75, 0.75, 0.72, 1.02), M_DASH, 0.04)
for (nm, y, m) in (("seat_driver", -0.36, M_SEAT), ("seat_passenger", 0.36, M_SEAT_WET)):
    cpart(nm + "_base", (-0.35, y - 0.25, 0.35, 0.2, y + 0.25, 0.58), m, 0.05)
    cpart(nm + "_back", (-0.5, y - 0.25, 0.55, -0.35, y + 0.25, 1.25), m, 0.05)
    cpart(nm + "_head", (-0.5, y - 0.13, 1.25, -0.4, y + 0.13, 1.42), m, 0.04)
cpart("rear_bench", (-1.3, -0.68, 0.35, -0.75, 0.68, 0.6), M_SEAT, 0.05)
cpart("rear_bench_back", (-1.42, -0.68, 0.6, -1.28, 0.68, 1.2), M_SEAT, 0.05)
# steering wheel (driver side = -y): rim + column
SW = bpy.data.objects.new("STEERING", None); link(SW, C["CAR"]); SW.parent = car; SW.location = (0.42, -0.36, 0.98); SW.rotation_euler = (0, math.radians(-62), 0)
bpy.ops.mesh.primitive_torus_add(major_radius=0.19, minor_radius=0.017, major_segments=40, minor_segments=10)
rim = bpy.context.object; rim.name = "steering_rim"; link(rim, C["CAR"]); rim.data.materials.append(M_TRIM); rim.parent = SW
for k in range(3):
    sp_ = box(f"steering_spoke_{k}", 0.0, -0.012, -0.008, 0.18, 0.012, 0.008, M_TRIM, C["CAR"]); sp_.parent = SW; sp_.rotation_euler = (0, 0, math.radians(90 + 120 * k))
hub = cyl("steering_hub", 0, 0, -0.02, 0.03, 0.06, M_TRIM, C["CAR"], 20); hub.parent = SW
col = cyl("steering_column", 0, 0, -0.35, -0.02, 0.025, M_TRIM, C["CAR"], 12); col.parent = SW
# seatbelt (passenger) + the long black hair strand hanging from it
cu = bpy.data.curves.new("belt_pass", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.0; cu.extrude = 0.024
spl = cu.splines.new("POLY"); spl.points.add(2)
for i, p in enumerate(((-0.42, 0.62, 1.32, 1), (-0.36, 0.6, 0.9, 1), (-0.3, 0.62, 0.62, 1))):
    spl.points[i].co = p
bo = bpy.data.objects.new("SEATBELT_PASS", cu); link(bo, C["CAR"]); bo.parent = car; cu.materials.append(M_TRIM)
hc = bpy.data.curves.new("hair_strand", "CURVE"); hc.dimensions = "3D"; hc.bevel_depth = 0.0012
sp2 = hc.splines.new("BEZIER"); sp2.bezier_points.add(3)
for i, p in enumerate(((-0.37, 0.595, 1.05), (-0.36, 0.585, 0.92), (-0.34, 0.592, 0.78), (-0.35, 0.585, 0.66))):
    bpt = sp2.bezier_points[i]; bpt.co = p; bpt.handle_left_type = bpt.handle_right_type = "AUTO"
ho = bpy.data.objects.new("HAIR_STRAND", hc); link(ho, C["CAR"]); ho.parent = car
hc.materials.append(mat("strand", (0.004, 0.004, 0.005), 0.25, coat=0.6))
# door (driver) as a hinged object for getting in
DD = bpy.data.objects.new("CAR_DOOR_DRIVER", None); link(DD, C["CAR"]); DD.parent = car; DD.location = (0.55, -0.875, 0.0)
dpanel = box("car_door_driver_panel", -1.1, -0.006, 0.4, 0.0, 0.004, 0.96, M_PAINT, C["CAR"], 0.01); dpanel.parent = DD
dglass = box("car_door_driver_glass", -1.05, 0.11, 0.99, 0.3, 0.12, 1.4, M_CARGLASS, C["CAR"], 0.0); dglass.parent = DD
dglass.visible_shadow = False
dglass.hide_render = True          # the fixed side glass is the window; this one only shows when the door swings open
cpart("dash_cluster", (0.48, -0.5, 0.98, 0.55, -0.22, 1.05), mat("cluster", (0.02, 0.03, 0.05), 0.3, emit=(0.9, 0.55, 0.2), emit_s=0.0), 0.01)

# ------------------------------------------------------------------ LIGHTS
K.CUR[0] = C["LIGHTS_WARM"]
lw = C["LIGHTS_WARM"]
point_light("L_lamp", (4.6, 7.6, 1.45), 45, (1.0, 0.72, 0.45), 0.12, lw)
area_light("L_living_ceiling", (3.0, 5.7, H - 0.05), 1.2, 70, (1.0, 0.85, 0.65), (0, 0, 0), lw)
area_light("L_kitchen", (7.5, 5.7, H - 0.05), 1.0, 45, (1.0, 0.88, 0.7), (0, 0, 0), lw)
area_light("L_hall", (0.8, 1.7, H - 0.05), 0.6, 25, (1.0, 0.85, 0.65), (0, 0, 0), lw)
area_light("L_window", (3.0, 7.85, 1.6), 1.9, 12, (0.4, 0.5, 0.75), (math.radians(90), 0, 0), lw, sy=1.2)
K.CUR[0] = C["LIGHTS_BATH"]
area_light("L_bath", (2.0, 1.85, 2.3), 0.6, 60, (1.0, 0.93, 0.82), (0, 0, 0), C["LIGHTS_BATH"])
area_light("L_bath_mirror", (1.8, 1.85, 1.98), 0.5, 12, (1.0, 0.92, 0.8), (0, math.radians(90), 0), C["LIGHTS_BATH"], sy=0.1)
K.CUR[0] = C["LIGHTS_CORRIDOR"]
for i, x in enumerate((-6.5, -2.0, 2.5, 7.0)):
    area_light(f"L_corr_{i}", (x, -1.1, 2.45), 1.0, 45, (0.85, 1.0, 0.85), (0, 0, 0), C["LIGHTS_CORRIDOR"], sy=0.3)
    box(f"corr_tube_{i}", x - 0.5, -1.25, 2.46, x + 0.5, -0.95, 2.5, mat(f"corr_tube_m{i}", (0.9, 0.95, 0.9), 0.3, emit=(0.85, 1.0, 0.85), emit_s=2.5), C["CORRIDOR"])
area_light("L_stairs_a", (-7.0, -1.1, 0.0), 1.2, 25, (0.85, 1.0, 0.85), (0, 0, 0), C["LIGHTS_CORRIDOR"])
area_light("L_stairs_b", (-7.0, -1.1, -1.7), 1.2, 25, (0.85, 1.0, 0.85), (0, 0, 0), C["LIGHTS_CORRIDOR"])
K.CUR[0] = C["LIGHTS_STREET"]
_sl = bpy.data.lights.new("L_streetlamp", "SPOT"); _sl.energy = 2500; _sl.color = (1.0, 0.72, 0.4); _sl.spot_size = math.radians(110); _sl.spot_blend = 0.5; _sl.shadow_soft_size = 0.2
_slo = bpy.data.objects.new("L_streetlamp", _sl); link(_slo, C["LIGHTS_STREET"]); _slo.location = (38.5, -6.4, GZ + 5.6)
area_light("L_moon", (40, -10, GZ + 20), 30, 40, (0.4, 0.5, 0.8), (math.radians(20), 0, 0), C["LIGHTS_STREET"])
area_light("L_car_dash", (40.3, -7.5, GZ + 1.05), 0.3, 1.2, (0.9, 0.6, 0.3), (0, math.radians(-90), 0), C["LIGHTS_STREET"])
# street light falling into the cabin through the glass (soft, cold-amber) so interiors read at night
area_light("L_car_fill", (39.6, -7.15, GZ + 1.38), 0.9, 2.2, (0.95, 0.8, 0.6), (0, 0, 0), C["LIGHTS_STREET"], sy=0.6)

w = bpy.data.worlds.new("night"); S.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.01, 0.012, 0.02, 1)
S.render.engine = "BLENDER_EEVEE_NEXT"
S.view_settings.view_transform = "AgX"; S.view_settings.look = "AgX - Medium High Contrast"
S.render.resolution_x, S.render.resolution_y = 720, 1280
S["floorplan"] = __doc__
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(K.HERE, "apartment.blend"))
print("SAVED apartment.blend")
