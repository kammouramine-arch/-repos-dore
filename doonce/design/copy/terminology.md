# DoOnce — Terminology and voice

Use these words and no synonyms in product copy.

| Say | Never |
|---|---|
| Memory | tutorial, guide (as noun), knowledge artifact, asset, workflow |
| Object, thing | item, entity, device record |
| Space | location, folder, room record |
| Person | contact, profile, user (for other people) |
| Step | instruction #, task |
| Teach | record a tutorial, create content |
| Look | scan, detect, identify |
| Do | view tutorial, play guide |
| Remembered. | Saved successfully! |
| Taught by Dad | Source: Dad |
| See original | View source video |
| Remember this | Add marker |
| Ask | Chat, AI assistant |
| Household | team, workspace, organisation |

Voice: confident, human, short, quietly intelligent. Sentences under twelve words in UI. No exclamation marks. "AI" appears only in Privacy and Settings, where it is a fact the user needs.

Provenance in copy: when the information came from a person, say so. *Julien said to turn it slowly.* Not *Turn it slowly.* When DoOnce inferred something, mark it: *Probably a Vaillant ecoTEC* / *This part wasn't clearly captured.*

Confidence-aware recognition copy:
- High: *Found your espresso machine.*
- Medium: *Is this your espresso machine?*
- Low: *I don't know this yet.*

Errors are calm and end with an action: *Couldn't recognise this yet. Try moving closer or getting more light.* → Try again / Choose manually.

Localisation: all strings live in `strings.json` (source) → `Localizable.xcstrings` and the prototype's `strings.js`. Plurals use ICU-style variants; no concatenation. French follows English.
