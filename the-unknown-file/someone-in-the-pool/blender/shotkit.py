"""Shot toolkit (SOMEONE IS IN THE POOL): loads a set (pool / apartment / street) + the GUARD and the WOMAN, provides lighting states, cameras,
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
from rigkit import mix_hand

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
SETS = {"pool": "pool.blend", "apartment": "apartment.blend"}


def open_set(set_name="pool", lights="night", guard=True, woman=True):
    """set_name: pool | apartment"""
    bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, SETS[set_name]))
    S = bpy.context.scene
    with bpy.data.libraries.load(os.path.join(HERE, "characters.blend"), link=False) as (src, dst):
        dst.collections = ["GUARD", "WOMAN", "PROPS"]
    for c in dst.collections:
        S.collection.children.link(c)
    G = Actor("Gua"); W = Actor("Wom")
    for flag, cname in ((guard, "GUARD"), (woman, "WOMAN")):
        if not flag:
            for o in bpy.data.collections[cname].all_objects:
                o.hide_render = True
    for nm in ("FLASHLIGHT", "HANDRADIO", "KEYS"):
        show(nm, False)
    if not guard:
        show("PHONE", False)
    S.render.engine = "BLENDER_EEVEE_NEXT"
    S.eevee.taa_render_samples = 6
    S.eevee.use_raytracing = False
    S.eevee.shadow_resolution_scale = 0.5
    S.eevee.volumetric_tile_size = "8"; S.eevee.volumetric_samples = 24
    S.render.image_settings.file_format = "JPEG"; S.render.image_settings.quality = 92
    S.view_settings.view_transform = "AgX"; S.view_settings.look = "AgX - Medium High Contrast"
    set_lights(lights)
    phone_light_setup()
    return S, G, W


def show(name, v=True):
    o = bpy.data.objects.get(name)
    if o:
        o.hide_render = not v
        for c in o.children_recursive:
            c.hide_render = not v


def set_lights(mode):
    """pool: night | hall | drained | drained_hall.  apartment: warm | bath | dark | street"""
    cols = bpy.data.collections
    if "LIGHTS_WARM" in cols:
        on = {"warm": ["LIGHTS_WARM", "LIGHTS_CORRIDOR", "LIGHTS_STREET"], "bath": ["LIGHTS_WARM", "LIGHTS_BATH", "LIGHTS_CORRIDOR", "LIGHTS_STREET"],
              "dark": ["LIGHTS_STREET"], "street": ["LIGHTS_STREET", "LIGHTS_CORRIDOR"]}[mode]
        for n in ("LIGHTS_WARM", "LIGHTS_BATH", "LIGHTS_CORRIDOR", "LIGHTS_STREET"):
            cols[n].hide_render = n not in on
        for mn, lit in (("bath_bulb", "LIGHTS_BATH" in on), ("lampshade", "LIGHTS_WARM" in on)):
            m = bpy.data.materials.get(mn)
            if m:
                m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = (4.0 if mn == "bath_bulb" else 1.2) if lit else 0.0
        return
    if "LIGHTS_HALL" in cols:
        on = {"night": ["LIGHTS_NIGHT", "LIGHTS_UNDERWATER", "LIGHTS_OFFICE", "LIGHTS_CORRIDOR"],
              "hall": ["LIGHTS_NIGHT", "LIGHTS_UNDERWATER", "LIGHTS_OFFICE", "LIGHTS_CORRIDOR", "LIGHTS_HALL"],
              "drained": ["LIGHTS_NIGHT", "LIGHTS_OFFICE", "LIGHTS_CORRIDOR"],
              "drained_hall": ["LIGHTS_NIGHT", "LIGHTS_OFFICE", "LIGHTS_CORRIDOR", "LIGHTS_HALL"],
              "dark": ["LIGHTS_NIGHT"]}[mode]
        for n in ("LIGHTS_NIGHT", "LIGHTS_HALL", "LIGHTS_OFFICE", "LIGHTS_CORRIDOR", "LIGHTS_UNDERWATER"):
            cols[n].hide_render = n not in on
        drained = mode.startswith("drained")
        cols["WATER"].hide_render = drained
        cols["DRAINED"].hide_render = not drained
        for o in cols["BASIN"].all_objects:
            if o.type == "MESH" and o.data.materials and o.data.materials[0].name.startswith("basin_tiles"):
                o.data.materials[0] = bpy.data.materials["basin_tiles_dry" if drained else "basin_tiles"]
        uw = mode in ("night", "hall")
        if "underwater_light" in bpy.data.materials:
            bpy.data.materials["underwater_light"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 8.0 if uw else 0.0
        if "fluoro_tube" in bpy.data.materials:
            bpy.data.materials["fluoro_tube"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 6.0 if "hall" in mode else 0.0
        for o in bpy.data.objects:
            if o.type == "LIGHT" and (o.name.startswith(("L_windows", "L_exit", "L_office_spill", "L_monitors", "L_corr")) or o.name.startswith("L_fix")):
                o.data.use_shadow = o.name.startswith(("L_fix_21.4", "L_fix_26.0"))


def water(t, calm=1.0):
    """animate ripples + caustics (call every frame); calm < 1 = stiller water"""
    m = bpy.data.materials.get("pool_water")
    if m:
        m.node_tree.nodes["RIPPLE"].inputs["W"].default_value = t * 0.18 * calm
        m.node_tree.nodes["RIPPLE2"].inputs["W"].default_value = t * 0.35 * calm
        m.node_tree.nodes["RIPPLE_BUMP"].inputs["Strength"].default_value = 0.06 * calm
    for mn in ("basin_tiles",):
        b = bpy.data.materials.get(mn)
        if b and "CAUSTIC" in b.node_tree.nodes:
            b.node_tree.nodes["CAUSTIC"].inputs["W"].default_value = t * 0.22 * calm


def rain(t):          # compatibility with the YOUR FOOD IS HERE renderer
    water(t)


def monitor(i, image_path, strength=1.6):
    o = bpy.data.objects.get(f"MONITOR_SCREEN_{i}")
    if not o:
        return
    m = o.data.materials[0]; n = m.node_tree.nodes["FEED"]
    b = m.node_tree.nodes["Principled BSDF"]
    if image_path:
        n.image = bpy.data.images.load(image_path, check_existing=True)
        b.inputs["Emission Strength"].default_value = strength
    else:
        b.inputs["Emission Strength"].default_value = 0.0


def flashlight(on, energy=180.0):
    bpy.data.objects["FLASHLIGHT.beam"].data.energy = energy if on else 0.0
    bpy.data.materials["torch_lens"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 12.0 if on else 0.0


def phone_light_setup():
    ph = bpy.data.objects["PHONE"]
    L = bpy.data.lights.new("PHONE_GLOW", "AREA"); L.shape = "RECTANGLE"; L.size = 0.066; L.size_y = 0.145
    L.energy = 0.0; L.color = (0.75, 0.85, 1.0); L.use_shadow = False
    o = bpy.data.objects.new("PHONE_GLOW", L); bpy.data.collections["PROPS"].objects.link(o)
    o.parent = ph; o.location = (0, 0, 0.006); o.rotation_euler = (math.pi, 0, 0)


def phone_screen(image_path=None, strength=2.5, glow=1.2):
    m = bpy.data.materials["phone_screen"]
    b = m.node_tree.nodes["Principled BSDF"]; n = m.node_tree.nodes["UI"]
    if image_path:
        n.image = bpy.data.images.load(image_path, check_existing=True)
        if not b.inputs["Emission Color"].links:
            m.node_tree.links.new(n.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = strength
    else:
        b.inputs["Emission Strength"].default_value = 0.0
    bpy.data.objects["PHONE_GLOW"].data.energy = glow if image_path else 0.0


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


def set_clock(h, m, s=0.0):  # office / apartment wall clock
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
