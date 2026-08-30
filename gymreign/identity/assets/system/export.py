import sys; sys.path.insert(0,'.')
from mark import build
from alpha import word, CAP

SYM, SW = build(w=22, gw=92, uid='s')
WM,  WW = word('GYMREIGN', uid='w')

def doc(inner, W, H, title, extra=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} {H:.2f}" '
            f'width="{W:.2f}" height="{H:.2f}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n'
            f'  <g fill="currentColor" stroke="currentColor" fill-rule="evenodd" '
            f'stroke-linecap="butt" stroke-linejoin="miter">{extra}{inner}</g>\n</svg>\n')

def horizontal(wcap=56.0, gap=38.0):
    s = SW/1.0; ws = WW*wcap/CAP
    off = (100-wcap)/2
    inner = (f'<g>{SYM}</g><g transform="translate({SW+gap:.2f} {off:.2f}) scale({wcap/CAP:.4f})">{WM}</g>')
    return inner, SW+gap+ws, 100.0

def stacked(wwidth_ratio=1.34, gap=26.0):
    ws = SW*wwidth_ratio; sc = ws/WW; wh = CAP*sc
    dx = (ws-SW)/2
    inner = (f'<g transform="translate({dx:.2f} 0)">{SYM}</g>'
             f'<g transform="translate(0 {100+gap:.2f}) scale({sc:.4f})">{WM}</g>')
    return inner, ws, 100+gap+wh

def compact(wcap=30.0, gap=18.0):
    """symbol + name on one line, for woven labels and hem tabs"""
    ws = WW*wcap/CAP; off=(100-wcap)/2
    inner = (f'<g>{SYM}</g><g transform="translate({SW+gap:.2f} {off:.2f}) scale({wcap/CAP:.4f})">{WM}</g>')
    return inner, SW+gap+ws, 100.0
