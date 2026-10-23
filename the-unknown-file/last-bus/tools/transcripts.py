"""Write the English transcripts (sentence per line, timecode = first word in the supplied narration)."""
import json, re, sys
sys.path.insert(0, "tools")
from sfx import cue_finder

N = {
 1: ("NIGHT 1 — THE EMPTY SEAT", "THE_LAST_BUS_NIGHT_01.mp3", [
  "Imagine you miss the last train home.", "It's 2:16 in the morning.", "The streets are completely empty, and your phone has 3% battery left.",
  "Then, out of nowhere, a bus pulls up.", "Its destination sign is blank.", "The doors open, but the driver doesn't look at you.",
  "You ask if the bus goes downtown.", "No answer.", "You get on anyway.", "Inside, every seat is empty.", "You sit beside a window, and that's when your phone vibrates.",
  "A message from an unknown number:", "\"Whatever you do, don't look at the windows.\"", "You look up.", "Outside, there's nothing but darkness.",
  "Then you notice something strange in the glass.", "Your reflection is sitting beside you.", "But the actual seat next to you is empty.",
  "You raise your hand.", "The reflection doesn't move.", "Instead, it slowly turns its head toward you.", "You jump out of your seat, and suddenly the bus lights flicker.",
  "When they come back on, someone is sitting beside you.", "Someone wearing your clothes.", "With your face.", "The bus stops.", "The doors open, and for the first time, the driver speaks:",
  "\"Only one of you can get off.\"", "You try to run toward the door, but your legs won't move.", "Your double stands up, walks straight past you, and steps outside.",
  "You watch yourself disappear into the darkness.", "Then the doors slam shut.", "Your phone vibrates one final time:", "\"Passenger replaced.\"",
  "The driver turns his head and smiles.", "End of night one."]),
 2: ("NIGHT 2 — THE REPLACEMENT", "THE_LAST_BUS_NIGHT_02.mp3", [
  "Night two.", "You're still on the bus.", "You have no idea how much time has passed.", "Outside the windows, it's always dark.", "The driver hasn't said another word.",
  "Then, the clock above him changes.", "2:16 a.m.", "Again.", "The bus slows down.", "You recognize the street.", "It's your neighborhood.", "Your phone suddenly lights up.",
  "1% battery.", "A message from your own phone number:", "\"I'm home.\"", "Attached is a photograph.", "Your apartment.", "Your kitchen.",
  "And sitting at the table is someone who looks exactly like you.", "Your double.", "You try calling your roommate, but before the call connects, another message appears:",
  "\"Don't bother. He thinks I'm you.\"", "You look toward the driver.", "\"How do I get off this bus?\"", "He doesn't answer.", "So you begin searching the seats.",
  "Under one of them, you find something scratched into the metal:", "\"If the glass takes your place, the bell can call it back.\"", "You stare at the words.", "The bell?",
  "Then you notice the old yellow stop-request cord running along the windows.", "You pull it.", "Ding!", "The entire bus goes silent.", "Even the engine stops.",
  "Your phone vibrates again.", "It's a live video from your apartment camera.", "Your double is sitting at the kitchen table.", "It suddenly freezes, slowly turns toward the camera, and smiles.",
  "Then your phone rings.", "The caller ID says: your name.", "You answer and hear your own voice whisper:", "\"I heard the bell.\"", "The call ends.", "Then the driver speaks:",
  "\"Tomorrow night.\"", "You look up.", "The clock is still showing 2:16.", "And for the first time, the driver is looking directly at you.", "End of night two."]),
 3: ("NIGHT 3 — THE FINAL STOP", "THE_LAST_BUS_NIGHT_03.mp3", [
  "Night three.", "You're sitting in the same seat.", "The bus hasn't stopped moving.", "Then, 2:16 a.m., the driver presses the brakes.", "You look outside: your apartment building.",
  "The doors open, and someone is standing at the bus stop.", "You.", "Or rather, the thing that stole your face.", "It's wearing your jacket, your shoes, and it's smiling.",
  "Then, it steps onto the bus.", "The lights turn red.", "You stand up.", "The driver finally speaks:", "\"One passenger leaves. One stays.\"", "Your double looks at you.",
  "\"You weren't supposed to figure it out.\"", "You slowly step toward the exit, but your double moves to block the doors.", "It reaches for your arm, and that's when you hear something.",
  "Ding!", "The stop-request bell — but nobody touched it.", "Your double freezes.", "Its smile disappears.", "Then, something invisible seems to pull it backward.",
  "One step, then another, until it falls into the empty seat beside the window.", "The driver turns toward you.", "\"Your stop.\"", "You don't wait.",
  "You run, through the doors, onto the pavement.", "The bus doors slam shut behind you.", "Through the window, you see your double.", "Its hands are pressed against the glass.",
  "Then, the bus drives away and disappears around the corner.", "You're finally home.", "You enter your apartment.", "Your roommate looks up from the sofa.", "\"Where have you been?\"",
  "You don't know how to explain, so you walk to the bathroom, turn on the light, and look into the mirror.", "You raise your hand.", "Your reflection raises its hand.",
  "You turn your head.", "It follows.", "Everything seems normal, until you turn away, and in the mirror, your reflection is still looking at you.", "End of night three."]),
}
# spoken forms where the transcript spelling differs from the recognised words
ALIAS = {"2:16": "2 16", "3%": "3 %", "1%": "1 %", "2:16 a.m.": "2 16 a", "Your double.": "You're double", "Its smile": "It's smile", "Its hands": "It's hands", "Its destination": "its destination", "stop-request": "stop request", "2:16 a.m., the": "2 .16 AM the"}
out = []
for k, (title, src, lines) in N.items():
    segs = json.load(open(f"data/n0{k}.words.json"))
    toks = [w for s in segs for w in s["words"]]
    find, seq = cue_finder(toks)
    dur = toks[-1]["e"]
    md = [f"# THE LAST BUS HOME — {title}", "", f"English narration transcript. Narration: supplied ElevenLabs voice `{src}`, used unchanged. Timecodes give the start of each sentence in the narration track.", ""]
    after = 0.0
    for ln in lines:
        probe = ln
        for a, b in ALIAS.items(): probe = probe.replace(a, b)
        probe = re.sub(r"[\"“”:—,.!?]", " ", probe)
        words = [w for w in probe.split() if re.sub(r"[^a-z0-9]", "", w.lower())]
        for k2 in (3, 2, 1):
            try:
                s, e = find(" ".join(words[:k2]), after); break
            except KeyError:
                continue
        after = s + 0.01
        md.append(f"`{int(s // 60):02d}:{s % 60:05.2f}`  {ln}  ")
    out.append("\n".join(md))
    open(f"deliverables/TRANSCRIPT_EN_NIGHT_0{k}.md", "w").write("\n".join(md) + "\n")
print("ok")
