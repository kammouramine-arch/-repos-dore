# 08 · IP and licenses

Status: **REQUIRES LEGAL/ACCOUNTING REVIEW** and **REQUIRES OWNER DECISION**. Code possession, Git author names and AI assistance do not establish a complete chain of title.

Additional evidence: `evidence/visual-assets.json` identifies tracked bitmap/vector/font/media files with SHA-256 hashes and sizes, distinguishing excluded archive material. `evidence/contributor-records.json` lists Git author names and commit counts without email addresses. These make the evidence package reproducible but intentionally leave creator/license/assignment proof unverified. For each contributor, supply a signed assignment or explain founder/company ownership; for each brand/stock asset, supply the editable original and creation record or license receipt. Never substitute the manifest for legal title.

Inventory findings: 1,615 package instances; all have declared license metadata. Non-permissive/attribution review items include sharp/libvips platform binaries (LGPL and mixed expressions), lightningcss and axe-core (MPL), caniuse-lite (CC-BY), and node-forge (BSD-or-GPL alternative). These are not automatically violations. Determine what is actually distributed, whether modified, and which license alternative applies; preserve required notices/source obligations rather than deleting working dependencies indiscriminately.

Generated `evidence/dependencies.json` lists resolved root/mobile lockfile package instances, versions, package-declared license metadata and development-only classification. Duplicate package instances are retained intentionally. It is not a full SBOM, license-text bundle, vulnerability scan or verification of every transitive asset. Native CocoaPods/build dependencies and vendored icon/font licenses require release-archive review too.

| Material | Evidence / action |
|---|---|
| Custom TS/TSX services, UI, prompts | Owner must attest authorship and provide assignments from any contractor/employer/company with potential rights |
| React/Next/Expo and other packages | Inventory package metadata; preserve notices and validate license expressions against distributed artifacts |
| Lucide / Ionicons / Expo font bundles | Retain upstream notices; font/icon licenses may differ from wrapper-package license |
| Mobile PNG/SVG logo, theme, web generated icons | Keep editable source; origin/creator contract not independently verified |
| Marketing AppPreview | Rendered illustrative UI, not verified customer screenshot or traction |
| AI-assisted code/artwork | Keep available provider terms and creation records; no exclusivity or trademark warranty inferred |
| `archive/reva-site` | Unrelated archived site/assets: exclude from sale unless provenance and intentional inclusion confirmed |
| User-provided recordings / contact sheets | Diagnostic only, excluded from source build output and proposed sale |
| Google/Apple/Stripe/provider branding | Third-party marks; no ownership conveyed |

No unverified asset was replaced merely on suspicion. Replacing an asset requires knowing its source and the replacement's license; visual similarity is not legal clearance. No broad open-source license was added to DEVISIA's proprietary code, as only the rights-holder can choose licensing terms.

Before diligence closes: collect contributor agreements/invoices, original brand files, stock receipts, domain title and trademark search; inspect complete Git history for third-party material and secrets; audit native binary notices; preserve license texts for redistributed material; counsel signs off exceptions. Do not give a buyer an unqualified '100% owned IP' statement before this is complete.
