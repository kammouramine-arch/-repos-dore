"""English transcripts (Markdown, sentence per line with timecodes) from the word-timed narration.
Usage: python3 tools/transcript.py short|long  -> deliverables/TRANSCRIPT_EN_<NAME>.md"""
import json, re, sys
name = sys.argv[1]
words = json.load(open(f"studio/src/data/{name}.tokens.json"))
lines, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    if w["w"][-1] in ".?!" or i == len(words) - 1:
        lines.append((cur[0]["s"], " ".join(x["w"] for x in cur))); cur = []
def fix(t):
    t = re.sub(r"\s+-", "-", t)
    for a, b in [("the unknown file", "The Unknown File"), ("The unknown file", "The Unknown File"), ("file 3", "File 3"), ("This was file", "This was File")]:
        t = t.replace(a, b)
    return t
title = "Vertical short (TikTok / Reels / Shorts)" if name == "short" else "YouTube documentary"
dur = "1:42" if name == "short" else "9:26"
with open(f"deliverables/TRANSCRIPT_EN_{name.upper()}.md", "w") as f:
    f.write(f"# THE UNKNOWN FILE — FILE #003 · The Man Who Survived Seven Lightning Strikes\n## English transcript · {title} · {dur}\n\n")
    f.write("Transcribed from the supplied ElevenLabs narration (faster-whisper medium.en, word-timed) and checked against the audio; "
            "dropped words were re-checked on short windows of the audio and restored. Timecodes are positions in the exported video. "
            "The narration itself was not edited, re-voiced or re-timed.\n\n")
    for s, t in lines:
        m, sec = divmod(s, 60)
        f.write(f"`{int(m):02d}:{sec:05.2f}` {fix(t)}  \n")
print(name, len(lines), "lines")
