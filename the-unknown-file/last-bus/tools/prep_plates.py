"""Copy Blender plates into the studio: base plates → JPEG, foreground layers → PNG (RGBA),
masks (white-on-black renders) → alpha PNGs usable as CSS mask-image. Animations → PNG frames kept."""
import sys, os, glob, json, shutil
from PIL import Image
src = os.path.join(os.path.dirname(__file__), "..", "blender", "plates")
dst = os.path.join(os.path.dirname(__file__), "..", "studio", "public", "plates")
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, "*.png"))):
    n = os.path.basename(f)[:-4]
    if "__mask" in n:
        m = Image.open(f).convert("L")
        out = Image.new("RGBA", m.size, (255, 255, 255, 0)); out.putalpha(m.point(lambda v: 255 if v > 128 else int(v * 2)))
        out.save(os.path.join(dst, n + ".png"))
    elif "__fg" in n:
        shutil.copy(f, os.path.join(dst, n + ".png"))
    else:
        Image.open(f).convert("RGB").save(os.path.join(dst, n + ".jpg"), quality=94, subsampling=0)
shutil.copy(os.path.join(src, "cams.json"), os.path.join(os.path.dirname(__file__), "..", "studio", "src", "data", "cams.json"))
print("ok", len(os.listdir(dst)))
# animation frame folders (Cycles, 15 fps) → JPEG frames
for d in sorted(glob.glob(os.path.join(src, "anim_*"))):
    if not os.path.isdir(d): continue
    od = os.path.join(dst, os.path.basename(d)); os.makedirs(od, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(d, "f_*.png"))):
        o = os.path.join(od, os.path.basename(f)[:-4] + ".jpg")
        if not os.path.exists(o) or os.path.getmtime(o) < os.path.getmtime(f):
            Image.open(f).convert("RGB").resize((1080, 1920), Image.LANCZOS).save(o, quality=92)
print("anims ok")
