# Apple StoreKit metadata discrepancy — evidence, 2026-09-09

App DEVISERA, App Store ID 6806865251, bundle fr.devisia.app.
Subscription group 22361541. Physical iPhone/TestFlight.
Diagnostic captured 2026-09-09T09:33:15.778Z, fetches through 09:33:08.653Z.
The supplied report omits the build number; confirm it from TestFlight before
sending this packet. Do not infer the installed build from the latest EAS build.
Latest EAS evidence: Build 30, testflight-diagnostics profile, source de699d3,
build ID 006d4b48-9665-42e7-a749-a6dfd5ba50a7. This is consistent with the
diagnostic feature but is not proof of the installed binary's version.

| Product | Native displayPrice / currency | Live France configuration |
| --- | --- | --- |
| fr.devisia.essentiel.monthly | $35.00 / USD | €39 monthly, 3 days free |
| fr.devisia.pro.monthly | $69.00 / USD | €79 monthly, 3 days free |
| fr.devisia.entreprise.monthly | $129.00 / USD | €149 monthly, 3 days free |

All three products are returned, no missing IDs, storefront FRA, repeated
successful fetches. Native intro mode is empty, other intro metadata null and
eligibility false. Application does not persist a product cache; overlapping
requests can share an in-flight request. Apple's internal caching is unknown.
Earlier native Apple purchase-sheet screenshots show Essential at €39.

Live audit: all products and group Prepare for Submission, France is the only
enabled territory (1/175). French DEVISERA product/group localization exists.
App version 1.0 draft still selects old Build 11, lacks app screenshots,
description/keywords/support metadata, review contact/credentials and IAP review
screenshots. No first approval was established and no review submission was made.

Apple DTS explicitly states prior IAP review is not required for sandbox testing:
https://developer.apple.com/forums/thread/820656
First public IAP submission must accompany an app version:
https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase
These are separate requirements. Approval absence is NOT a proven cause of USD.

## Support request draft

Please investigate the StoreKit catalogue response for these products. On a
physical TestFlight iPhone, Storefront returns FRA while repeated product fetches
return the USD values above and no introductory metadata. Apple's native purchase
sheet previously showed Essential €39. App Store Connect France configuration
shows the EUR values and three-day offers listed above. Please confirm whether
this is sandbox catalogue/propagation behavior and advise how to obtain internally
consistent French product metadata and introductory-offer eligibility.

Attach the supplied diagnostic JSON and original screenshots privately to Apple
Developer Support; include TestFlight build number and iOS version confirmed by
the tester. No account credentials, signed receipts or billing ownership data.
This request is prepared, not sent.

## Release gate

No fake conversion. The client suppresses mismatched price/intro presentation.
The latest preflight release permits native Apple price confirmation for a fetched
product while suppressing inconsistent amounts; restore stays independent. This
is explicit containment requested by the owner, not proof of resolved metadata.
Do not call this public-ready while the discrepancy persists. First review needs
current clean screenshots/build, review account/contact information and explicit
owner authorization for public review. Do not submit old Build 11 or the diagnostic
binary merely to try to repair metadata.
