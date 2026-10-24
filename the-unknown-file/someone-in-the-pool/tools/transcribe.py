"""Word-level transcription of the narration files (faster-whisper).
Usage: python3 tools/transcribe.py audio/X.mp3 data/X.words.json"""
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
src, dst = sys.argv[1], sys.argv[2]
model = WhisperModel("medium.en", device="cpu", compute_type="int8", cpu_threads=4)
pcm = subprocess.run(["ffmpeg","-v","error","-i",src,"-ac","1","-ar","16000","-f","s16le","-"],capture_output=True,check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
segs, info = model.transcribe(audio, word_timestamps=True, beam_size=5, vad_filter=False,
                              condition_on_previous_text=True)
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                "words": [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for w in s.words]})
    print(f"{s.start:7.2f} {s.end:7.2f} {s.text.strip()}", flush=True)
json.dump(out, open(dst, "w"), indent=1)
