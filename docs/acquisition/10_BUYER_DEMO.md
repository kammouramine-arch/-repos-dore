# 10 · Buyer demonstration · 3 minutes

Use an isolated local demo/test database, synthetic seed and a dedicated demo build/account. Never reset production, send to a real client, initiate a live purchase or show private logs. The seed is now host/name/opt-in guarded. If an external capability is unavailable, say so and show the preparation workflow rather than simulate delivery as real.

| Time | Exact action / capture | Suggested narration |
|---|---|---|
| 0:00–0:20 | Open presentation and dashboard; show phone frame and bottom tabs | “DEVISIA helps an artisan turn a chantier description into a reviewed quote, from the phone.” |
| 0:20–1:00 | New quote; dictate “Remplacer un siphon d’évier, une heure de main-d’œuvre et un déplacement”; use a consent-cleared fixture photo if live vision is configured | “Voice and photos provide context. The catalogue supplies the business's prices; the result remains a draft.” |
| 1:00–1:40 | Review customer, quantities, units, prices and TVA; edit one line; save; generate PDF | “The artisan stays in control. Totals are calculated by the application, not trusted to the language model.” |
| 1:40–2:10 | Open client and prospect; show conversion and related quote | “Commercial context stays together instead of being lost across notes and messages.” |
| 2:10–2:35 | Open follow-up preparation; show approval step; send only to controlled inbox if delivery is configured | “Follow-ups are prepared for review. This demo does not claim delivery unless we verify the inbox.” |
| 2:35–3:00 | Show plans and trial terms without confirming purchase; finish on dashboard | “Web and Apple billing have different confirmation flows. The buyer receives the implementation and a documented provider handover plan.” |

Rehearse before recording: first load and warm reopen, microphone/photo permission denial, one offline retry, PDF multi-line totals, keyboard dismissal, tab drag cancellation, logout/login and account isolation. Record build/commit/date. Capture actual UI, not invented mock customers or revenue. The account's synthetic totals must carry a clear “Démonstration — données fictives” video overlay.

Use the seeded demo identity only in the isolated environment; credentials are defined in prisma/seed.ts and must never be copied to production. No publicly reachable demo bypass or weakened authentication was added. A live buyer demo is blocked until its rehearsal and required provider setup are complete.
