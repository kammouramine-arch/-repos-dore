"""Pair English cards with French translations; write SRT (EN + FR), plain transcript, and studio JSON.
Usage: python3 tools/build_subs.py short|long"""
import json, re, sys, importlib.util, textwrap
name = sys.argv[1]
cards = json.load(open(f"data/{name}.cards.json"))
spec = importlib.util.spec_from_file_location("fr", f"tools/fr_{name}.py"); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
FR = mod.FR
if len(FR) != len(cards):
    for i in range(max(len(FR), len(cards))):
        print(i, cards[i]["en"] if i < len(cards) else "-", "||", FR[i] if i < len(FR) else "-")
    raise SystemExit(f"MISMATCH {len(cards)} cards vs {len(FR)} FR")
NB, NNB = " ", " "
def frtypo(s):
    s = re.sub(r"(\d) (\d{3})", r"\1" + NB + r"\2", s)
    s = re.sub(r" ([?!;:])", NB + r"\1", s)
    s = s.replace("n° ", "n°" + NB)
    s = re.sub(r"\b(lac|Lac) (Nyos|Monoun)", r"\1" + NB + r"\2", s)
    return s
def wrap(s, width):
    if len(s) <= width: return s
    for extra in range(2, 30):  # balanced two-line split
        lines = textwrap.wrap(s, width=(len(s) + 1) // 2 + extra, break_long_words=False)
        if len(lines) <= 2: break
    return "\n".join(lines)
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
W = 42
out = []
for c, fr in zip(cards, FR):
    out.append({"start": c["start"], "end": c["end"], "en": c["en"], "fr": frtypo(fr)})
for lang in ("en", "fr"):
    with open(f"data/{name}.{lang}.srt", "w") as f:
        for i, c in enumerate(out, 1):
            f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{wrap(c[lang], W)}\n\n")
json.dump(out, open(f"studio/src/data/{name}.subs.json", "w"), ensure_ascii=False, indent=0)
# reading-speed check (chars per second)
fast = [(i, round(len(c["fr"]) / (c["end"] - c["start"]), 1)) for i, c in enumerate(out) if len(c["fr"]) / (c["end"] - c["start"]) > 21]
print(name, len(out), "cards; FR cards above 21 cps:", fast)
