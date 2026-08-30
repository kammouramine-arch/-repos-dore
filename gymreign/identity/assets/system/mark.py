"""The GYMREIGN symbol: G and R interlocked on one datum. Own optical cut."""
CAP=100.0
def build(w=22.0, K=0.52, rad=30.0, apert=0.72, ov=None, gw=96.0, bx=82.0,
          dband=None, uid='m'):
    d0,d1 = dband or (50.0-w/2, 50.0+w/2)
    th = w*(1+K*K)**.5
    ov = w if ov is None else ov
    h=w/2; x0,x1,y0,y1 = h, gw-h, h, CAP-h
    sx = x0+(x1-x0)*apert
    ring=(f'M{sx:g} {y0:g} H{x0+rad:g} A{rad} {rad} 0 0 0 {x0:g} {y0+rad:g} '
          f'V{y1-rad:g} A{rad} {rad} 0 0 0 {x0+rad:g} {y1:g} H{x1-rad:g} '
          f'A{rad} {rad} 0 0 0 {x1:g} {y1-rad:g} V{d1:g}')
    G=(f'<path d="{ring}" fill="none" stroke-width="{w:g}"/>'
       f'<rect x="{gw*0.46:g}" y="{d0:g}" width="{gw*0.54:g}" height="{d1-d0:g}"/>')
    run=K*(CAP-d0)
    R=(f'<rect x="0" y="0" width="{w:g}" height="{CAP:g}"/>'
       f'<rect x="0" y="0" width="{bx:g}" height="{w:g}"/>'
       f'<rect x="{bx-w:g}" y="0" width="{w:g}" height="{d0:g}"/>'
       f'<rect x="0" y="{d0:g}" width="{bx:g}" height="{d1-d0:g}"/>'
       f'<path d="M{bx:g} {d0:g} L{bx+run:g} {CAP:g} L{bx+run-th:g} {CAP:g} L{bx-th:g} {d0:g} Z"/>')
    x = gw-ov
    inner=(f'<clipPath id="{uid}g"><rect x="-1" y="0" width="{gw+2:g}" height="{CAP:g}"/></clipPath>'
           f'<g clip-path="url(#{uid}g)">{G}</g>'
           f'<g transform="translate({x:g} 0)">'
           f'<clipPath id="{uid}r"><rect x="-1" y="0" width="{bx+run+2:g}" height="{CAP:g}"/></clipPath>'
           f'<g clip-path="url(#{uid}r)">{R}</g></g>')
    return inner, x+bx+run
