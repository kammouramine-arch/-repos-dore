# Release evidence update — build 17

This is a narrow evidence update after the strict 71/100 audit. It does not replace the full audit or claim App Store approval.

## Newly verified

- Remote branch `codex/devisia-premium-fluidity` now contains the local continuation through `c4a29ef41b1c4fa6c036f04b263a2426363000cf`.
- The required earlier commits `a45204d` and `4847fc8` remain present in the remote history.
- Production iOS build **17** was created for DEVISERA (`fr.devisia.app`, App Store ID `6806865251`).
- An iOS submission was scheduled for that build.
- Screenshot-provided EAS references:
  - Build: `83a42357-9da2-46b5-8577-160f4f64db02`
  - Submission: `da8f9aed-efbc-4b39-9338-743d960d5199`

The screenshot does not prove that Apple has finished processing the binary or that it is installable through TestFlight yet. Physical-device acceptance is still open.

## Verification correction

`npm test` was run inside `mobile`, where no `test` script exists. The correct server/unit command is run from the repository root. It passes with **22 files / 211 tests**. Mobile validation is `npm run typecheck` from `mobile`, which also passes.

## Updated strict score: 73 / 100

The score increases only for remote source availability and the new submitted build. It does not award points for Apple processing, real-device behavior, email delivery, a public App Store release, or legal approval.

Remaining gates are unchanged: full mobile English copy, PostgreSQL integration execution, Resend/DNS delivery proof, Apple processing and TestFlight installation, StoreKit purchase/restore acceptance, regional legal review, and transfer/account evidence.

## Next owner action

Wait for build 17 to finish Apple processing in App Store Connect/TestFlight, install it on the real iPhone, and execute the QA checklist. Keep the EAS build/submission references with the acquisition data room.
