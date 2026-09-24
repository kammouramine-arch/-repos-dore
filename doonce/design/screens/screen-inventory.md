# DoOnce — Screen inventory and states

46 core screens from the brief, grouped as the Figma file is organised. Status columns: **Proto** = present in `prototype/` (interactive, screenshot-reviewed), **iOS** = SwiftUI view exists in `ios/`.

Legend: ✅ done · ◐ partial · — not yet

| # | Section | Screen | Proto | iOS | States covered |
|---|---|---|---|---|---|
| 1 | Launch | Splash (logo formation) | ✅ | ✅ | full, short, reduce-motion, skip |
| 2–5 | Onboarding | Scenes 1–4 | ✅ | ✅ | paged, parallax, live-intelligence demo, recognition demo, do demo |
| 6 | Onboarding | Authentication | ✅ | ✅ | Apple, email alt |
| 7 | Onboarding | First-use introduction | ✅ | ✅ | examples, CTA |
| 8 | Memory | Memory home | ✅ | ✅ | default, empty, continue card, offline banner |
| 9 | Memory | Memory search | ✅ | ✅ | text, voice, camera entry |
| 10 | Memory | Search results | ✅ | ◐ | best answer first, grouped |
| 11 | Navigation | Centre action menu (bloom) | ✅ | ✅ | open, select, dismiss |
| 12 | Look | Look camera | ✅ | ✅ | looking, torch, close |
| 13 | Look | Recognition acquired | ✅ | ✅ | contour, pulse, label, sheet |
| 14 | Look | Recognition uncertain | ✅ | ✅ | yes/no chips |
| 15 | Look | Unknown object | ✅ | ✅ | remember it / search similar |
| 16 | Teach | Pre-recording | ✅ | ✅ | instruction, import, existing object |
| 17 | Teach | Recording | ✅ | ✅ | pulse ring, timer, transient observations, live transcript |
| 18 | Teach | Marked moment | ✅ | ✅ | marker on timeline |
| 19 | Teach | Processing | ✅ | ✅ | real stages, timeline, frame arrangement |
| 20 | Teach | Generated procedure | ✅ | ✅ | observed vs inferred, unclear part |
| 21 | Teach | Edit procedure | ✅ | ◐ | edit text, reorder, warning, split/combine (menu) |
| 22 | Teach | Save memory | ✅ | ✅ | compress-to-object, Remembered. |
| 23 | Objects | Object creation | ✅ | ✅ | suggestion, correct/edit/generic, space |
| 24 | Objects | Object detail (passport) | ✅ | ✅ | hero, memories, about, service, freshness |
| 25 | Objects | Procedure detail | ✅ | ✅ | steps, taught by, versions |
| 26 | Do | Do mode | ✅ | ✅ | step, media, warning, auto-complete |
| 27 | Do | Hands-free Do | ✅ | ✅ | listening indicator, voice hint |
| 28 | Do | Ask memory | ✅ | ◐ | question, answer with source timestamp |
| 29 | Do | Procedure completed | ✅ | ✅ | loop resolve, accuracy prompt |
| 30 | Memory | Spaces | ✅ | ◐ | grid |
| 31 | Memory | Space detail | ✅ | ◐ | hero, objects |
| 32 | Memory | People | ✅ | ◐ | list, empty |
| 33 | Memory | Person detail | ✅ | ◐ | memories taught |
| 34 | Sharing | Household | ✅ | ◐ | members, counts |
| 35 | Sharing | Share memory | ✅ | ◐ | preview, link |
| 36 | Sharing | QR import | ✅ | ◐ | scan, preview import |
| 37 | Settings | Notifications | ✅ | ◐ | useful examples, education |
| 38 | Settings | Profile (You) | ✅ | ✅ | |
| 39 | Settings | Settings | ✅ | ✅ | |
| 40 | Settings | Privacy | ✅ | ✅ | what uploads, who sees, delete, training |
| 41 | Settings | Haptics | ✅ | ✅ | full/reduced/off |
| 42 | Subscription | Subscription | ✅ | ◐ | |
| 43 | Subscription | Paywall | ✅ | ✅ | monthly/yearly, trial |
| 44 | States | Offline | ✅ | ✅ | banner, cached badge |
| 45 | States | Error states | ✅ | ✅ | recognition, upload, generic |
| 46 | States | Permission education | ✅ | ✅ | camera, mic, photos, notifications |

Per-screen quality checklist (from the brief §129) is applied in the prototype review pass; results are noted in `prototype/REVIEW.md`.
