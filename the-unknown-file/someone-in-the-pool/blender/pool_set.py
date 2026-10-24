"""Builds pool.blend — the indoor pool, the security office and the service corridor. ONE floor plan (Nights 1 + 2).

Floor plan (metres, +Y north, +X east, deck level z = 0):
  POOL HALL   x 0-30, y 0-18, ceiling 7.0. Tall windows in the north wall; plant-room door in the east wall.
  BASIN       x 2.5-27.5, y 4-14 (25 x 10 m, 6 lanes along X). Water surface z = -0.12.
              Shallow end (west) floor z = -1.1; slope x 10-18; deep end (east, x 18-27.5) floor z = -3.2.
              Ladders at the deep end: south (x 26.6, y 4) and north (x 26.6, y 14). Lifeguard chair (19, 15.4).
  OFFICE      x 22-28, y -4.0-0 (ceiling 2.7). Window in its north wall (x 23-27.6, z 1.3-2.4) looks straight onto the
              deep end. Desk + 5 CCTV monitors under the window; guard's chair (25.0, -1.35) facing north; radio; clock on
              the east wall. Door in the west wall (y -1.45 to -0.55) with a glass vision panel, opening onto the corridor.
  CORRIDOR    x 3-22, y -2.2-0 (ceiling 2.7). Glass double doors into the pool hall at x 17.0-19.0 (y = 0).
  CCTV        CAM1 office (behind the guard), CAM2 corridor (west end looking east at the office door),
              CAM3 shallow end overview, CAM4 deep end (high in the north-east corner, looking down into the water).
"""
import bpy, bmesh, os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
import setkit as K
from setkit import box, cyl, wall_x, wall_y, tex_mat, mat, area_light, point_light, import_gltf, door_leaf, door_frame, text, link

S = K.init(["HALL", "BASIN", "WATER", "DRAINED", "OFFICE", "CORRIDOR", "PROPS", "LIGHTS_NIGHT", "LIGHTS_HALL", "LIGHTS_OFFICE",
            "LIGHTS_CORRIDOR", "LIGHTS_UNDERWATER", "EXTERIOR", "CCTV"])
C = K.COLS
WL = -0.12                                  # water level
X0, X1, Y0, Y1 = 2.5, 27.5, 4.0, 14.0       # basin


def floor_z(x):
    if x <= 10:
        return -1.1
    if x >= 18:
        return -3.2
    return -1.1 - 2.1 * (x - 10) / 8


# ------------------------------------------------------------------ materials
M_DECK = tex_mat("deck_tiles", "anti_skid_tiles", 0.9, (0.55, 0.68, 0.74), 0.45, 0.4)
M_WALLT = tex_mat("wall_tiles", "rounded_square_tiled_wall", 1.2, (0.78, 0.86, 0.88), 0.6, 0.5)
M_PAINT = tex_mat("hall_paint", "painted_plaster_wall", 2.0, (0.55, 0.62, 0.64), 1.0, 0.2)
M_CORR_FLOOR = tex_mat("corridor_floor", "concrete_floor_painted", 1.6, (0.55, 0.58, 0.56), 0.8, 0.3)
M_CORR_WALL = tex_mat("corridor_wall", "painted_plaster_wall", 1.6, (0.62, 0.66, 0.62), 1.0, 0.2)
M_CEIL = mat("ceiling_panels", (0.42, 0.45, 0.47), 0.8, noise=0.05)
M_STEEL = K.M_STEEL
M_DARK = mat("dark_metal", (0.05, 0.055, 0.06), 0.4, 0.8)
def glass_mat(name, tint=(0.85, 0.92, 0.94), refl=0.12):
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
M_LANE = mat("lane_tiles", (0.02, 0.05, 0.12), 0.3, noise=0.05)
M_COPING = mat("coping", (0.78, 0.8, 0.8), 0.35, noise=0.08)
M_GRATE = mat("gutter_grate", (0.85, 0.87, 0.88), 0.4)
M_FIXTURE = mat("fluoro_tube", (0.9, 0.95, 0.95), 0.3, emit=(0.78, 0.95, 1.0), emit_s=0.0)
M_UWL = mat("underwater_light", (0.6, 0.9, 1.0), 0.1, emit=(0.45, 0.9, 1.0), emit_s=0.0)
M_DOOR = mat("door_grey", (0.32, 0.35, 0.36), 0.45, noise=0.02)
M_DESK = mat("desk_laminate", (0.28, 0.27, 0.25), 0.45)
M_SCREEN = mat("monitor_bezel", (0.02, 0.02, 0.022), 0.35)
M_RED = mat("lifeguard_red", (0.55, 0.06, 0.05), 0.5)
M_WHITE = mat("lifeguard_white", (0.85, 0.86, 0.86), 0.35)
M_EXIT = mat("exit_green", (0.1, 0.8, 0.25), 0.4, emit=(0.1, 1.0, 0.3), emit_s=6.0)


def basin_tile_mat(name, tint, caustic=True):
    """basin tiles with animated caustics (W of the 4D voronoi is driven per frame by shotkit.water(t))."""
    m = tex_mat(name, "square_tiles_02", 0.5, tint, 0.5, 0.5)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    if caustic:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        vo = nt.nodes.new("ShaderNodeTexVoronoi"); vo.voronoi_dimensions = "4D"; vo.feature = "SMOOTH_F1"
        vo.inputs["Scale"].default_value = 1.6; vo.name = "CAUSTIC"
        nt.links.new(tc.outputs["Object"], vo.inputs["Vector"])
        mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Max"].default_value = 0.3; mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = 0.0
        nt.links.new(vo.outputs["Distance"], mr.inputs["Value"])
        pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 7.0
        nt.links.new(mr.outputs["Result"], pw.inputs[0])
        g = nt.nodes.new("ShaderNodeMath"); g.operation = "MULTIPLY"; g.inputs[1].default_value = 0.6; g.name = "CAUSTIC_GAIN"
        nt.links.new(pw.outputs[0], g.inputs[0])
        nt.links.new(nt.nodes["Principled BSDF"].inputs["Base Color"].links[0].from_socket, b.inputs["Emission Color"])
        nt.links.new(g.outputs[0], b.inputs["Emission Strength"])
    return m


