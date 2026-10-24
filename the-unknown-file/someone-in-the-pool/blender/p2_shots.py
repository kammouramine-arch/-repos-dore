"""NIGHT 2 — THE POOL IS EMPTY. SO WHO IS THAT? 3D shots, timed to the narration (docs/STORYBOARDS.md has the cut list).
The real pool is drained (set_lights 'drained'); the CCTV feed of CAM 4 shows it FULL (rendered with water, 'night').
blender -b --python p2_shots.py -- [shot ...|all] [--still]
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector, Matrix, Euler
from shotkit import *
from poses import *
import fx
from setkit import cyl

OUT = os.path.join(ROOT, "renders", "p2")
P1 = os.path.join(ROOT, "renders", "p1")
HERO = (720, 1280); STD = (576, 1024); CCTV = (540, 960); MON = (640, 360)
LADDER = (26.6, 14.0)            # north ladder (rails at x 26.35/26.85, y 13.92), she faces the wall (north, yaw 180)
OUTSIDE = (21.55, -1.0)          # where she stands outside the office door (facing east)
DOOR_GLASS_IN_X = 22.008         # inner (office-side) face of the door's vision panel
PRINTS_T = [1.86 + 0.78 * i for i in range(11)]   # p2_10 local times of the wet footprints (narration 75.26 + ...)


def feed(name):
    for d in (OUT, P1):
        p = os.path.join(d, name + ".jpg")
        if os.path.exists(p):
            return p
    return None


def feeds(c4="feed_c4_dry", dim=1.0, off=(), c1="feed_c1", c2="feed_c2"):
    for i, n in enumerate(["feed_c3_dry", c1, c2, c4, c2]):
        monitor(i, None if (i in off or n is None) else feed(n), 1.4 * dim)


def cctv_cam(name, lens=None, at=None):
    c = bpy.data.objects[name]
    if lens:
        c.data.lens = lens
    if at is not None:
        c.rotation_euler = (Vector(at) - c.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = c
    return c


def footprints(n=11, t_list=None, x0=14.4, step=0.66):
    """the trail of wet bare footprints along the corridor toward the office door (heading east). Returns update(t)."""
    items = []
    for i in range(n):
        x = x0 + i * step
        y = -1.0 + (0.11 if i % 2 == 0 else -0.11)
        o, op = fx.decal(f"print_{i}", "footprint.png", (x, y, 0.002), (0.15, 0.32), rot=(0, 0, math.radians(-90)),
                         color=(0.0, 0.0, 0.0), alpha=0.0, rough=0.01, coat=1.0, flip_x=(i % 2 == 1), coll="CORRIDOR")
        items.append((o, op))

    def update(t):
        for i, (o, op) in enumerate(items):
            a = (t_list[i] if t_list else -1)
            k = clamp((t - a) / 0.18) if t_list else 1.0
            op.outputs[0].default_value = 0.97 * k
            o.hide_render = k <= 0
    return update


def drained_hall(k=0.3):
    set_lights("drained_hall")
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name.startswith("L_fix"):
            o.data.energy *= k
    bpy.data.materials["fluoro_tube"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 6.0 * max(k, 0.4)


def drain_level(level):
    """move the water surface + volume to a lower level (time-lapse draining)."""
    ws = bpy.data.objects["WATER_SURFACE"]; wv = bpy.data.objects["WATER_VOLUME"]
    ws.location.z = level - (-0.12)
    s = (level + 3.21) / 3.09
    wv.scale.z = s; wv.location.z = -3.21 + 3.21 * s


def radio_led(on, flicker=0.0, t=0.0):
    m = bpy.data.objects["RADIO_LED"].data.materials[0]
    f = 1.0 - flicker * (0.5 + 0.5 * math.sin(t * 37) * math.sin(t * 11))
    m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 30.0 * f if on else 0.0


# ------------------------------------------------------------------ feeds
def feed_c4_dry():
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cctv_cam("CAM4_POOL", lens=55, at=(24.0, 9.0, -2.4))
    return {"frames": 1, "update": lambda t: None, "still": True, "res": MON, "samples": 8}


def feed_c3_dry():
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cctv_cam("CAM3_SHALLOW")
    return {"frames": 1, "update": lambda t: None, "still": True, "res": MON, "samples": 8}


def feed_c4_full():
    S, G, W = open_set("pool", "night", guard=False, woman=False)
    cctv_cam("CAM4_POOL", lens=40, at=(25.5, 11.5, -1.6))
    return {"frames": 1, "update": lambda t: water(1.0), "still": True, "res": MON, "samples": 8}


def p2_cc2_empty():
    """62.54-67.48  CAM 2 hallway: empty."""
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cctv_cam("CAM2_CORRIDOR", lens=34, at=(22.0, -1.0, 1.0))
    return {"frames": 1, "update": lambda t: None, "still": True, "res": CCTV, "samples": 8}


# ------------------------------------------------------------------ shots
def p2_01():
    """0.00-3.64  POV walking down the service corridor toward SECURITY; the drained pool glimpsed through the glass doors."""
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cam = camera(lens=24)

    def update(t):
        p = lerp(Vector((9.0, -1.15, 1.62)), Vector((15.6, -1.05, 1.62)), t / 3.7)
        bob = Vector((0.012 * math.sin(t * 6.3), 0, 0.022 * abs(math.sin(t * 6.3))))
        at = Vector((22.0, -1.0 + 0.6 * math.sin(math.pi * ramp(t, 1.6, 3.4)) * 0, 1.35)) + Vector((0, 1.8 * smooth(ramp(t, 1.8, 2.8)) * (1 - ramp(t, 3.0, 3.7)), 0))
        aim(cam, p + bob, at, handheld(t, 0.8)[1])
    return {"frames": 45, "fps": 12, "update": update, "res": STD}


def p2_02():
    """3.64-5.98  The logbook on the desk, open at his Night 1 entry."""
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cam = camera(lens=40)
    bk, _ = fx.decal("LOGBOOK_PAGE", "logbook_page.png", (24.1, -0.7, 0.782), (0.42, 0.3), rot=(0, 0, math.radians(4)), color=(0.88, 0.86, 0.8), alpha=1.0, rough=0.7, coat=0.0, coll="OFFICE")
    m = bk.data.materials[0]; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tx = [n for n in nt.nodes if n.type == "TEX_IMAGE"][0]; tx.image.colorspace_settings.name = "sRGB"
    dim = nt.nodes.new("ShaderNodeMix"); dim.data_type = "RGBA"; dim.blend_type = "MULTIPLY"; dim.inputs["Factor"].default_value = 1.0
    dim.inputs["B"].default_value = (0.5, 0.5, 0.5, 1); nt.links.new(tx.outputs["Color"], dim.inputs["A"])
    nt.links.new(dim.outputs["Result"], b.inputs["Base Color"]); b.inputs["Alpha"].default_value = 1.0; b.inputs["Roughness"].default_value = 0.85
    for l in list(b.inputs["Alpha"].links):
        nt.links.remove(l)
    pen = cyl("PEN", 0, 0, -0.07, 0.07, 0.005, None, bpy.data.collections["OFFICE"], 12); pen.rotation_euler = (0, math.radians(90), math.radians(30)); pen.location = (24.25, -0.82, 0.787)
    pen.data.materials.append(bpy.data.materials["torch_black"])
    aim(cam, (24.08, -0.86, 1.25), (24.11, -0.7, 0.78))
    dof(cam, 0.49, 4.0)
    return {"frames": 1, "update": lambda t: None, "still": True, "res": HERO, "samples": 12}


def p2_03():
    """12.94-17.18  Time-lapse, grey morning light: the water level drops through the basin."""
    S, G, W = open_set("pool", "hall", guard=False, woman=False)
    cam = camera(lens=24)
    bpy.data.objects["L_windows"].data.energy = 1400; bpy.data.objects["L_windows"].data.color = (0.75, 0.82, 0.95)
    bpy.data.collections["LIGHTS_UNDERWATER"].hide_render = True
    bpy.data.materials["underwater_light"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0
    S.world.node_tree.nodes["Background"].inputs[0].default_value = (0.08, 0.09, 0.1, 1)

    def update(t):
        drain_level(-0.12 - 3.0 * smooth(ramp(t, 0.2, 4.2)))
        water(t * 6, 0.6)
        aim(cam, Vector((3.2, 1.2, 5.6)), Vector((20.0, 10.5, -2.5)))
    return {"frames": 52, "fps": 12, "update": update, "res": STD}


def p2_04():
    """17.18-20.66  Night: the drained deep end — dark puddle, cones, hose, barrier tape. Dry tiles. Nothing."""
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cam = camera(lens=26)
    bpy.data.objects["L_windows"].data.energy = 420

    def update(t):
        aim(cam, lerp(Vector((20.6, 2.9, 1.65)), Vector((21.0, 3.1, 1.6)), t / 3.6), Vector((24.6, 9.8, -3.0)), handheld(t, 0.3)[1])
    return {"frames": 43, "fps": 12, "update": update, "res": STD}


def p2_05():
    """20.66-25.02  Back at the monitors, typing, checking the cameras (all normal: the pool is dry on CAM 4)."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=35)
    feeds()

    def update(t):
        guard_seated(G, t, hands="keys", lean=10, look=-6 + 8 * math.sin(t * 0.7), look_up=2)
        aim(cam, lerp(Vector((23.5, -1.75, 1.4)), Vector((23.65, -1.6, 1.38)), t / 4.4), Vector((25.1, -0.65, 1.05)), handheld(t, 0.3)[1])
    return {"frames": 53, "fps": 12, "update": update, "res": STD}


