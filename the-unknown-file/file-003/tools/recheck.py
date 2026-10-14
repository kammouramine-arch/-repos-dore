"""Re-transcribe a short window to double-check words. Usage: python3 tools/recheck.py audio.mp3 start dur"""
import numpy as np, subprocess, sys
from faster_whisper import WhisperModel
f, s0, d = sys.argv[1], float(sys.argv[2]), sys.argv[3]
pcm = subprocess.run(['ffmpeg','-v','error','-ss',str(s0),'-t',d,'-i',f,'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
a = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
m = WhisperModel('medium.en', device='cpu', compute_type='int8', cpu_threads=4)
for x in m.transcribe(a, word_timestamps=True)[0]:
    print(' '.join(f"{w.word.strip()}[{w.start+s0:.2f}]" for w in x.words))
