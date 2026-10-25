"""NIGHT 3 — IT FOLLOWED YOU HOME. 3D shots, timed to the narration (docs/STORYBOARDS.md has the cut list).
Sets: apartment.blend (flat 3C, building corridor + stairwell, street + car) and pool.blend (CAM 4 on his phone).
blender -b --python p3_shots.py -- [shot ...|all] [--still]
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
from shotkit import *
from poses import *
import fx
from setkit import box, cyl

OUT = os.path.join(ROOT, "renders", "p3")
UI = os.path.join(ROOT, "renders", "ui")
HERO = (720, 1280); STD = (576, 1024); CCTV = (540, 960)
SOFA_SEAT = (3.38, 5.9)         # he sits facing west (TV), yaw 270
BATH_DOOR_SPOT = (2.9, 3.25)     # in front of the bathroom door (landing), facing south into the bathroom
GZ = -9.0
CAR = Vector((40.0, -7.15, GZ))


def ui(name):
    p = os.path.join(UI, name + ".png")
    return p if os.path.exists(p) else None


def car(v):
    """car-local -> world (the car is axis-aligned, heading +X)"""
    return CAR + Vector(v)


def phone_light(on, energy=40.0, cam=None):
    """the phone's torch: a cold spot light at the camera (POV shots)"""
    L = bpy.data.objects.get("PHONE_TORCH")
    if not L:
        ld = bpy.data.lights.new("PHONE_TORCH", "SPOT"); ld.spot_size = math.radians(70); ld.spot_blend = 0.8; ld.color = (0.85, 0.92, 1.0); ld.shadow_soft_size = 0.01
        L = bpy.data.objects.new("PHONE_TORCH", ld); bpy.context.scene.collection.objects.link(L)
    L.data.energy = energy if on else 0.0
    if cam is not None:
        L.matrix_world = cam.matrix_world @ Matrix.Translation((0.08, -0.12, 0.0))
    return L


def all_off_but(*keep):
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name not in keep and not o.name.startswith("PHONE"):
            o.data.energy = 0.0


def guard_in_car(G, t, grip=True, head_back=0.0, look=0.0, breath=1.0):
    G.floor = GZ + 0.35
    G.sit(car((-0.06, -0.36, 0))[0], car((0, -0.36, 0))[1], 90, seat=GZ + 0.6, feet_fwd=0.55, feet_apart=0.13)
    b = breathe(t, 0.3, breath)
    G.spine(pitch=-4 + b - 6 * head_back, yaw=look * 0.2)
    G.head(pitch=4 - 22 * head_back, yaw=look * 0.8)
    if grip:
        sw = bpy.data.objects["STEERING"]; bpy.context.view_layer.update()
        Mw = sw.matrix_world
        ax = (Mw.to_3x3() @ Vector((0, 0, 1))).normalized()
        best = max(range(0, 360, 5), key=lambda a: (Mw @ Vector((0.19 * math.cos(math.radians(a)), 0.19 * math.sin(math.radians(a)), 0))).z)
        for s_, da in (("l", 60), ("r", -60)):
            a = math.radians(best + da)
            p = Mw @ Vector((0.19 * math.cos(a), 0.19 * math.sin(a), 0))
            rad = (p - Mw.translation).normalized()
            G.hand_world(s_, p - rad * 0.06 - ax * 0.03, rad, ax, "grip")
    bpy.context.view_layer.update()


# ------------------------------------------------------------------ shots
def p3_01():
    """0.00-2.98  His flat at night: the security radio, the torch and his ID badge dropped on the kitchen table."""
    S, G, W = open_set("apartment", "warm", guard=False, woman=False)
    cam = camera(lens=40)
    for nm, loc, rot in (("HANDRADIO", (7.0, 5.45, 0.785), (math.radians(90), 0, math.radians(20))), ("FLASHLIGHT", (7.15, 5.7, 0.787), (0, math.radians(90), math.radians(-30)))):
        o = bpy.data.objects[nm]; show(nm, True); o.location = loc; o.rotation_euler = rot
    flashlight(False)
    badge, _ = fx.decal("BADGE", "logbook_page.png", (6.85, 5.72, 0.763), (0.085, 0.055), rot=(0, 0, math.radians(-14)), color=(0.9, 0.9, 0.88), alpha=1.0, rough=0.4, coat=0.3, coll="FLAT")
    aim(cam, (6.35, 6.45, 1.35), (7.0, 5.6, 0.78))
    dof(cam, 1.05, 2.8)
    return {"frames": 1, "update": lambda t: None, "still": True, "res": HERO, "samples": 12}


def p3_02():
    """10.64-14.00  He turns the deadbolt on his front door (3C)."""
    S, G, W = open_set("apartment", "warm", woman=False)
    cam = camera(lens=45)
    db = bpy.data.objects["deadbolt"]; db.rotation_mode = "ZXY"
    bar = box("deadbolt_bar", -0.006, -0.025, 0.0, 0.006, 0.025, 0.018, bpy.data.materials["brushed_steel"], bpy.data.collections["FLAT"])
    bar.parent = db; bar.location = (0, 0, 0.02)

    def update(t):
        guard_stand(G, 1.0, 0.62, 0, t, spine=8, head_pitch=14, arms=False)
        G.hand_rest("l")
        k = smooth(ramp(t, 0.9, 1.6))
        reach = smooth(ramp(t, 0.2, 0.85))
        bpy.context.view_layer.update()
        p = db.matrix_world.translation + Vector((0, 0.035, 0))
        start = G.world(Vector((-0.2, -0.25, 0.95)))
        G.hand_world("r", start.lerp(p + Vector((0.03, 0.06, -0.06)), reach), (-0.3, -0.5, 0.8), (-1, 0, 0), "handle")
        db.rotation_euler = (math.radians(90), 0, math.radians(90 * k))
        aim(cam, Vector((1.48, 0.95, 1.5)), Vector((1.08, 0.0, 1.28)), handheld(t, 0.3)[1])
    return {"frames": 41, "fps": 12, "update": update, "res": STD}