M_BASIN = basin_tile_mat("basin_tiles", (0.62, 0.86, 0.92))

# ------------------------------------------------------------------ POOL HALL structure
K.CUR[0] = C["HALL"]
hc = C["HALL"]
# deck: four slabs around the basin opening
box("deck_s", 0, 0, -0.15, 30, Y0, 0, M_DECK, hc)
box("deck_n", 0, Y1, -0.15, 30, 18, 0, M_DECK, hc)
box("deck_w", 0, Y0, -0.15, X0, Y1, 0, M_DECK, hc)
box("deck_e", X1, Y0, -0.15, 30, Y1, 0, M_DECK, hc)
box("hall_ceiling", -0.3, -0.3, 7.0, 30.3, 18.3, 7.2, M_CEIL, hc)
# walls: tiled dado to 2.4 m, painted above
for (nm, fn, args, ops) in (("wall_hall_n", wall_x, (18.12, -0.25, 30.25, 0.25), [(1.5, 28.5, 1.4, 6.3)]),
                            ("wall_hall_e", wall_y, (30.12, -0.25, 18.25, 0.25), [(15.0, 16.2, 0, 2.2)]),
                            ("wall_hall_w", wall_y, (-0.12, -0.25, 18.25, 0.25), [])):
    fn(nm, *args, ops, M_PAINT, hc, 0.0, 7.0)
wall_x("wall_hall_s", -0.0, -0.25, 30.25, 0.25, [(17.0, 19.0, 0, 2.3), (23.0, 27.6, 1.3, 2.4)], M_PAINT, hc, 0.0, 7.0)
for (x0, y0, x1, y1) in ((0.0, 0.13, 30.0, 0.15), (0.0, 17.85, 30.0, 17.87), (0.0, 0.0, 0.02, 18.0), (29.98, 0.0, 30.0, 18.0)):
    pass
box("dado_n", 0.0, 17.84, 0.0, 30.0, 17.87, 1.4, M_WALLT, hc)
box("dado_e", 29.84, 0.13, 0.0, 29.87, 18.0, 2.4, M_WALLT, hc)
box("dado_w", 0.13, 0.13, 0.0, 0.16, 18.0, 2.4, M_WALLT, hc)
box("dado_s1", 0.0, 0.125, 0.0, 17.0, 0.155, 2.4, M_WALLT, hc)
box("dado_s2", 19.0, 0.125, 0.0, 23.0, 0.155, 2.4, M_WALLT, hc)
box("dado_s3", 27.6, 0.125, 0.0, 30.0, 0.155, 2.4, M_WALLT, hc)
# north windows: glass + mullions
for i in range(14):
    x = 1.5 + i * 27.0 / 14
    box(f"win_mullion_{i}", x - 0.05, 17.95, 1.4, x + 0.05, 18.1, 6.3, M_DARK, hc)
box("win_mullion_last", 28.45, 17.95, 1.4, 28.55, 18.1, 6.3, M_DARK, hc)
box("win_transom", 1.5, 17.95, 3.82, 28.5, 18.1, 3.9, M_DARK, hc)
box("win_glass", 1.5, 18.0, 1.4, 28.5, 18.02, 6.3, M_GLASS, hc).visible_shadow = False
# roof trusses + ceiling fixtures (3 rows along X)
for i in range(7):
    x = 1.0 + i * 4.6
    box(f"truss_{i}", x - 0.12, -0.2, 6.55, x + 0.12, 18.2, 7.0, M_DARK, hc)
FIX = []
for j, y in enumerate((5.0, 9.0, 13.0)):
    for i in range(6):
        x = 3.0 + i * 4.6
        f = box(f"fixture_{j}_{i}", x - 1.2, y - 0.12, 6.35, x + 1.2, y + 0.12, 6.45, M_FIXTURE, hc)
        FIX.append((x, y))
# plant-room door (east wall)
door_frame("frame_plant", 15.0, 16.2, 30.0, 0.25, hc, axis="y")
pd = box("plant_door", 29.9, 15.02, 0.0, 29.95, 16.18, 2.18, M_DOOR, hc)
text("plant_sign", "PLANT ROOM", (29.86, 15.6, 2.45), 0.12, mat("sign_white", (0.9, 0.9, 0.9), 0.4), (math.pi / 2, 0, -math.pi / 2), hc, 0.002, font=K.FONT)
# exit signs
box("exit_sign_s", 17.6, 0.16, 2.45, 18.4, 0.2, 2.68, M_EXIT, hc)
box("exit_sign_e", 29.82, 15.3, 2.45, 29.86, 15.9, 2.68, M_EXIT, hc)

# ------------------------------------------------------------------ BASIN (floor follows the depth profile)
K.CUR[0] = C["BASIN"]
bc = C["BASIN"]
xs = [X0 + i * 0.5 for i in range(int((X1 - X0) / 0.5) + 1)]
bm = bmesh.new()
rows = []
for x in xs:
    rows.append([bm.verts.new((x, y, floor_z(x))) for y in (Y0, Y1)])
for i in range(len(rows) - 1):
    bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
me = bpy.data.meshes.new("basin_floor"); bm.to_mesh(me); bm.free()
fl = bpy.data.objects.new("basin_floor", me); link(fl, bc); me.materials.append(M_BASIN)
# side walls (south/north) follow the profile; end walls
for (nm, y, sgn) in (("basin_wall_s", Y0, 1), ("basin_wall_n", Y1, -1)):
    bm = bmesh.new(); top = []; bot = []
    for x in xs:
        top.append(bm.verts.new((x, y, 0.0))); bot.append(bm.verts.new((x, y, floor_z(x))))
    for i in range(len(xs) - 1):
        bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
    me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nm, me); link(o, bc); me.materials.append(M_BASIN)
