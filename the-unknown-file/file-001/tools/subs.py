"""Split the word-timed transcript into subtitle cards.
Usage: python3 tools/subs.py short|long  -> data/<name>.cards.json + data/<name>.tokens.json"""
import json, re, sys
name = sys.argv[1]
MAXC = 58 if name == "short" else 80
segs = json.load(open(f"data/{name}.words.json"))
raw = [dict(w) for s in segs for w in s["words"]]
# merge tokens like "1" ",700" and stray punctuation
words = []
for w in raw:
    if words and (re.match(r"^[,.]\d", w["w"]) or w["w"] in {",", ".", "?", "!"}):
        words[-1]["w"] += w["w"]; words[-1]["e"] = w["e"]
    else:
        words.append(w)
# hyphenated compounds split by the recogniser ("gas" "-rich")
fixed = []
for w in words:
    if fixed and w["w"].startswith("-"):
        fixed[-1]["w"] += w["w"]; fixed[-1]["e"] = w["e"]
    else:
        fixed.append(w)
words = fixed
# verified corrections (re-checked by isolated re-transcription of the passage)
for k in range(len(words) - 2):
    if [x["w"] for x in words[k:k + 3]] == ["there", "was", "disturbing"]:
        d = words[k + 2]; mid = round(d["s"] - 0.38, 3)
        words.insert(k + 2, {"w": "another", "s": mid, "e": round(d["s"] - 0.02, 3)}); break
for k, w in enumerate(words):
    if k > 0 and words[k - 1]["w"].lower() == "file" and w["w"] in ("1,", "1.", "one,", "one."):
        w["w"] = "One" + w["w"][-1]; words[k - 1]["w"] = "File"
    if k > 0 and words[k - 1]["w"].lower() in ("the",) and w["w"].lower() == "unknown":
        words[k - 1]["w"] = "The" if words[k - 1]["w"][0].isupper() or (k > 1 and words[k - 2]["w"].endswith(",")) else words[k - 1]["w"]
        w["w"] = "Unknown"
    if w["w"].lower().startswith("file") and k > 0 and words[k - 1]["w"] == "Unknown":
        w["w"] = "File" + w["w"][4:]
json.dump([{"w": w["w"], "s": w["s"], "e": w["e"]} for w in words], open(f"data/{name}.tokens.json", "w"))
BREAK_BEFORE = {"and", "but", "to", "that", "of", "with", "filling", "which", "until", "because", "where", "when", "as", "or", "who", "so", "instead", "except", "under", "in", "from", "surrounded", "it", "its", "near", "once", "into", "for", "like", "without", "allowing", "reaching", "far"}
cards, cur = [], []
def emit(ws):
    cards.append({"start": ws[0]["s"], "end": ws[-1]["e"], "en": " ".join(x["w"] for x in ws)})
i = 0
while i < len(words):
    w = words[i]; cur.append(w)
    text = " ".join(x["w"] for x in cur); n = len(text)
    nxt = words[i + 1] if i + 1 < len(words) else None
    gap = (nxt["s"] - w["e"]) if nxt else 9
    dur = w["e"] - cur[0]["s"]
    end_sent = w["w"][-1] in ".?!"
    if not nxt or (end_sent and (n >= 12 or gap > 0.3)) or (gap > 0.5 and n >= 10) or (w["w"][-1] in ",;:" and n >= MAXC * 0.6):
        emit(cur); cur = []
    elif n > MAXC or dur > 6.0:
        # backtrack to the best phrase boundary inside the card
        best = None
        for j in range(len(cur) - 1, 0, -1):
            left = " ".join(x["w"] for x in cur[:j])
            if len(left) < 14: break
            if cur[j - 1]["w"][-1] in ",;:" or cur[j]["w"].lower().strip(",.") in BREAK_BEFORE:
                best = j; break
        if best is None: best = len(cur) - 1
        emit(cur[:best]); cur = cur[best:]
    i += 1
for k, c in enumerate(cards):
    nxt = cards[k + 1]["start"] if k + 1 < len(cards) else c["end"] + 1.5
    c["end"] = round(min(max(c["end"] + 0.35, c["start"] + 1.0), nxt - 0.05), 3)
    c["i"] = k
json.dump(cards, open(f"data/{name}.cards.json", "w"), indent=1, ensure_ascii=False)
for c in cards: print(f'{c["i"]:3d} {c["start"]:7.2f} {c["end"]:7.2f} {c["en"]}')
