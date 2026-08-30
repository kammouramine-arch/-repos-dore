"""Optical spacing by measurement: set every advance so the tightest ink gap is equal."""
import sys; sys.path.insert(0,'.')
from lab import raster
from alpha import LETTERS, CAP

def profile(ch, s=6):
    inner,w = LETTERS[ch]()
    im = raster(inner, w, CAP, round(w*s))
    a = im.split()[-1].point(lambda v:1 if v>128 else 0)
    W_,H_ = a.size; d=list(a.getdata()); L=[];Rt=[]
    for y in range(H_):
        row=d[y*W_:(y+1)*W_]
        if 1 in row: L.append(row.index(1)); Rt.append(W_-1-row[::-1].index(1))
        else: L.append(None); Rt.append(None)
    return w, W_, L, Rt

def gap_advance(a, b, target=19.0, s=6):
    wa, Wa, La, Ra = profile(a,s)
    wb, Wb, Lb, Rb = profile(b,s)
    best=None
    for y in range(len(Ra)):
        if Ra[y] is None or Lb[y] is None: continue
        g = (Lb[y] - (Ra[y]-Wa))/s            # gap if advance == wa
        best = g if best is None else min(best,g)
    if best is None: best=0.0
    return wa + (target - best)