def p2_06():
    """27.30-31.50  The monitor bank: CAM 4's monitor flashes red — motion alarm. Red light pulses on him."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=28)
    feeds(c4="feed_c4_full")
    red = bpy.data.lights.new("ALARM", "POINT"); red.color = (1, 0.08, 0.05); red.shadow_soft_size = 0.2
    ro = bpy.data.objects.new("ALARM", red); S.collection.objects.link(ro); ro.location = (25.83, -0.55, 1.05)
    m3 = bpy.data.objects["MONITOR_SCREEN_3"].data.materials[0].node_tree.nodes["Principled BSDF"]

    def update(t):
        pulse = 1.0 if (t % 0.7) < 0.35 else 0.0
        red.energy = 18 * pulse
        m3.inputs["Emission Strength"].default_value = 1.4 + 3.0 * pulse
        guard_seated(G, t, hands="desk", lean=6 + 8 * ramp(t, 0.4, 1.0), look=-12 * ramp(t, 0.3, 0.9))
        aim(cam, Vector((24.3, -2.6, 1.6)), Vector((25.5, -0.5, 1.05)), handheld(t, 0.3)[1])
    return {"frames": 51, "fps": 12, "update": update, "res": STD}


def p2_07():
    """31.50-35.14  His face lit by the monitor; his stomach drops (he pulls back)."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=55)
    feeds(c4="feed_c4_full")
    bpy.data.objects["L_monitors"].data.energy = 45

    def update(t):
        k = smooth(ramp(t, 1.0, 1.8))
        guard_seated(G, t, hands="desk", lean=12 - 12 * k, look=-10, look_up=4 + 4 * k, breath=0.4)
        eye = G.world(G.eye())
        aim(cam, Vector((25.55, -0.48, 1.2)), eye + Vector((0, 0, -0.04)), handheld(t, 0.2)[1])
        dof(cam, (eye - cam.location).length, 2.2)
    return {"frames": 44, "fps": 12, "update": update, "res": STD}


