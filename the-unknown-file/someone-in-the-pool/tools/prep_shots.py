"""Prepare rendered shots for the edit (studio/public/shots/<ep>/):
  - 3D shots (12-15 fps EEVEE renders, 576x1024 / 720x1280) -> 30 fps (motion-compensated interpolation) at 1080x1920
  - 24 fps shots -> 30 fps by frame rate conversion (fast action stays crisp)
  - CCTV shots (*_cc*) -> kept at their 8 fps cadence (frames repeated) at 1080x1920 — security cameras stutter
  - stills (.jpg) -> copied
  - p1_19 also gets a reversed copy (p1_19_rev: he turns back to the screen)
usage: python3 tools/prep_shots.py p1 [name ...]
"""
import os, sys, json, subprocess, shutil, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ep = sys.argv[1]
only = set(sys.argv[2:])
src = os.path.join(ROOT, "renders", ep)
dst = os.path.join(ROOT, "studio", "public", "shots", ep)
os.makedirs(dst, exist_ok=True)


def run(args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error"] + args, check=True)


for f in sorted(glob.glob(os.path.join(src, "*.mp4")) + glob.glob(os.path.join(src, "*.jpg"))):
    name = os.path.splitext(os.path.basename(f))[0]
    if only and name not in only:
        continue
    out = os.path.join(dst, os.path.basename(f))
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(f):
        continue
    if f.endswith(".jpg"):
        shutil.copy(f, out)
    else:
        info = json.load(open(f[:-4] + ".json")) if os.path.exists(f[:-4] + ".json") else {"fps": 12}
        fps = info.get("fps", 12)
        sc = "scale=1080:1920:flags=lanczos"
        if "_cc" in name:
            vf = sc + ",fps=30"
        elif fps >= 24:
            vf = sc + ",fps=30"
        else:
            vf = "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1," + sc + ",unsharp=5:5:0.35"
        run(["-i", f, "-vf", vf, "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p", out])
        if name == "p1_19":
            run(["-i", out, "-vf", "reverse", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", os.path.join(dst, "p1_19_rev.mp4")])
    print("prepped", name)
