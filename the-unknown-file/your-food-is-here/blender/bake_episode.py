"""Bakes every 3D shot of one night into ONE editable animation scene file: blender/scenes/<ep>_animation.blend.

Each shot's update(t) is replayed and recorded (rigs, IK controls, props, doors, clock, lights, camera); the
recording is then keyframed onto a single 30 fps timeline in shot order, one camera per shot, with timeline
markers bound to the cameras (so the cut plays in Blender's viewport / renders shot by shot).
The rendered episodes use exactly these update() functions, so the scene file matches what is on screen.
Note: the phone's screen image (UI state) is not animatable — the file shows the last UI texture used.
usage: blender -b --python bake_episode.py -- n1
"""
import bpy, os, sys, re, math, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Matrix, Vector
import shotkit

ep = sys.argv[sys.argv.index("--") + 1]
mod = importlib.import_module(f"{ep}_shots")
SH = mod.SHOTS
TRACK_PROPS = ("PHONE", "BAG", "RECEIPT")
TRACK_ROT = ("CLOCK_hour", "CLOCK_minute", "CLOCK_second")


def start_of(fn):
    m = re.search(r"(\d+\.\d+)-(\d+\.\d+)", fn.__doc__ or "")
    return float(m.group(1)) if m else 9999.0


def snapshot():
    st = {"rig": {}, "ctl": {}, "obj": {}, "rot": {}, "lights": {}, "cam": None}
    for tag in ("Pro", "Cou"):
        rig = bpy.data.objects.get(f"{tag}.rig")
        if not rig:
            continue
        vis = not bpy.data.objects[tag].hide_render
        st["rig"][tag] = (rig.matrix_world.copy(), {b.name: (b.rotation_quaternion.copy(), b.location.copy()) for b in rig.pose.bones}, vis)
        for k in ("hand_l", "hand_r", "elbow_l", "elbow_r", "knee_l", "knee_r", "foot_l", "foot_r"):
            o = bpy.data.objects[f"{tag}.{k}"]
            st["ctl"][o.name] = o.matrix_basis.copy()
    for n in TRACK_PROPS:
        o = bpy.data.objects[n]
        st["obj"][n] = (o.matrix_world.copy(), not o.hide_render)
    for o in bpy.data.objects:
        if (o.name.startswith(("DOOR_", "CLOSET_DOOR")) and o.type == "EMPTY") or o.name in TRACK_ROT:
            st["rot"][o.name] = o.rotation_euler.copy()
    for o in bpy.data.objects:
        if o.type == "LIGHT":
            hidden = o.hide_render or any(c.hide_render for c in o.users_collection)
            st["lights"][o.name] = (o.matrix_world.copy(), o.data.type, tuple(o.data.color), o.data.energy, not hidden,
                                    getattr(o.data, "size", 0.1), getattr(o.data, "size_y", 0.1), getattr(o.data, "spot_size", 1.0))
    c = bpy.context.scene.camera
    st["cam"] = (c.matrix_world.copy(), c.data.lens, c.data.clip_start, c.data.dof.use_dof, c.data.dof.focus_distance, c.data.dof.aperture_fstop)
    return st


# ---------------------------------------------------------------- record
order = sorted([k for k in SH if not k.startswith("__")], key=lambda k: start_of(SH[k]))
REC = []
for name in order:
    spec = SH[name]()
    fps = spec.get("fps", 12); n = spec["frames"]
    frames = []
    for i in range(n):
        t = i / fps
        shotkit.rain(t); spec["update"](t); bpy.context.view_layer.update()
        frames.append((t, snapshot()))
    REC.append((name, fps, n, frames, start_of(SH[name])))
    print("recorded", name, n, flush=True)

# ---------------------------------------------------------------- build
S, P, C = shotkit.open_set("night")
S.render.fps = 30
cams = bpy.data.collections.new("SHOT_CAMERAS"); S.collection.children.link(cams)
extra = bpy.data.collections.new("SHOT_LIGHTS"); S.collection.children.link(extra)
g = 1
for name, fps, n, frames, t0 in REC:
    cd = bpy.data.cameras.new("CAM_" + name)
    cam = bpy.data.objects.new("CAM_" + name, cd); cams.objects.link(cam)
    mk = S.timeline_markers.new(f"{name} ({t0:.2f}s)" if t0 < 9000 else name, frame=g); mk.camera = cam
    last = g
    for t, st in frames:
        f = g + int(round(t * 30))
        last = f
        M, lens, clip, udof, fd, fs = st["cam"]
        cam.matrix_world = M; cd.lens = lens; cd.clip_start = clip; cd.dof.use_dof = udof; cd.dof.focus_distance = fd; cd.dof.aperture_fstop = fs
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
        cd.keyframe_insert("lens", frame=f); cd.dof.keyframe_insert("focus_distance", frame=f)
        for tag, (MW, bones, vis) in st["rig"].items():
            rig = bpy.data.objects[f"{tag}.rig"]
            rig.matrix_world = MW; rig.keyframe_insert("location", frame=f); rig.keyframe_insert("rotation_euler", frame=f)
            for bn, (q, loc) in bones.items():
                pb = rig.pose.bones[bn]; pb.rotation_quaternion = q; pb.location = loc
                pb.keyframe_insert("rotation_quaternion", frame=f); pb.keyframe_insert("location", frame=f)
            for o in bpy.data.collections["PROTAGONIST" if tag == "Pro" else "COURIER"].objects:
                if o.type == "MESH":
                    o.hide_render = not vis; o.hide_viewport = not vis
                    o.keyframe_insert("hide_render", frame=f); o.keyframe_insert("hide_viewport", frame=f)
        for on, MB in st["ctl"].items():
            o = bpy.data.objects[on]; o.matrix_basis = MB
            o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f)
        for on, (MW, vis) in st["obj"].items():
            o = bpy.data.objects[on]; o.parent = None; o.matrix_world = MW; o.hide_render = not vis; o.hide_viewport = not vis
            for p_ in ("location", "rotation_euler", "hide_render", "hide_viewport"):
                o.keyframe_insert(p_, frame=f)
        for on, rot in st["rot"].items():
            o = bpy.data.objects.get(on)
            if o:
                o.rotation_euler = rot; o.keyframe_insert("rotation_euler", frame=f)
        for on, (MW, typ, col, en, vis, sz, szy, spot) in st["lights"].items():
            o = bpy.data.objects.get(on)
            if o is None:
                L = bpy.data.lights.new(on, typ); o = bpy.data.objects.new(on, L); extra.objects.link(o)
            o.matrix_world = MW; o.data.color = col; o.data.energy = en if vis else 0.0
            if typ == "AREA":
                o.data.size = sz; o.data.size_y = szy
            if typ == "SPOT":
                o.data.spot_size = spot
            for c in o.users_collection:
                c.hide_render = False
            o.hide_render = False
            o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f)
            o.data.keyframe_insert("energy", frame=f)
    g = last + 8      # a short gap between shots on the timeline
    print("baked", name, flush=True)
S.frame_start, S.frame_end = 1, g
# keep cuts hard: constant interpolation between shots is implied by the gaps; inside shots use linear
for a in bpy.data.actions:
    for fc in a.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
os.makedirs(os.path.join(shotkit.HERE, "scenes"), exist_ok=True)
out = os.path.join(shotkit.HERE, "scenes", f"{ep}_animation.blend")
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("SAVED", out, g, "frames")
