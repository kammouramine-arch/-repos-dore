"""Alpha cut-outs for compositing (sky replacement / object isolation).

  sky  <src> <out.png> [thr]   : remove sky (pixels connected to the top edge that look like sky) -> foreground with alpha
  obj  <src> <out.png> [model] : isolate the main object (rembg; default isnet-general-use)
  poly <src> <out.png> x,y x,y ... : make the polygon region transparent (e.g. a windscreen)
Outputs are resized so the long edge is <= 3840 px (4K plates).
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage


def sky_mask(rgb, thr=0.42, allcomp=False, blueonly=False):
    a = rgb.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / (mx + 1e-6)
    blue = (b > r + 0.04) & (b >= g - 0.02) & (lum > thr * 0.8)
    cloud = (lum > max(thr + 0.18, 0.62)) & (sat < 0.28)
    # local texture: sky is smooth
    gx = ndimage.sobel(lum, 1); gy = ndimage.sobel(lum, 0)
    tex = ndimage.uniform_filter(np.hypot(gx, gy), 5)
    cand = ((blue if blueonly else (blue | cloud))) & (tex < 0.35)
    cand = ndimage.binary_opening(cand, iterations=1)
    lab, n = ndimage.label(cand)
    top = set(np.unique(lab[0, :])) - {0}
    if allcomp:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        top = {i + 1 for i, sz in enumerate(sizes) if sz > 40}
    sky = np.isin(lab, list(top))
    sky = ndimage.binary_closing(sky, iterations=1 if allcomp else 3)
    if not allcomp: sky = ndimage.binary_fill_holes(sky)
    return sky


def fit(im, maxe=3840):
    s = maxe / max(im.size)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS) if s < 1 else im


def main():
    mode, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
    im = Image.open(src).convert("RGB")
    if mode in ("sky", "skyall", "skyblue"):
        thr = float(sys.argv[4]) if len(sys.argv) > 4 else 0.42
        sky = sky_mask(np.asarray(im), thr, allcomp=mode != "sky", blueonly=mode == "skyblue")
        alpha = Image.fromarray(((~sky) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
        im.putalpha(alpha)
    elif mode == "obj":
        from rembg import new_session, remove
        model = sys.argv[4] if len(sys.argv) > 4 else "isnet-general-use"
        im = remove(im, session=new_session(model), alpha_matting=False)
    elif mode == "poly":
        pts = [tuple(float(v) for v in p.split(",")) for p in sys.argv[4:]]
        m = Image.new("L", im.size, 255)
        ImageDraw.Draw(m).polygon([(x * im.width, y * im.height) if x <= 1 and y <= 1 else (x, y) for x, y in pts], fill=0)
        im.putalpha(m.filter(ImageFilter.GaussianBlur(1.5)))
    if mode in ("sky", "skyall", "skyblue"):
        A = np.array(im); A[:4, :, 3] = A[4:5, :, 3]; A[:, :3, 3] = A[:, 3:4, 3]; A[:, -3:, 3] = A[:, -4:-3, 3]; im = Image.fromarray(A)
    fit(im).save(out)
    print(out, im.size)


if __name__ == "__main__":
    main()
