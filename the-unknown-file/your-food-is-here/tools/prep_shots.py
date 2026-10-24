"""Prepare rendered shots for the edit (studio/public/shots/<ep>/):
  - 3D shots (12-15 fps EEVEE renders, 720x1280) -> 30 fps (motion-compensated interpolation) at 1080x1920
  - doorbell feeds (db_*) -> 1080x1440 security-camera look: barrel/fisheye distortion, sensor noise,
    low saturation; kept at 15 fps like a real doorbell stream
  - stills (.jpg) -> copied
usage: python3 tools/prep_shots.py n1 [name ...]
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
    if f.endswith(".jpg") and name.startswith("db_"):
        vf = ("scale=1080:1440:flags=lanczos,lenscorrection=cx=0.5:cy=0.5:k1=-0.32:k2=0.06,"
              "eq=saturation=0.55:contrast=1.08:brightness=0.01,colorbalance=gs=0.04:bs=-0.02,noise=alls=14:allf=t")
        run(["-loop", "1", "-i", f, "-t", "8", "-vf", vf, "-r", "15", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", out[:-4] + ".mp4"])
    elif f.endswith(".jpg"):
        shutil.copy(f, out)
    elif name.startswith("db_"):
        vf = ("scale=1080:1440:flags=lanczos,lenscorrection=cx=0.5:cy=0.5:k1=-0.32:k2=0.06,"
              "eq=saturation=0.55:contrast=1.08:brightness=0.01,colorbalance=gs=0.04:bs=-0.02,"
              "noise=alls=14:allf=t,unsharp=5:5:0.4")
        dfps = (json.load(open(f[:-4] + ".json")) if os.path.exists(f[:-4] + ".json") else {"fps": 15}).get("fps", 15)
        run(["-i", f, "-vf", vf, "-r", str(dfps), "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", out])
    else:
        info = json.load(open(f[:-4] + ".json")) if os.path.exists(f[:-4] + ".json") else {"fps": 12}
        fps = info.get("fps", 12)
        w, h = info.get("res", [720, 1280])
        sc = "scale=1080:1920:flags=lanczos" if abs(w / h - 9 / 16) < 0.01 else "scale=1080:-2:flags=lanczos"
        if fps >= 24:
            vf = sc + ",fps=30"
        else:
            vf = "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1," + sc + ",unsharp=5:5:0.35"
        run(["-i", f, "-vf", vf, "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p", out])
    if name == "n2_17":   # its first frame is also the still "photo" of his face
        os.makedirs(os.path.join(ROOT, "studio", "public", "photos"), exist_ok=True)
        run(["-i", out, "-frames:v", "1", "-q:v", "2", os.path.join(ROOT, "studio", "public", "photos", "n2_photo_g.jpg")])
    print("prepped", name)
