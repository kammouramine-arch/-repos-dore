/* ═══════════════════════════════════════════════════════════════
   THE ARCHIVE INDEX

   Light metadata only — enough to render the archive grid, the
   home page and the dashboard without loading a full case file.
   Full dossiers are code-split and fetched on demand by loadCase().

   States: free | available | soon | locked
   ═══════════════════════════════════════════════════════════════ */

export const CASES = [
  {
    id: "UF-000", number: "000", title: "The Last Guest", slug: "the-last-guest",
    state: "free", statusLabel: "FREE SAMPLE",
    hook: "A watch stopped at 02:14. A soaked jacket on a dry night. And a photograph taken after the guest had gone.",
    location: "Ardmair", period: "October 2016",
    difficulty: "INTRODUCTORY", difficultyLevel: 1, duration: "10–15 min", exhibits: 6,
    price: null, priceDisplay: "FREE",
    cover: "assets/img/case-000.svg",
    href: "free-case.html", playHref: "investigate.html?case=UF-000",
    module: "./case-uf-000.js"
  },
  {
    id: "UF-001", number: "001", title: "The Hollow Hour", slug: "the-hollow-hour",
    state: "available", statusLabel: "OPEN / UNRESOLVED",
    hook: "At 02:41 the door opened. At 03:38 it opened again. In between, a recorder captured a woman who was already gone.",
    location: "Isle of Morn", period: "February 2009",
    difficulty: "ADVANCED", difficultyLevel: 4, duration: "2–3 hrs", exhibits: 24,
    price: 14.99, priceDisplay: "€14.99",
    cover: "assets/img/case-001.svg",
    href: "case-001.html", playHref: "investigate.html?case=UF-001",
    module: "./case-uf-001.js",
    featured: true
  },
  {
    id: "UF-002", number: "002", title: "Nine Minutes of Tape", slug: "nine-minutes-of-tape",
    state: "soon", statusLabel: "IN PREPARATION",
    hook: "A answering machine in an empty flat recorded nine minutes of a conversation that three people deny having.",
    location: "Withheld", period: "1994",
    difficulty: "INTERMEDIATE", difficultyLevel: 3, duration: "90 min", exhibits: 18,
    price: 14.99, priceDisplay: "€14.99",
    cover: "assets/img/case-locked.svg",
    href: "archive.html", playHref: null, module: null,
    release: "Next release"
  },
  {
    id: "UF-003", number: "003", title: "The Woman on Platform 4", slug: "the-woman-on-platform-4",
    state: "soon", statusLabel: "IN PREPARATION",
    hook: "She appears on four cameras in eleven minutes. Two of them are pointed at the same place.",
    location: "Withheld", period: "2011",
    difficulty: "ADVANCED", difficultyLevel: 4, duration: "2 hrs", exhibits: 21,
    price: 14.99, priceDisplay: "€14.99",
    cover: "assets/img/case-locked.svg",
    href: "archive.html", playHref: null, module: null
  },
  { id: "UF-004", number: "004", title: "Carriage Seven", slug: "carriage-seven", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null },
  { id: "UF-005", number: "005", title: "The Orphan Frequency", slug: "the-orphan-frequency", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null },
  { id: "UF-006", number: "006", title: "A House With No Keys", slug: "a-house-with-no-keys", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null },
  { id: "UF-007", number: "007", title: "The Second Signature", slug: "the-second-signature", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null },
  { id: "UF-008", number: "008", title: "The Vantage Road File", slug: "the-vantage-road-file", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null },
  { id: "UF-009", number: "009", title: "Seventeen Degrees West", slug: "seventeen-degrees-west", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null },
  { id: "UF-010", number: "010", title: "The Cold Room", slug: "the-cold-room", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null },
  { id: "UF-011", number: "011", title: "The Unsent Letters", slug: "the-unsent-letters", state: "locked",
    statusLabel: "SEALED", hook: "Sealed pending completion.", location: "—", period: "—",
    difficulty: "—", difficultyLevel: 0, duration: "—", exhibits: 0, price: null, priceDisplay: "—",
    cover: "assets/img/case-locked.svg", href: null, playHref: null, module: null }
];

export const byId = (id) => CASES.find((c) => c.id === id) || null;

/* Code-split loader. Only the case being investigated is fetched. */
export async function loadCase(id) {
  const meta = byId(id);
  if (!meta?.module) throw new Error(`No dossier available for ${id}.`);
  const mod = await import(meta.module);
  return mod.CASE;
}

/* ═══ COMMERCE ═══════════════════════════════════════════════
   Prices are declared here so the site has one source of truth.
   They must be mirrored in the payment provider — see
   docs/INTEGRATION.md. Nothing here charges anybody.            */
export const PRODUCTS = [
  {
    sku: "UF-001",
    kind: "case",
    name: "Case #001 — The Hollow Hour",
    price: 14.99, display: "€14.99",
    blurb: "One complete investigation. Yours permanently.",
    grants: ["UF-001"]
  },
  {
    sku: "UF-FOUNDING",
    kind: "bundle",
    name: "The Founding Files",
    price: 34.99, display: "€34.99",
    compare: 44.97, compareDisplay: "€44.97",
    blurb: "Case #001 now, plus Case #002 and Case #003 released to you the day each one opens.",
    grants: ["UF-001", "UF-002", "UF-003"],
    best: true
  },
  {
    sku: "UF-ARCHIVE",
    kind: "membership",
    name: "Archive Access",
    price: 7.99, display: "€7.99 / month",
    blurb: "Every case in the archive, and every new case on release. Cancel whenever you like.",
    grants: ["*"],
    note: "Opens when the archive reaches six published cases."
  }
];

export const productBySku = (sku) => PRODUCTS.find((p) => p.sku === sku) || null;