def p2_08():
    """38.36-44.08  Over his shoulder, racking from monitor 4 (FULL of water) up to the window: the real basin is EMPTY."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=45)
    feeds(c4="feed_c4_full")
    bpy.data.objects["L_windows"].data.energy = 380

    def update(t):
        k = smoother(ramp(t, 1.4, 3.6))
        guard_seated(G, t, hands="desk", lean=6, look=-6, look_up=12 * k)
        at = lerp(Vector((25.83, -0.42, 1.05)), Vector((25.6, 6.0, -1.6)), k)
        aim(cam, Vector((25.25, -1.95, 1.55)), at, handheld(t, 0.25)[1])
        dof(cam, lerp(1.6, 8.5, k), 2.0)
    return {"frames": 69, "fps": 12, "update": update, "res": STD}


def p2_cc4():
    """35.14-62.54  CAM 4 (the screen, FULL of water). At t=8.94 she is there (glitch in the edit): standing below the north ladder looking up.
    17.0 she rises, grips the rails; two steps up (18.8-20.0, 20.4-21.8); her head breaks the surface (~21.8); 22.4-27.0 she turns toward the office."""
    S, G, W = open_set("pool", "night", guard=False)
    cctv_cam("CAM4_POOL", lens=32, at=(26.3, 13.2, -1.6))
    # two extra treads lower down the ladder (the set's ladder stops at -1.21)
    for k, z in enumerate((-1.53, -1.85)):
        box_ = bpy.data.objects["ladder_n_tread_3"].copy(); box_.data = box_.data.copy(); bpy.data.collections["BASIN"].objects.link(box_)
        box_.location.z += z - (-1.21)
    x, y = LADDER[0], LADDER[1] - 0.52
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name.startswith("L_uw"):
            o.data.energy *= 1.5
    sp = bpy.data.lights.new("LADDER_SPOT", "SPOT"); sp.energy = 380; sp.color = (0.5, 0.9, 1.0); sp.spot_size = math.radians(60); sp.spot_blend = 0.7
    so = bpy.data.objects.new("LADDER_SPOT", sp); bpy.data.collections["LIGHTS_UNDERWATER"].objects.link(so); so.location = (25.2, 12.0, -0.6)
    so.rotation_euler = (Vector((26.6, 13.4, -2.4)) - so.location).to_track_quat("-Z", "Y").to_euler()

    def update(t):
        water(t, 0.8)
        present = t >= 8.94
        for o in bpy.data.collections["WOMAN"].all_objects:
            o.hide_render = not present or o.name.startswith("Wom.lock_")
        if not present:
            return
        rise = smooth(ramp(t, 17.0, 18.6))
        s1 = smooth(ramp(t, 18.8, 20.0)); s2 = smooth(ramp(t, 20.4, 21.8))
        floor = -3.2 + 0.7 * rise + (-1.85 - (-2.5)) * s1 + (-1.53 - (-1.85)) * s2
        turn = smoother(ramp(t, 22.4, 27.0))
        W.place(x, y + 0.08 * rise, 180, floor=floor)
        W.stand(spread=0.02)
        # feet: on the floor, then floating, then on the treads (left first, then right)
        if t >= 18.8:
            for s_, sg, kk in (("l", 1, s1), ("r", -1, s2)):
                M = W.rig.matrix_world
                p = M @ Vector((sg * 0.1, -0.12, 0))
                W.foot(s_, p.x, p.y, 180, lift=0.08 * math.sin(math.pi * kk))
        look_up = -35 * (1 - turn) * smooth(ramp(t, 9.5, 12.0))
        W.spine(pitch=3 + 4 * rise, yaw=45 * turn)
        W.head(pitch=look_up + 8 * turn, yaw=95 * turn, roll=-10 * turn)
        if t < 17.6:
            W.hand_rest("l", out=0.05); W.hand_rest("r", out=0.05)
        else:
            reach = smooth(ramp(t, 17.6, 18.3))
            for s_, rx in (("l", 26.35), ("r", 26.85)):
                zz = -0.75 - 0.25 * (s_ == "r") * (1 - s2) + 0.3 * s2
                tgt = Vector((rx, 13.9, zz))
                cur = W.world(Vector((0.25 if s_ == "l" else -0.25, -0.1, 1.0)))
                W.hand_world(s_, cur.lerp(tgt, reach), (0, 0.2, 1), (0, 1, 0), "grip")
        bpy.context.view_layer.update()
    return {"frames": 220, "fps": 8, "update": update, "res": CCTV, "samples": 4}


def p2_09():
    """67.48-73.40  Wet footsteps outside: he turns his head toward the office door and its glass panel."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=40)
    feeds(c4="feed_c4_full")

    def update(t):
        k = smoother(ramp(t, 0.8, 3.2))
        guard_seated(G, t, hands="desk", lean=8 - 6 * k, look=72 * k, breath=0.5 * (1 - k))
        G.spine(pitch=2, yaw=25 * k)
        aim(cam, Vector((24.0, -0.85, 1.35)), G.world(G.eye()) + Vector((0.0, 0.0, -0.05)), handheld(t, 0.25)[1])
        dof(cam, 1.2, 2.4)
    return {"frames": 72, "fps": 12, "update": update, "res": STD}


