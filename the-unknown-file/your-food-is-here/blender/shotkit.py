"""Shot toolkit: loads the one apartment set + the two characters, provides lighting states, cameras,
easing, and a frame renderer that writes JPEG frames then encodes an MP4 and deletes the frames.

A shot is a function `setup(k)` that returns a dict with:
  frames  — number of frames
  fps     — render rate (the editor plays at 30 fps; 15 fps shots are frame-blended)
  update  — callable(t) that poses everything for time t (seconds from shot start)
  res     — (w, h)
Every shot is also baked (keyframed) into the episode .blend by bake_episode.py, so the saved
animation scene files contain exactly what was rendered.
"""
import bpy, os, sys, math, json, subprocess, shutil, time, random
from mathutils import Vector, Matrix, Euler, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import rigkit
from actor import Actor

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"


# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def smoother(x):
    x = clamp(x)
    return x * x * x * (x * (x * 6 - 15) + 10)


def ramp(t, a, b, f=smooth):
    return f((t - a) / (b - a)) if b > a else (1.0 if t >= b else 0.0)


def lerp(a, b, k):
    if isinstance(a, (tuple, list, Vector)):
        return Vector(a).lerp(Vector(b), k)
    return a + (b - a) * k


def noise1(t, seed=0.0, f=1.0):
    """cheap smooth noise in [-1, 1]"""
    return (math.sin(t * 1.7 * f + seed) * 0.5 + math.sin(t * 2.9 * f + seed * 1.7) * 0.3 + math.sin(t * 5.3 * f + seed * 0.3) * 0.2)


# ------------------------------------------------------------------ scene
def open_set(lights="night", courier=True, protagonist=True):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "apartment.blend"))
    S = bpy.context.scene
    if bpy.data.objects.get("clock_glass"):
        bpy.data.objects["clock_glass"].hide_render = True     # transmission glass renders opaque in EEVEE without raytracing: it hid the face
    with bpy.data.libraries.load(os.path.join(HERE, "characters.blend"), link=False) as (src, dst):
        dst.collections = ["PROTAGONIST", "COURIER", "PROPS"]
    for c in dst.collections:
        S.collection.children.link(c)
    P = Actor("Pro") if protagonist else None
    C = Actor("Cou") if courier else None
    if not protagonist:
        for o in bpy.data.collections["PROTAGONIST"].all_objects:
            o.hide_render = True
    if not courier:
        for o in bpy.data.collections["COURIER"].all_objects:
            o.hide_render = True
    for nm in ("BAG", "RECEIPT"):
        bpy.data.objects[nm].hide_render = True
    if not protagonist:
        bpy.data.objects["PHONE"].hide_render = True
        bpy.data.objects["PHONE.screen"].hide_render = True
    set_lights(lights)
    S.render.engine = "BLENDER_EEVEE_NEXT"
    S.eevee.taa_render_samples = 6
    S.eevee.use_raytracing = False           # CPU (llvmpipe) budget: see docs/PRODUCTION_BIBLE.md "Render budget"
    S.eevee.shadow_resolution_scale = 0.5
    for o in bpy.data.objects:
        if o.type == "LIGHT" and (o.name.startswith("L_window") or o.name.startswith("L_on_") or o.name in ("L_undercab", "L_hall_fill", "L_floorlamp")):
            o.data.use_shadow = False
    S.render.image_settings.file_format = "JPEG"
    S.render.image_settings.quality = 92
    S.render.film_transparent = False
    S.view_settings.view_transform = "AgX"
    S.view_settings.look = "AgX - Medium High Contrast"
    rain_setup()
    phone_light_setup()
    return S, P, C


def hide(objs, v=True):
    for o in objs:
        o.hide_render = v
        o.hide_viewport = v


