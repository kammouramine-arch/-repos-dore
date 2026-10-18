import re,collections,sys
name,fps=sys.argv[1],float(sys.argv[2])
L=open(f'/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/sb/qc_{name}.txt').read().splitlines()
agg=collections.defaultdict(lambda:[1e9,0,0.0])
for l in L:
    m=re.search(r'F(\d+)\|(\w+)\|(.*)',l)
    if not m: continue
    f=int(m.group(1)); who=m.group(2)
    for part in m.group(3).split(', '):
        mm=re.match(r'(\w+) overreach ([0-9.]+)',part)
        if not mm: continue
        a=agg[((who,mm.group(1)), int(f//(2*fps)))]
        a[0]=min(a[0],f); a[1]=max(a[1],f); a[2]=max(a[2],float(mm.group(2)))
for (k,b),(f0,f1,mx) in sorted(agg.items(), key=lambda x:x[1][0]):
    print(f"{f0/fps:7.2f}-{f1/fps:7.2f}s {k[0]:9} {k[1]:5} max {mx:.0f}")
