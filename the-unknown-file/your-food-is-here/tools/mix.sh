#!/usr/bin/env bash
# YOUR FOOD IS HERE: narration + SFX → final mix (stereo 48 kHz, −14 LUFS integrated, ≤ −1 dBTP). No music.
# The narration is only gain-adjusted and peak-limited (words untouched; N3's "Night three," was removed in tools/edit_narration.sh).
# Usage: tools/mix.sh <name> <narration_src> <duration_s> <narration_gain_db>
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1; SRC=$2; DUR=$3; GAIN=$4
M=audio/master; mkdir -p $M audio/stems
ffmpeg -v error -y -i "$SRC" -af "aresample=48000:resampler=soxr,volume=${GAIN}dB,alimiter=limit=0.80:attack=2:release=60:level=false" -c:a pcm_s24le $M/${NAME}_narration.wav
python3 tools/sfx.py "$NAME"
ffmpeg -v error -y -i $M/${NAME}_narration.wav -i $M/${NAME}_sfx_ducked.wav -filter_complex \
  "[0:a]pan=stereo|c0=c0|c1=c0,apad=whole_dur=${DUR}[v];[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,volume=7dB[s];[v][s]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.85:attack=2:release=80:level=false,atrim=0:${DUR}" \
  -c:a pcm_s24le $M/${NAME}_premix.wav
I=$(ffmpeg -nostats -i $M/${NAME}_premix.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14.0 - float('$I'), 2))")
ffmpeg -v error -y -i $M/${NAME}_premix.wav -af "volume=${G}dB,aresample=192000,alimiter=limit=0.84:attack=1:release=60:level=false,aresample=48000" -c:a pcm_s24le $M/${NAME}_mix.wav
ffmpeg -v error -y -i $M/${NAME}_mix.wav -af "aresample=192000,alimiter=limit=0.70:attack=1:release=60:level=false,aresample=48000" -c:a pcm_s24le $M/${NAME}_mix_aac.wav
cp $M/${NAME}_narration.wav audio/stems/${NAME}_narration.wav
for f in ${NAME}_narration ${NAME}_sfx_ducked ${NAME}_mix; do echo -n "$f: "; ffmpeg -nostats -i $M/$f.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2 | tr -s ' ' | tr '\n' ' '; echo; done
