# AMYN 3D — Atelier Lumière

Original fictional architectural design study, created 15 October 2026. This is not an existing property, client commission or photorealistic architectural visualisation.

## Included

- `/3d` and `/en/3d`, using the existing site shell, navigation, language switcher and sitemap.
- One coherent scene: 12 × 8 metre interior and 12 × 3 metre terrace; living room, kitchen/dining and bedroom. These are design coordinates, not surveyed dimensions. This is a presentation study of these spaces, not a complete construction-ready apartment plan.
- Procedural furniture, original abstract wall art, seeded wood/stone/fabric textures, lighting and skyline. All geometry/material authoring is in `public/3d/apartment.js`.
- Four room viewpoints, free looking by drag or keyboard, evening/day lighting, schematic plan and fullscreen where supported. This is not free walking or a VR experience.
- 24-second 1920 × 1080 H.264 film at 24 fps, no audio. Four camera moves with cuts; fictional-concept label burned into the film. The 1280 × 720 background version is about 1.2 MB. Full film is about 8.1 MB.
- Inquiry endpoint `/api/3d`, sharing existing sanitation, server validation, origin checks, honeypot, rate limiting and OVH delivery. No new email service or account.
- Prices remain **Sur devis / Quoted per project**, consistent with the existing public service pricing. No invented or unapproved price figures.

## Costs and dependencies

Additional spend incurred: **€0**. No paid assets, generation credits, software subscription, external rendering service, new hosting project or third-party website requests. Three.js 0.186.1 and its RoundedBoxGeometry are locally vendored under the included MIT licence. Original scene assets were authored for AMYN. The existing site retains its existing asset/font licences.

The existing Vercel `amyn1/repos-dore` project uses root directory `amyn` and production branch `claude/amyn-official-website-k4cbwx`. Keep development in `codex/amyn-3d`; pushing the production branch can trigger a live deployment. Do not replace other site routes or the separate outreach checkout.

## Verify

```
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run start -- --port 3008
```

The local production inquiry endpoint deliberately returns 503 when SMTP_PASSWORD/RESEND_API_KEY are absent, retains the visitor's fields and shows the direct email fallback. Do not claim email delivery from a local success simulation. Existing production/preview environment variable names were inspected without exposing values; a real delivered message has not been verified as part of this build.

Local browser validation: headless Microsoft Edge on Windows; desktop 1440 px, emulated mobile 390 px and 320 px; room buttons, keyboard switching, evening lighting, closing/reopening, missing-WebGL fallback, reduced motion, no horizontal overflow and no third-party resource requests. Invalid/malformed/cross-origin requests return 422/400/403. Existing home, Revenue OS and ProofSprint return 200. All 74 unit tests pass, including new inquiry sanitation/consent tests.

Performance sample: 90 look-and-render samples at 1280 × 720, median ~2.8 ms, p95 ~3.8 ms on this desktop/headless environment. About 71,624 triangles / 467 draw calls in the selected view. This does not establish performance on physical low-end phones or Safari. Pixel ratio is capped at 1.5; rendering is on demand, paused when hidden; the viewer is unloaded when closed. The film and posters remain alternatives to WebGL 2. Reduced motion and data-saver mode suppress background autoplay; the visitor can explicitly play it.

Framework patched from Next.js 16.3.7 to 16.3.8, matching eslint-config-next updated; source-map-js updated in the lockfile. Production dependency audit: zero known vulnerabilities at verification time. Five development-only advisory chains remain through the lint tooling's braces dependency; npm offers no compatible fixed braces release (latest inspected: 3.0.3). No forced downgrade was applied.

Only `/3d/tour.html` permits same-origin framing; all other routes retain the existing frame denial. The scene's JS is outside the main React bundle and loads only after the tour opens. Upstream vendor code alone is excluded from ESLint.

## Editing and rendering

`apartment.js`: `stations` controls tour viewpoints; `shots` controls the film; `film(time)` renders a deterministic frame. Modify geometry in the same source so film and tour remain coherent. Regenerate stills and film after scene changes. A local browser and FFmpeg can render frames without a paid service. The checked-in media are ready to serve; no renderer runs in production.

Optional offline utility: install Playwright locally without saving it to package.json, start the site on port 3008, then run `node scripts/render-three.mjs`. Requires FFmpeg on PATH. Edge is used on Windows; elsewhere install Playwright Chromium. Set AMYN_RENDER_URL for another local URL. The script renders the labelled 1080p film; regenerate the lighter hero encode separately with FFmpeg. The script is not part of the production build.

Limitations: stylised real-time visuals; four fixed viewpoints; no collision-based walking, bathroom/utility modelling, VR, real-property measurements or professional photorealistic claims. No physical iOS/Android testing. Email delivery still needs a controlled owner test in the configured deployed environment. Hosting capacity remains subject to the existing free-plan limits; no upgrade has been purchased or authorised.