def p2_10():
    """73.40-84.36  POV through the door's glass panel: an empty corridor; wet footprints appear one by one, straight toward the door."""
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cam = camera(lens=30)
    fp = footprints(11, PRINTS_T)

    def update(t):
        fp(t)
        push = smooth(t / 11.0)
        aim(cam, Vector((22.42 - 0.12 * push, -1.0, 1.62)), Vector((17.6, -1.05, -0.2)) + Vector((0, 0, 0.5 * push)), handheld(t, 0.35)[1])
    return {"frames": 132, "fps": 12, "update": update, "res": STD}


def p2_11():
    """84.36-86.06  His hand turns the lock's thumb-turn."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=55)
    lk = recenter(bpy.data.objects["OFFICE_LOCK_TURN"])
    base = lk.rotation_euler.copy()

    def update(t):
        guard_stand(G, 22.55, -1.22, -90, t, spine=8, head_pitch=6, arms=False)
        G.hand_rest("l")
        k = smooth(ramp(t, 0.5, 1.0))
        bpy.context.view_layer.update()
        lw = lk.matrix_world.translation + Vector((0.012, 0.0, 0.0))
        fwd = Vector((-0.2, 0.0, 1.0)); fwd.rotate(Euler((math.radians(90 * k), 0, 0)))
        reach = smooth(ramp(t, 0.0, 0.45))
        start = G.world(Vector((-0.2, -0.25, 0.95)))
        G.hand_world("r", start.lerp(lw + Vector((0.09, 0.0, -0.02)), reach), (-1, 0, 0.3), (0, 1, 0), "handle")
        lk.rotation_euler = (base.x, base.y + math.radians(90 * k), base.z)
        aim(cam, Vector((22.75, -1.75, 1.3)), lw, handheld(t, 0.3)[1])
        dof(cam, (lw - cam.location).length, 2.8)
    return {"frames": 21, "fps": 12, "update": update, "res": STD}


def p2_12():
    """86.06-89.12  Close on his face at the door, holding his breath."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=60)

    def update(t):
        guard_stand(G, 22.55, -1.22, -90, t, spine=4, head_pitch=4, head_yaw=-8, breath=0.0)
        eye = G.world(G.eye())
        aim(cam, eye + Vector((0.55, -0.5, -0.02)), eye + Vector((0, 0, -0.03)), handheld(t, 0.2)[1])
        dof(cam, 0.75, 2.0)
    return {"frames": 37, "fps": 12, "update": update, "res": STD}


