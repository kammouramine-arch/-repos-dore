#!/usr/bin/env bash
# QC contact sheet: tools/sheet.sh <Comp> <t0> <dt> <n> <cols> <name> [scale] [crop WxH+X+Y]
set -e
cd "$(dirname "$0")/../studio"
COMP=$1; T0=$2; DT=$3; N=$4; COLS=$5; NAME=$6; SC=${7:-0.5}; CROP=${8:-}
OUT=/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/sb/qc_$NAME
rm -rf "/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/sb/qc_$NAME"; mkdir -p "$OUT"
SECS=$(python3 -c "print(','.join(str(round($T0+i*$DT,4)) for i in range($N)))")
node stills.mjs "$COMP" "$OUT" "$SECS" "$SC" > /dev/null 2>&1
python3 - "$OUT" "$COLS" "$NAME" "$CROP" <<'PY'
import sys,glob
from PIL import Image, ImageDraw
out,cols,name,crop=sys.argv[1],int(sys.argv[2]),sys.argv[3],sys.argv[4]
fs=sorted(glob.glob(out+'/*.jpg'), key=lambda f: float(f.rsplit('_',1)[1][:-4]))
ims=[]
for f in fs:
    im=Image.open(f)
    if crop:
        wh,x,y=crop.split('+'); w,h=map(int,wh.split('x')); im=im.crop((int(x),int(y),int(x)+w,int(y)+h))
    d=ImageDraw.Draw(im); d.text((6,6),f.rsplit('_',1)[1][:-4],fill=(200,0,0))
    ims.append(im)
w,h=ims[0].size; rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),'white')
for i,im in enumerate(ims): S.paste(im,((i%cols)*w,(i//cols)*h))
S.save(f'/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/sb/S_{name}.jpg',quality=88)
print(f'/tmp/claude-0/-home-user--repos-dore/6b76b049-7736-58b3-b2c8-4d7d90c68fc3/scratchpad/sb/S_{name}.jpg', S.size)
PY