box("basin_wall_w", X0 - 0.02, Y0, -1.1, X0, Y1, 0.0, M_BASIN, bc)
box("basin_wall_e", X1, Y0, -3.2, X1 + 0.02, Y1, 0.0, M_BASIN, bc)
# lane lines on the floor + T-targets on the end walls
for k in range(6):
    yc = Y0 + (k + 0.5) * (Y1 - Y0) / 6
    bm = bmesh.new(); a = []; b_ = []
    for x in [v for v in xs if X0 + 2.0 <= v <= X1 - 2.0]:
        a.append(bm.verts.new((x, yc - 0.13, floor_z(x) + 0.004))); b_.append(bm.verts.new((x, yc + 0.13, floor_z(x) + 0.004)))
    for i in range(len(a) - 1):
        bm.faces.new((a[i], a[i + 1], b_[i + 1], b_[i]))
    me = bpy.data.meshes.new(f"lane_{k}"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f"lane_{k}", me); link(o, bc); me.materials.append(M_LANE)
    box(f"lane_T_e_{k}", X1 - 2.0, yc - 0.5, floor_z(X1 - 2.0) + 0.004, X1 - 1.74, yc + 0.5, floor_z(X1 - 2.0) + 0.006, M_LANE, bc)
    box(f"lane_T_w_{k}", X0 + 1.74, yc - 0.5, -1.096, X0 + 2.0, yc + 0.5, -1.094, M_LANE, bc)
    box(f"lane_wall_e_{k}", X1 - 0.006, yc - 0.13, -3.0, X1, yc + 0.13, -0.4, M_LANE, bc)
    box(f"lane_wall_w_{k}", X0, yc - 0.13, -0.9, X0 + 0.006, yc + 0.13, -0.4, M_LANE, bc)
# coping stones + overflow gutter grate round the edge
for (x0, y0, x1, y1) in ((X0 - 0.35, Y0 - 0.35, X1 + 0.35, Y0), (X0 - 0.35, Y1, X1 + 0.35, Y1 + 0.35), (X0 - 0.35, Y0, X0, Y1), (X1, Y0, X1 + 0.35, Y1)):
    box("coping", x0, y0, -0.02, x1, y1, 0.015, M_COPING, bc, 0.01)
for (x0, y0, x1, y1) in ((X0 - 0.6, Y0 - 0.6, X1 + 0.6, Y0 - 0.35), (X0 - 0.6, Y1 + 0.35, X1 + 0.6, Y1 + 0.6)):
    box("gutter_grate", x0, y0, -0.01, x1, y1, 0.004, M_GRATE, bc)
# depth markings on the coping (story text: real pool signage)
M_MARK = mat("depth_mark", (0.05, 0.1, 0.35), 0.4)
for (x, t_) in ((4.0, "1.1 m"), (14.0, "2.0 m"), (24.0, "3.2 m"), (24.0, "DEEP END")):
    yy = Y0 - 0.17 if t_ != "DEEP END" else Y1 + 0.17
    text(f"depth_{t_}", t_, (x, yy, 0.017), 0.16, M_MARK, (0, 0, 0 if t_ != "DEEP END" else math.pi), bc, 0.001, font=K.FONT)
# underwater lights in the side walls
UWL = []
for x in (6.0, 12.0, 18.0, 24.0):
    for (y, s_) in ((Y0 + 0.01, 1), (Y1 - 0.01, -1)):
        o = cyl(f"uw_light_{x}_{y}", 0, 0, 0, 0.02, 0.14, M_UWL, bc, 24)
        o.rotation_euler = (math.radians(90), 0, 0); o.location = (x, y, -0.7)
        UWL.append((x, y, s_))
# ladders at the deep end (stainless rails curving over the coping, treads into the water)


