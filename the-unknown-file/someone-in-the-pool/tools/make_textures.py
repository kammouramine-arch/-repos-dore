"""Procedural story textures for SOMEONE IS IN THE POOL (original, generated here; no third-party content).

Writes to assets/textures/:
  hand_height.png    palm + five fingers height map (white = raised), the hand pressing up under the pool floor (N1)
  hand_crack.png     grout-crack mask around the hand (N1, revealed as the hand strains)
  handprint.png      wet handprint on glass, alpha mask (N2 door glass, both sides)
  footprint.png      wet bare footprint (left; mirrored for the right), alpha mask (N2 corridor)
  glass_crack.png    radial crack in the door's vision panel (N2)
  mirror_msg.png     "YOU LEFT THE DOOR OPEN." wiped into the mirror fog with a fingertip, with runs (N3)
  logbook_page.png   the guard's incident log for Night 1 (N2)
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "textures")
os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
R = random.Random(7)


def capsule(d, a, b, r, fill):
    (x0, y0), (x1, y1) = a, b
    n = max(2, int(math.hypot(x1 - x0, y1 - y0) / 2))
    for i in range(n + 1):
        t = i / n
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        rr = r * (1 - 0.18 * t)
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=fill)


def hand_shape(size, spread=1.0, curl=0.0):
    """right hand, palm toward the viewer, fingers up (+y up in image = toward the top edge)."""
    S = size / 1024
    im = Image.new("L", (size, size), 0); d = ImageDraw.Draw(im)
    cx, cy = 512 * S, 640 * S
    d.ellipse((cx - 185 * S, cy - 235 * S, cx + 180 * S, cy + 190 * S), fill=255)          # palm
    d.rectangle((cx - 165 * S, cy - 190 * S, cx + 160 * S, cy - 60 * S), fill=255)
    d.ellipse((cx - 120 * S, cy + 120 * S, cx + 110 * S, cy + 300 * S), fill=255)          # heel of the hand
    fingers = [(-115, -150, -175, 300, 40), (-40, -175, -15, 360, 42), (40, -172, 18, 385, 42), (112, -150, 50, 345, 40)]
    for (bx, by, ang, ln, r) in fingers:
        a = math.radians(ang * 0.18 * spread)
        b = (cx + bx * S, cy + by * S)
        ln2 = ln * (1 - 0.35 * curl)
        tip = (b[0] + math.sin(a) * ln2 * S + bx * 0.25 * spread * S, b[1] - math.cos(a) * ln2 * S)
        capsule(d, b, tip, r * S, 255)
    capsule(d, (cx - 140 * S, cy + 60 * S), (cx - 330 * S, cy - 120 * S), 46 * S, 255)    # thumb
    return im


def save(im, name):
    im.save(os.path.join(OUT, name)); print("wrote", name)


# ---- hand height map (soft dome so the tiles bulge, sharper knuckle ridges)
h = hand_shape(1024, spread=1.15)
dome = h.filter(ImageFilter.GaussianBlur(26))
ridge = h.filter(ImageFilter.GaussianBlur(9))
hm = Image.blend(dome, ridge, 0.45)
save(hm, "hand_height.png")
# cracks: random walks starting on the hand outline
cr = Image.new("L", (1024, 1024), 0); d = ImageDraw.Draw(cr)
edge = ImageChops.subtract(h.filter(ImageFilter.MaxFilter(9)), h)
pts = [(x, y) for y in range(0, 1024, 6) for x in range(0, 1024, 6) if edge.getpixel((x, y)) > 128]
for _ in range(46):
    x, y = R.choice(pts); a = R.uniform(0, 2 * math.pi)
    for _ in range(R.randint(8, 22)):
        a += R.uniform(-0.6, 0.6); l = R.uniform(8, 22)
        nx, ny = x + math.cos(a) * l, y + math.sin(a) * l
        d.line((x, y, nx, ny), fill=255, width=R.choice((3, 4, 5, 6)))
        x, y = nx, ny
save(cr, "hand_crack.png")

# ---- wet handprint on glass (palm pads + finger pads, smeared, with runs)
hp = hand_shape(512, spread=1.3)
pads = Image.new("L", (512, 512), 0); d = ImageDraw.Draw(pads)
pads.paste(hp, (0, 0))
noise = Image.effect_noise((512, 512), 90).filter(ImageFilter.GaussianBlur(2))
hp2 = ImageChops.multiply(hp.filter(ImageFilter.GaussianBlur(3)), noise.point(lambda v: min(255, v * 2)))
d = ImageDraw.Draw(hp2)
for _ in range(7):                                              # water running down from the print
    x = R.randint(170, 360); y = R.randint(330, 420)
    capsule(d, (x, y), (x + R.randint(-4, 4), y + R.randint(50, 150)), R.uniform(3, 6), 200)
save(hp2.filter(ImageFilter.GaussianBlur(1.2)), "handprint.png")

# ---- wet footprint (left foot), toes up
fp = Image.new("L", (256, 512), 0); d = ImageDraw.Draw(fp)
d.ellipse((70, 120, 190, 300), fill=255)          # ball
d.ellipse((85, 330, 175, 470), fill=255)          # heel
d.polygon([(100, 260), (150, 260), (140, 360), (110, 360)], fill=170)   # arch (lighter contact)
for i, (x, y, r) in enumerate(((92, 82, 24), (134, 64, 14), (162, 72, 12), (184, 88, 11), (202, 110, 10))):
    d.ellipse((x - r, y - r, x + r, y + r), fill=255)
fp = ImageChops.multiply(fp.filter(ImageFilter.GaussianBlur(4)), Image.effect_noise((256, 512), 60).filter(ImageFilter.GaussianBlur(3)).point(lambda v: min(255, 80 + v * 1.4)))
save(fp, "footprint.png")

# ---- glass crack
gc = Image.new("L", (1024, 1024), 0); d = ImageDraw.Draw(gc)
cx, cy = 560, 470
for k in range(17):
    a = 2 * math.pi * k / 17 + R.uniform(-0.15, 0.15); x, y = cx, cy
    for s in range(14):
        a += R.uniform(-0.2, 0.2); l = R.uniform(30, 70)
        nx, ny = x + math.cos(a) * l, y + math.sin(a) * l
        d.line((x, y, nx, ny), fill=255, width=2 if s < 4 else 1)
        x, y = nx, ny
for rad in (60, 120, 200):                         # concentric rings
    prev = None
    for k in range(0, 361, 12):
        a = math.radians(k); rr = rad * R.uniform(0.85, 1.15)
        p = (cx + math.cos(a) * rr, cy + math.sin(a) * rr)
        if prev and R.random() < 0.8:
            d.line((*prev, *p), fill=200, width=1)
        prev = p
d.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), fill=255)
save(gc, "glass_crack.png")

# ---- mirror message, finger-wiped through fog (white = cleared glass)
W, H = 2048, 1024
mm = Image.new("L", (W, H), 0); d = ImageDraw.Draw(mm)
f = ImageFont.truetype(FONT, 190)
lines = ["YOU LEFT", "THE DOOR OPEN."]
y = 210
for ln in lines:
    x = 150
    for ch in ln:
        if ch != " ":
            g = Image.new("L", (260, 260), 0); gd = ImageDraw.Draw(g)
            gd.text((30, 10), ch, font=f, fill=255)
            g = g.rotate(R.uniform(-6, 6), resample=Image.BICUBIC)
            mm.paste(255, (int(x), int(y + R.uniform(-14, 14))), g)
        x += f.getlength(ch) * 1.05
    y += 330
# fingertip strokes are soft-edged; condensation runs drip from the bottom of some strokes
mm = mm.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(4))
d = ImageDraw.Draw(mm)
for _ in range(9):
    x = R.randint(180, 1900); y0 = R.choice((410, 740))
    capsule(d, (x, y0), (x + R.randint(-3, 3), y0 + R.randint(60, 220)), R.uniform(4, 8), 230)
save(mm, "mirror_msg.png")

# ---- logbook page (lined paper, the guard's block capitals in blue ballpoint)
lp = Image.new("RGB", (1400, 1000), (226, 224, 212)); d = ImageDraw.Draw(lp)
for k in range(24):
    d.line((0, 120 + k * 36, 1400, 120 + k * 36), fill=(160, 175, 200), width=2)
d.line((150, 0, 150, 1000), fill=(200, 110, 110), width=3)
pen = ImageFont.truetype("/usr/share/fonts/truetype/crosextra/Carlito-Italic.ttf", 34) if os.path.exists("/usr/share/fonts/truetype/crosextra/Carlito-Italic.ttf") else ImageFont.truetype(FONT, 30)
entries = ["NIGHT LOG — POOL BUILDING", "", "02:00  ROUNDS COMPLETE. ALL DOORS LOCKED.", "03:07  MOTION ALARM — CAM 4 (DEEP END).",
           "       WOMAN STANDING ON THE BOTTOM. NOT SWIMMING.", "       LOOKED UP AT THE CAMERA.", "03:09  POOL CHECKED. NOBODY IN THE WATER.",
           "       KNOCKING FROM UNDER THE WATER. 3 KNOCKS.", "       A HAND UNDER THE FLOOR TILES???", "03:12  CAM 1 (OFFICE) SHOWS HER BEHIND ME.",
           "       NOBODY HERE. WATER ON MY SHOULDER.", "", "       PLEASE CHECK THE CAMERAS."]
for i, t in enumerate(entries):
    x = 170
    for ch in t:
        d.text((x + R.uniform(-1, 1), 92 + i * 36 * 1.0 + R.uniform(-2, 2)), ch, font=pen, fill=(28, 40, 110))
        x += pen.getlength(ch) * R.uniform(0.98, 1.06)
lp = lp.filter(ImageFilter.GaussianBlur(0.6))
save(lp, "logbook_page.png")
