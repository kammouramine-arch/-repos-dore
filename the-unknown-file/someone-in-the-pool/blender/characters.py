"""Builds characters.blend for SOMEONE IS IN THE POOL: the GUARD and the WOMAN (in white). MPFB CC0 bodies on the
53-bone game_engine skeleton with two-bone IK, pole targets, joint limits and a finger rig (rigkit.py), plus props.
Run: blender -b --python characters.py
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
TEX = os.path.join(HERE, "..", "assets", "textures")
PH = os.path.join(HERE, "..", "assets", "polyhaven")
bpy.ops.wm.read_factory_settings(use_empty=True)


def coll(name):
    c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); return c


def move_to(objs, c):
    for o in objs:
        for u in list(o.users_collection):
            u.objects.unlink(o)
        c.objects.link(o)


def human(name, macro, skin, assets):
    m = TargetService.get_default_macro_info_dict(); m.update(macro)
    h = HumanService.create_human(macro_detail_dict=m, scale=0.1)
    rig = HumanService.add_builtin_rig(h, "game_engine")
    HumanService.set_character_skin(os.path.join(D, skin), h, skin_type="ENHANCED_SSS")
    for kind, rel in assets:
        HumanService.add_mhclo_asset(os.path.join(D, rel), h, asset_type=kind, subdiv_levels=0)
    for o in [rig] + [o for o in bpy.data.objects if o.parent == rig or o == h]:
        o.name = o.name.replace("Human", name)
    return h, rig


def principled(name, color, rough=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal; b.inputs["Coat Weight"].default_value = coat
    return m


def swap_diffuse(obj, path):
    for ms in obj.material_slots:
        for n in ms.material.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and "diffuse" in n.image.name.lower():
                n.image = bpy.data.images.load(path)


def wet(obj, rough=0.18, darken=0.85):
    """make a garment/hair look soaked: lower roughness, darker, glossy coat"""
    for ms in obj.material_slots:
        m = ms.material; nt = m.node_tree
        for n in nt.nodes:
            if n.type == "BSDF_PRINCIPLED":
                n.inputs["Roughness"].default_value = rough
                n.inputs["Coat Weight"].default_value = 0.25; n.inputs["Coat Roughness"].default_value = 0.12
                src = n.inputs["Base Color"].links[0].from_socket if n.inputs["Base Color"].links else None
                if src:
                    mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
                    nt.links.new(src, mul.inputs["A"]); mul.inputs["B"].default_value = (darken, darken, darken, 1)
                    nt.links.new(mul.outputs["Result"], n.inputs["Base Color"])


# ------------------------------------------------------------------ GUARD
c_g = coll("GUARD")
guard, g_rig = human("Gua", dict(gender=1.0, age=0.56, muscle=0.5, weight=0.62, height=0.5, proportions=0.55),
                     "skins/middleage_caucasian_male/middleage_caucasian_male.mhmat",
                     (("Eyes", "eyes/high-poly/high-poly.mhclo"), ("Eyebrows", "eyebrows/eyebrow002/eyebrow002.mhclo"),
                      ("Eyelashes", "eyelashes/eyelashes01/eyelashes01.mhclo"), ("Hair", "hair/short04/short04.mhclo"),
                      ("Clothes", "clothes/male_casualsuit03/male_casualsuit03.mhclo"), ("Clothes", "clothes/shoes01/shoes01.mhclo")))
move_to([o for o in bpy.data.objects if o.name.startswith("Gua")], c_g)
swap_diffuse(bpy.data.objects["Gua.male_casualsuit03"], os.path.join(TEX, "guard_uniform_diffuse.png"))
sh = bpy.data.objects["Gua.shoes01"]; sh.data.materials.clear(); sh.data.materials.append(principled("Gua.shoes", (0.015, 0.015, 0.016), 0.3, coat=0.4))
# hair: dark brown going grey
for ms in bpy.data.objects["Gua.short04"].material_slots:
    for n in ms.material.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED" and n.inputs["Base Color"].links:
            nt = ms.material.node_tree
            hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 0.5; hs.inputs["Value"].default_value = 0.75
            nt.links.new(n.inputs["Base Color"].links[0].from_socket, hs.inputs["Color"]); nt.links.new(hs.outputs["Color"], n.inputs["Base Color"])
g_ctl = rigkit.setup_ik(g_rig, "Gua")
# uniform details: shoulder patch + duty belt + radio pouch (children of the spine/pelvis bones -> no floating)
M_PATCH = principled("Gua.patch", (0.05, 0.08, 0.15), 0.6)
M_BELT = principled("Gua.belt", (0.015, 0.015, 0.015), 0.35, coat=0.3)


def bone_child(obj, rig, bone):
    b = rig.data.bones[bone]
    obj.parent = rig; obj.parent_type = "BONE"; obj.parent_bone = bone
    obj.matrix_parent_inverse = (rig.matrix_world @ Matrix.Translation(b.tail_local) @ b.matrix_local.to_3x3().to_4x4()).inverted()


pel = g_rig.data.bones["pelvis"].head_local
gv = [v.co for v in guard.data.vertices if pel.z + 0.06 < v.co.z < pel.z + 0.12 and abs(v.co.x) < 0.25]
rx = (max(v.x for v in gv) - min(v.x for v in gv)) / 2
cy = (max(v.y for v in gv) + min(v.y for v in gv)) / 2
bpy.ops.mesh.primitive_cube_add(size=1); rp = bpy.context.object; rp.name = "Gua.radio_pouch"
rp.scale = (0.035, 0.06, 0.12); rp.location = (-rx - 0.012, cy, pel.z + 0.02)
bpy.ops.object.transform_apply(scale=True, location=True); rp.data.materials.append(M_BELT); move_to([rp], c_g); bone_child(rp, g_rig, "pelvis")

# ------------------------------------------------------------------ WOMAN IN WHITE
c_w = coll("WOMAN")
woman, w_rig = human("Wom", dict(gender=0.0, age=0.42, muscle=0.3, weight=0.32, height=0.6, proportions=0.6),
                     "skins/young_caucasian_female/young_caucasian_female.mhmat",
                     (("Eyes", "eyes/high-poly/high-poly.mhclo"), ("Eyebrows", "eyebrows/eyebrow001/eyebrow001.mhclo"),
                      ("Eyelashes", "eyelashes/eyelashes01/eyelashes01.mhclo"), ("Hair", "hair/long01/long01.mhclo"),
                      ("Clothes", "clothes/female_elegantsuit01/female_elegantsuit01.mhclo")))
move_to([o for o in bpy.data.objects if o.name.startswith("Wom")], c_w)
dress = [o for o in bpy.data.objects if o.name.startswith("Wom.female_elegantsuit01")][0]
swap_diffuse(dress, os.path.join(TEX, "woman_dress_diffuse.png"))
wet(dress, rough=0.42, darken=1.08)
for ms in dress.material_slots:      # thin wet cotton: a little light passes through
    for n in ms.material.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            n.inputs["Subsurface Weight"].default_value = 0.0
# long gown: keep the blouse, replace the short skirt with a lofted ankle-length skirt skinned to pelvis/thighs/calves
pelw = w_rig.data.bones["pelvis"].head_local
bm = bmesh.new(); bm.from_mesh(dress.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < pelw.z + 0.02], context="VERTS")
bm.to_mesh(dress.data); bm.free()
bodyv = [v.co for v in woman.data.vertices]
def band(z0, z1):
    b = [v for v in bodyv if z0 < v.z < z1 and abs(v.x) < 0.3]
    return min(v.x for v in b), max(v.x for v in b), min(v.y for v in b), max(v.y for v in b)
hx0, hx1, hy0, hy1 = band(pelw.z - 0.12, pelw.z - 0.02)
cxg, cyg = (hx0 + hx1) / 2, (hy0 + hy1) / 2
rings, segs = 22, 56
top_z, bot_z = pelw.z + 0.07, 0.1
bm = bmesh.new(); rows = []
rnd = random.Random(5)
for i in range(rings):
    u = i / (rings - 1); z = top_z + (bot_z - top_z) * u
    rx = (hx1 - hx0) / 2 + 0.006 + 0.095 * u ** 1.5; ry = (hy1 - hy0) / 2 + 0.008 + 0.075 * u ** 1.5
    row = []
    for j in range(segs):
        a = 2 * math.pi * j / segs
        fold = 1 + (0.03 * math.sin(a * 11 + 0.3 * math.sin(i * 0.5)) + 0.018 * math.sin(a * 6 - 1.3)) * (0.2 + u)
        row.append(bm.verts.new((cxg + rx * math.cos(a) * fold, cyg + ry * math.sin(a) * fold, z)))
    rows.append(row)
for i in range(rings - 1):
    for j in range(segs):
        bm.faces.new((rows[i][j], rows[i][(j + 1) % segs], rows[i + 1][(j + 1) % segs], rows[i + 1][j]))
gme = bpy.data.meshes.new("Wom.gown"); bm.to_mesh(gme); bm.free()
gown = bpy.data.objects.new("Wom.gown", gme); c_w.objects.link(gown)
gme.uv_layers.new()
for p_ in gme.polygons: p_.use_smooth = True
for g in ("pelvis", "thigh_l", "thigh_r", "calf_l", "calf_r"):
    gown.vertex_groups.new(name=g)
knee_z = w_rig.data.bones["calf_l"].head_local.z
for v in gme.vertices:
    side = "l" if v.co.x > cxg else "r"
    lat = min(1.0, abs(v.co.x - cxg) / 0.09)
    u = (top_z - v.co.z) / (top_z - bot_z)
    leg = min(1.0, u * 1.6) * (0.25 + 0.5 * lat)
    wcalf = max(0.0, (knee_z - v.co.z) / knee_z) * leg * 0.6
    gown.vertex_groups["pelvis"].add([v.index], max(0.0, 1 - leg), "REPLACE")
    gown.vertex_groups[f"thigh_{side}"].add([v.index], max(0.0, leg - wcalf), "REPLACE")
    gown.vertex_groups[f"calf_{side}"].add([v.index], wcalf, "REPLACE")
gs = gown.modifiers.new("t", "SOLIDIFY"); gs.thickness = 0.004
gown.parent = w_rig; am = gown.modifiers.new("Armature", "ARMATURE"); am.object = w_rig
bpy.context.view_layer.objects.active = gown; bpy.ops.object.modifier_move_to_index(modifier="Armature", index=0)
M_GOWN = principled("Wom.gown_cloth", (0.82, 0.83, 0.82), 0.4, coat=0.25)
nt = M_GOWN.node_tree; bsd = nt.nodes["Principled BSDF"]
st = nt.nodes.new("ShaderNodeTexNoise"); st.inputs["Scale"].default_value = 3.0; st.inputs["Detail"].default_value = 6
cr_ = nt.nodes.new("ShaderNodeMapRange"); cr_.inputs["From Min"].default_value = 0.45; cr_.inputs["From Max"].default_value = 0.7; cr_.inputs["To Max"].default_value = 0.25
nt.links.new(st.outputs["Fac"], cr_.inputs["Value"])
mxg = nt.nodes.new("ShaderNodeMix"); mxg.data_type = "RGBA"; mxg.inputs["A"].default_value = (0.82, 0.83, 0.82, 1); mxg.inputs["B"].default_value = (0.45, 0.47, 0.44, 1)
nt.links.new(cr_.outputs["Result"], mxg.inputs["Factor"]); nt.links.new(mxg.outputs["Result"], bsd.inputs["Base Color"])
tcg = nt.nodes.new("ShaderNodeTexCoord"); mpg = nt.nodes.new("ShaderNodeMapping"); mpg.inputs["Scale"].default_value = (1.0, 1.0, 0.12)
nt.links.new(tcg.outputs["Object"], mpg.inputs["Vector"])
bpw = nt.nodes.new("ShaderNodeTexNoise"); bpw.inputs["Scale"].default_value = 22; bpw.inputs["Detail"].default_value = 3
nt.links.new(mpg.outputs["Vector"], bpw.inputs["Vector"])
bpn = nt.nodes.new("ShaderNodeBump"); bpn.inputs["Strength"].default_value = 0.14
nt.links.new(bpw.outputs["Fac"], bpn.inputs["Height"]); nt.links.new(bpn.outputs["Normal"], bsd.inputs["Normal"])
gme.materials.append(M_GOWN)
# hide the body's legs under the gown (thighs/knees can't poke through)
mg = woman.vertex_groups.new(name="Delete.gown")
for v in woman.data.vertices:
    if bot_z + 0.12 < v.co.z < top_z - 0.02 and abs(v.co.x - cxg) < 0.2:
        mg.add([v.index], 1.0, "REPLACE")
mm = woman.modifiers.new("Delete.gown", "MASK"); mm.vertex_group = "Delete.gown"; mm.invert_vertex_group = True

# hair: black, soaked, clumped
hair = bpy.data.objects["Wom.long01"]
for ms in hair.material_slots:
    nt = ms.material.node_tree
    for n in nt.nodes:
        if n.type == "BSDF_PRINCIPLED" and n.inputs["Base Color"].links:
            hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 0.2; hs.inputs["Value"].default_value = 0.12
            nt.links.new(n.inputs["Base Color"].links[0].from_socket, hs.inputs["Color"]); nt.links.new(hs.outputs["Color"], n.inputs["Base Color"])
            n.inputs["Roughness"].default_value = 0.22; n.inputs["Coat Weight"].default_value = 0.5
# hair falls forward over the face when her head is down: extra front locks (strips skinned to the head)
M_LOCK = principled("Wom.locks", (0.006, 0.006, 0.007), 0.2, coat=0.6)
hb = w_rig.data.bones["head"]
hc = hb.head_local + Vector((0, 0.0, 0.11))
for i, (ax, az) in enumerate(((-0.06, 0.0), (-0.025, 0.01), (0.015, 0.01), (0.05, 0.0), (-0.085, -0.03), (0.08, -0.03))):
    bm = bmesh.new()
    pts = [hc + Vector((ax * 0.7, -0.035, 0.07 + az)), hc + Vector((ax, -0.105, 0.03 + az)), hc + Vector((ax * 1.05, -0.125, -0.06)),
           hc + Vector((ax * 1.1, -0.12, -0.18)), hc + Vector((ax * 1.15, -0.1, -0.32))]
    left, right = [], []
    for j, p in enumerate(pts):
        w = 0.022 * (1 - j / 6)
        left.append(bm.verts.new(p + Vector((-w, 0, 0)))); right.append(bm.verts.new(p + Vector((w, 0, 0))))
    for j in range(len(pts) - 1):
        bm.faces.new((left[j], right[j], right[j + 1], left[j + 1]))
    me = bpy.data.meshes.new(f"Wom.lock_{i}"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f"Wom.lock_{i}", me); c_w.objects.link(o); me.materials.append(M_LOCK)
    s_ = o.modifiers.new("t", "SOLIDIFY"); s_.thickness = 0.004
    o.vertex_groups.new(name="head").add(list(range(len(me.vertices))), 1.0, "REPLACE")
    o.parent = w_rig; am = o.modifiers.new("Armature", "ARMATURE"); am.object = w_rig
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_move_to_index(modifier="Armature", index=0)
    o.hide_render = True          # shown per shot ("locks" on) when her head hangs
# skin: pale, cold, waterlogged (subtle — she must still read as human on Night 1)
for ms in woman.material_slots:
    m = ms.material.copy(); ms.material = m
    for n in m.node_tree.nodes:
        if n.type == "GROUP" and n.node_tree:
            n.node_tree = n.node_tree.copy()
            for bs in [x for x in n.node_tree.nodes if x.type == "BSDF_PRINCIPLED"]:
                gt = n.node_tree
                src = bs.inputs["Base Color"].links[0].from_socket if bs.inputs["Base Color"].links else None
                hsv = gt.nodes.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = 0.35; hsv.inputs["Value"].default_value = 0.82
                if src:
                    gt.links.new(src, hsv.inputs["Color"])
                mix = gt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["Factor"].default_value = 0.2
                gt.links.new(hsv.outputs["Color"], mix.inputs["A"]); mix.inputs["B"].default_value = (0.55, 0.62, 0.66, 1)
                gt.links.new(mix.outputs["Result"], bs.inputs["Base Color"])
                bs.inputs["Coat Weight"].default_value = 0.35; bs.inputs["Coat Roughness"].default_value = 0.1
# eyes: Night 1-2 very dark irises (human); Night 3 material "Wom.eyes_void" swapped in by shots
eye = bpy.data.objects.get("Wom.high-poly")
M_VOID = principled("Wom.eyes_void", (0.003, 0.003, 0.004), 0.06, coat=1.0)
M_VOID.use_fake_user = True
if eye:
    for ms in eye.material_slots:
        for n in ms.material.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED" and n.inputs["Base Color"].links:
                nt = ms.material.node_tree
                hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Value"].default_value = 0.55; hs.inputs["Saturation"].default_value = 0.3
                nt.links.new(n.inputs["Base Color"].links[0].from_socket, hs.inputs["Color"]); nt.links.new(hs.outputs["Color"], n.inputs["Base Color"])
w_ctl = rigkit.setup_ik(w_rig, "Wom")

# ------------------------------------------------------------------ PROPS
c_p = coll("PROPS")


def rbox(name, size, bevel=0.003, segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("bevel", "BEVEL"); b.width = bevel; b.segments = segs
    move_to([o], c_p); return o


# phone (same construction as YOUR FOOD IS HERE; UI image set per shot)
phone = rbox("PHONE", (0.072, 0.152, 0.0085), 0.006, 4)
phone.data.materials.append(principled("phone_body", (0.02, 0.02, 0.022), 0.25, 0.6))
bpy.ops.mesh.primitive_plane_add(size=1); scr = bpy.context.object; scr.name = "PHONE.screen"; scr.scale = (0.066, 0.145, 1)
bpy.ops.object.transform_apply(scale=True); scr.location.z = 0.00435; scr.parent = phone
sm = bpy.data.materials.new("phone_screen"); sm.use_nodes = True; snt = sm.node_tree; sb = snt.nodes["Principled BSDF"]
sb.inputs["Base Color"].default_value = (0.002, 0.002, 0.003, 1); sb.inputs["Roughness"].default_value = 0.05
sb.inputs["Emission Color"].default_value = (0.75, 0.82, 1.0, 1); sb.inputs["Emission Strength"].default_value = 0.0
img = snt.nodes.new("ShaderNodeTexImage"); img.name = "UI"
scr.data.materials.append(sm); move_to([scr], c_p)
# flashlight: long black torch with a working spot light at the lens
fl = rbox("FLASHLIGHT", (0.042, 0.042, 0.30), 0.012, 3)
fl.data.materials.append(principled("torch_black", (0.02, 0.02, 0.022), 0.35, 0.5))
lens = rbox("FLASHLIGHT.lens", (0.05, 0.05, 0.02), 0.01, 2); lens.parent = fl; lens.location = (0, 0, 0.155)
lm = principled("torch_lens", (0.9, 0.9, 0.85), 0.05); lm.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1, 0.97, 0.9, 1)
lm.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.0; lens.data.materials.append(lm)
L = bpy.data.lights.new("FLASHLIGHT.beam", "SPOT"); L.energy = 0.0; L.spot_size = math.radians(26); L.spot_blend = 0.45; L.color = (1.0, 0.96, 0.88); L.shadow_soft_size = 0.02
lo = bpy.data.objects.new("FLASHLIGHT.beam", L); c_p.objects.link(lo); lo.parent = fl; lo.location = (0, 0, 0.17); lo.rotation_euler = (math.pi, 0, 0)
# handheld radio
rad = rbox("HANDRADIO", (0.06, 0.035, 0.13), 0.006, 3); rad.data.materials.append(principled("handradio", (0.03, 0.03, 0.035), 0.45))
ant = rbox("HANDRADIO.antenna", (0.012, 0.012, 0.08), 0.004, 2); ant.parent = rad; ant.location = (0.018, 0, 0.1); ant.data.materials.append(principled("ant", (0.02, 0.02, 0.02), 0.5))
# car keys (N3 ending)
bpy.ops.mesh.primitive_torus_add(major_radius=0.015, minor_radius=0.002); kr = bpy.context.object; kr.name = "KEYS"; move_to([kr], c_p)
kr.data.materials.append(principled("keys", (0.7, 0.7, 0.72), 0.3, 1.0))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "characters.blend"))
print("SAVED characters.blend")