def p2_13():
    """89.12-95.92  The radio on the desk: its LED flicks on by itself; static, then the whisper (LED pulses with the voice)."""
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cam = camera(lens=70)
    feeds(c4="feed_c4_full", dim=0.6)

    def update(t):
        on = t > 0.25
        radio_led(on, flicker=0.6 if 4.8 < t < 6.4 else 0.15, t=t)
        k = t / 6.8
        aim(cam, lerp(Vector((26.4, -1.25, 1.15)), Vector((26.55, -1.05, 1.08)), k), Vector((26.92, -0.64, 0.92)), handheld(t, 0.2)[1])
        dof(cam, bpy.data.objects["RADIO"], 2.0)
    return {"frames": 55, "fps": 8, "update": update, "res": STD}


def p2_14():
    """95.92-101.12  His hand switches the radio off (LED dies at 0.9) — it turns back on (1.75)."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=45)
    feeds(c4="feed_c4_full", dim=0.6)
    knob = cyl("RADIO_KNOB", 26.91, -0.64, 1.0, 1.02, 0.012, bpy.data.materials["dark_metal"], bpy.data.collections["OFFICE"], 16)

    def update(t):
        guard_stand(G, 26.75, -1.25, 180, t, spine=16, head_pitch=20, arms=False)
        G.hand_rest("l")
        press = smooth(ramp(t, 0.2, 0.75)) * (1 - smooth(ramp(t, 1.9, 2.6)))
        top = Vector((26.91, -0.64, 1.035))
        start = G.world(Vector((-0.2, -0.25, 0.95)))
        G.touch("r", start.lerp(top, press) if press < 0.999 else top, (0.1, 0.6, -0.8), (0, 0.4, -1), "point")
        knob.location.z = 1.0 - 0.004 * (0.75 < t < 1.9)
        radio_led(not (0.9 < t < 1.75), flicker=0.3, t=t)
        aim(cam, Vector((26.1, -1.05, 1.3)), Vector((26.9, -0.64, 0.95)), handheld(t, 0.25)[1])
    return {"frames": 63, "fps": 12, "update": update, "res": STD}


def p2_15():
    """101.12-103.28  From the door, over his shoulder: the monitor bank — monitor 4 is black."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=32)
    feeds(off=(3,))

    def update(t):
        guard_stand(G, 22.7, -1.2, 120, t, spine=6, head_pitch=12, breath=0.4)
        aim(cam, Vector((22.35, -1.85, 1.75)), Vector((25.5, -0.45, 1.05)), handheld(t, 0.3)[1])
    return {"frames": 27, "fps": 12, "update": update, "res": STD}


