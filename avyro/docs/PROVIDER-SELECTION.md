# Worldwide provider selection — 2026-10-13

Avyro targets every country. This is a product target, not a promise that every
country has navigable roads, speed limits, signs and incident feeds. Coverage
must be assessed separately for each feature and region; missing evidence stays
unavailable. No mobile live feed, payment method or paid plan was activated.

## Decision

Use **TomTom APIs for the first free evaluation**, subject to the account's actual
entitlements and terms. This is the best current fit for evaluating Avyro's road
data without first requiring a Navigate contract. It is not a measured accuracy
ranking or a completed worldwide commercial-licence confirmation.

Retain **HERE Navigate as the commercial full-navigation candidate**. Its native
speed-limit and road-sign events are a strong functional fit, but a signed
contract is required. An Explore/free account does not grant Navigate rights.
Mapbox is a credible customizable-navigation option, but its country-level data
quality varies; the reviewed documentation does not establish complete global
road-sign coverage.

| Criterion | TomTom | HERE | Mapbox |
| --- | --- | --- | --- |
| No-card testing | Published free API evaluation | Navigate requires contract | Product-specific free allowances; not activated |
| Current-road limit and sign evidence | Snap to Roads schema includes speedLimits and trafficSigns | Navigate speed-limit delegates and road-sign warners | Directions speed-limit attributes; full sign coverage unconfirmed |
| Native iOS guidance | Navigation SDK available by request | Navigate licence and onboarding | Customizable Navigation SDK |
| Coverage limits | Traffic missing markets are unsupported; Korea has regional restrictions | Feature-specific countries; Japan, China and Korea map restrictions | Address and other data quality varies by country |
| Avyro production rights | Account-specific terms must be verified | Contract and applicable hazard-alert terms needed | Applicable product terms must be verified |

## Primary evidence

- TomTom pricing/free evaluation, no credit card required:
  https://docs.tomtom.com/pricing
  Snap to Roads currently lists 2,500 free monthly requests; do not assume this
  allowance applies to every product or that unused allowance on another API
  can be pooled.
- TomTom API commercial-use FAQ:
  https://docs.tomtom.com/platform/documentation/status-and-support/faqs
  The FAQ points to terms; it is not a substitute for the actual agreement.
- TomTom iOS SDK access by request:
  https://docs.tomtom.com/navigation/ios/introduction/introduction
- TomTom GPS matching schema:
  https://docs.tomtom.com/snap-to-roads-api/documentation/snap-to-roads-api/synchronous-snap-to-roads
- TomTom traffic coverage:
  https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/product-information/market-coverage
  New traffic integrations are directed to Orbis; do not treat this classic
  coverage table as proof of an Orbis account's entitlements.
- TomTom regional data restrictions:
  https://docs.tomtom.com/api-explorer-index/documentation/product-information/faq
- HERE licences:
  https://docs.here.com/here-sdk/docs/ios-introduction-editions
- HERE coverage:
  https://docs.here.com/here-sdk/docs/ios-coverage-information
- HERE road warners:
  https://docs.here.com/here-sdk/docs/ios-navigation-warners
- HERE Base/Limited plan exclusions, including Safety Enhancement Alerts:
  https://www.here.com/get-started/pricing/rps-limits-excluded-use-cases
  The Limited Plan itself is retired. Do not offer it as an account option.
- Mapbox data quality by geography:
  https://docs.mapbox.com/help/dive-deeper/mapbox-data/
- Mapbox Directions capabilities:
  https://docs.mapbox.com/api/navigation/directions/

## Required before enabling a live feed

1. User completed account registration. The dashboard shows Freemium, initially
   zero requests, and an existing Evaluation key with Snap to Roads, Search,
   Routing and Traffic products assigned. No payment method or upgrade was added
   by this task. The existing key was captured via the browser copy control and
   stored locally using Windows user-bound encryption, outside the repository;
   its value was never printed or shipped in the app. No new key was created.
2. Read the agreement presented in the account. Confirm mobile navigation,
   server proxying, display with the current Apple map, attribution, retention,
   redistribution and test-user distribution. The public documentation's legal
   landing page returned no agreement text during this review, so these remain
   unconfirmed. Do not fabricate acceptance or claim paid production rights.
