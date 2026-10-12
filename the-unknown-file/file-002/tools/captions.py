"""English transcript + optional English SRT sidecar captions from the word-timed transcript.
Usage: python3 tools/captions.py short|long   (writes deliverables/…en.srt and deliverables/TRANSCRIPT_EN_<NAME>.md)"""
import json, sys
name = sys.argv[1]
words = json.load(open(f"studio/src/data/{name}.tokens.json"))
MAXC = 42 if name == "short" else 64
cards, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    text = " ".join(x["w"] for x in cur)
    nxt = words[i + 1] if i + 1 < len(words) else None
    gap = nxt["s"] - w["e"] if nxt else 9
    if not nxt or (w["w"][-1] in ".?!" and len(text) > 10) or gap > 0.6 or len(text) > MAXC or (w["w"][-1] in ",;:" and len(text) > MAXC * 0.6):
        cards.append({"s": cur[0]["s"], "e": cur[-1]["e"], "t": text}); cur = []
def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
fix = lambda t: t.replace("File 2.", "File Two.").replace("file two,", "File Two,").replace("the unknown file", "The Unknown File").replace("The unknown file", "The Unknown File")
NAME = "THE_UNKNOWN_FILE_002_SHORT" if name == "short" else "THE_UNKNOWN_FILE_002_YOUTUBE_FULL"
with open(f"deliverables/{NAME}.en.srt", "w") as f:
    for k, c in enumerate(cards):
        e = min(c["e"] + 0.3, cards[k + 1]["s"] - 0.04) if k + 1 < len(cards) else c["e"] + 0.8
        f.write(f"{k + 1}\n{ts(c['s'])} --> {ts(e)}\n{fix(c['t'])}\n\n")
segs = json.load(open(f"data/{name}.words.json"))
title = "Vertical short" if name == "short" else "YouTube documentary (Part 1 + Part 2, joined with a 0.75 s pause at 05:52.76)"
with open(f"deliverables/TRANSCRIPT_EN_{name.upper()}.md", "w") as f:
    f.write(f"# THE UNKNOWN FILE — FILE #002 · English transcript · {title}\n\n")
    f.write("Machine-transcribed from the supplied ElevenLabs narration (faster-whisper medium.en) and checked against the audio. Timecodes are positions in the exported video. The narration itself was not edited.\n\n")
    for s in segs:
        m, sec = divmod(s["start"], 60)
        f.write(f"`{int(m):02d}:{sec:05.2f}` {fix(s['text'].strip())}  \n")
print(name, len(cards), "cards")