def p2_cc2():
    """103.28-122.52  CAM 2: outside his locked door, the woman, perfectly still, dripping into a growing puddle, head tilted sideways.
    14.6-18.6 she raises one hand and lays it flat on the door's glass."""
    S, G, W = open_set("pool", "drained", guard=False)
    drained_hall()
    cctv_cam("CAM2_CORRIDOR", lens=34, at=(22.0, -1.0, 1.0))
    fp = footprints(11)
    dr = fx.Drips([((21.55 + dx, -1.0 + dy, 0.12 + 0.02 * i), 0.7 + 0.21 * i, 0.31 * i) for i, (dx, dy) in enumerate(((0.1, 0.12), (-0.08, -0.1), (0.05, -0.15), (-0.1, 0.1), (0.12, 0.0)))], 0.0, 0.007)
    pud = bpy.data.objects.new("PUDDLE", bpy.data.meshes.new("PUDDLE")); bm_pts = [(math.cos(a) * (0.42 + 0.06 * math.sin(a * 5)), math.sin(a) * (0.32 + 0.05 * math.cos(a * 3)), 0) for a in [i * 2 * math.pi / 40 for i in range(40)]]
    pud.data.from_pydata(bm_pts, [], [list(range(40))]); pud.data.materials.append(bpy.data.materials["puddle"]); bpy.data.collections["CORRIDOR"].objects.link(pud)
    pud.location = (21.5, -1.0, 0.002)

    def update(t):
        fp(t)
        k = smoother(ramp(t, 14.6, 18.6))
        woman_stand(W, *OUTSIDE, 90, t, head_pitch=10, head_roll=-34, spine=2, locks=True, arms=False)
        W.hand_rest("l", out=0.02)
        if k <= 0:
            W.hand_rest("r", out=0.02)
        else:
            rest = W.world(Vector((-0.24, -0.02, 0.85)))
            glass = Vector((21.965, -1.08, 1.5))
            p = rest.lerp(glass + Vector((-0.04 * (1 - k), 0, 0)), k)
            W.hand_world("r", p - Vector((0.0, 0.0, 0.09)), (0.1 * (1 - k), 0, 1), (1, 0, 0), mix_hand("relaxed", "flat", k))
        dr.update(t)
        s = 0.55 + 0.45 * ramp(t, 0.0, 19.0)
        pud.scale = (s, s, 1)
    return {"frames": 154, "fps": 8, "update": update, "res": CCTV, "samples": 4}


