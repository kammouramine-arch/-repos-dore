# 07 · Third-party service register

| Service | Purpose / data | Implementation versus operation |
|---|---|---|
| GitHub | Source/version control | Repository exists; ownership evidence needed |
| Vercel | Web/API execution, scheduled jobs, logs | Existing deployment; invoices/region/log retention not reviewed |
| Supabase PostgreSQL | Application records and potentially file binaries | Existing hosted DB; backup settings/DPAs require account evidence |
| Expo EAS / push | Build source, signing, push tokens | Active build workflow; use destination-owned signing at handover |
| Apple StoreKit / App Store Connect | Purchases, receipts, app distribution | Three products configured, internal beta; launch/transfer gates outstanding |
| Stripe | Web billing and payment events | Code integrated; live revenue and migration feasibility unverified |
| Google Gemini | Text/photo AI requests and output | Production provider previously configured; paid-tier data terms and quotas must be verified |
| Anthropic | Optional AI alternative | Adapter exists; active usage unverified |
| Transcription endpoint | Optional uploaded voice transcription | Configurable service; native recognition is another path |
| Resend | Quote, recovery and verification emails | Adapter exists; verified production sender/delivery setup incomplete |
| S3-compatible storage | Optional private file storage | Adapter exists; actual deployment provider must be confirmed |
| Twilio / WhatsApp | Optional message delivery | Adapter exists, not an operational product claim |
| Product analytics | Organization-scoped events in database | Not evidence of public traffic/revenue; no confirmed external analytics contract |

For every active processor, collect: legal entity, contract/DPA, subprocessors, region, international-transfer basis, retention, training policy, security contact, billing owner and termination/export procedure. Provider credentials belong in a secret manager, not the buyer data room. Do not transmit live customer material while rehearsing integrations.
