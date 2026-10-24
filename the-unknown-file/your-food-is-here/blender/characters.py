"""Builds characters.blend: PROTAGONIST and COURIER (MPFB CC0 bodies, game_engine rig + IK), plus props.

Run:  blender -b --python characters.py
"""
import bpy, bmesh, os, sys, math, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rigkit
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

D = LocationService.get_user_data()
HERE = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)


def coll(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def move_to(objs, c):
    for o in objs:
        for u in list(o.users_collection):
            u.objects.unlink(o)
        c.objects.link(o)


def human(name, macro, skin, assets):
    m = TargetService.get_default_macro_info_dict()
    m.update(macro)
    h = HumanService.create_human(macro_detail_dict=m, scale=0.1)
    rig = HumanService.add_builtin_rig(h, "game_engine")
    HumanService.set_character_skin(os.path.join(D, skin), h, skin_type="ENHANCED_SSS")
    for kind, rel in assets:
        HumanService.add_mhclo_asset(os.path.join(D, rel), h, asset_type=kind, subdiv_levels=0)
    objs = [rig] + [o for o in bpy.data.objects if o.parent == rig or o == h or (o.parent and o.parent == h)]
    for o in objs:
        o.name = o.name.replace("Human", name)
        if o.data and hasattr(o.data, "name"):
            o.data.name = o.name
    return h, rig


def principled(name, color, rough=0.5, metal=0.0, spec=0.5, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    return m


def add_noise_bump(m, scale=40.0, strength=0.15, color_var=None):
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = 8
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = strength
    nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    if color_var:
        c0 = b.inputs["Base Color"].default_value[:]
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
        n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = color_var[0]; n2.inputs["Detail"].default_value = 4
        mx.inputs["A"].default_value = c0
        mx.inputs["B"].default_value = (*color_var[1], 1)
        nt.links.new(n2.outputs["Fac"], mx.inputs["Factor"])
        nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
    return m


# ------------------------------------------------------------------ PROTAGONIST
c_pro = coll("PROTAGONIST")
pro, pro_rig = human("Pro", dict(gender=1.0, age=0.42, muscle=0.5, weight=0.5, height=0.52, proportions=0.6),
                     "skins/young_caucasian_male/young_caucasian_male.mhmat",
                     (("Eyes", "eyes/high-poly/high-poly.mhclo"), ("Eyebrows", "eyebrows/eyebrow001/eyebrow001.mhclo"),
                      ("Eyelashes", "eyelashes/eyelashes01/eyelashes01.mhclo"), ("Hair", "hair/short02/short02.mhclo"),
                      ("Clothes", "clothes/male_casualsuit02/male_casualsuit02.mhclo"), ("Clothes", "clothes/shoes05/shoes05.mhclo")))
move_to([o for o in bpy.data.objects if o.name.startswith("Pro")], c_pro)
# plain charcoal T-shirt (logo removed), same jeans
_shirt = bpy.data.objects["Pro.male_casualsuit02"].active_material
for n in _shirt.node_tree.nodes:
    if n.type == "TEX_IMAGE" and n.image and "diffuse" in n.image.name:
        n.image = bpy.data.images.load(os.path.join(HERE, "..", "assets", "textures", "pro_shirt_diffuse.png"))
pro_ctl = rigkit.setup_ik(pro_rig, "Pro")

# ------------------------------------------------------------------ COURIER
c_cou = coll("COURIER")
cou, cou_rig = human("Cou", dict(gender=1.0, age=0.6, muscle=0.35, weight=0.3, height=0.72, proportions=0.4),
                     "skins/young_caucasian_male/young_caucasian_male.mhmat",
                     (("Eyes", "eyes/high-poly/high-poly.mhclo"), ("Eyelashes", "eyelashes/eyelashes01/eyelashes01.mhclo"),
                      ("Clothes", "clothes/male_casualsuit01/male_casualsuit01.mhclo"), ("Clothes", "clothes/shoes01/shoes01.mhclo")))
move_to([o for o in bpy.data.objects if o.name.startswith("Cou")], c_cou)

# skin: the same CC0 skin texture, drained — grey-green, waxy, bloodless (only ever seen in the reveals)
skin_img = bpy.data.images.load(os.path.join(D, "skins", "young_caucasian_male", "young_lightskinned_male_diffuse.png"))
sk = bpy.data.materials.new("Cou.skin"); sk.use_nodes = True
snt = sk.node_tree; sb = snt.nodes["Principled BSDF"]
ti = snt.nodes.new("ShaderNodeTexImage"); ti.image = skin_img
uvn = snt.nodes.new("ShaderNodeUVMap")
snt.links.new(uvn.outputs["UV"], ti.inputs["Vector"])
hsv = snt.nodes.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = 0.4; hsv.inputs["Value"].default_value = 0.52
snt.links.new(ti.outputs["Color"], hsv.inputs["Color"])
mx = snt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs["Factor"].default_value = 0.3
snt.links.new(hsv.outputs["Color"], mx.inputs["A"]); mx.inputs["B"].default_value = (0.2, 0.23, 0.21, 1)
# blotchy, bruised discolouration
bn = snt.nodes.new("ShaderNodeTexNoise"); bn.inputs["Scale"].default_value = 14; bn.inputs["Detail"].default_value = 6
bm_ = snt.nodes.new("ShaderNodeMix"); bm_.data_type = "RGBA"; bm_.blend_type = "MULTIPLY"
br_ = snt.nodes.new("ShaderNodeMapRange"); br_.inputs["From Min"].default_value = 0.5; br_.inputs["From Max"].default_value = 0.75; br_.inputs["To Max"].default_value = 0.35
snt.links.new(bn.outputs["Fac"], br_.inputs["Value"]); snt.links.new(br_.outputs["Result"], bm_.inputs["Factor"])
snt.links.new(mx.outputs["Result"], bm_.inputs["A"]); bm_.inputs["B"].default_value = (0.35, 0.3, 0.38, 1)
snt.links.new(bm_.outputs["Result"], sb.inputs["Base Color"])
sb.inputs["Roughness"].default_value = 0.5; sb.inputs["Coat Weight"].default_value = 0.08
sb.inputs["Subsurface Weight"].default_value = 0.0
pn = snt.nodes.new("ShaderNodeTexNoise"); pn.inputs["Scale"].default_value = 900; pn.inputs["Detail"].default_value = 4
pb_ = snt.nodes.new("ShaderNodeBump"); pb_.inputs["Strength"].default_value = 0.12
snt.links.new(pn.outputs["Fac"], pb_.inputs["Height"]); snt.links.new(pb_.outputs["Normal"], sb.inputs["Normal"])
for i, ms in enumerate(cou.material_slots):
    n_ = ms.material.name if ms.material else ""
    if any(k in n_ for k in ("body", "ears", "lips", "nipple", "genitals", "toenails")):
        ms.material = sk
# eyes sit in hollow, widened sockets
_rest = {g.name: g.index for g in cou.vertex_groups}
for side in ("l", "r"):
    ev = [v for v in cou.data.vertices if any(g.group == _rest.get(f"helper-{side}-eye") and g.weight > 0.5 for g in v.groups)]
    if not ev:
        continue
    ec = sum((v.co for v in ev), Vector()) / len(ev)
    evset = {v.index for v in ev}
    deltas = {}
    for v in cou.data.vertices:
        d = (v.co - ec)
        if d.length < 0.028 and v.index not in evset and d.y < 0.012:
            k = 1 - d.length / 0.028
            lat = Vector((d.x * 0.6, 0, d.z))
            dv = Vector((0, 0.0035 * k, 0))
            if lat.length > 1e-6:
                dv += lat.normalized() * 0.0055 * k
            deltas[v.index] = dv
    keys = cou.data.shape_keys.key_blocks if cou.data.shape_keys else []
    for vi, dv in deltas.items():
        cou.data.vertices[vi].co += dv
        for kb in keys:
            kb.data[vi].co += dv
# eyes: no iris, no white — wet black
eye = bpy.data.objects.get("Cou.high-poly")
black_eye = principled("Cou.eyes_black", (0.004, 0.004, 0.005), rough=0.08, coat=1.0)
if eye:
    eye.data.materials.clear(); eye.data.materials.append(black_eye)
    for side_x in (1, -1):
        pts = [v for v in eye.data.vertices if v.co.x * side_x > 0]
        c_ = sum((v.co for v in pts), Vector()) / len(pts)
        for v in pts:
            v.co = c_ + (v.co - c_) * 1.12

# trousers + shirt base from casualsuit01 -> near-black, worn
suit = bpy.data.objects["Cou.male_casualsuit01"]
trousers = add_noise_bump(principled("Cou.trousers", (0.025, 0.025, 0.028), rough=0.8), 120, 0.08, (6, (0.04, 0.038, 0.035)))
suit.data.materials.clear(); suit.data.materials.append(trousers)
shoe = bpy.data.objects["Cou.shoes01"]
shoe_m = add_noise_bump(principled("Cou.shoes_wet", (0.02, 0.018, 0.016), rough=0.18, coat=0.6), 60, 0.1)
shoe.data.materials.clear(); shoe.data.materials.append(shoe_m)


# --- gloves: the hand region of the body itself (exact five fingers, no clipping)
def weight_of(o, vi, names):
    s = 0.0
    for g in o.data.vertices[vi].groups:
        if o.vertex_groups[g.group].name in names:
            s += g.weight
    return s


hand_bones = {f"{b}_{s}" for s in "lr" for b in ["hand"] + [f"{f}_0{k}" for f in rigkit.FINGERS for k in (1, 2, 3)]}
glove = add_noise_bump(principled("Cou.gloves", (0.012, 0.012, 0.013), rough=0.32, coat=0.4), 300, 0.05)
cou.data.materials.append(glove)
gi = len(cou.data.materials) - 1
hand_v = [weight_of(cou, i, hand_bones) for i in range(len(cou.data.vertices))]
for p in cou.data.polygons:
    if min(hand_v[v] for v in p.vertices) > 0.35:
        p.material_index = gi
# hide the nails under the gloves
for p in cou.data.polygons:
    if cou.data.materials[p.material_index] and "fingernails" in cou.data.materials[p.material_index].name:
        p.material_index = gi


# --- raincoat: torso + sleeves derived from the body surface (inherits skin weights), skirt lofted to the knee
def body_copy(o, name):
    arm = o.modifiers.get("Armature")
    states = [(m, m.show_viewport) for m in o.modifiers]
    for m in o.modifiers:
        m.show_viewport = m.type == "MASK" and m.name == "Hide helpers"
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    for m, s in states:
        m.show_viewport = s
    ob = bpy.data.objects.new(name, me)
    for g in o.vertex_groups:
        ob.vertex_groups.new(name=g.name)
    c_cou.objects.link(ob)
    ob.matrix_world = o.matrix_world
    return ob


torso_bones = {"pelvis", "spine_01", "spine_02", "spine_03", "neck_01"} | {f"{b}_{s}" for s in "lr" for b in ("clavicle", "upperarm", "lowerarm")}
# coat torso + sleeves: a real garment (MPFB male_casualsuit01 top, CC0), let out 1.2 cm and re-skinned in yellow PVC
coat = bpy.data.objects.new("Cou.raincoat", suit.data.copy()); c_cou.objects.link(coat)
for g in suit.vertex_groups:
    coat.vertex_groups.new(name=g.name)
coat.matrix_world = suit.matrix_world
bm = bmesh.new(); bm.from_mesh(coat.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0.93], context="VERTS")
bm.normal_update()
for v in bm.verts:
    v.co += v.normal * 0.012
bm.to_mesh(coat.data); bm.free()
for p_ in coat.data.polygons: p_.use_smooth = True


def loft_skirt(name, top_z, bot_z, cx, cy, rx0, ry0, rx1, ry1, rings=14, segs=48):
    bm = bmesh.new()
    rows = []
    for i in range(rings):
        u = i / (rings - 1)
        z = top_z + (bot_z - top_z) * u
        rx = rx0 + (rx1 - rx0) * (u ** 0.8)
        ry = ry0 + (ry1 - ry0) * (u ** 0.8)
        row = []
        for j in range(segs):
            a = 2 * math.pi * j / segs
            wob = 1 + 0.025 * math.sin(a * 7 + i * 0.6) * u      # drape folds widen toward the hem
            row.append(bm.verts.new((cx + rx * math.cos(a) * wob, cy + ry * math.sin(a) * wob, z)))
        rows.append(row)
    for i in range(rings - 1):
        for j in range(segs):
            bm.faces.new((rows[i][j], rows[i][(j + 1) % segs], rows[i + 1][(j + 1) % segs], rows[i + 1][j]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); c_cou.objects.link(ob)
    return ob, [[i * segs + j for j in range(segs)] for i in range(rings)]


# measure the hips/thighs
bodyv = [v.co for v in cou.data.vertices if 0.4 < v.co.z < 1.0 and abs(v.co.x) < 0.3]
def band(z0, z1):
    b = [v for v in bodyv if z0 < v.z < z1]
    xs = [v.x for v in b]; ys = [v.y for v in b]
    return (min(xs), max(xs), min(ys), max(ys))
hx0, hx1, hy0, hy1 = band(0.86, 0.98)
cx, cy = (hx0 + hx1) / 2, (hy0 + hy1) / 2
# (no separate skirt: the courier wears a hip-length yellow rain jacket over dark trousers)
sol = coat.modifiers.new("thickness", "SOLIDIFY"); sol.thickness = 0.006; sol.offset = 1

coat_m = principled("Cou.raincoat", (0.56, 0.38, 0.02), rough=0.4, coat=0.12)
nt = coat_m.node_tree; bsdf = nt.nodes["Principled BSDF"]
# grime + wet streaks + front placket
tc = nt.nodes.new("ShaderNodeTexCoord")
n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 3.0; n1.inputs["Detail"].default_value = 6
n2 = nt.nodes.new("ShaderNodeTexWave"); n2.wave_type = "BANDS"; n2.bands_direction = "Z"; n2.inputs["Scale"].default_value = 2.0; n2.inputs["Distortion"].default_value = 18
nt.links.new(tc.outputs["Object"], n1.inputs["Vector"]); nt.links.new(tc.outputs["Object"], n2.inputs["Vector"])
mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
mx.inputs["A"].default_value = (0.56, 0.38, 0.018, 1); mx.inputs["B"].default_value = (0.22, 0.16, 0.04, 1)
cr = nt.nodes.new("ShaderNodeMapRange"); cr.inputs["From Min"].default_value = 0.38; cr.inputs["From Max"].default_value = 0.8
nt.links.new(n1.outputs["Fac"], cr.inputs["Value"])
nt.links.new(cr.outputs["Result"], mx.inputs["Factor"])
nt.links.new(mx.outputs["Result"], bsdf.inputs["Base Color"])
rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.28; rr.inputs["To Max"].default_value = 0.7
nt.links.new(n2.outputs["Fac"], rr.inputs["Value"]); nt.links.new(rr.outputs["Result"], bsdf.inputs["Roughness"])
bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.06
n3 = nt.nodes.new("ShaderNodeTexNoise"); n3.inputs["Scale"].default_value = 9; n3.inputs["Detail"].default_value = 3
nt.links.new(n3.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], bsdf.inputs["Normal"])
# garment folds from the CC0 suit normal map
nm_img = bpy.data.images.load(os.path.join(D, "clothes", "male_casualsuit01", "male_casualsuit01_normal.png")); nm_img.colorspace_settings.name = "Non-Color"
nti = nt.nodes.new("ShaderNodeTexImage"); nti.image = nm_img
nmap = nt.nodes.new("ShaderNodeNormalMap"); nmap.inputs["Strength"].default_value = 1.4
nt.links.new(nti.outputs["Color"], nmap.inputs["Color"])
nt.links.new(bp.outputs["Normal"], nmap.inputs["Normal"]) if False else None
bp.inputs["Normal"] if False else None
nt.links.new(nmap.outputs["Normal"], bp.inputs["Normal"])
coat.data.materials.clear(); coat.data.materials.append(coat_m)
coat.parent = cou_rig
am = coat.modifiers.new("Armature", "ARMATURE"); am.object = cou_rig
bpy.ops.object.modifier_move_to_index(modifier="Armature", index=0)

# --- hood: dark fabric hood (hoodie under the coat), modelled as a shell round the skull, face opening shadowed
hc = cou_rig.data.bones["head"].head_local + Vector((0, 0.012, 0.085))
bpy.ops.mesh.primitive_uv_sphere_add(segments=56, ring_count=36, radius=1)
hood = bpy.context.object; hood.name = "Cou.hood"
hood.rotation_euler = (math.radians(90), 0, 0)
bpy.ops.object.transform_apply(rotation=True)
move_to([hood], c_cou)
bm = bmesh.new(); bm.from_mesh(hood.data)
rx, ry, rz = 0.128, 0.146, 0.158
kill = []
for f in bm.faces:
    c = f.calc_center_median()
    ang = math.degrees(math.acos(max(-1, min(1, -c.y / max(c.length, 1e-6)))))   # angle from straight ahead
    if ang < 48 or c.z < -0.9:
        kill.append(f)
bmesh.ops.delete(bm, geom=kill, context="FACES")
rnd = random.Random(9)
for v in bm.verts:
    c = v.co.copy()
    ang = math.degrees(math.acos(max(-1, min(1, -c.y / max(c.length, 1e-6)))))
    el = math.degrees(math.asin(max(-1, min(1, c.z))))
    x, y, z = c.x * rx, c.y * ry, c.z * rz
    if el < -20:                       # lower part flares out over the neck and shoulders
        k = (-20 - el) / 45
        x *= 1 + 0.9 * k; y *= 1 + 0.45 * k; z -= 0.05 * k
    if ang < 75:                       # stiff brim, pulled forward and down over the brow
        k = 1 - (ang - 48) / 27
        y -= 0.035 * k
        if c.z > 0:
            z -= 0.022 * k
    if ang < 55:                       # face opening: oval (narrow)
        x *= 0.82
    j = (0.004 * math.sin(c.x * 21 + c.z * 13) + rnd.uniform(-0.001, 0.001)) * min(1.0, max(0.0, (ang - 50) / 25))
    v.co = Vector((x, y, z)) * (1 + j / 0.13) + hc
bm.to_mesh(hood.data); bm.free()
for p_ in hood.data.polygons: p_.use_smooth = True
s2 = hood.modifiers.new("thickness", "SOLIDIFY"); s2.thickness = 0.008; s2.offset = 1
hood_m = add_noise_bump(principled("Cou.hood", (0.012, 0.012, 0.014), rough=0.95), 220, 0.12)
hood.data.materials.clear(); hood.data.materials.append(hood_m)
for g in ("head", "neck_01", "spine_03"):
    hood.vertex_groups.new(name=g)
for v in hood.data.vertices:
    dz = v.co.z - hc.z
    wh = max(0.0, min(1.0, (dz + 0.10) / 0.07))
    hood.vertex_groups["head"].add([v.index], wh, "REPLACE")
    hood.vertex_groups["neck_01"].add([v.index], (1 - wh) * 0.6, "REPLACE")
    hood.vertex_groups["spine_03"].add([v.index], (1 - wh) * 0.4, "REPLACE")
hood.parent = cou_rig
am = hood.modifiers.new("Armature", "ARMATURE"); am.object = cou_rig
bpy.ops.object.select_all(action="DESELECT"); hood.select_set(True); bpy.context.view_layer.objects.active = hood
bpy.ops.object.modifier_move_to_index(modifier="Armature", index=0)
# the shirt half of the base suit is never seen under the coat: remove it so nothing pokes through
bm = bmesh.new(); bm.from_mesh(suit.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 1.0], context="VERTS")
bm.to_mesh(suit.data); bm.free()
# head is shaved under the hood; no hair object at all
cou_ctl = rigkit.setup_ik(cou_rig, "Cou")

