# Worldwide provider selection — 2026-10-13

Avyro targets every country. This is a product target, not a promise that every
country has navigable roads, speed limits, signs and incident feeds. Coverage
must be assessed separately for each feature and region; missing evidence stays
unavailable. No live provider, payment method or paid plan was activated.

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

1. User completes email/password/verification and reviews free-account terms.
   Registration is prepared at https://my.tomtom.com/; no account was created.
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
   but its build-time activation flag defaults to false. Build 25 predates the
   wiring. A new beta is being built with the service still disabled; this is
   committed integration work, not a claim of live road information.

No provider outreach was sent. No Stripe Directory search result was obtained:
its CLI was unavailable; official provider documentation was used as fallback.