HANDPRINTS = [(1.68, (-1.02, 1.5)), (3.8, (-0.92, 1.38)), (5.2, (-1.12, 1.62)), (6.4, (-0.96, 1.72)), (7.5, (-1.14, 1.32)), (8.5, (-0.88, 1.58)), (9.5, (-1.05, 1.25))]
SLAM = 10.28
CRACK = 10.52


def p2_16():
    """122.52-134.60  POV whip to the door. The glass from inside: nobody behind it, but wet handprints form on OUR side, one after another;
    SLAM at 10.28 (the door jolts), the glass cracks at 10.52."""
    S, G, W = open_set("pool", "drained", guard=False, woman=False)
    drained_hall()
    cam = camera(lens=30)
    door = bpy.data.objects["OFFICE_DOOR"]; d0 = door.rotation_euler.z
    prints = []
    for i, (at, (y, z)) in enumerate(HANDPRINTS):
        o, op = fx.decal(f"handprint_{i}", "handprint.png", (DOOR_GLASS_IN_X - 0.0, y, z), 0.2, rot=(math.radians(90), 0, math.radians(90)),
                         color=(0.55, 0.62, 0.64), alpha=0.0, rough=0.12, coat=0.6, flip_x=(i % 2 == 1), coll="OFFICE")
        o.parent = door; o.matrix_parent_inverse = door.matrix_world.inverted()
        prints.append((at, o, op))
    cr, crop = fx.decal("glass_crack", "glass_crack.png", (DOOR_GLASS_IN_X + 0.001, -1.0, 1.5), (0.42, 0.72), rot=(math.radians(90), 0, math.radians(90)),
                        color=(0.9, 0.95, 0.95), alpha=0.0, rough=0.1, coat=1.0, emit=0.3, coll="OFFICE")
    cr.parent = door; cr.matrix_parent_inverse = door.matrix_world.inverted()

    def update(t):
        for (at, o, op) in prints:
            k = clamp((t - at) / 0.6)
            op.outputs[0].default_value = 0.42 * k
            o.hide_render = k <= 0
        crop.outputs[0].default_value = 0.95 if t >= CRACK else 0.0
        slam = math.exp(-((t - SLAM) / 0.05) ** 2) if t >= SLAM - 0.1 else 0.0
        jolt = (math.sin((t - SLAM) * 70) * math.exp(-(t - SLAM) * 9)) if t >= SLAM else 0.0
        door.rotation_euler.z = d0 + math.radians(1.6 * jolt)
        whip = smoother(ramp(t, 0.0, 0.45))
        at_ = lerp(Vector((25.6, -0.4, 1.0)), Vector((22.0, -1.0, 1.5)), whip)
        d, r = handheld(t, 0.6 + 4.0 * abs(jolt))
        push = 0.22 * smooth(ramp(t, 1.0, 10.0))
        aim(cam, Vector((22.85 - push, -1.02, 1.6)) + d, at_, r)
    return {"frames": 146, "fps": 12, "update": update, "res": HERO}


def p2_17():
    """134.60-136.10  The monitors go black one by one (he has turned back to them)."""
    S, G, W = open_set("pool", "drained", woman=False)
    drained_hall()
    cam = camera(lens=30)
    G.rig.hide_render = True
    for o in bpy.data.collections["GUARD"].all_objects:
        o.hide_render = True
    offs = [0.15, 0.4, 0.55, 0.8, 1.0]

    def update(t):
        feeds(c4=None, off=tuple(i for i, a in enumerate(offs) if t >= a))
        bpy.data.objects["L_monitors"].data.energy = 25 * (1 - ramp(t, 0.1, 1.0))
        aim(cam, Vector((25.0, -1.7, 1.55)), Vector((25.0, -0.4, 1.0)), handheld(t, 0.4)[1])
    return {"frames": 19, "fps": 12, "update": update, "res": STD}