3. Confirm products assigned to a dedicated key, account's unused free allowance,
   and no automatic paid upgrade. Keep the secret server-side.
4. Test representative countries against live service: driving on parallel roads,
   crossings, tunnels, missing limits, mixed units, conditional limits, stale
   data and region-specific endpoints. Retrospective matching is not forward
   sign/hazard prediction. Do not ship untested safety-critical display.
5. Connect and deploy the gateway only to an approved host. Mobile source includes
   consent, freshness/movement invalidation and visible provider attribution,
   but its build-time activation flag defaults to false. Build 26 includes the
   wiring with the service disabled; this is committed integration work, not a
   claim of live road information in the TestFlight binary.

## Live free evaluation results

Public test addresses were geocoded and routed using TomTom, then small synthetic
traces from those route geometries were passed through the same road adapter.
No real user location or trip trace was transmitted. Twenty-five API calls were
made in total, including two Netherlands probes and two failed Tokyo address
attempts. All calls were against the existing Evaluation key; no paid plan was
enabled. This is a narrow API smoke test, not a countrywide accuracy assessment.

| Test city | Geocode and route | Usable mapped maximum limit |
| --- | --- | --- |
| Paris, France | Passed | 50 km/h |
| New York, United States | Passed | 25 mph |
| Sao Paulo, Brazil | Passed | 30 km/h |
| Cape Town, South Africa | Passed | 60 km/h |
| Sydney, Australia | Passed | 40 km/h |
| Tokyo, Japan | Address samples failed the country/result check | Unavailable |

The first Netherlands request was rejected by conservative matching checks; a
second request using the documented projected road coordinates matched with
confidence 1 and a mapped 70 km/h maximum. A variable-sign type was returned;
no current variable-sign value or warning ahead was inferred. The five other
successful country samples returned no sign data. Tokyo's failed samples do
not establish that all Japan data is unavailable; this remains unresolved.

Version 1.0.0 (26), source `a047425b88ad129aa7c4633281c7684843b81df9`:
signed device Release build `7fecfefd-3db7-4564-8fcb-b4fa5cf397da` succeeded.
Submission `4f9e0cf4-7d7f-4484-b220-0ad9cb6467b8` finished; Apple processing
is VALID and internal state IN_BETA_TESTING. IPA model/license hashes verified.
423 app tests, 14 backend tests, typecheck and lint passed. Phone/vehicle tests,
approved hosting and account-specific production terms remain outstanding.

## Prepared no-cost phone-test backend

The current server is running on Windows loopback only, with a separate beta
SQLite database outside Git, the encrypted evaluation key and paid AI explicitly
disabled. Health check passed and unauthenticated road access returned 401.
The usage table conservatively includes all 25 evaluation calls already made.

Cloudflare Quick Tunnel is prepared as a temporary HTTPS test transport, without
an account, domain or paid plan. The official cloudflared 2026.10.0 Windows AMD64
binary was downloaded and verified against its published SHA256:
`86aee4017b26625cee8484c113558f48effa4cd47f7aa05fcf425604e5d2b23c`.
The user subsequently explicitly authorized the connection. The tunnel is now
running, and an external HTTPS integration test passed health, registration,
session validation, live mapped limit, pending incident submission, rejected
unauthorized moderation, disabled paid AI and logout revocation. Only synthetic
identity/observations and public test coordinates were used; the synthetic user
and report were deleted afterward. No test observation was approved/published.
The `connected-beta` EAS profile explicitly enables the road-data opt-in and
uses the temporary HTTPS backend; the standard production profile stays off.

This is not production hosting: the computer and process must remain running,
the hostname changes on tunnel restart, and there is no uptime guarantee.
Cloudflare email access gating is incompatible with non-interactive mobile API
clients, so the gateway's own sessions, body bounds and request quotas remain
essential. Any visitor can reach the URL; protected operations require login,
but the current controlled-beta registration endpoint is open. Do not present
this as a hardened public production service. Only use synthetic test identity
and observations until production identity/privacy/retention gates are complete.

Source: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

No provider outreach was sent. No Stripe Directory search result was obtained:
its CLI was unavailable; official provider documentation was used as fallback.
