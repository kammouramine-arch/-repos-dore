"""The thermal-paper delivery receipt found outside the door on the last morning (N3)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random, sys
W, H = 600, 1300
im = Image.new("RGB", (W, H), (236, 233, 224)); d = ImageDraw.Draw(im)
mono = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"; bold = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
f = lambda s, b=False: ImageFont.truetype(bold if b else mono, s)
y = 60
def line(t, s=34, b=False, c=(40, 40, 42), center=True):
    global y
    fo = f(s, b); w = d.textlength(t, font=fo)
    d.text(((W - w) / 2 if center else 50, y), t, font=fo, fill=c); y += int(s * 1.45)
line("DELIVERY RECEIPT", 40, True); line("- - - - - - - - - - - - - -", 30)
line("ORDER #4471", 36, True); line("03:13 AM", 34)
line("- - - - - - - - - - - - - -", 30)
line("1x DOUBLE SMASH BURGER", 30, center=False); line("1x FRIES", 30, center=False); line("1x COLA", 30, center=False)
line("- - - - - - - - - - - - - -", 30)
line("DELIVER TO:", 32, True)
y += 10; line("APARTMENT", 64, True); line("6B", 150, True); y += 10
line("6TH FLOOR", 32)
line("- - - - - - - - - - - - - -", 30)
line("STATUS: DELIVERED", 32, True)
line("CONFIRMED BY: 6B", 30)
r = random.Random(4)
for _ in range(2500):   # thermal print speckle + fold shadow
    x, yy = r.randrange(W), r.randrange(H); im.putpixel((x, yy), (210, 206, 196))
im = im.filter(ImageFilter.GaussianBlur(0.6))
d = ImageDraw.Draw(im)
for k in range(40):
    d.line([(0, 1040 + k), (W, 1040 + k)], fill=(236 - k // 2, 233 - k // 2, 224 - k // 2))
im.save(sys.argv[1])
