"""Trim each footage clip to the part the V2 edits actually use (keeps every start offset unchanged).
Usage: python3 tools/trim_footage.py [--apply]"""
import re, subprocess, sys, json
from pathlib import Path
ST = Path("studio")
need = {}
def use(clip, end):
    need[clip] = max(need.get(clip, 0), end)
for f in ["src/short/ShortV2.tsx", "src/long/LongV2.tsx"]:
    s = (ST / f).read_text()
    for m in re.finditer(r"\{ from: ([0-9.]+), to: ([0-9.]+|[A-Z_]+)(.*?)(?=\n  \{ from: |\n\];)", s, re.S):
        a = float(m.group(1)); b = float(m.group(2)) if m.group(2)[0].isdigit() else a + 10
        body = m.group(3)
        for fm in re.finditer(r'<Footage(?:Layer)? id="([a-z0-9_]+)"(?: start=\{([0-9.]+)\})?', body):
            use(fm.group(1), float(fm.group(2) or 0) + (b - a))
        for tm in re.finditer(r"<TideBeach [^>]*?start=\{([0-9.]+)\}", body):
            use("beach_tripod", float(tm.group(1)) + (b - a))
        if "<SpawnGrid" in body:
            g = (ST / "src/components/SpawnGrid.tsx").read_text()
            for cm in re.finditer(r'\{ id: "([a-z0-9_]+)", start: ([0-9.]+) \}', g):
                use(cm.group(1), float(cm.group(2)) + (b - a))
reg = (ST / "src/footage.ts").read_text()
files = dict(re.findall(r'^  ([a-z0-9_]+): \{ file: "(footage/[^"]+\.mp4)"', reg, re.M))
total0 = total1 = 0
for clip, path in files.items():
    p = ST / "public" / path
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)
    keep = min(dur, need.get(clip, 0) + 1.5)
    size = p.stat().st_size
    total0 += size
    print(f"{clip:18s} dur {dur:6.1f}  used to {need.get(clip, 0):6.1f}  keep {keep:6.1f}")
    if "--apply" in sys.argv and keep < dur - 1:
        tmp = p.with_suffix(".tmp.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(p), "-t", f"{keep:.2f}", "-c", "copy", "-movflags", "+faststart", str(tmp)], check=True)
        tmp.replace(p)
    total1 += p.stat().st_size
print(f"total {total0/1e6:.0f} MB -> {total1/1e6:.0f} MB")
