"""Guard uniform: MPFB male_casualsuit03 (CC0) atlas -> slate-blue uniform shirt + dark navy trousers (stripes and logo removed).
Woman's dress: MPFB female_elegantsuit01 (CC0) atlas -> off-white, worn, water-stained."""
import sys, numpy as np
from PIL import Image, ImageFilter
D = "/root/.config/blender/4.2/extensions/.user/user_default/mpfb/data/clothes/"


def detail(L, med=11, blur=20, k=0.05):
    Lm = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(med))).astype(np.float32) / 255
    bl = np.asarray(Image.fromarray((Lm * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255
    return np.clip(Lm - bl, -k, k)


def uniform(out):
    a = np.asarray(Image.open(D + "male_casualsuit03/male_casualsuit03_diffuse.png").convert("RGB")).astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = a.mean(2)
    denim = (b > r * 1.08) & (b > 0.18)
    det = detail(L)
    rng = np.random.default_rng(2)
    n = rng.normal(0, 0.01, L.shape).astype(np.float32)
    shirt = np.array([0.30, 0.37, 0.44], np.float32)[None, None] * (1 + n * 2)[..., None]   # flat cloth (stripes removed); folds come from the normal map
    trous = np.array([0.07, 0.08, 0.12], np.float32)[None, None] * (1 + 4 * det + n)[..., None]
    o = np.where(denim[..., None], trous, shirt)
    Image.fromarray((np.clip(o, 0, 1) * 255).astype(np.uint8)).save(out)


def dress(out):
    a = np.asarray(Image.open(D + "female_elegantsuit01/female_elegantsuit01_diffuse.png").convert("RGB")).astype(np.float32) / 255
    L = a.mean(2)
    det = detail(L, 13, 24, 0.04)
    H, W = L.shape
    yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
    # water stains: low-frequency blotches, darker toward the hems
    rng = np.random.default_rng(7)
    st = np.asarray(Image.fromarray((rng.random((64, 64)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))).astype(np.float32) / 255
    stain = np.clip((st - 0.5) * 2.2, 0, 1) * 0.22
    base = np.array([0.86, 0.86, 0.84], np.float32)
    o = base[None, None] * (1 - stain + rng.normal(0, 0.012, L.shape).astype(np.float32))[..., None]
    o = o * np.array([1.0, 0.99, 0.95])[None, None]
    Image.fromarray((np.clip(o, 0, 1) * 255).astype(np.uint8)).save(out)


uniform("assets/textures/guard_uniform_diffuse.png")
dress("assets/textures/woman_dress_diffuse.png")