def ladder(nm, x, y, side):
    for dx in (-0.25, 0.25):
        bm = bmesh.new()
        pts = [(x + dx, y - side * 0.45, 0.0), (x + dx, y - side * 0.45, 0.85), (x + dx, y - side * 0.3, 1.0), (x + dx, y - side * 0.1, 0.95),
               (x + dx, y + side * 0.06, 0.6), (x + dx, y + side * 0.08, -1.6)]
        cu = bpy.data.curves.new(nm + "_rail", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.022; cu.bevel_resolution = 4
        sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
        for i, p in enumerate(pts):
            sp.points[i].co = (*p, 1)
        o = bpy.data.objects.new(nm + "_rail", cu); link(o, bc); cu.materials.append(M_STEEL)
    for k in range(4):
        z = -0.25 - k * 0.32
        box(f"{nm}_tread_{k}", x - 0.25, y + side * 0.02, z - 0.02, x + 0.25, y + side * 0.14, z, M_STEEL, bc)


ladder("ladder_s", 26.6, Y0, 1)
ladder("ladder_n", 26.6, Y1, -1)
# hand-under-the-floor patch: a separate, finely subdivided piece of the deep-end floor (displaced in N1)
bpy.ops.mesh.primitive_grid_add(x_subdivisions=160, y_subdivisions=160, size=1.0)
hp = bpy.context.object; hp.name = "HAND_PATCH"; link(hp, bc)
hp.scale = (1.4, 1.4, 1); hp.location = (23.2, 7.6, -3.2 + 0.006)
bpy.ops.object.transform_apply(scale=True)
hp.data.materials.append(M_BASIN)

# ------------------------------------------------------------------ WATER (surface + volume) and the DRAINED variant
K.CUR[0] = C["WATER"]
wc = C["WATER"]
wm = bpy.data.materials.new("pool_water"); wm.use_nodes = True; nt = wm.node_tree; nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.025; gl.inputs["Color"].default_value = (0.92, 0.98, 1.0, 1)
tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (0.62, 0.88, 0.9, 1)
fr = nt.nodes.new("ShaderNodeFresnel"); fr.inputs["IOR"].default_value = 1.333
tcw = nt.nodes.new("ShaderNodeTexCoord")
wv = nt.nodes.new("ShaderNodeTexNoise"); wv.noise_dimensions = "4D"; wv.inputs["Scale"].default_value = 1.6; wv.inputs["Detail"].default_value = 6; wv.name = "RIPPLE"
wv2 = nt.nodes.new("ShaderNodeTexNoise"); wv2.noise_dimensions = "4D"; wv2.inputs["Scale"].default_value = 7.0; wv2.inputs["Detail"].default_value = 3; wv2.name = "RIPPLE2"
nt.links.new(tcw.outputs["Object"], wv.inputs["Vector"]); nt.links.new(tcw.outputs["Object"], wv2.inputs["Vector"])
add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"; nt.links.new(wv.outputs["Fac"], add.inputs[0]); nt.links.new(wv2.outputs["Fac"], add.inputs[1])
bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.06; bp.inputs["Distance"].default_value = 0.04; bp.name = "RIPPLE_BUMP"
nt.links.new(add.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], gl.inputs["Normal"]); nt.links.new(bp.outputs["Normal"], fr.inputs["Normal"])
ms = nt.nodes.new("ShaderNodeMixShader"); nt.links.new(fr.outputs[0], ms.inputs[0]); nt.links.new(tr.outputs[0], ms.inputs[1]); nt.links.new(gl.outputs[0], ms.inputs[2])
nt.links.new(ms.outputs[0], out.inputs["Surface"])
wm.surface_render_method = "BLENDED"
bpy.ops.mesh.primitive_grid_add(x_subdivisions=100, y_subdivisions=40, size=1.0)
ws = bpy.context.object; ws.name = "WATER_SURFACE"; link(ws, wc)
ws.scale = (X1 - X0, Y1 - Y0, 1); ws.location = ((X0 + X1) / 2, (Y0 + Y1) / 2, WL)
bpy.ops.object.transform_apply(scale=True)
ws.data.materials.append(wm); ws.visible_shadow = False
vm = bpy.data.materials.new("pool_water_volume"); vm.use_nodes = True; vn = vm.node_tree; vn.nodes.remove(vn.nodes["Principled BSDF"])
pv = vn.nodes.new("ShaderNodeVolumePrincipled"); pv.inputs["Color"].default_value = (0.25, 0.62, 0.66, 1); pv.inputs["Density"].default_value = 0.075
pv.inputs["Absorption Color"].default_value = (0.3, 0.72, 0.76, 1); pv.name = "VOL"
vn.links.new(pv.outputs[0], vn.nodes["Material Output"].inputs["Volume"])
wv_ = box("WATER_VOLUME", X0, Y0, -3.21, X1, Y1, WL, None, wc); wv_.data.materials.append(vm); wv_.visible_shadow = False
# drained pool (Night 2): damp dark patches, a puddle in the deep end, inspection kit — only visible in DRAINED mode
K.CUR[0] = C["DRAINED"]
dc = C["DRAINED"]
M_PUDDLE = mat("puddle", (0.05, 0.08, 0.09), 0.02, coat=1.0)
bpy.ops.mesh.primitive_circle_add(vertices=48, radius=1.0, fill_type="NGON")
pu = bpy.context.object; pu.name = "deep_puddle"; link(pu, dc); pu.scale = (2.6, 1.6, 1); pu.location = (24.5, 9.5, -3.195)
pu.data.materials.append(M_PUDDLE)
for i, (x, y) in enumerate(((22.0, 6.0), (23.5, 12.0), (19.0, 8.5))):
    cyl(f"cone_{i}", x, y, floor_z(x), floor_z(x) + 0.45, 0.12, mat(f"cone_m{i}", (0.85, 0.3, 0.02), 0.5), dc, 16)
cu = bpy.data.curves.new("hose", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.035
sp = cu.splines.new("BEZIER"); sp.bezier_points.add(4)
for i, p in enumerate(((26.5, 3.3, 0.04), (26.0, 4.2, -0.4), (25.2, 5.0, -3.15), (23.0, 6.4, -3.15), (21.5, 8.0, -3.12))):
    bp_ = sp.bezier_points[i]; bp_.co = p; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
ho = bpy.data.objects.new("hose", cu); link(ho, dc); cu.materials.append(mat("hose_black", (0.02, 0.02, 0.02), 0.5))
box("barrier_tape_post_a", 17.2, 3.2, 0.0, 17.26, 3.26, 1.0, M_STEEL, dc)
box("barrier_tape_post_b", 27.8, 3.2, 0.0, 27.86, 3.26, 1.0, M_STEEL, dc)
box("barrier_tape", 17.23, 3.225, 0.9, 27.83, 3.235, 0.96, mat("tape", (0.9, 0.75, 0.05), 0.5), dc)
M_BASIN_DRY = basin_tile_mat("basin_tiles_dry", (0.68, 0.84, 0.86), caustic=False)

# ------------------------------------------------------------------ deck furniture
K.CUR[0] = C["PROPS"]
pc = C["PROPS"]
# lifeguard chair (north deck)
lx, ly = 19.0, 15.4
for dx in (-0.35, 0.35):
    for dy in (-0.35, 0.35):
        box("lg_leg", lx + dx - 0.03, ly + dy - 0.03, 0.0, lx + dx + 0.03, ly + dy + 0.03, 1.9, M_WHITE, pc)
box("lg_seat", lx - 0.4, ly - 0.4, 1.9, lx + 0.4, ly + 0.4, 1.96, M_RED, pc)
box("lg_back", lx - 0.4, ly + 0.36, 1.96, lx + 0.4, ly + 0.42, 2.5, M_RED, pc)
for k in range(5):
    box("lg_step", lx - 0.33, ly - 0.42 - 0.05, 0.35 + k * 0.33, lx + 0.33, ly - 0.36, 0.38 + k * 0.33, M_WHITE, pc)
box("lg_umbrella_pole", lx - 0.02, ly + 0.38, 1.96, lx + 0.02, ly + 0.42, 3.3, M_WHITE, pc)
# plastic chairs + benches + lane-rope reel + kickboards
for i, x in enumerate((4.0, 5.0, 6.0, 7.0)):
    import_gltf("plastic_monobloc_chair_01", (x, 16.6, 0.0), 180 + random.Random(i).uniform(-8, 8), 1.0, pc, f"POOLCHAIR_{i}")
for x in (9.0, 12.5):
    box("bench_top", x, 17.2, 0.42, x + 2.4, 17.6, 0.47, mat("bench_wood", (0.35, 0.25, 0.15), 0.6), pc)
    for dx in (0.1, 2.2):
        box("bench_leg", x + dx, 17.25, 0.0, x + dx + 0.08, 17.55, 0.42, M_STEEL, pc)
reel = cyl("rope_reel", 2.0, 16.0, 0.3, 0.9, 0.55, mat("reel_blue", (0.05, 0.2, 0.6), 0.5), pc, 32)
reel.rotation_euler = (math.radians(90), 0, 0); reel.location = (1.6, 15.8, 0.75)
for i in range(6):
    box(f"kickboard_{i}", 27.6, 16.3 + i * 0.03, 0.0, 28.1, 16.32 + i * 0.03, 0.35, mat(f"kb_{i}", (0.1 + 0.15 * (i % 3), 0.3, 0.7 - 0.1 * (i % 2)), 0.5), pc)
box("ring_buoy_hook", 29.85, 9.0, 1.5, 29.88, 9.1, 1.6, M_STEEL, pc)
rb = bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.07, location=(29.8, 9.05, 1.3), rotation=(0, math.radians(90), 0))
rbo = bpy.context.object; rbo.name = "ring_buoy"; link(rbo, pc); rbo.data.materials.append(mat("buoy", (0.85, 0.12, 0.05), 0.5))

