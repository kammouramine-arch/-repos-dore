"""GYMREIGN alphabet. One weight, one diagonal angle, one datum band.
Every glyph is an explicit outline — nothing is typed, nothing is a stroke that
runs past its join."""
CAP=100.0; W=20.0; K=0.52            # stem weight; diagonal run per unit rise
D0,D1 = 42.0, 62.0                   # the datum band — every crossbar sits in it
RAD=30.0                             # flat-side corner radius
TH = W/ (1/(1+K*K)**.5)              # horizontal thickness of a diagonal of weight W

def _r(x0,y0,x1,y1): return f'<rect x="{x0:g}" y="{y0:g}" width="{x1-x0:g}" height="{y1-y0:g}"/>'
def _p(*pts): return '<path d="M'+' L'.join(f'{x:g} {y:g}' for x,y in pts)+' Z"/>'

def G(width=96):
    h=W/2; x0,x1,y0,y1=h,width-h,h,CAP-h
    sx=x0+(x1-x0)*0.64
    d=(f'M{sx:g} {y0:g} H{x0+RAD:g} A{RAD} {RAD} 0 0 0 {x0:g} {y0+RAD:g} '
       f'V{y1-RAD:g} A{RAD} {RAD} 0 0 0 {x0+RAD:g} {y1:g} H{x1-RAD:g} '
       f'A{RAD} {RAD} 0 0 0 {x1:g} {y1-RAD:g} V{D1:g}')
    return (f'<path d="{d}" fill="none" stroke-width="{W:g}"/>'+_r(width*0.46,D0,width,D1), width)

def Y(width=88):
    cx=width/2; j=D1+2                      # stem springs from the datum band
    xo=cx-K*j; xi=cx-TH/2                   # outer / inner arm tops
    ym=(cx-(xi))/K                          # where the inner edges meet
    return (_p((xo-TH,0),(xi,0),(cx,ym),(width-xi,0),(width-xo+TH,0),
               (cx+W/2,j),(cx+W/2,CAP),(cx-W/2,CAP),(cx-W/2,j)), width)

def M(width=112):
    """The V is truncated flat at the datum — the M literally stops at the line."""
    xo=W; xi=xo+TH
    fl=D1                                    # flat cut, on the datum
    ax0=xo+K*fl; ax1=width-xo-K*fl           # outer apex flat, left and right
    yt=(width/2-xi)/K                        # inner apex, where the inner edges meet
    return (_r(0,0,W,CAP)+_r(width-W,0,width,CAP)
            +_p((xo,0),(ax0,fl),(ax1,fl),(width-xo,0),(width-xi,0),
                (width/2,yt),(xi,0)), width)

def R(width=106):
    """Bowl closes on the datum; the leg springs off the bar at full weight."""
    bx=82.0; run=K*(CAP-D0)
    return (_r(0,0,W,CAP)+_r(0,0,bx,W)+_r(bx-W,0,bx,D0)+_r(0,D0,bx,D1)
            +_p((bx,D0),(bx+run,CAP),(bx+run-TH,CAP),(bx-TH,D0)), bx+run)

def E(width=78):
    return (_r(0,0,W,CAP)+_r(0,0,width,W)+_r(0,D0,width*0.82,D1)+_r(0,CAP-W,width,CAP), width)

def I(width=20):
    return (_r(0,0,W,CAP), width)

def N(width=92):
    return (_r(0,0,W,CAP)+_r(width-W,0,width,CAP)
            +_p((0,0),(W,0),(width-W,CAP),(width-2*W,CAP)), width)

LETTERS={'G':G,'Y':Y,'M':M,'R':R,'E':E,'I':I,'N':N}
# advances measured optically so every ink gap is equal (see space.py)
ADV={'GY': 97.5, 'YM': 106.8, 'MR': 130.8, 'RE': 131.0, 'EI': 96.8, 'IG': 38.8, 'GN': 114.8}

def word(text, uid='w', adv=None):
    adv = adv or ADV
    parts=[]; x=0.0; last=0.0
    for i,ch in enumerate(text):
        inner,w = LETTERS[ch]()
        parts.append(f'<g transform="translate({x:g} 0)">'
                     f'<clipPath id="{uid}{i}"><rect x="-1" y="0" width="{w+2:g}" height="{CAP:g}"/></clipPath>'
                     f'<g clip-path="url(#{uid}{i})">{inner}</g></g>')
        last = w
        if i+1<len(text): x += adv.get(ch+text[i+1], w+19)
    return ''.join(parts), x+last