def p2_18():
    """136.10-137.60  FINAL SCARE (rendered as the reflection in the black monitor, flipped + darkened in the edit):
    his face looking down at the screen — and at t=0.55 her pale face slides in right beside his."""
    S, G, W = open_set("pool", "drained")
    drained_hall()
    cam = camera(lens=40)
    feeds(off=(0, 1, 2, 3, 4))
    for nm in ("L_monitors",):
        bpy.data.objects[nm].data.energy = 0
    key = bpy.data.lights.new("REFL_KEY", "AREA"); key.energy = 12; key.size = 0.6; key.color = (0.6, 0.8, 1.0)
    ko = bpy.data.objects.new("REFL_KEY", key); S.collection.objects.link(ko); ko.location = (25.0, -0.6, 1.05); ko.rotation_euler = (math.radians(-80), 0, 0)
    ko.rotation_euler = ((Vector((25.0, -1.4, 1.5)) - ko.location).to_track_quat("-Z", "Y").to_euler())

    def update(t):
        guard_stand(G, 25.0, -1.45, 180, t, spine=22, head_pitch=24, breath=0.3)
        k = smoother(ramp(t, 0.55, 0.85))
        woman_stand(W, 25.24, -1.85 + 0.25 * k, 180, t, head_pitch=12, head_roll=-14, spine=10 + 4 * k, locks=False)
        eye = G.world(G.eye())
        aim(cam, Vector((25.0, -0.62, 1.12)), eye + Vector((0.05, 0, -0.05)))
        dof(cam, (eye - cam.location).length, 2.2)
    return {"frames": 20, "fps": 12, "update": update, "res": HERO}


def cover2():
    """Cover NIGHT 2: the drained deep end at night, dry tiles, the puddle — and the woman standing at the bottom in the torch beam,
    head tilted, looking up at us."""
    S, G, W = open_set("pool", "drained", guard=False)
    drained_hall()
    cam = camera(lens=45)
    bpy.data.objects["L_windows"].data.energy = 420
    fl = bpy.data.objects["FLASHLIGHT"]; show("FLASHLIGHT", True); fl.hide_render = True; bpy.data.objects["FLASHLIGHT.lens"].hide_render = True
    fl.parent = None; fl.location = (22.3, 3.3, 1.7)
    fl.rotation_euler = (Vector((24.3, 9.4, -2.4)) - fl.location).to_track_quat("Z", "Y").to_euler()
    flashlight(True, 1100)

    def update(t):
        woman_stand(W, 24.4, 9.6, 200, 0.0, head_pitch=-14, head_roll=-26, spine=2, floor=-3.2, locks=False)
        aim(cam, Vector((23.2, 6.0, 0.9)), Vector((24.4, 9.55, -2.3)), 0)
    return {"frames": 1, "update": update, "still": True, "res": (1080, 1920), "samples": 16}


SHOTS = {
    "__episode__": "p2", "cover2": cover2,
    "feed_c4_dry": feed_c4_dry, "feed_c3_dry": feed_c3_dry, "feed_c4_full": feed_c4_full, "p2_cc2_empty": p2_cc2_empty, "p2_02": p2_02,
    "p2_cc4": p2_cc4, "p2_cc2": p2_cc2, "p2_16": p2_16, "p2_18": p2_18,
    "p2_01": p2_01, "p2_03": p2_03, "p2_04": p2_04, "p2_05": p2_05, "p2_06": p2_06, "p2_07": p2_07, "p2_08": p2_08, "p2_09": p2_09,
    "p2_10": p2_10, "p2_11": p2_11, "p2_12": p2_12, "p2_13": p2_13, "p2_14": p2_14, "p2_15": p2_15, "p2_17": p2_17,
}

if __name__ == "__main__":
    run_cli(SHOTS)