# ------------------------------------------------------------------ OFFICE
K.CUR[0] = C["OFFICE"]
oc = C["OFFICE"]
OH = 2.7
box("office_floor", 22.0, -4.0, -0.05, 28.0, 0.0, 0.0, M_CORR_FLOOR, oc)
M_CT = mat("office_ceiling_tiles", (0.75, 0.76, 0.74), 0.8, noise=0.1)
# suspended ceiling with one removable tile right above the guard's chair (OFFICE_CEIL_TILE; hidden in N1's ending = a black hole)
HX0, HX1, HY0, HY1 = 24.7, 25.3, -1.6, -1.0
box("office_ceiling", 21.8, -4.2, OH, 28.2, HY0, OH + 0.05, M_CT, oc)
box("office_ceiling", 21.8, HY1, OH, 28.2, 0.0, OH + 0.05, M_CT, oc)
box("office_ceiling", 21.8, HY0, OH, HX0, HY1, OH + 0.05, M_CT, oc)
box("office_ceiling", HX1, HY0, OH, 28.2, HY1, OH + 0.05, M_CT, oc)
box("OFFICE_CEIL_TILE", HX0, HY0, OH, HX1, HY1, OH + 0.05, M_CT, oc)
M_VOIDB = mat("void_black", (0.0, 0.0, 0.0), 1.0)
for (a, b_) in (((HX0 - 0.02, HY0 - 0.02, OH, HX0, HY1 + 0.02, OH + 0.9), (HX1, HY0 - 0.02, OH, HX1 + 0.02, HY1 + 0.02, OH + 0.9)),
                ((HX0, HY0 - 0.02, OH, HX1, HY0, OH + 0.9), (HX0, HY1, OH, HX1, HY1 + 0.02, OH + 0.9))):
    box("plenum_void", *a, M_VOIDB, oc); box("plenum_void", *b_, M_VOIDB, oc)
box("plenum_void_top", HX0 - 0.02, HY0 - 0.02, OH + 0.9, HX1 + 0.02, HY1 + 0.02, OH + 0.92, M_VOIDB, oc)
wall_x("office_wall_s", -4.12, 21.8, 28.25, 0.25, [], M_CORR_WALL, oc, 0.0, OH)
wall_y("office_wall_e", 28.12, -4.25, 0.0, 0.25, [], M_CORR_WALL, oc, 0.0, OH)
wall_y("office_wall_w", 22.0, -4.0, -0.0, 0.12, [(-1.45, -0.55, 0.0, 2.1)], M_CORR_WALL, oc, 0.0, OH)
box("office_window_glass", 23.0, -0.01, 1.3, 27.6, 0.01, 2.4, M_GLASS, oc).visible_shadow = False
box("office_window_sill", 22.9, -0.25, 1.25, 27.7, 0.0, 1.3, M_DESK, oc)
# desk + monitors (one row, under the window)
box("desk_top", 22.6, -0.95, 0.74, 27.6, -0.15, 0.78, M_DESK, oc, 0.004)
for xl in (22.65, 27.5):
    box("desk_leg", xl, -0.9, 0.0, xl + 0.05, -0.2, 0.74, M_DESK, oc)
box("desk_apron", 22.6, -0.3, 0.6, 27.6, -0.25, 0.74, M_DESK, oc)
MON = []
for i in range(5):
    x = 23.25 + i * 0.86
    mo = box(f"monitor_{i}", x - 0.4, -0.42, 0.82, x + 0.4, -0.38, 1.27, M_SCREEN, oc, 0.006)
    box(f"monitor_stand_{i}", x - 0.04, -0.36, 0.78, x + 0.04, -0.3, 0.86, M_SCREEN, oc)
    # screen plane facing south (the guard), image texture set per shot (shotkit.monitor())
    me = bpy.data.meshes.new(f"MONITOR_SCREEN_{i}")
    me.from_pydata([(x - 0.37, -0.425, 0.85), (x + 0.37, -0.425, 0.85), (x + 0.37, -0.425, 1.24), (x - 0.37, -0.425, 1.24)], [], [(0, 1, 2, 3)])
    me.uv_layers.new(); uv = me.uv_layers[0].data
    for k, c in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv[k].uv = c
    sm = bpy.data.materials.new(f"monitor_screen_{i}"); sm.use_nodes = True; snt = sm.node_tree; sb = snt.nodes["Principled BSDF"]
    sb.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1); sb.inputs["Roughness"].default_value = 0.08
    im = snt.nodes.new("ShaderNodeTexImage"); im.name = "FEED"
    snt.links.new(im.outputs["Color"], sb.inputs["Emission Color"]); sb.inputs["Emission Strength"].default_value = 1.6
    me.materials.append(sm)
    so = bpy.data.objects.new(f"MONITOR_SCREEN_{i}", me); link(so, oc)
    MON.append(so)
