#!/usr/bin/env bash
# Narration master + SFX stem → final mix (stereo, 48 kHz). Narration stays untouched in timing and wording;
# only gain + a transparent peak limiter are applied. Usage: tools/mix.sh <name> <narration_src> <duration_s> <narration_gain_db>
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1; SRC=$2; DUR=$3; GAIN=$4
M=audio/master
ffmpeg -v error -y -i "$SRC" -af "aresample=48000:resampler=soxr,volume=${GAIN}dB,alimiter=limit=0.80:attack=2:release=60:level=false" -c:a pcm_s24le $M/${NAME}_narration.wav
python3 tools/sfx.py "$NAME"
ffmpeg -v error -y -i $M/${NAME}_narration.wav -i $M/${NAME}_sfx_ducked.wav -filter_complex \
  "[0:a]pan=stereo|c0=c0|c1=c0,apad=whole_dur=${DUR}[v];[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,volume=3dB[s];[v][s]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.85:attack=2:release=80:level=false,atrim=0:${DUR}" \
  -c:a pcm_s24le $M/${NAME}_mix.wav
for f in ${NAME}_narration ${NAME}_mix; do echo -n "$f: "; ffmpeg -nostats -i $M/$f.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2 | tr -s ' ' | tr '\n' ' '; echo; done