def set_lights(mode):
    cols = bpy.data.collections
    on = {"night": ["LIGHTS_NIGHT", "LIGHTS_CORRIDOR"], "allon": ["LIGHTS_ALLON", "LIGHTS_CORRIDOR", "LIGHTS_NIGHT"],
          "dark": ["LIGHTS_CORRIDOR"], "morning": ["LIGHTS_NIGHT", "LIGHTS_CORRIDOR"], "corridor": ["LIGHTS_CORRIDOR"]}[mode]
    for n in ("LIGHTS_NIGHT", "LIGHTS_ALLON", "LIGHTS_CORRIDOR"):
        cols[n].hide_render = n not in on
    W = bpy.context.scene.world.node_tree.nodes["Background"]
    if mode == "morning":
        for nm, e, c in (("L_window_living", 220, (0.75, 0.82, 0.95)), ("L_window_kitchen", 90, (0.75, 0.82, 0.95)), ("L_window_bed", 80, (0.75, 0.82, 0.95))):
            L = bpy.data.objects[nm].data; L.energy = e; L.color = c
        bpy.data.objects["L_floorlamp"].data.energy = 0
        bpy.data.objects["L_floorlamp_down"].data.energy = 0
        bpy.data.objects["L_undercab"].data.energy = 0
        W.inputs[0].default_value = (0.05, 0.06, 0.08, 1)
    if mode == "allon":
        bpy.data.objects["L_floorlamp"].data.energy = 10
        for o in bpy.data.collections["LIGHTS_ALLON"].objects:
            if o.type == "LIGHT" and not o.get("scaled"):
                o.data.energy *= 0.42; o["scaled"] = 1
    # emissive lamp shades follow the lights
    em = 0.6 if mode in ("night", "allon") else 0.0
    if "lampshade" in bpy.data.materials:
        bpy.data.materials["lampshade"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = em if mode != "allon" else 2.0
    bpy.data.collections["CURTAINS_N3"].hide_render = True


def rain_setup():
    """Animated rain streak curtains just outside the windows (emission + alpha)."""
    m = bpy.data.materials.new("rain_streaks"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.name = "RAIN_MAP"
    mp.inputs["Scale"].default_value = (60, 60, 1.2)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 1.0; ns.inputs["Detail"].default_value = 0
    nt.links.new(mp.outputs["Vector"], ns.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.68; mr.inputs["From Max"].default_value = 0.8
    nt.links.new(ns.outputs["Fac"], mr.inputs["Value"])
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.7, 0.78, 0.9, 1); em.inputs["Strength"].default_value = 0.8
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs["Result"], mx.inputs["Fac"]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    try:
        m.surface_render_method = "BLENDED"
    except Exception:
        pass
    col = bpy.data.collections["EXTERIOR"]
    for (x0, x1, y) in ((0.9, 2.3, 9.2), (3.7, 7.1, 9.2)):
        me = bpy.data.meshes.new("rain")
        me.from_pydata([(x0, y, 0.5), (x1, y, 0.5), (x1, y, 2.6), (x0, y, 2.6)], [], [(0, 1, 2, 3)])
        o = bpy.data.objects.new("RAIN", me); col.objects.link(o); me.materials.append(m)
    me = bpy.data.meshes.new("rain_e")
    me.from_pydata([(8.0, 2.3, 0.6), (8.0, 3.7, 0.6), (8.0, 3.7, 2.6), (8.0, 2.3, 2.6)], [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new("RAIN", me); col.objects.link(o); me.materials.append(m)


def rain(t):
    m = bpy.data.materials.get("rain_streaks")
    if m:
        m.node_tree.nodes["RAIN_MAP"].inputs["Location"].default_value[2] = t * 9.0


def door_leak(gaps=()):
    """Corridor light spilling under the front door of 6A; `gaps` = list of (x0, x1) shadows cut by feet outside."""
    for o in [o for o in bpy.data.objects if o.name.startswith("DOOR_LEAK")]:
        bpy.data.objects.remove(o)
    m = bpy.data.materials.get("door_leak")
    if m is None:
        m = bpy.data.materials.new("door_leak"); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Color"].default_value = (0.85, 1.0, 0.82, 1); b.inputs["Emission Strength"].default_value = 6.0
    xs = [0.27]
    for a, b_ in sorted(gaps):
        xs += [a, b_]
    xs.append(1.13)
    segs = [(xs[i], xs[i + 1]) for i in range(0, len(xs), 2)]
    for i, (a, b_) in enumerate(segs):
        if b_ - a < 0.01:
            continue
        me = bpy.data.meshes.new("leak")
        # light fan on the floor inside the door (fades out across ~25 cm)
        me.from_pydata([(a, 0.0, 0.002), (b_, 0.0, 0.002), (b_ + 0.03, 0.22, 0.002), (a - 0.03, 0.22, 0.002)], [], [(0, 1, 2, 3)])
        o = bpy.data.objects.new(f"DOOR_LEAK_{i}", me); bpy.data.collections["HALL"].objects.link(o)
        me.materials.append(m)
        L = bpy.data.lights.new(f"DOOR_LEAK_L{i}", "AREA"); L.shape = "RECTANGLE"; L.size = b_ - a; L.size_y = 0.02; L.energy = 6.0 * (b_ - a); L.color = (0.85, 1.0, 0.82)
        lo = bpy.data.objects.new(f"DOOR_LEAK_L{i}", L); bpy.data.collections["HALL"].objects.link(lo)
        lo.location = ((a + b_) / 2, 0.02, 0.01); lo.rotation_euler = (math.radians(-80), 0, 0)
    # gradient: emission fades with distance from the door
    nt = m.node_tree
    if "grad" not in nt.nodes:
        tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.name = "grad"
        mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 0.22
        mr.inputs["To Min"].default_value = 6.0; mr.inputs["To Max"].default_value = 0.0
        nt.links.new(tc.outputs["Object"], sep.inputs["Vector"]); nt.links.new(sep.outputs["Y"], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], nt.nodes["Principled BSDF"].inputs["Emission Strength"])


def phone_light_setup():
    """Screen glow: a small area light on the phone's screen (lights hands + face like a real phone)."""
    ph = bpy.data.objects["PHONE"]
    L = bpy.data.lights.new("PHONE_GLOW", "AREA"); L.shape = "RECTANGLE"; L.size = 0.066; L.size_y = 0.145
    L.energy = 0.0; L.color = (0.75, 0.85, 1.0); L.use_shadow = False
    o = bpy.data.objects.new("PHONE_GLOW", L); bpy.data.collections["PROPS"].objects.link(o)
    o.parent = ph; o.location = (0, 0, 0.006); o.rotation_euler = (math.pi, 0, 0)   # area lights emit along -Z; flip to face out of the screen
    o.rotation_euler = (0, 0, 0)
    # area light points down its -Z; screen normal is +Z of the phone -> rotate 180 about X
    o.rotation_euler = (math.pi, 0, 0)


def phone_screen(image_path=None, strength=2.5, glow=1.2):
    """Show a UI image on the phone (None = screen off)."""
    m = bpy.data.materials["phone_screen"]
    b = m.node_tree.nodes["Principled BSDF"]
    n = m.node_tree.nodes["UI"]
    if image_path:
        img = bpy.data.images.load(image_path, check_existing=True)
        n.image = img
        if not b.inputs["Emission Color"].links:
            m.node_tree.links.new(n.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = strength
    else:
        b.inputs["Emission Strength"].default_value = 0.0
    bpy.data.objects["PHONE_GLOW"].data.energy = glow if image_path else 0.0


def phone_screen_strength(s, glow=None):
    m = bpy.data.materials["phone_screen"]
    m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = s
    if glow is not None:
        bpy.data.objects["PHONE_GLOW"].data.energy = glow


def camera(name="CAM", lens=28.0):
    S = bpy.context.scene
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.03; cd.clip_end = 200
    cd.sensor_width = 36
    o = bpy.data.objects.new(name, cd); S.collection.objects.link(o)
    S.camera = o
    return o


def aim(cam, loc, at, roll=0.0, lens=None):
    cam.location = Vector(loc)
    q = (Vector(at) - Vector(loc)).to_track_quat("-Z", "Y")
    if roll:
        q = q @ Quaternion((0, 0, 1), math.radians(roll))
    cam.rotation_euler = q.to_euler()
    if lens:
        cam.data.lens = lens


def handheld(t, amp=1.0, seed=0.0):
    """small positional + rotational drift (metres, degrees)"""
    return (Vector((noise1(t, seed, 0.6) * 0.004, noise1(t, seed + 3, 0.5) * 0.003, noise1(t, seed + 7, 0.55) * 0.004)) * amp,
            noise1(t, seed + 11, 0.4) * 0.35 * amp)


def dof(cam, focus_obj_or_dist, fstop=2.8):
    cam.data.dof.use_dof = True
    if isinstance(focus_obj_or_dist, (int, float)):
        cam.data.dof.focus_distance = focus_obj_or_dist
    else:
        cam.data.dof.focus_object = focus_obj_or_dist
    cam.data.dof.aperture_fstop = fstop


def set_clock(h, m, s=0.0):
    bpy.data.objects["CLOCK_hour"].rotation_euler = (0, 0, -math.radians((h % 12) * 30 + m * 0.5))
    bpy.data.objects["CLOCK_minute"].rotation_euler = (0, 0, -math.radians(m * 6 + s * 0.1))
    bpy.data.objects["CLOCK_second"].rotation_euler = (0, 0, -math.radians(s * 6))


def door(name, deg):
    o = bpy.data.objects[name]
    base = o.get("yaw0")
    if base is None:
        o["yaw0"] = math.degrees(o.rotation_euler.z); base = o["yaw0"]
    o.rotation_euler.z = math.radians(base + deg)


def handle(name, deg):
    """rotate a door lever (pivot empties are named <DOOR>_handlepivot_in/_out)."""
    for side in ("_in", "_out"):
        o = bpy.data.objects.get(f"{name}_handlepivot{side}")
        if o:
            o.rotation_euler = (0, math.radians(deg if side == "_in" else -deg), 0)


# ------------------------------------------------------------------ rendering
def render_shot(name, setup, out_dir, samples=6, frames=None, keep_frames=False):
    spec = setup()
    S = bpy.context.scene
    n = spec["frames"]; fps = spec.get("fps", 15)
    w, h = spec.get("res", (720, 1280))
    S.render.resolution_x, S.render.resolution_y = w, h
    S.render.resolution_percentage = 100
    S.eevee.taa_render_samples = spec.get("samples", samples)
    if spec.get("border"):
        x0, y0, x1, y1 = spec["border"]
        S.render.use_border = True; S.render.use_crop_to_border = False
        S.render.border_min_x, S.render.border_min_y, S.render.border_max_x, S.render.border_max_y = x0, y0, x1, y1
    else:
        S.render.use_border = False
    if spec.get("still"):
        if spec.get("res") is None:
            S.render.resolution_x, S.render.resolution_y = 1080, 1920
        rain(0.0); spec["update"](0.0); bpy.context.view_layer.update()
        S.render.filepath = os.path.join(out_dir, name + ".jpg")
        S.render.image_settings.quality = 95
        bpy.ops.render.render(write_still=True)
        return spec
    fdir = os.path.join(out_dir, name)
    os.makedirs(fdir, exist_ok=True)
    t0 = time.time()
    rng = range(n) if frames is None else frames
    for i in rng:
        t = i / fps
        p = os.path.join(fdir, f"f_{i + 1:04d}.jpg")
        if os.path.exists(p):
            continue
        rain(t)
        spec["update"](t)
        bpy.context.view_layer.update()
        S.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print(f"[{name}] frame {i + 1}/{n} {time.time() - t0:.0f}s", flush=True)
    if frames is None:
        mp4 = os.path.join(out_dir, name + ".mp4")
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(fdir, "f_%04d.jpg"),
                        "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", mp4], check=True)
        if not keep_frames:
            shutil.rmtree(fdir)
        json.dump({"name": name, "frames": n, "fps": fps, "res": [w, h], "seconds": time.time() - t0},
                  open(os.path.join(out_dir, name + ".json"), "w"))
    return spec


def run_cli(shots):
    """blender -b --python nX_shots.py -- <shot names...|all> [--still]"""
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ep = shots["__episode__"]
    out = os.path.join(ROOT, "renders", ep)
    os.makedirs(out, exist_ok=True)
    names = [a for a in argv if not a.startswith("--")]
    if not names or names == ["all"]:
        names = [k for k in shots if not k.startswith("__")]
    still = "--still" in argv
    for nm in names:
        if not still and (os.path.exists(os.path.join(out, nm + ".mp4")) or os.path.exists(os.path.join(out, nm + ".jpg"))):
            print("skip", nm); continue
        fn = shots[nm]
        if still:
            spec = fn()
            S = bpy.context.scene
            S.render.resolution_x, S.render.resolution_y = spec.get("res", (720, 1280))
            S.render.resolution_percentage = 75
            S.eevee.taa_render_samples = 6
            for frac in ((0.0,) if spec.get("still") else (0.0, 0.5, 0.99)):
                t = frac * (spec["frames"] - 1) / spec.get("fps", 15)
                rain(t); spec["update"](t); bpy.context.view_layer.update()
                S.render.filepath = os.path.join(out, "_stills", f"{nm}_{int(frac * 100):02d}.jpg")
                bpy.ops.render.render(write_still=True)
        else:
            render_shot(nm, fn, out)