box("keyboard", 24.6, -0.75, 0.78, 25.4, -0.6, 0.8, M_SCREEN, oc)
box("radio_base", 26.9, -0.7, 0.78, 27.0, -0.55, 0.98, M_DARK, oc)
RADIO = box("RADIO", 26.88, -0.68, 0.8, 26.96, -0.6, 1.0, mat("radio_black", (0.03, 0.03, 0.035), 0.5), oc, 0.005)
cyl("radio_antenna", 26.94, -0.62, 1.0, 1.14, 0.006, M_DARK, oc, 8)
RADIO_LED = box("RADIO_LED", 26.875, -0.665, 0.95, 26.878, -0.655, 0.96, mat("radio_led", (0.1, 0.05, 0.0), 0.3, emit=(1.0, 0.25, 0.05), emit_s=0.0), oc)
box("desk_lamp_base", 22.8, -0.75, 0.78, 22.95, -0.6, 0.8, M_DARK, oc)
box("logbook", 23.4, -0.8, 0.78, 23.7, -0.6, 0.795, mat("logbook", (0.1, 0.2, 0.35), 0.6), oc)
box("mug", 26.3, -0.72, 0.78, 26.38, -0.64, 0.88, mat("mug", (0.85, 0.85, 0.82), 0.3), oc)
box("filing_cabinet", 27.3, -3.9, 0.0, 27.95, -3.3, 1.3, M_STEEL, oc, 0.01)
box("key_box", 27.95, -2.5, 1.4, 28.0, -1.9, 1.9, M_DARK, oc)
box("notice_board", 22.07, -3.6, 1.2, 22.1, -2.2, 1.9, mat("cork", (0.5, 0.36, 0.2), 0.8), oc)
import_gltf("metal_office_desk", (24.8, -3.55, 0.0), 0, 1.0, oc, "BACK_DESK")
# office chair (swivel): seat, back, gas column, 5-star base with castors
CH = bpy.data.objects.new("OFFICE_CHAIR", None); link(CH, oc); CH.location = (25.0, -1.35, 0.0)
M_FAB = mat("chair_fabric", (0.03, 0.035, 0.04), 0.9, noise=0.2)
for nm_, a in (("chair_seat", (-0.26, -0.24, 0.44, 0.26, 0.24, 0.52)), ("chair_back", (-0.24, 0.24, 0.55, 0.24, 0.3, 1.05))):
    o = box(nm_, *a, M_FAB, oc, 0.03); o.parent = CH
cyl("chair_column", 0, 0, 0.1, 0.44, 0.025, M_STEEL, oc, 16).parent = CH
for k in range(5):
    a_ = math.radians(72 * k)
    leg = box(f"chair_star_{k}", 0.0, -0.02, 0.06, 0.32, 0.02, 0.09, M_DARK, oc); leg.rotation_euler = (0, 0, a_); leg.parent = CH
    cs = cyl(f"chair_castor_{k}", 0, 0, 0.0, 0.06, 0.03, M_DARK, oc, 12); cs.location = (0.3 * math.cos(a_), 0.3 * math.sin(a_), 0.03); cs.parent = CH
# wall clock on the east wall (facing west)
CLK = bpy.data.objects.new("CLOCK", None); link(CLK, oc); CLK.location = (27.98, -2.2, 2.05); CLK.rotation_euler = (math.radians(90), 0, math.radians(90))
cyl("clock_face", 0, 0, 0.0, 0.02, 0.16, mat("clock_face", (0.92, 0.91, 0.88), 0.4), oc, 48).parent = CLK
cyl("clock_rim", 0, 0, -0.01, 0.03, 0.17, M_DARK, oc, 48).parent = CLK
bpy.data.objects["clock_face"].location.z = 0.012
for i in range(12):
    tk = box("clock_tick", -0.004, 0.125, 0.032, 0.004, 0.15, 0.035, M_DARK, oc); tk.parent = CLK; tk.rotation_euler = (0, 0, -math.radians(i * 30))
box("CLOCK_hour", -0.006, -0.015, 0.035, 0.006, 0.08, 0.039, M_DARK, oc).parent = CLK
box("CLOCK_minute", -0.004, -0.02, 0.039, 0.004, 0.12, 0.042, M_DARK, oc).parent = CLK
box("CLOCK_second", -0.0015, -0.03, 0.042, 0.0015, 0.13, 0.044, mat("clock_red", (0.6, 0.05, 0.04), 0.4), oc).parent = CLK
# office door (west wall): hinge at the north jamb, swings into the office; glass vision panel; inside lock thumb-turn
door_frame("frame_office", -1.45, -0.55, 22.0, 0.12, oc, axis="y")
OD = door_leaf("OFFICE_DOOR", (22.0, -0.55, 0.0), 0.9, -90, M_DOOR, oc, 0.045)
for o in [o for o in bpy.data.objects if o.name.startswith("OFFICE_DOOR_panel")]:
    o.hide_render = True
og = box("OFFICE_DOOR_GLASS", 0.25, -0.03, 1.15, 0.65, 0.03, 1.85, M_GLASS, oc); og.parent = OD
ogf = box("OFFICE_DOOR_GLASS_FRAME", 0.22, -0.026, 1.12, 0.68, 0.026, 1.88, M_DARK, oc); ogf.parent = OD
ogf.modifiers.new("hole", "SOLIDIFY")
bpy.data.objects.remove(ogf)
lockt = box("OFFICE_LOCK_TURN", 0.8, 0.025, 1.12, 0.84, 0.045, 1.16, M_STEEL, oc); lockt.parent = OD

