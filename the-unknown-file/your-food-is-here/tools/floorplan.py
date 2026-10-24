"""Draws docs/FLOOR_PLAN.png from the same coordinates blender/apartment.py uses (1 m = 110 px)."""
from PIL import Image, ImageDraw, ImageFont
S, OX, OY = 110, 760, 1180          # scale, origin (x=0, y=0) in pixels; +y (north) is up
W, H = 2200, 1700
im = Image.new("RGB", (W, H), (246, 244, 239)); d = ImageDraw.Draw(im)
F = lambda s, b=False: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if b else ""), s)
P = lambda x, y: (OX + x * S, OY - y * S)
def rect(x0, y0, x1, y1, fill=None, outline=(30, 30, 30), w=3):
    a, b = P(x0, y1), P(x1, y0); d.rectangle([a, b], fill=fill, outline=outline, width=w)
def label(x, y, t, s=30, b=True, c=(20, 20, 20)):
    f = F(s, b); w = d.textlength(t, font=f); px, py = P(x, y); d.text((px - w / 2, py - s / 2), t, font=f, fill=c)
# rooms
rect(0, 0, 1.4, 4.2, (232, 228, 218)); label(0.7, 2.0, "HALL", 26)
rect(1.4, 0, 3.6, 4.2, (220, 230, 236)); label(2.5, 1.2, "BATH", 26)
rect(3.6, 0, 7.4, 4.2, (226, 232, 222)); label(5.5, 2.9, "BEDROOM", 28)
rect(0, 4.2, 3.0, 8.6, (238, 230, 214)); label(1.5, 7.3, "KITCHEN", 28)
rect(3.0, 4.2, 7.4, 8.6, (236, 226, 226), outline=(236, 226, 226)); label(5.6, 7.8, "LIVING ROOM", 28)
d.line([P(3.0, 4.2), P(3.0, 8.6)], fill=(180, 170, 170), width=2)
rect(-6, -2.0, 12, -0.25, (214, 220, 210)); label(-3.0, -1.12, "CORRIDOR — 6th floor", 26)
# exterior walls
rect(0, 0, 7.4, 8.6, None, (20, 20, 20), 8)
# doors (gaps + swing arcs)
def gap(x0, y0, x1, y1): d.line([P(x0, y0), P(x1, y1)], fill=(246, 244, 239), width=12)
gap(0.25, 0, 1.15, 0); d.arc([P(0.25 - 0.9, 0.9), P(0.25 + 0.9, -0.9)], 270, 360, fill=(180, 40, 30), width=3); label(0.7, -0.45, "6A (ours)", 22, c=(180, 40, 30))
gap(1.4, 2.9, 1.4, 3.7); gap(4.2, 4.2, 5.0, 4.2); gap(0, 4.2, 1.4, 4.2)
label(4.6, 4.45, "door", 18, False)
# furniture
rect(4.0, 0.0, 5.2, 0.62, (150, 120, 90)); label(4.6, 0.31, "WARDROBE / CLOSET", 16, c=(255, 255, 255))
rect(5.55, 0.05, 7.15, 2.15, (190, 200, 215)); label(6.35, 1.1, "bed", 20, False)
rect(3.82, 5.5, 4.64, 7.3, (110, 80, 70)); label(4.23, 6.4, "SOFA", 18, c=(255, 255, 255))
d.ellipse([P(5.15, 7.05), P(6.45, 5.75)], fill=(200, 170, 130)); label(5.8, 6.4, "coffee table", 16, False)
rect(7.0, 5.6, 7.4, 7.2, (80, 80, 80)); label(7.2, 6.4, "TV", 16, c=(255, 255, 255))
rect(1.45, 5.85, 2.45, 6.75, (180, 140, 100)); label(1.95, 6.3, "table", 18, False)
rect(0, 5.4, 0.62, 8.6, (170, 150, 120)); rect(0.6, 7.96, 2.62, 8.6, (170, 150, 120)); label(1.6, 8.3, "counters / sink", 16, False)
rect(2.64, 7.92, 3.34, 8.6, (230, 230, 232)); label(2.99, 8.26, "fridge", 14, False)
rect(1.48, 0.05, 3.5, 0.8, (255, 255, 255)); label(2.5, 0.42, "bathtub", 16, False)
d.ellipse([P(4.08, 7.97), P(4.52, 7.53)], fill=(240, 200, 120)); label(4.3, 8.25, "floor lamp", 14, False)
# windows
for (x0, x1) in ((1.0, 2.2), (3.8, 5.2), (5.8, 7.0)):
    d.line([P(x0, 8.6), P(x1, 8.6)], fill=(90, 150, 220), width=10)
d.line([P(7.4, 2.4), P(7.4, 3.6)], fill=(90, 150, 220), width=10)
# wall clock + doorbell camera
d.ellipse([P(3.15, 4.38), P(3.35, 4.18)], fill=(20, 20, 20)); label(3.25, 4.6, "wall clock", 14, False)
d.rectangle([P(1.31, -0.25), P(1.39, -0.32)], fill=(40, 120, 255)); label(1.95, -0.48, "doorbell cam", 16, c=(40, 90, 200))
# neighbour doors
for x0, nm, yy in ((8.2, "6B", -0.25), (3.0, "6C", -2.0), (-3.5, "6D", -2.0)):
    d.line([P(x0, yy), P(x0 + 0.9, yy)], fill=(180, 40, 30), width=10); label(x0 + 0.45, yy + (0.3 if yy > -1 else -0.3), nm, 22, c=(180, 40, 30))
# key positions
def dot(x, y, t, c):
    px, py = P(x, y); d.ellipse([px - 9, py - 9, px + 9, py + 9], fill=c); d.text((px + 12, py - 10), t, font=F(16), fill=c)
dot(4.36, 5.98, "him: sofa (N1/N2)", (30, 100, 30)); dot(0.95, 4.95, "him: hall mouth (N1 feed)", (30, 100, 30))
dot(3.4, 6.2, "him: end of N1", (30, 100, 30)); dot(1.95, 5.42, "him: table (N3)", (30, 100, 30))
dot(0.62, -1.05, "courier at the door (feed)", (200, 140, 0)); dot(4.6, 0.34, "courier in closet (N2 photo)", (200, 140, 0))
# grid + scale
for i in range(0, 8):
    px, py = P(i, -2.3); d.text((px - 4, py), f"{i}", font=F(14), fill=(120, 120, 120))
label(3.7, 9.2, "APARTMENT 6A — one floor plan for all three nights (metres; north up)", 30)
im.save("docs/FLOOR_PLAN.png")