def _sofa(G, t, look=0.0, lift=0.0, head_pitch=26.0, phone_ui=None):
    G.sit(SOFA_SEAT[0], SOFA_SEAT[1], 270, seat=0.66, feet_fwd=0.52)
    b = breathe(t, 0.22)
    G.spine(pitch=-10 + b + 10 * lift, yaw=look * 0.3)
    G.head(pitch=head_pitch - lift * 34, yaw=look * 0.7)
    M = phone_in_hand(G, 0.3, 0.26 - 0.06 * lift)
    attach_phone(G, M)
    G.hand("l", Vector((0.17, -0.4, 0.5)), Vector((0.1, -1, -0.15)), Vector((0, 0, -1)), "relaxed")
    bpy.context.view_layer.update()


def p3_03():
    """14.00-16.98  On the sofa under the lamp, phone in hand, convincing himself it's over."""
    S, G, W = open_set("apartment", "warm", woman=False)
    cam = camera(lens=35)
    phone_screen(ui("p3_home"), 2.0, 1.5)

    def update(t):
        _sofa(G, t, head_pitch=22)
        aim(cam, lerp(Vector((1.7, 4.9, 1.35)), Vector((1.85, 5.05, 1.32)), t / 3.0), G.world(G.eye()) + Vector((0, 0, -0.18)), handheld(t, 0.3)[1])
    return {"frames": 36, "fps": 12, "update": update, "res": STD}


def p3_04():
    """16.98-21.60  The phone face-up on the coffee table buzzes; the lock screen lights at 3:07."""
    S, G, W = open_set("apartment", "warm", guard=False, woman=False)
    cam = camera(lens=55)
    ph = bpy.data.objects["PHONE"]; show("PHONE", True); ph.parent = None
    base = Matrix.Translation((2.15, 5.75, 0.425)) @ Matrix.Rotation(math.radians(80), 4, "Z")
    for nm in ("L_living_ceiling", "L_kitchen"):
        bpy.data.objects[nm].data.energy *= 0.25

    def update(t):
        buzz = (0.6 < t < 1.3) or (2.2 < t < 2.9)
        j = Matrix.Rotation(math.radians(1.2 * math.sin(t * 160)) if buzz else 0, 4, "Z") @ Matrix.Translation((0.0008 * math.sin(t * 190) if buzz else 0, 0, 0))
        ph.matrix_world = base @ j
        phone_screen(ui("p3_lock_note") if t >= 0.6 else None, 2.6 * clamp((t - 0.6) / 0.15), 2.5)
        aim(cam, Vector((2.55, 6.35, 0.95)), Vector((2.15, 5.75, 0.43)), handheld(t, 0.2)[1])
        dof(cam, ph, 2.4)
    return {"frames": 56, "fps": 12, "update": update, "res": STD}


def p3_cc4():
    """29.92-47.50  CAM 4 on his phone: the pool full of dark water; she stands beneath the surface. 6.1-8.6 her head rises until she
    looks straight into the lens (at you). 12.0-14.6 she raises one finger and points at the camera — at something behind it."""
    S, G, W = open_set("pool", "night", guard=False)
    c = bpy.data.objects["CAM4_POOL"]; c.data.lens = 95
    c.rotation_euler = (Vector((24.0, 9.0, -1.9)) - c.location).to_track_quat("-Z", "Y").to_euler(); S.camera = c
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name.startswith("L_uw"):
            o.data.energy *= 0.55
    void_eyes(True)

    def update(t):
        k = smoother(ramp(t, 6.1, 8.6))
        woman_under(W, 24.0, 9.0, 90, t, head_pitch=34 - 84 * k, spine=4 - 12 * k, sway=1 - 0.7 * k)
        p = smoother(ramp(t, 12.0, 14.6))
        if p > 0:
            sh = W.world(Vector((-0.2, -0.05, 1.38)))
            tgt = c.location
            d = (tgt - sh).normalized()
            rest = W.world(Vector((-0.24, -0.02, 0.82)))
            hand = rest.lerp(sh + d * 0.52, p)
            W.hand_world("r", hand, d.lerp(Vector((0, 0, -1)), 1 - p).normalized(), Vector((0, 0, -1)).lerp(Vector((0, 1, 0)), p), mix_hand("relaxed", "point", p))
        water(t, 0.7)
    return {"frames": 141, "fps": 8, "update": update, "res": CCTV, "samples": 5}


def p3_05():
    """47.50-50.32  A noise from the bathroom: he looks up from the phone toward the hall."""
    S, G, W = open_set("apartment", "warm", woman=False)
    cam = camera(lens=40)
    phone_screen(ui("p3_cam4"), 2.2, 1.6)

    def update(t):
        k = smoother(ramp(t, 0.5, 1.6))
        _sofa(G, t, look=-60 * k, lift=k, head_pitch=24)
        aim(cam, Vector((1.6, 6.6, 1.25)), G.world(G.eye()) + Vector((0, 0, -0.1)), handheld(t, 0.3)[1])
        dof(cam, 1.9, 2.4)
    return {"frames": 34, "fps": 12, "update": update, "res": STD}