# ------------------------------------------------------------------ PROPS
c_props = coll("PROPS")


def rbox(name, size, bevel=0.003, segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object; o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("bevel", "BEVEL"); b.width = bevel; b.segments = segs
    move_to([o], c_props)
    return o


phone = rbox("PHONE", (0.072, 0.152, 0.0085), 0.006, 4)
phone.data.materials.append(principled("phone_body", (0.02, 0.02, 0.022), rough=0.25, metal=0.6))
bpy.ops.mesh.primitive_plane_add(size=1)
scr = bpy.context.object; scr.name = "PHONE.screen"; scr.scale = (0.066, 0.145, 1)
bpy.ops.object.transform_apply(scale=True)
scr.location.z = 0.00435; scr.parent = phone
sm = bpy.data.materials.new("phone_screen"); sm.use_nodes = True
snt = sm.node_tree; sb = snt.nodes["Principled BSDF"]
sb.inputs["Base Color"].default_value = (0.002, 0.002, 0.003, 1); sb.inputs["Roughness"].default_value = 0.05
sb.inputs["Emission Color"].default_value = (0.75, 0.82, 1.0, 1); sb.inputs["Emission Strength"].default_value = 2.5
img = snt.nodes.new("ShaderNodeTexImage"); img.name = "UI"
snt.links.new(img.outputs["Color"], sb.inputs["Emission Color"])
scr.data.materials.append(sm)
move_to([scr], c_props)

# paper delivery bag: kraft paper, rolled-over top, grease stain
bag = rbox("BAG", (0.24, 0.15, 0.30), 0.004, 2)
bm = bmesh.new(); bm.from_mesh(bag.data)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=6, use_grid_fill=True)
rnd = random.Random(4)
for v in bm.verts:
    v.co += Vector((rnd.uniform(-1, 1) * 0.004, rnd.uniform(-1, 1) * 0.004, rnd.uniform(-1, 1) * 0.003))
    if v.co.z > 0.12:            # pinched, folded top
        v.co.y *= 0.35
bm.to_mesh(bag.data); bm.free()
kraft = add_noise_bump(principled("kraft", (0.42, 0.28, 0.15), rough=0.85), 25, 0.35, (4, (0.30, 0.19, 0.10)))
bag.data.materials.append(kraft)

# receipt (N3 ending)
bpy.ops.mesh.primitive_plane_add(size=1)
rc = bpy.context.object; rc.name = "RECEIPT"; rc.scale = (0.075, 0.16, 1)
bpy.ops.object.transform_apply(scale=True)
move_to([rc], c_props)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "characters.blend"))
print("SAVED characters.blend")
