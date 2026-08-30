"""GYMREIGN identity lab: render, scale-test, embroidery-simulate, critique."""
import cairosvg, io, math
from PIL import Image, ImageFilter, ImageDraw

BLACK=(14,15,17); BONE=(233,228,218)

def svg(inner, W, H, fill="#fff"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}" '
            f'width="{W:g}" height="{H:g}"><g fill="{fill}" stroke="{fill}" fill-rule="evenodd" stroke-linecap="butt" stroke-linejoin="miter">{inner}</g></svg>')

def raster(inner, W, H, px, fill="#fff"):
    s=svg(inner,W,H,fill)
    out=cairosvg.svg2png(bytestring=s.encode(), output_width=px,
                         output_height=max(1,round(px*H/W)), background_color=None)
    return Image.open(io.BytesIO(out)).convert('RGBA')

def on(bg, im, box=None, pad=0.16):
    """composite mark centred on a solid ground tile"""
    w,h=im.size
    tw,th=round(w*(1+pad*2)), round(h*(1+pad*2))
    t=Image.new('RGB',(tw,th),bg); t.paste(im,((tw-w)//2,(th-h)//2),im); return t

def embroider(inner, W, H, mark_mm, min_sat_mm=1.2, fill="#fff"):
    """Simulate stitch fidelity: render at a resolution where 1px ~ min satin width,
       blur and threshold. Detail finer than the needle can hold disappears."""
    px = max(8, round(mark_mm/min_sat_mm))          # 1 px == min satin width
    small = raster(inner, W, H, px, fill)
    a = small.split()[-1].filter(ImageFilter.GaussianBlur(0.6))
    a = a.point(lambda v: 255 if v>120 else 0)
    big = a.resize((px*14, max(1,round(px*H/W))*14), Image.NEAREST)
    out = Image.new('RGBA', big.size, (255,255,255,0)); out.putalpha(big)
    return out

def ink(inner, W, H, px=900, fill="#fff"):
    im=raster(inner,W,H,px,fill); a=im.split()[-1]
    return sum(a.point(lambda v:1 if v>128 else 0).getdata())/(a.size[0]*a.size[1])

def min_feature(inner, W, H, px=900, fill="#fff"):
    """Narrowest ink run, as a fraction of mark width — the embroidery limit."""
    im=raster(inner,W,H,px,fill); a=im.split()[-1].point(lambda v:1 if v>128 else 0)
    w,h=a.size; d=list(a.getdata()); best=10**9
    for y in range(0,h,3):
        run=0
        for x in range(w):
            if d[y*w+x]: run+=1
            else:
                if run: best=min(best,run); run=0
        if run: best=min(best,run)
    for x in range(0,w,3):
        run=0
        for y in range(h):
            if d[y*w+x]: run+=1
            else:
                if run: best=min(best,run); run=0
        if run: best=min(best,run)
    return best/px

def sheet(cands, path, sizes=(190,44,24,14), label_h=26):
    """cands: list of (name, inner, W, H)"""
    cols=[]
    for name, inner, W, H in cands:
        tiles=[]
        for s in sizes:
            im=raster(inner,W,H,s)
            tiles.append(on(BLACK,im,pad=0.30))
        inv=raster(inner,W,H,sizes[1],fill="#0E0F11")
        tiles.append(on(BONE,inv,pad=0.30))
        tiles.append(on(BLACK, embroider(inner,W,H,45), pad=0.20))
        cw=max(t.size[0] for t in tiles); ch=sum(t.size[1] for t in tiles)+8*len(tiles)
        col=Image.new('RGB',(cw,ch+label_h),(255,255,255))
        d=ImageDraw.Draw(col); d.text((2,6),name,fill=(0,0,0))
        y=label_h
        for t in tiles: col.paste(t,((cw-t.size[0])//2,y)); y+=t.size[1]+8
        cols.append(col)
    Wt=sum(c.size[0]+14 for c in cols); Ht=max(c.size[1] for c in cols)
    out=Image.new('RGB',(Wt,Ht),(255,255,255)); x=0
    for c in cols: out.paste(c,(x,0)); x+=c.size[0]+14
    out.save(path); return out.size