def p3_06():
    """50.32-53.00  The dark bathroom: the tap drips into the sink — drip, drip, drip."""
    S, G, W = open_set("apartment", "bath", guard=False, woman=False)
    cam = camera(lens=80)
    for nm in ("L_bath", "L_bath_mirror"):
        bpy.data.objects[nm].data.energy *= 0.12
    fill = area_fill("BATH_FILL", (3.5, 1.2, 2.3), 6, (0.6, 0.75, 1.0))
    dr = fx.Drips([((1.855, 1.85, 1.022), 0.68, 0.12)], 0.84, 0.0045, coll="BATHROOM")

    def update(t):
        dr.update(t)
        aim(cam, Vector((2.35, 1.55, 1.12)), Vector((1.84, 1.85, 0.97)), handheld(t, 0.1)[1])
        dof(cam, 0.6, 2.8)
    return {"frames": 33, "fps": 12, "update": update, "res": STD}


def area_fill(name, loc, energy, color, size=1.0):
    L = bpy.data.lights.new(name, "AREA"); L.energy = energy; L.size = size; L.color = color
    o = bpy.data.objects.new(name, L); bpy.context.scene.collection.objects.link(o); o.location = loc
    return o


def water_sheet(name="FLOOD"):
    """a thin sheet of water spreading out from under the bathroom door (alpha grows from the door gap). returns setter(growth)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([(1.62, 2.86, 0.003), (4.18, 2.86, 0.003), (4.18, 4.6, 0.003), (1.62, 4.6, 0.003)], [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new(name, me); bpy.data.collections["WET"].objects.link(o); o.visible_shadow = False
    m = bpy.data.materials.new(name + "_mat"); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.06, 0.07, 0.075, 1); b.inputs["Roughness"].default_value = 0.0; b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Specular IOR Level"].default_value = 1.0
    tc = nt.nodes.new("ShaderNodeTexCoord"); sx = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sx.inputs[0])
    # distance from the door gap: (y - 2.8) + 0.6*|x - 2.9|
    dx = nt.nodes.new("ShaderNodeMath"); dx.operation = "SUBTRACT"; dx.inputs[1].default_value = 2.9; nt.links.new(sx.outputs["X"], dx.inputs[0])
    ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; nt.links.new(dx.outputs[0], ab.inputs[0])
    mx = nt.nodes.new("ShaderNodeMath"); mx.operation = "MULTIPLY"; mx.inputs[1].default_value = 0.6; nt.links.new(ab.outputs[0], mx.inputs[0])
    dy = nt.nodes.new("ShaderNodeMath"); dy.operation = "SUBTRACT"; dy.inputs[1].default_value = 2.8; nt.links.new(sx.outputs["Y"], dy.inputs[0])
    dd = nt.nodes.new("ShaderNodeMath"); dd.operation = "ADD"; nt.links.new(dy.outputs[0], dd.inputs[0]); nt.links.new(mx.outputs[0], dd.inputs[1])
    ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 3.0; ns.inputs["Detail"].default_value = 4; nt.links.new(tc.outputs["Object"], ns.inputs["Vector"])
    nm = nt.nodes.new("ShaderNodeMath"); nm.operation = "MULTIPLY_ADD"; nm.inputs[1].default_value = 0.35; nm.inputs[2].default_value = -0.17
    nt.links.new(ns.outputs["Fac"], nm.inputs[0])
    tot = nt.nodes.new("ShaderNodeMath"); tot.operation = "ADD"; nt.links.new(dd.outputs[0], tot.inputs[0]); nt.links.new(nm.outputs[0], tot.inputs[1])
    gv = nt.nodes.new("ShaderNodeValue"); gv.name = "GROWTH"; gv.outputs[0].default_value = 0.0
    ed = nt.nodes.new("ShaderNodeMath"); ed.operation = "SUBTRACT"; nt.links.new(gv.outputs[0], ed.inputs[0]); nt.links.new(tot.outputs[0], ed.inputs[1])
    sm = nt.nodes.new("ShaderNodeMapRange"); sm.inputs["From Min"].default_value = 0.0; sm.inputs["From Max"].default_value = 0.04
    nt.links.new(ed.outputs[0], sm.inputs["Value"]); nt.links.new(sm.outputs["Result"], b.inputs["Alpha"])
    rp = nt.nodes.new("ShaderNodeTexNoise"); rp.noise_dimensions = "4D"; rp.inputs["Scale"].default_value = 24; rp.name = "RIPPLE"
    nt.links.new(tc.outputs["Object"], rp.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.12; nt.links.new(rp.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    m.surface_render_method = "BLENDED"; me.materials.append(m)
    bpy.data.objects["DOOR_WATER"].hide_render = True

    def set_(g, t=0.0):
        gv.outputs[0].default_value = g; rp.inputs["W"].default_value = t * 0.6
    return set_


def p3_07():
    """53.00-57.14  Low on the hall floor: water flows out under the bathroom door and spreads toward us."""
    S, G, W = open_set("apartment", "bath", guard=False, woman=False)
    cam = camera(lens=30)
    flood = water_sheet()          # the bathroom light leaks under the door and glints on the spreading water
    # the light leaking through the gap under the door: a thin strip just outside the door, low, facing the hall
    glint = area_fill("DOOR_GAP_LIGHT", (2.9, 2.86, 0.012), 6, (1.0, 0.9, 0.75), 0.78)
    glint.data.shape = "RECTANGLE"; glint.data.size_y = 0.012; glint.rotation_euler = (math.radians(-90), 0, 0)
    for nm in ("L_living_ceiling",):
        bpy.data.objects[nm].data.energy *= 0.5

    def update(t):
        flood(-0.1 + 1.25 * smooth(ramp(t, 0.0, 4.2)) + 0.04 * t, t)
        aim(cam, Vector((2.55, 4.55, 0.11)), Vector((2.9, 2.8, 0.06)), handheld(t, 0.2)[1])
        dof(cam, 1.0, 3.5)
    return {"frames": 50, "fps": 12, "update": update, "res": STD}


def p3_08():
    """57.14-60.46  He grabs the red main-valve wheel and wrenches it shut."""
    S, G, W = open_set("apartment", "warm", woman=False)
    cam = camera(lens=45)
    flood = water_sheet(); flood(1.3)
    vw = bpy.data.objects["VALVE"]; vw.rotation_mode = "ZYX"        # spin about the wheel's own axis (local Z), then the 90° wall tilt
    r0 = Euler((0, math.radians(90), 0))

    def update(t):
        G.place(2.3, 3.1, 270, dz=-0.12)
        G.stand(spread=0.06)
        G.spine(pitch=34); G.head(pitch=14)
        G.hand_rest("l", swing=0.1)
        turn = smooth(ramp(t, 0.6, 1.9)) * 140
        bpy.context.view_layer.update()
        Mv = vw.matrix_world
        reach = smooth(ramp(t, 0.0, 0.5))
        a = math.radians(90 + 0)          # grip the rim at the top, the grip point turns with the wheel
        vw.rotation_euler = (0, r0.y, -math.radians(turn))
        bpy.context.view_layer.update(); Mv = vw.matrix_world
        rim = Mv @ Vector((0.07 * math.cos(a), 0.07 * math.sin(a), 0))
        ctr = Mv.translation
        rad = (rim - ctr).normalized()
        start = G.world(Vector((-0.25, -0.3, 0.9)))
        G.hand_world("r", start.lerp(rim + rad * 0.05 + Vector((0.05, 0, 0)), reach), -rad, Vector((1, 0, 0)), "grip")
        aim(cam, Vector((1.98, 3.37, 0.92)), Vector((1.76, 3.05, 0.62)), handheld(t, 0.3)[1])
        dof(cam, 0.85, 2.8)
    return {"frames": 40, "fps": 12, "update": update, "res": STD}


def p3_09():
    """60.46-64.96  Behind him in the hall: he stands before the closed bathroom door. Silence."""
    S, G, W = open_set("apartment", "warm", woman=False)
    cam = camera(lens=32)
    flood = water_sheet(); flood(1.3)

    def update(t):
        guard_stand(G, *BATH_DOOR_SPOT, 0, t, spine=3, head_pitch=6, breath=0.5)
        aim(cam, lerp(Vector((3.6, 6.0, 1.6)), Vector((3.45, 5.55, 1.58)), t / 4.5), Vector((2.9, 2.8, 1.1)), handheld(t, 0.2)[1])
    return {"frames": 28, "fps": 6, "update": update, "res": STD}


def _bath_photo(woman_pose):
    S, G, W = open_set("apartment", "bath")
    cam = camera(lens=14)
    area_fill("LANDING_LIGHT", (2.9, 3.1, 2.5), 22, (1.0, 0.85, 0.65), 0.6)
    door("BATH_DOOR", 172)          # swung right back against the bathroom's north wall: the doorway is clear for the camera
    void_eyes(True)
    flood = water_sheet(); flood(1.3)

    def update(t):
        guard_stand(G, 2.9, 2.68, 0, 0.0, spine=4, head_pitch=10, breath=0.0)      # standing in the doorway, looking in
        woman_pose(W)
        aim(cam, Vector((4.05, 0.2, 2.45)), Vector((2.85, 2.8, 1.3)))
    return {"frames": 1, "update": update, "still": True, "res": HERO, "samples": 10}


def p3_photo_a():
    """69.18-78.20  The camera image: a high corner view of HIS bathroom. He stands in the doorway; she crouches upside-down on the ceiling above him."""
    def pose(W):
        W.floor = 0.0
        crouch(W, 2.85, 2.35, 180, 0.0, depth=0.55, spine=38, head_pitch=-55, head_roll=10)
        fx.invert(W, pivot_z=2.545 / 2, pivot_y=2.35)
        h = fx.HangingHair(W, n=140, length=(0.5, 0.8)); h.update(0.0, sway=0.0)
    return _bath_photo(pose)


def p3_photo_b():
    """80.34-84.66  The photo changes: she is crouched on the floor directly behind him."""
    def pose(W):
        crouch(W, 2.95, 3.12, 0, 0.0, depth=0.5, spine=30, head_pitch=-25, head_roll=-18)
        for i in range(6):
            bpy.data.objects[f"Wom.lock_{i}"].hide_render = False
    return _bath_photo(pose)


def p3_10():
    """78.20-80.34  POV up at the bathroom ceiling: nothing."""
    S, G, W = open_set("apartment", "bath", guard=False, woman=False)
    cam = camera(lens=22)
    door("BATH_DOOR", 100)
    aim(cam, Vector((2.9, 3.0, 1.62)), Vector((2.85, 2.3, 2.55)), 4)
    return {"frames": 1, "update": lambda t: None, "still": True, "res": STD, "samples": 10}


def p3_11():
    """84.66-87.64  POV spins around: the hall behind him is empty."""
    S, G, W = open_set("apartment", "bath", guard=False, woman=False)
    cam = camera(lens=22)
    door("BATH_DOOR", 100)
    flood = water_sheet(); flood(1.3)

    def update(t):
        k = smoother(ramp(t, 0.0, 0.55))
        yaw = math.radians(-90 - 180 * k)
        eye = Vector((2.9, 3.0, 1.62))
        at = eye + Vector((math.cos(yaw), math.sin(yaw), -0.08))
        d, r = handheld(t, 1.5 + 3 * (1 - ramp(t, 0.5, 0.9)))
        aim(cam, eye + d, at, r)
        flood(1.3, t)
    return {"frames": 45, "fps": 15, "update": update, "res": STD}


def p3_12():
    """87.64-97.12  The bathroom mirror fogs over; then, from the other side, a fingertip wipes letters clear: YOU LEFT THE DOOR OPEN."""
    S, G, W = open_set("apartment", "bath", guard=False, woman=False)
    cam = camera(lens=24)
    door("BATH_DOOR", 100)
    m = bpy.data.materials["mirror_fog"]; nt = m.node_tree
    tx = nt.nodes["MSG"]; tx.image = bpy.data.images.load(os.path.join(ROOT, "assets", "textures", "mirror_msg.png")); tx.image.colorspace_settings.name = "Non-Color"
    # writing order: line 1 (v>0.5) left->right, then line 2: visible where u < progress (line 1) / progress-1 (line 2)
    uv = nt.nodes.new("ShaderNodeUVMap"); sp = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(uv.outputs["UV"], sp.inputs[0])
    prog = nt.nodes["REVEAL"]
    isl2 = nt.nodes.new("ShaderNodeMath"); isl2.operation = "LESS_THAN"; isl2.inputs[1].default_value = 0.5; nt.links.new(sp.outputs["Y"], isl2.inputs[0])
    lim = nt.nodes.new("ShaderNodeMath"); lim.operation = "SUBTRACT"; nt.links.new(prog.outputs[0], lim.inputs[0]); nt.links.new(isl2.outputs[0], lim.inputs[1])
    wr = nt.nodes.new("ShaderNodeMath"); wr.operation = "LESS_THAN"; nt.links.new(sp.outputs["X"], wr.inputs[0]); nt.links.new(lim.outputs[0], wr.inputs[1])
    mul = [n for n in nt.nodes if n.type == "MATH" and n.operation == "MULTIPLY" and n.inputs[1].links and n.inputs[1].links[0].from_node == prog][0]
    nt.links.new(wr.outputs[0], mul.inputs[1])
    probe = bpy.data.lightprobes.new("MIRROR_PROBE", "PLANE"); po = bpy.data.objects.new("MIRROR_PROBE", probe); S.collection.objects.link(po)
    po.location = (1.704, 1.85, 1.475); po.rotation_euler = (0, math.radians(90), 0); po.scale = (0.4, 0.4, 1)

    def update(t):
        nt.nodes["FOG"].outputs[0].default_value = 0.72 * smooth(ramp(t, 0.0, 3.0))
        prog.outputs[0].default_value = 2.05 * ramp(t, 2.9, 6.6, lambda x: x)
        k = smooth(t / 9.6)
        aim(cam, lerp(Vector((3.05, 1.72, 1.55)), Vector((2.8, 1.78, 1.52)), k), Vector((1.7, 1.86, 1.47)), handheld(t, 0.2)[1])
    return {"frames": 114, "fps": 12, "update": update, "res": STD}


def p3_13():
    """97.12-100.46  POV backing out of the bathroom — the door slams shut in his face at 1.8."""
    S, G, W = open_set("apartment", "bath", guard=False, woman=False)
    cam = camera(lens=24)

    def update(t):
        back = smooth(ramp(t, 0.0, 1.7))
        eye = lerp(Vector((2.9, 2.35, 1.62)), Vector((2.9, 3.25, 1.6)), back)
        slam = smoother(ramp(t, 1.8, 2.02))
        door("BATH_DOOR", 100 * (1 - slam))
        jolt = math.exp(-(t - 2.02) * 8) * math.sin((t - 2.02) * 60) if t > 2.02 else 0.0
        d, r = handheld(t, 0.8 + 6 * abs(jolt))
        aim(cam, eye + d, Vector((1.75, 1.85, 1.45)), r)
    return {"frames": 80, "fps": 24, "update": update, "res": STD}


def p3_14():
    """101.74-108.38  Lights out. The phone torch on the closed bathroom door; water under the gap; wet steps inside;
    at 4.46-6.16 the lever handle slowly turns down."""
    S, G, W = open_set("apartment", "dark", guard=False, woman=False)
    cam = camera(lens=32)
    flood = water_sheet(); flood(1.35)
    bpy.data.objects["L_window"].data.energy = 3

    def update(t):
        handle("BATH_DOOR", 40 * smooth(ramp(t, 4.46, 6.16)))
        eye = Vector((2.95, 3.85, 1.45))
        d, r = handheld(t, 1.0)
        aim(cam, eye + d, Vector((2.95, 2.8, 1.0)), r)
        phone_light(True, 60, cam)
        flood(1.35, t)
    return {"frames": 80, "fps": 12, "update": update, "res": STD}


def p3_15():
    """108.38-111.98  POV running down the dark hall toward the front door (phone torch bouncing)."""
    S, G, W = open_set("apartment", "dark", guard=False, woman=False)
    cam = camera(lens=22)
    flood = water_sheet(); flood(1.35)

    def update(t):
        k = smooth(ramp(t, 0.0, 3.4))
        if k < 0.45:
            p = lerp(Vector((2.7, 3.2, 1.6)), Vector((0.85, 3.0, 1.6)), k / 0.45); at = Vector((-2.0, 2.4, 1.4)).lerp(Vector((0.8, -1.0, 1.3)), ramp(t, 0.9, 1.6))
        else:
            p = lerp(Vector((0.85, 3.0, 1.6)), Vector((0.8, 1.15, 1.6)), (k - 0.45) / 0.55); at = Vector((0.75, -1.0, 1.25))
        bob = Vector((0.03 * math.sin(t * 9), 0, 0.04 * abs(math.sin(t * 9))))
        d, r = handheld(t, 3.0)
        aim(cam, p + bob + d, at, r * 2)
        phone_light(True, 55, cam)
    return {"frames": 54, "fps": 15, "update": update, "res": STD}


def p3_16():
    """111.98-115.86  Profile close on his face in the dark hall; beside his ear, out of the dark, her wet face. Breathing."""
    S, G, W = open_set("apartment", "dark")
    cam = camera(lens=55)
    void_eyes(True)
    rim = area_fill("RIM", (0.35, 0.9, 2.1), 16.0, (0.55, 0.7, 1.0), 0.4)
    rim.rotation_euler = (Vector((0.6, 1.4, 1.5)) - rim.location).to_track_quat("-Z", "Y").to_euler()

    def update(t):
        guard_stand(G, 0.8, 1.2, 0, t, spine=4, head_pitch=4, head_yaw=-4, breath=0.2)
        k = smooth(ramp(t, 0.6, 2.4))
        woman_stand(W, 0.6, 1.52 - 0.06 * k, 0, t, head_pitch=6, head_roll=-12, head_yaw=-25, spine=16 + 6 * k, locks=False, arms=False)
        W.hand_rest("l"); W.hand_rest("r")
        eye = G.world(G.eye())
        aim(cam, eye + Vector((-0.55, -0.5, 0.02)), eye + Vector((-0.1, 0.12, -0.02)), handheld(t, 0.2)[1])
        dof(cam, 0.88, 2.0)
        L = phone_light(True, 25)
        L.location = eye + Vector((0.05, -0.35, -0.35)); L.rotation_euler = ((eye + Vector((0, 0.2, 0.0))) - L.location).to_track_quat("-Z", "Y").to_euler()
    return {"frames": 47, "fps": 12, "update": update, "res": HERO}


def p3_17():
    """115.86-119.52  SCARE: a pale, wet hand settles on his shoulder (0.6-1.15)."""
    S, G, W = open_set("apartment", "dark")
    cam = camera(lens=50)
    rim = area_fill("RIM", (1.6, 0.6, 2.0), 4.0, (0.55, 0.7, 1.0), 0.5)

    def update(t):
        guard_stand(G, 0.8, 1.2, 0, t, spine=4, head_pitch=4, breath=0.2)
        woman_stand(W, 1.0, 1.6, 0, t, head_pitch=10, spine=12, locks=True, arms=False)
        W.hand_rest("l")
        bpy.context.view_layer.update()
        sh = G.rig.matrix_world @ G.rig.pose.bones["clavicle_l"].tail + Vector((0.0, 0.0, 0.06))
        k = smoother(ramp(t, 0.6, 1.15))
        start = W.world(Vector((-0.25, -0.25, 0.9)))
        tgt = sh + Vector((0.0, 0.06, 0.035))
        grip = smooth(ramp(t, 1.1, 1.6))
        W.hand_world("r", start.lerp(tgt, k), Vector((0.0, -1.0, -0.35)).normalized(), Vector((0, -0.2, -1)), mix_hand("relaxed", "claw", 0.4 * grip))
        aim(cam, sh + Vector((0.45, -0.55, 0.12)), sh + Vector((0, 0.02, 0.0)), handheld(t, 0.2 + 1.2 * math.exp(-((t - 1.15) / 0.1) ** 2))[1])
        dof(cam, 0.72, 2.4)
        L = phone_light(True, 20)
        L.location = sh + Vector((0.1, -0.6, -0.4)); L.rotation_euler = (sh - L.location).to_track_quat("-Z", "Y").to_euler()
    return {"frames": 44, "fps": 12, "update": update, "res": HERO}


def p3_18():
    """119.52-121.92  From the building corridor: his front door is yanked open; he lunges out."""
    S, G, W = open_set("apartment", "street", woman=False)
    cam = camera(lens=24)

    def update(t):
        k = smoother(ramp(t, 0.15, 0.5))
        door("FRONT_DOOR", 95 * k)
        guard_stand(G, 0.75, 0.55 - 0.45 * smooth(ramp(t, 0.4, 1.4)), 0, t, spine=14, head_pitch=-4, breath=0)
        aim(cam, Vector((-0.35, -1.7, 1.55)), Vector((0.75, 0.25, 1.3)), handheld(t, 1.2)[1])
    return {"frames": 36, "fps": 15, "update": update, "res": STD}


def p3_19():
    """121.92-123.60  POV running down the building corridor toward the stairs."""
    S, G, W = open_set("apartment", "street", guard=False, woman=False)
    cam = camera(lens=22)

    def update(t):
        p = lerp(Vector((0.6, -1.0, 1.6)), Vector((-4.6, -1.05, 1.6)), t / 1.7)
        bob = Vector((0, 0.03 * math.sin(t * 10), 0.04 * abs(math.sin(t * 10))))
        d, r = handheld(t, 3.0)
        aim(cam, p + bob + d, Vector((-9.0, -0.9, 1.0)), r * 2)
    return {"frames": 26, "fps": 15, "update": update, "res": STD}


def p3_20():
    """123.60-124.28  POV down the stairwell."""
    S, G, W = open_set("apartment", "street", guard=False, woman=False)
    cam = camera(lens=22)

    def update(t):
        k = t / 1.0
        p = lerp(Vector((-5.8, -0.55, 1.6)), Vector((-7.4, -0.55, 0.25)), k)
        d, r = handheld(t, 3.0)
        aim(cam, p + d + Vector((0, 0, 0.04 * abs(math.sin(t * 12)))), p + Vector((-1.0, -0.6, -1.0)), r * 2)
    return {"frames": 15, "fps": 15, "update": update, "res": STD}


def p3_21():
    """124.28-126.24  POV out through the street door into the night; the car under the streetlamp."""
    S, G, W = open_set("apartment", "street", guard=False, woman=False)
    cam = camera(lens=22)
    show("entrance_door", False)

    def update(t):
        k = smooth(t / 2.0)
        p = lerp(Vector((33.8, 1.2, GZ + 1.75)), Vector((35.2, -4.0, GZ + 1.72)), k)
        bob = Vector((0, 0, 0.04 * abs(math.sin(t * 9))))
        d, r = handheld(t, 3.0)
        aim(cam, p + bob + d, Vector((40.0, -7.0, GZ + 1.0)), r * 2)
    return {"frames": 30, "fps": 15, "update": update, "res": STD}


def p3_22():
    """126.24-128.96  The street: his car under the lamp; the driver door slams (1.2)."""
    S, G, W = open_set("apartment", "street", woman=False)
    cam = camera(lens=35)
    dd = bpy.data.objects["CAR_DOOR_DRIVER"]

    def update(t):
        guard_in_car(G, t, grip=False)
        G.hand_rest("l"); G.hand_rest("r")
        dd.rotation_euler.z = math.radians(55 * (1 - smoother(ramp(t, 0.8, 1.2))))
        aim(cam, Vector((45.5, -12.6, GZ + 1.5)), Vector((40.0, -7.3, GZ + 0.9)), handheld(t, 0.3)[1])
    return {"frames": 33, "fps": 12, "update": update, "res": STD}


def p3_23():
    """128.96-134.62  Inside the car (from the passenger side): locks, engine — the dash lights come on (1.4); he grips the wheel, breathes."""
    S, G, W = open_set("apartment", "street", woman=False)
    cam = camera(lens=26)
    cl = [o for o in bpy.data.objects if o.name == "dash_cluster"][0].data.materials[0].node_tree.nodes["Principled BSDF"]
    dash = bpy.data.objects["L_car_dash"]
    side = area_fill("STREET_SIDE", tuple(car((0.1, -1.6, 1.6))), 30, (1.0, 0.75, 0.45), 1.0)
    side.rotation_euler = (car((0.0, -0.36, 1.1)) - side.location).to_track_quat("-Z", "Y").to_euler()

    def update(t):
        on = t > 1.4
        cl.inputs["Emission Strength"].default_value = 3.0 if on else 0.0
        dash.data.energy = 7.0 if on else 0.0
        hb = smooth(ramp(t, 3.4, 4.6))
        guard_in_car(G, t, head_back=hb, breath=1.5 - 0.8 * hb)
        aim(cam, car((-0.28, 0.33, 1.12)), car((0.02, -0.36, 1.12)), handheld(t, 0.25)[1])
    return {"frames": 68, "fps": 12, "update": update, "res": STD}


def p3_24():
    """134.62-137.44  The driver window from inside: a tap rattles the glass (0.5) — nothing outside."""
    S, G, W = open_set("apartment", "street", woman=False)
    cam = camera(lens=35)
    g = bpy.data.objects["glass_front_r"]; g0 = g.location.copy()

    def update(t):
        guard_in_car(G, t, grip=True, head_back=0.4, look=-20 * smooth(ramp(t, 0.7, 1.5)))
        tap = math.exp(-((t - 0.5) / 0.04) ** 2)
        g.location = g0 + Vector((0, 0.002 * tap * math.sin(t * 200), 0))
        aim(cam, car((-0.15, 0.1, 1.2)), car((0.15, -0.9, 1.2)), handheld(t, 0.3 + 1.5 * tap)[1])
    return {"frames": 34, "fps": 12, "update": update, "res": STD}


def p3_25():
    """137.44-139.48  POV out of the driver window: the empty street. Nothing."""
    S, G, W = open_set("apartment", "street", guard=False, woman=False)
    cam = camera(lens=26)
    aim(cam, car((-0.12, -0.36, 1.22)), car((0.6, -3.0, 1.0)))
    return {"frames": 1, "update": lambda t: None, "still": True, "res": STD, "samples": 10}


def p3_26():
    """139.48-144.32  POV slowly turning from the driver window, across the windscreen, to the passenger side."""
    S, G, W = open_set("apartment", "street", guard=False, woman=False)
    cam = camera(lens=26)

    def update(t):
        k = smoother(ramp(t, 0.6, 4.6))
        a = math.radians(-80 + 160 * k)
        eye = car((-0.12, -0.36, 1.22))
        at = eye + Vector((math.cos(a), math.sin(a), -0.15 - 0.15 * k))
        aim(cam, eye, at, handheld(t, 0.5)[1])
    return {"frames": 58, "fps": 12, "update": update, "res": STD}


def p3_27():
    """144.32-147.92  The passenger seat: empty, but soaking wet; water running off its edge."""
    S, G, W = open_set("apartment", "street", guard=False, woman=False)
    cam = camera(lens=40)
    dr = fx.Drips([(tuple(car((0.19, 0.36 + dy, 0.57))), 0.5 + 0.2 * i, 0.17 * i) for i, dy in enumerate((-0.12, 0.0, 0.1))], GZ + 0.35, 0.0045, coll="CAR")
    fill = area_fill("STREET_SPILL", tuple(car((0.0, 1.4, 1.5))), 24, (1.0, 0.75, 0.45), 0.8)
    fill.rotation_euler = (math.radians(60), 0, math.radians(180))

    def update(t):
        dr.update(t)
        aim(cam, car((-0.15, -0.25, 1.1)), car((-0.05, 0.36, 0.6)), handheld(t, 0.3)[1])
    return {"frames": 43, "fps": 12, "update": update, "res": STD}


def p3_28():
    """147.92-153.36  The seatbelt: one long black hair hangs from it, swaying, a drop at its tip."""
    S, G, W = open_set("apartment", "street", guard=False, woman=False)
    cam = camera(lens=90)
    hs = bpy.data.objects["HAIR_STRAND"]; sp = hs.data.splines[0]
    base = [p.co.copy() for p in sp.bezier_points]
    tip = car(tuple(base[-1])) - Vector((0, 0, 0.004))
    dr = fx.Drips([(tuple(tip), 2.3, 1.2)], GZ + 0.58, 0.0035, coll="CAR")
    fill = area_fill("STREET_SPILL", tuple(car((-0.3, 1.2, 1.4))), 40, (1.0, 0.75, 0.45), 0.6)
    back = area_fill("HAIR_RIM", tuple(car((-0.75, 0.62, 1.0))), 12, (0.8, 0.88, 1.0), 0.3)
    back.rotation_euler = (car((-0.355, 0.59, 0.85)) - back.location).to_track_quat("-Z", "Y").to_euler()
    bpy.data.objects["HAIR_STRAND"].data.bevel_depth = 0.0018
    fill.rotation_euler = (car((-0.35, 0.59, 0.85)) - fill.location).to_track_quat("-Z", "Y").to_euler()

    def update(t):
        for i, p in enumerate(sp.bezier_points):
            f = i / 3
            p.co = base[i] + Vector((0.006 * f * math.sin(t * 1.3), 0.004 * f * math.cos(t * 1.1), 0))
            p.handle_left_type = p.handle_right_type = "AUTO"
        dr.update(t)
        aim(cam, car((-0.05, 0.25, 0.95)), car((-0.355, 0.59, 0.85)), handheld(t, 0.2)[1])
        dof(cam, 0.43, 2.8)
    return {"frames": 65, "fps": 12, "update": update, "res": STD}


KNOCKS3 = (2.62, 3.27, 3.9)


def p3_29():
    """153.36-159.40  FINAL SCARE. Front view: him frozen in the driver seat; three slow knocks behind his seat (2.62, 3.27, 3.9);
    4.9-5.25 her face rises from behind the headrest beside his head; 5.55 it lunges at us. (Hard cut to black.)"""
    S, G, W = open_set("apartment", "street")
    cam = camera(lens=24)
    void_eyes(True)
    cl = [o for o in bpy.data.objects if o.name == "dash_cluster"][0].data.materials[0].node_tree.nodes["Principled BSDF"]
    cl.inputs["Emission Strength"].default_value = 3.0
    bpy.data.objects["L_car_dash"].data.energy = 7.0
    key = area_fill("DASH_UP", tuple(car((0.4, -0.2, 0.95))), 3.5, (0.9, 0.6, 0.35), 0.3)
    key.rotation_euler = ((car((-0.6, -0.25, 1.3))) - key.location).to_track_quat("-Z", "Y").to_euler()

    def update(t):
        guard_in_car(G, t, grip=True, head_back=0.0, breath=0.2, look=-6 * smooth(ramp(t, 2.6, 4.0)))
        rise = smoother(ramp(t, 4.9, 5.25)); lunge = smoother(ramp(t, 5.55, 5.8))
        W.floor = GZ + 0.35
        p = car((-1.02 + 0.22 * lunge, -0.07, 0))
        W.sit(p.x, p.y, 90, seat=GZ + 0.62, feet_fwd=0.42)
        W.spine(pitch=62 - 30 * rise + 10 * lunge, yaw=-8); W.head(pitch=-28 * rise - 10, roll=14)
        W.hand_rest("l"); W.hand_rest("r")
        eye = G.world(G.eye())
        d, r = handheld(t, 0.2 + 1.0 * lunge)
        aim(cam, car((0.52, -0.22, 1.22)) + d, car((-0.4, -0.28, 1.2)), r)
    return {"frames": 74, "fps": 12, "update": update, "res": HERO}


def cover3():
    """Cover NIGHT 3: in his car at night — her face risen from behind the driver's seat, right beside his."""
    spec = p3_29()
    up = spec["update"]
    return {"frames": 1, "update": lambda t: up(5.4), "still": True, "res": (1080, 1920), "samples": 16}


SHOTS = {
    "__episode__": "p3", "cover3": cover3,
    "p3_01": p3_01, "p3_photo_a": p3_photo_a, "p3_photo_b": p3_photo_b, "p3_10": p3_10, "p3_25": p3_25,
    "p3_cc4": p3_cc4, "p3_12": p3_12, "p3_16": p3_16, "p3_17": p3_17, "p3_29": p3_29,
    "p3_02": p3_02, "p3_03": p3_03, "p3_04": p3_04, "p3_05": p3_05, "p3_06": p3_06, "p3_07": p3_07, "p3_08": p3_08, "p3_09": p3_09,
    "p3_11": p3_11, "p3_13": p3_13, "p3_14": p3_14, "p3_15": p3_15, "p3_18": p3_18, "p3_19": p3_19, "p3_20": p3_20, "p3_21": p3_21,
    "p3_22": p3_22, "p3_23": p3_23, "p3_24": p3_24, "p3_26": p3_26, "p3_27": p3_27, "p3_28": p3_28,
}

if __name__ == "__main__":
    run_cli(SHOTS)