# ------------------------------------------------------------------ CORRIDOR
K.CUR[0] = C["CORRIDOR"]
cc = C["CORRIDOR"]
box("corr_floor", 3.0, -2.2, -0.05, 22.0, 0.0, 0.0, M_CORR_FLOOR, cc)
box("corr_ceiling", 3.0, -2.3, 2.7, 22.0, 0.0, 2.75, mat("corr_ceiling", (0.72, 0.74, 0.72), 0.8), cc)
wall_x("corr_wall_s", -2.32, 3.0, 22.0, 0.25, [(8.0, 9.0, 0, 2.1)], M_CORR_WALL, cc, 0.0, 2.7)
wall_y("corr_wall_w", 2.88, -2.2, 0.0, 0.25, [(-1.6, -0.6, 0, 2.1)], M_CORR_WALL, cc, 0.0, 2.7)
box("corr_skin_n_a", 3.0, -0.14, 0.0, 17.0, -0.125, 2.7, M_CORR_WALL, cc)
box("corr_skin_n_b", 19.0, -0.14, 0.0, 22.0, -0.125, 2.7, M_CORR_WALL, cc)
box("corr_skin_n_top", 17.0, -0.14, 2.3, 19.0, -0.125, 2.7, M_CORR_WALL, cc)
box("corr_skirt_n", 3.0, -0.16, 0.0, 22.0, -0.14, 0.1, M_DARK, cc)
box("corr_skirt_s", 3.0, -2.2, 0.0, 22.0, -2.18, 0.1, M_DARK, cc)
# glass double doors into the pool hall (closed)
for (nm_, x0_) in (("POOL_DOOR_A", 17.0), ("POOL_DOOR_B", 18.0)):
    d = bpy.data.objects.new(nm_, None); link(d, cc); d.location = (x0_ if nm_ == "POOL_DOOR_A" else 19.0, 0.0, 0.0)
    d.rotation_euler = (0, 0, 0 if nm_ == "POOL_DOOR_A" else math.pi)
    fr_ = box(nm_ + "_frame", 0.0, -0.03, 0.0, 1.0, 0.03, 2.28, M_DARK, cc); fr_.parent = d
    gl_ = box(nm_ + "_glass", 0.06, -0.012, 0.06, 0.94, 0.012, 2.22, M_GLASS, cc); gl_.parent = d
    bar = box(nm_ + "_bar", 0.12, -0.08, 1.0, 0.88, -0.05, 1.04, M_STEEL, cc); bar.parent = d
box("LIGHT_PANEL", 19.25, 0.155, 1.15, 19.45, 0.185, 1.45, mat("switch_plate", (0.85, 0.85, 0.83), 0.4), cc)
for k in range(3):
    box(f"LIGHT_SWITCH_{k}", 19.28 + k * 0.055, 0.18, 1.27, 19.31 + k * 0.055, 0.197, 1.33, mat("switch_rocker", (0.92, 0.92, 0.9), 0.35), cc)
box("pool_sign", 17.4, -0.15, 2.32, 18.6, -0.13, 2.6, mat("sign_blue", (0.05, 0.15, 0.45), 0.5), cc)
text("pool_sign_text", "POOL", (18.0, -0.155, 2.46), 0.16, mat("sign_white2", (0.95, 0.95, 0.95), 0.4), (math.pi / 2, 0, math.pi), cc, 0.002, font=K.FONT)
box("office_sign", 21.88, -1.4, 2.2, 21.9, -0.6, 2.42, mat("sign_grey", (0.2, 0.22, 0.24), 0.5), cc)
text("office_sign_text", "SECURITY", (21.875, -1.0, 2.31), 0.12, mat("sign_white3", (0.95, 0.95, 0.95), 0.4), (math.pi / 2, 0, -math.pi / 2), cc, 0.002, font=K.FONT)
box("lockers", 10.0, -2.18, 0.0, 13.6, -1.75, 1.9, mat("locker_blue", (0.12, 0.2, 0.32), 0.45, 0.4), cc, 0.005)
for i in range(9):
    box(f"locker_gap_{i}", 10.0 + i * 0.4, -1.752, 0.0, 10.01 + i * 0.4, -1.748, 1.9, M_DARK, cc)
box("fire_ext", 14.5, -2.15, 0.6, 14.65, -2.0, 1.15, mat("fire_red", (0.6, 0.03, 0.02), 0.4), cc)

# ------------------------------------------------------------------ LIGHTS
# night (building closed): exit signs, underwater pool lights, a little city light through the windows, office fluorescents
K.CUR[0] = C["LIGHTS_UNDERWATER"]
for (x, y, s_) in UWL:
    L = bpy.data.lights.new("uwl", "SPOT"); L.energy = 260; L.color = (0.45, 0.9, 1.0); L.spot_size = math.radians(110); L.spot_blend = 0.6; L.shadow_soft_size = 0.1
    o = bpy.data.objects.new(f"L_uw_{x}_{y}", L); link(o, C["LIGHTS_UNDERWATER"]); o.location = (x, y + s_ * 0.05, -0.7)
    o.rotation_euler = (math.radians(90) * s_ * -1 + (0 if s_ > 0 else 0), 0, 0)
    o.rotation_euler = ((Vector((x, y + s_ * 3.0, -1.6)) - o.location).to_track_quat("-Z", "Y")).to_euler()
