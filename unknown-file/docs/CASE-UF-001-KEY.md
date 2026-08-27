# CASE UF-001 — "The Hollow Hour" · Solution key

**Spoilers.** This is the maintainer's document. It records the solution,
the clue chain, and the reasoning behind every deliberate choice, so the
file can be edited later without quietly breaking it.

All of it is fiction. See `disclaimer.html`.

---

## 1 · What actually happened

On the night of 3–4 February 2009, **Dr Elin Marchetti staged her own
disappearance** from Kestrel Point Field Station.

| Time | Event |
|---|---|
| 23:52 | Sends "Confirmed. I'll be ready at 2." to a number on the Ardmair Marine Services account. |
| 00:52 | MV *Sgurr* leaves Ardmair slip. No purpose entered. |
| 01:27 | *Sgurr* alongside Kestrel Point (35-minute crossing). |
| 01:41 | She photographs the pier to confirm the boat has arrived. **The camera runs 2 h 11 min fast, so the file stamps this 03:52.** |
| 01:58 | Opens a 3 min 40 s WRITE session on the audio archive under `MARCHETTI_E`, substituting 57 minutes of the 31 January recording for the live channel. |
| 02:15 | Snow begins. |
| 02:41 | She leaves. Door open, 8 seconds. |
| 02:44 | Microgrid fails; generator changeover sheds the pier lamp and every exterior circuit until 06:10. |
| 03:05 | Snow stops. Her track is already gone. |
| 03:26 | *Sgurr* back at Ardmair. |
| 03:36 | Reyes wakes, goes to the corridor, acknowledges the changeover panel at 03:37:02. Returns to bed. |
| **03:38** | **The exterior door opens for 22 seconds. Not Reyes.** |
| 04:20–04:55 | *Sgurr* makes a 35-minute movement — too short for Kestrel. Sannick fits. Unresolved. |

**Motive.** A Trust audit on 9 February would have required the raw counts
behind the Kestrel Point aerosol series, with a written account of every
correction ever applied (EX-21). The undated note in her drawer (EX-20)
describes a finding she let stand for four years. Nora Vance was already
copying the raw files.

## 2 · The three famous "impossibilities", and their answers

| The detail everyone repeats | What the file actually shows |
|---|---|
| "Her coat and boots were still on the rack." | Both carry Trust tag **STN-04** — station spares. Her own parka, size 39 boots marked E.M., gloves, hat and 30-litre rucksack are all on her January inventory and none was found. She left dressed, carrying a bag. |
| "The recorder proves she was inside until 03:38." | The recording is the night of 31 January, written over the live channel at 01:58 under her own administrator credential. Every incidental event matches the archive copy to the second. |
| "There were no outbound footprints." | Snow fell from 02:15 to 03:05. She left at 02:41 — twenty-four further minutes of accumulation in calm air, at rates that fill a print in about twenty. The single inbound line was made after 03:05. |

## 3 · The clue chain

The player has to make **one measurement** before anything else resolves:
the camera's clock offset.

```
EX-07 (pier photo, stamped 03:52, lamp lit)
  ×  EX-14 (pier lamp circuit dead 02:44 → 06:10)
        →  the file stamp cannot be right

EX-07  ×  EX-08 (same camera; wall clock 01:47 vs stamp 03:58)
        →  camera is +2 h 11 min
        →  EX-07 was taken at 01:41
        →  a second vessel was alongside, an hour before she left
```

From there the file opens in three independent directions, and **any one of
them is enough** — which is what makes the case fair:

1. **The boat.** EX-12 × EX-13 (undeclared 00:52 crossing) and EX-15 × EX-12
   (14.2 litres against a stated 6-litre round trip).
2. **The recording.** EX-05 × EX-06 (identical offsets) and EX-18 × EX-05
   (WRITE session at 01:58 under the only admin credential).
3. **The physical scene.** EX-16 × EX-17 (STN-04 tags) and EX-03 × EX-04
   (snowfall window).

Motive closes it: EX-21 × EX-20.

## 4 · Deliberate red herrings

| # | The contradiction | Why it is here | Resolution |
|---|---|---|---|
| XR-11 | Nora Vance's tablet count disproves her first statement (EX-19 × EX-11). | A player who cannot distinguish a relevant contradiction from an irrelevant one has not finished thinking. Real files are full of these. | She was copying the raw files. She withdrew the account herself the next day, unprompted. **Immaterial.** |
| XR-12 | The 04:20–04:55 movement cannot have reached the island (EX-13 × EX-22). | Genuinely unresolved, and flagged as such rather than dangled. | Carried forward. Nothing in this dossier establishes it. |
| — | Reyes was awake and moving at exactly the wrong moment. | The obvious suspect, corroborated into innocence by the panel acknowledgement at 03:37:02 falling inside his motion window. | Not the 03:38 door. |
| — | EX-20, the undated note. | Reads as a suicide note on a first pass. | It is about a falsified dataset. The file explicitly declines to rely on it. |

## 5 · The final unanswered question

At 03:33:12 — inside the four minutes the transcript records as
`SENSOR RESET`, and after the substituted audio ends — the logger wrote
3.4 seconds to a block the 2009 export routine could not read. Recovered in
2019. It contains **breathing, close to the microphone, in a room that every
record says was empty.**

Fifty-two minutes after she left. Two minutes and thirty-two seconds before
Reyes reached the corridor. Whoever opened the exterior door at 03:38 was
already in the common room, and the corridor sensor — which covers the only
route from the bedrooms — records nothing between 03:37:15 and 07:02.

That is EX-24, sealed until the conclusion, and it is the door into Case #002.

## 6 · Grading

Five questions. Q1 mechanism, Q2 the audio, Q3 the snow, Q4 the accomplice,
Q5 the measurement (EX-08, matched case-insensitively).

Guessing all five is a 1-in-4⁴ shot on the multiple choice alone, before the
free-text exhibit code. The conclusion opens at any score — locking a paying
customer out of the ending they bought would be indefensible, and the grade
carries all the pressure the moment needs.

## 7 · Rules for writing the next case

Everything here generalises.

1. **Write the solution first**, minute by minute, including what nobody
   will see. Then decide what each instrument in that world recorded. Then
   decide which records the investigation would plausibly have obtained.
2. **One measurement unlocks the file.** Not a hunch, not a name — something
   the player can calculate and be certain about.
3. **Three independent routes to the truth**, so the case is fair without
   being linear.
4. **The most-repeated "fact" about the case is false**, and one exhibit
   quietly disproves it.
5. **Two red herrings**: one true-but-irrelevant contradiction, and one
   genuine loose end that is flagged as unresolved rather than dangled.
6. **Machine records never lie; people sometimes do.** The instruments are
   the player's anchor. Break this and there is nothing to stand on.
7. **Every step of the reveal cites the exhibits it rests on.** If a step
   cannot cite one, the case is not finished.
8. **End on a question the file genuinely cannot answer** — and make sure it
   is a question the reader can see the shape of, not a shrug.
