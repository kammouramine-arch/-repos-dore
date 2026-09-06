# 09 · Operating cost model

No billing statements reviewed. Actual monthly spend, credits, tax, free-tier eligibility and negotiated rates are **UNKNOWN**. Do not treat a provider's free tier as a sustainable zero-cost production plan.

## Verified public rates, checked 6 September 2026

These are published rates, NOT proof of the account's subscribed tier or actual invoices.

Account evidence: authenticated Vercel team API on 6 September returned **Hobby / active / USD**. The base plan is free, but Vercel explicitly limits Hobby to personal non-commercial use. **OWNER ACTION before paid commercial launch:** Vercel → select DEVISERA's team → Settings → Billing → Upgrade; review the current Pro price, usage limits and payment details before confirming. No paid upgrade was made. [Hobby terms and upgrade steps](https://vercel.com/docs/plans/hobby). Other team add-ons/invoices were not verified; do not describe all hosting costs as zero.

- Configured quote model `gemini-3.5-flash`: standard paid input **USD 1.50/million tokens**, output including thinking **USD 9.00/million**. Do not use batch/flex rates for the interactive request path. [Google pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=en).
- Resend: free tier **3,000 emails/month, 100/day**; Pro **USD 20/month for 50,000**, additional **USD 0.90/1,000**. Verified sender remains an operational prerequisite. [Resend pricing](https://resend.com/pricing).
- Expo: Free lists 15 iOS and 15 Android builds; Starter **USD 19/month plus usage**, with **USD 45 build credit**. Current account tier still needs account evidence. [Expo pricing](https://expo.dev/pricing).
- Supabase Pro subscription **USD 25/month**; compute/add-ons/overages affect total. PITR starts at **USD 100/month**, not automatically included in the base subscription. [Supabase pricing](https://supabase.com/pricing).

Applying Google's verified standard rates to the explicit text-only workload assumptions below yields **USD 24 / 240 / 1,200 per month**, respectively. This is calculated AI usage, not a forecast of actual COGS. It excludes extra thinking beyond the assumed output, image input, assistant calls, retries and infrastructure. Native iPhone dictation is not the optional server transcription API: do not charge every voice quote an invented transcription API cost.

| Service | Billing model / scaling driver | Billing owner / free-tier evidence |
|---|---|---|
| Vercel | Plan plus compute, requests, egress and add-ons | Vercel team Billing; current plan unknown |
| Supabase | Plan/compute, DB size, egress, backups/PITR | Organization Billing; current entitlement unknown |
| Expo/EAS | Build plan/credits and usage; push-related operations | Expo organization Billing; free/paid plans exist, limits must be rechecked |
| Gemini / optional Anthropic | Input/output tokens, images and model/tier | Provider project billing; active price/paid data terms must be verified |
| Transcription | Audio duration/model or own compute | Configured provider billing; no measured usage |
| Resend | Email volume, monthly tier/overage | Sender organization billing; free/paid tiers exist |
| S3 | Storage GB-month, requests and egress | Storage account; unused if database-backed |
| Apple Developer / StoreKit | Program membership and applicable transaction terms | Account Holder; regional fees/commission/tax require current account terms |
| Stripe | Payment transactions, currency/refund/dispute/add-on fees | Stripe Dashboard; effective fee depends on payment mix |
| Domain/DNS/mailbox | Registration renewal, mailbox and optional DNS fees | Registrar/mail host UNKNOWN |
| SMS/WhatsApp | Number, destination/message/template fees | Optional provider UNKNOWN |
| Monitoring/analytics | Existing database usage or added monitoring plan | No dedicated paid tool established |
| Google Play | Developer registration/payment terms if launched | Listing/account not verified |

## Explicit workload examples, not invoices

Assume 20 quote generations per active user/month, 2,000 text input tokens and 1,000 output tokens per generation, no retries or photo tokens. At 100 active users: 2,000 generations, 4M input and 2M output tokens/month. At 1,000: 20,000 generations, 40M input and 20M output. At high use (100 generations/user for 1,000 users): 100,000 generations, 200M input and 100M output.

Let I and O be the verified model's price per million input/output tokens. Text AI cost is respectively `4I + 2O`, `40I + 20O`, or `200I + 100O`, in the provider's currency, before tax. Add separate photo analysis, thinking tokens where billable, retries, assistant requests, transcription and storage. These assumptions are not measured DEVISERA token consumption. At three emails per quote, the scenarios imply 6,000 / 60,000 / 300,000 emails, before signup/recovery mail. Plan quotas may prevent these workloads; reconcile with shared plans before quoting margins.

Buyer should collect three months of invoices and usage exports, separate founder tooling from product COGS, reconcile cash versus recognized revenue/refunds/tax, set per-provider budget alerts, and stress-test quota saturation. No profit or valuation estimate is justified yet.

Pricing references checked 6 September 2026: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Expo pricing](https://expo.dev/pricing), [Resend pricing](https://resend.com/pricing). Use the exact selected model and account tier, not a search excerpt's unrelated model rate.
