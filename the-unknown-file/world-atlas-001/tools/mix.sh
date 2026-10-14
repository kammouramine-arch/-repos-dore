#!/usr/bin/env bash
# Narration master + SFX stem + original score → final mix (stereo 48 kHz, ≈ −14 LUFS, −1 dBTP).
# The narration is only gain-adjusted and peak-limited (timing and words untouched).
# Usage: tools/mix.sh <name> <narration_src> <duration_s> <narration_gain_db> [music_lufs]
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1; SRC=$2; DUR=$3; GAIN=$4; MUSIC_LUFS=${5:--27}
M=audio/master
ffmpeg -v error -y -i "$SRC" -af "aresample=48000:resampler=soxr,volume=${GAIN}dB,alimiter=limit=0.80:attack=2:release=60:level=false" -c:a pcm_s24le $M/${NAME}_narration.wav
python3 tools/sfx.py "$NAME"
[[ -s $M/${NAME}_music.wav ]] || python3 tools/music.py "$NAME"
# music: normalise to a quiet bed, then duck under the voice (sidechain)
ffmpeg -v error -y -i $M/${NAME}_music.wav -af "loudnorm=I=${MUSIC_LUFS}:TP=-6:LRA=11:linear=true" -ar 48000 -c:a pcm_s24le $M/${NAME}_music_norm.wav
ffmpeg -v error -y -i $M/${NAME}_music_norm.wav -i $M/${NAME}_narration.wav -filter_complex \
  "[1:a]pan=stereo|c0=c0|c1=c0,apad=whole_dur=${DUR}[sc];[0:a][sc]sidechaincompress=threshold=0.06:ratio=3:attack=40:release=900:makeup=1[m]" \
  -map "[m]" -t ${DUR} -c:a pcm_s24le $M/${NAME}_music_ducked.wav
ffmpeg -v error -y -i $M/${NAME}_narration.wav -i $M/${NAME}_sfx_ducked.wav -i $M/${NAME}_music_ducked.wav -filter_complex \
  "[0:a]pan=stereo|c0=c0|c1=c0,apad=whole_dur=${DUR}[v];[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,volume=3dB[s];[2:a]aformat=sample_fmts=fltp:channel_layouts=stereo[m];[v][s][m]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.85:attack=2:release=80:level=false,atrim=0:${DUR}" \
  -c:a pcm_s24le $M/${NAME}_mix.wav
for f in ${NAME}_narration ${NAME}_music_ducked ${NAME}_mix; do echo -n "$f: "; ffmpeg -nostats -i $M/$f.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2 | tr -s ' ' | tr '\n' ' '; echo; done
