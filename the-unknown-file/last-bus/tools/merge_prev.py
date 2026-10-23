"""Use quick preview renders for plates the main batch has not produced yet (dev only)."""
import json, os, glob, sys
from PIL import Image
src = sys.argv[1]; dst = "studio/public/plates"; cams = "studio/src/data/cams.json"
c = json.load(open(cams)); pc = json.load(open(os.path.join(src, "cams.json")))
main_done = json.load(open("blender/plates/cams.json"))
for f in glob.glob(os.path.join(src, "*.png")):
    n = os.path.basename(f)[:-4]; base = n.split("__")[0]
    if os.path.exists(os.path.join("blender/plates", base + ".png")) and base in main_done and main_done[base]["res"][0] == 1080: continue
    if "__mask" in n:
        m = Image.open(f).convert("L").resize((1080, 1920)); o = Image.new("RGBA", m.size, (255, 255, 255, 0)); o.putalpha(m); o.save(os.path.join(dst, n + ".png"))
    elif "__fg" in n:
        Image.open(f).resize((1080, 1920)).save(os.path.join(dst, n + ".png"))
    else:
        Image.open(f).convert("RGB").resize((1080, 1920)).save(os.path.join(dst, n + ".jpg"), quality=90)
    if base in pc: c[base] = pc[base]
json.dump(c, open(cams, "w"), indent=1)
print("merged", sorted(k for k in pc))