K.CUR[0] = C["LIGHTS_NIGHT"]
area_light("L_windows", (15.0, 17.6, 4.0), 27.0, 220, (0.35, 0.45, 0.7), (math.radians(90), 0, 0), C["LIGHTS_NIGHT"], sy=4.5)
area_light("L_exit_glow", (18.0, 0.6, 2.4), 0.8, 6, (0.2, 1.0, 0.4), (math.radians(-60), 0, 0), C["LIGHTS_NIGHT"])
area_light("L_office_spill", (25.3, 0.3, 1.9), 4.4, 60, (0.8, 0.95, 1.0), (math.radians(-90), 0, 0), C["LIGHTS_NIGHT"], sy=1.0)
K.CUR[0] = C["LIGHTS_HALL"]
for (x, y) in FIX:
    area_light(f"L_fix_{x}_{y}", (x, y, 6.3), 2.4, 260, (0.78, 0.95, 1.0), (0, 0, 0), C["LIGHTS_HALL"], sy=0.24)
K.CUR[0] = C["LIGHTS_OFFICE"]
for (x, y) in ((23.8, -2.0), (26.2, -2.0)):
    area_light(f"L_office_{x}", (x, y, 2.65), 1.2, 95, (0.85, 1.0, 0.92), (0, 0, 0), C["LIGHTS_OFFICE"], sy=0.3)
    box(f"office_tube_{x}", x - 0.6, y - 0.15, 2.66, x + 0.6, y + 0.15, 2.69, mat(f"office_tube_m{x}", (0.9, 0.95, 0.9), 0.3, emit=(0.85, 1.0, 0.92), emit_s=3.0), C["OFFICE"])
area_light("L_monitors", (25.0, -0.5, 1.05), 4.0, 25, (0.6, 0.75, 1.0), (math.radians(90), 0, 0), C["LIGHTS_OFFICE"], sy=0.4)
bpy.data.objects["L_monitors"].rotation_euler = (math.radians(-90), 0, 0)
K.CUR[0] = C["LIGHTS_CORRIDOR"]
for i, x in enumerate((5.0, 9.0, 13.0, 17.0, 20.5)):
    area_light(f"L_corr_{i}", (x, -1.1, 2.65), 1.2, 55, (0.8, 1.0, 0.85), (0, 0, 0), C["LIGHTS_CORRIDOR"], sy=0.3)
    box(f"corr_tube_{i}", x - 0.6, -1.25, 2.66, x + 0.6, -0.95, 2.69, mat(f"corr_tube_m{i}", (0.9, 0.95, 0.9), 0.3, emit=(0.8, 1.0, 0.85), emit_s=2.5), C["CORRIDOR"])

# outside: night city through the windows
K.CUR[0] = C["EXTERIOR"]
city = bpy.data.materials.new("city_night"); city.use_nodes = True
nt = city.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"])
em = nt.nodes.new("ShaderNodeEmission"); tc = nt.nodes.new("ShaderNodeTexCoord")
br = nt.nodes.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 18; br.inputs["Mortar Size"].default_value = 0.4
br.inputs["Color1"].default_value = (1.0, 0.75, 0.45, 1); br.inputs["Color2"].default_value = (0.4, 0.5, 0.7, 1); br.inputs["Mortar"].default_value = (0, 0, 0, 1)
nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 7; nt.links.new(tc.outputs["Object"], ns.inputs["Vector"])
th = nt.nodes.new("ShaderNodeMapRange"); th.inputs["From Min"].default_value = 0.6; th.inputs["From Max"].default_value = 0.64
nt.links.new(ns.outputs["Fac"], th.inputs["Value"])
mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 1
nt.links.new(br.outputs["Color"], mx.inputs["A"]); nt.links.new(th.outputs["Result"], mx.inputs["B"])
sky = nt.nodes.new("ShaderNodeMix"); sky.data_type = "RGBA"; sky.inputs["Factor"].default_value = 0.8; sky.inputs["A"].default_value = (0.02, 0.03, 0.06, 1)
nt.links.new(mx.outputs["Result"], sky.inputs["B"]); nt.links.new(sky.outputs["Result"], em.inputs["Color"]); em.inputs["Strength"].default_value = 1.2
nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
box("city", -20, 45, -10, 50, 45.5, 40, city, C["EXTERIOR"])

# ------------------------------------------------------------------ CCTV cameras (housings + Blender cameras)
K.CUR[0] = C["CCTV"]
CAMS = {
    "CAM1_OFFICE": ((27.75, -3.8, 2.55), (24.6, -0.6, 0.9), 13),
    "CAM2_CORRIDOR": ((3.35, -0.4, 2.5), (22.0, -1.1, 0.9), 22),
    "CAM3_SHALLOW": ((0.6, 17.4, 6.2), (14.0, 7.5, -1.0), 14),
    "CAM4_POOL": ((29.75, 9.0, 3.6), (24.0, 9.0, -2.4), 40),
}
for nm_, (loc, at, lens) in CAMS.items():
    cd = bpy.data.cameras.new(nm_); cd.lens = lens; cd.sensor_width = 36; cd.clip_start = 0.05
    co = bpy.data.objects.new(nm_, cd); link(co, C["CCTV"]); co.location = loc
    co.rotation_euler = (Vector(at) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    hb = box(nm_ + "_housing", -0.07, -0.07, 0.02, 0.07, 0.07, 0.26, mat(nm_ + "_white", (0.85, 0.86, 0.86), 0.4), C["CCTV"], 0.01)
    hb.parent = co
    led = cyl(nm_ + "_led", 0, 0, 0, 0.004, 0.008, mat(nm_ + "_led", (0.2, 0, 0), 0.3, emit=(1.0, 0.05, 0.02), emit_s=8.0), C["CCTV"], 8)
    led.parent = co; led.location = (0.05, 0.0, 0.015)

# world: cold dark
w = bpy.data.worlds.new("night"); S.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.008, 0.012, 0.016, 1)
S.render.engine = "BLENDER_EEVEE_NEXT"
S.view_settings.view_transform = "AgX"; S.view_settings.look = "AgX - Medium High Contrast"
S.eevee.volumetric_tile_size = "8"; S.eevee.volumetric_samples = 32
S.render.resolution_x, S.render.resolution_y = 720, 1280
S["floorplan"] = __doc__
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(K.HERE, "pool.blend"))
print("SAVED pool.blend")
