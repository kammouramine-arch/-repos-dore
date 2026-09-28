/**
 * Maquettes d'interfaces — une par type de solution.
 *
 * Ce sont des illustrations : les noms, dates et contenus sont fictifs et
 * aucun ne désigne une personne ou une entreprise réelle. Aucune n'affiche
 * de note, d'avis ou de chiffre de performance.
 *
 * Chaque maquette est écrite à sa taille réelle (en pixels) et mise à
 * l'échelle par `ScaledCanvas`.
 */

const ui = {
  bg: "#FBFAF7",
  panel: "#FFFFFF",
  soft: "#F3F1EC",
  ink: "#161512",
  muted: "#6E6A62",
  faint: "#77736B",
  line: "#E7E3DB",
  brand: "#1F3B2F",
  brandSoft: "#E3EAE5",
  brass: "#9C7A3C",
  brassSoft: "#F3ECDD",
  warn: "#A4552F",
  warnSoft: "#F6E6DC",
};

/* ------------------------------------------------------------------------ */
/* Suivi des demandes & devis — 1280 × 800                                   */
/* ------------------------------------------------------------------------ */

const columns: {
  title: string;
  cards: { title: string; meta: string; flag?: { text: string; tone: "warn" | "brass" | "brand" } }[];
}[] = [
  {
    title: "Nouvelles demandes",
    cards: [
      { title: "Salle de bain complète", meta: "Formulaire du site · aujourd'hui", flag: { text: "À qualifier", tone: "brass" } },
      { title: "Remplacement chaudière", meta: "Téléphone · hier" },
      { title: "Fuite sous évier", meta: "E-mail · hier", flag: { text: "Urgent", tone: "warn" } },
    ],
  },
  {
    title: "Infos manquantes",
    cards: [
      { title: "Douche à l'italienne", meta: "Attend : photos, dimensions", flag: { text: "Relancer le client", tone: "warn" } },
      { title: "Radiateurs étage", meta: "Attend : modèle actuel" },
    ],
  },
  {
    title: "Devis envoyé",
    cards: [
      { title: "Cuisine, réseau eau", meta: "Envoyé il y a 6 jours", flag: { text: "Relance prévue jeudi", tone: "brass" } },
      { title: "Entretien annuel ×3", meta: "Envoyé il y a 2 jours" },
      { title: "Ballon thermodynamique", meta: "Envoyé il y a 9 jours", flag: { text: "Relance due", tone: "warn" } },
    ],
  },
  {
    title: "Accepté",
    cards: [
      { title: "Salle d'eau, studio", meta: "Chantier à planifier", flag: { text: "Signé", tone: "brand" } },
      { title: "Mise aux normes gaz", meta: "Intervention le 14" },
    ],
  },
];

const flagStyle = (tone: "warn" | "brass" | "brand") =>
  tone === "warn"
    ? { background: ui.warnSoft, color: ui.warn }
    : tone === "brass"
      ? { background: ui.brassSoft, color: ui.brass }
      : { background: ui.brandSoft, color: ui.brand };

export function QuoteBoardMock() {
  return (
    <div className="flex h-full w-full" style={{ background: ui.bg, color: ui.ink }}>
      <aside className="flex w-[232px] shrink-0 flex-col gap-1 border-r px-5 py-7" style={{ borderColor: ui.line }}>
        <div className="mb-8 flex items-center gap-2.5">
          <span className="size-7 rounded-md" style={{ background: ui.brand }} />
          <span className="text-[16px] font-semibold">Thermia</span>
        </div>
        {["Demandes", "Clients", "Devis", "Relances", "Notes"].map((item, i) => (
          <span
            key={item}
            className="rounded-md px-3 py-2.5 text-[15px]"
            style={i === 0 ? { background: ui.soft, fontWeight: 500 } : { color: ui.muted }}
          >
            {item}
          </span>
        ))}
      </aside>

      <div className="flex flex-1 flex-col px-9 py-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px]" style={{ color: ui.muted }}>Semaine en cours</p>
            <p className="mt-1 text-[28px] font-semibold tracking-[-0.02em]">Demandes</p>
          </div>
          <div className="flex gap-2.5">
            <span className="rounded-lg border px-4 py-2.5 text-[14px]" style={{ borderColor: ui.line, color: ui.muted }}>
              Filtrer
            </span>
            <span className="rounded-lg px-4 py-2.5 text-[14px] font-medium text-white" style={{ background: ui.brand }}>
              Nouvelle demande
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3 text-[13px]">
          {[
            ["À traiter aujourd'hui", "4"],
            ["Relances dues", "2"],
            ["Devis en attente", "3"],
          ].map(([label, count]) => (
            <span key={label} className="flex items-center gap-2 rounded-full border px-3.5 py-1.5" style={{ borderColor: ui.line }}>
              <span style={{ color: ui.muted }}>{label}</span>
              <span className="font-semibold">{count}</span>
            </span>
          ))}
        </div>

        <div className="mt-7 grid flex-1 grid-cols-4 gap-4">
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3 rounded-xl p-3" style={{ background: ui.soft }}>
              <div className="flex items-center justify-between px-1.5 pt-1">
                <span className="text-[14px] font-medium">{col.title}</span>
                <span className="text-[13px]" style={{ color: ui.faint }}>{col.cards.length}</span>
              </div>
              {col.cards.map((card) => (
                <div key={card.title} className="rounded-lg border p-3.5" style={{ background: ui.panel, borderColor: ui.line }}>
                  <p className="text-[15px] font-medium leading-snug">{card.title}</p>
                  <p className="mt-1.5 text-[13px]" style={{ color: ui.muted }}>{card.meta}</p>
                  {card.flag && (
                    <span className="mt-3 inline-block rounded-md px-2 py-1 text-[12px] font-medium" style={flagStyle(card.flag.tone)}>
                      {card.flag.text}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Réservation — téléphone 390 × 800                                         */
/* ------------------------------------------------------------------------ */

export function BookingMock({
  brand = "Barberie Aubin",
  accent = ui.brand,
}: {
  brand?: string;
  accent?: string;
}) {
  const days = [
    ["Mar", "11"],
    ["Mer", "12"],
    ["Jeu", "13"],
    ["Ven", "14"],
    ["Sam", "15"],
  ];
  const slots = ["09:30", "10:15", "11:00", "14:00", "14:45", "15:30", "16:15", "17:00", "17:45"];
  const taken = new Set(["10:15", "14:00", "17:00"]);

  return (
    <div className="flex h-full w-full flex-col" style={{ background: ui.bg, color: ui.ink }}>
      <div className="flex items-center justify-between px-6 pb-4 pt-12">
        <span className="text-[15px]" style={{ color: ui.muted }}>←</span>
        <span className="text-[16px] font-semibold">{brand}</span>
        <span className="w-4" />
      </div>

      <div className="px-6">
        <p className="text-[13px]" style={{ color: ui.muted }}>Étape 2 sur 3</p>
        <p className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">Choisir un créneau</p>

        <div className="mt-5 flex items-center justify-between rounded-xl border px-4 py-3.5" style={{ borderColor: ui.line, background: ui.panel }}>
          <div>
            <p className="text-[15px] font-medium">Coupe & barbe</p>
            <p className="text-[13px]" style={{ color: ui.muted }}>45 min · avec Hugo</p>
          </div>
          <span className="text-[13px] font-medium" style={{ color: accent }}>Modifier</span>
        </div>

        <div className="mt-6 grid grid-cols-5 gap-2">
          {days.map(([d, n], i) => (
            <div
              key={n}
              className="flex flex-col items-center rounded-xl border py-2.5"
              style={
                i === 2
                  ? { background: accent, borderColor: accent, color: "#fff" }
                  : { borderColor: ui.line, background: ui.panel }
              }
            >
              <span className="text-[12px]" style={i === 2 ? undefined : { color: ui.muted }}>{d}</span>
              <span className="text-[18px] font-semibold">{n}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[14px] font-medium">Jeudi 13</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {slots.map((s) => {
            const isTaken = taken.has(s);
            const chosen = s === "15:30";
            return (
              <span
                key={s}
                className="rounded-lg border py-2.5 text-center text-[15px]"
                style={
                  chosen
                    ? { background: accent, borderColor: accent, color: "#fff", fontWeight: 500 }
                    : isTaken
                      ? { borderColor: ui.line, color: ui.faint, textDecoration: "line-through" }
                      : { borderColor: ui.line, background: ui.panel }
                }
              >
                {s}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-auto border-t px-6 pb-8 pt-4" style={{ borderColor: ui.line, background: ui.panel }}>
        <div className="flex items-center justify-between text-[14px]">
          <span style={{ color: ui.muted }}>Jeudi 13 · 15:30</span>
          <span style={{ color: ui.muted }}>Confirmation par e-mail</span>
        </div>
        <div className="mt-3 rounded-xl py-3.5 text-center text-[16px] font-medium text-white" style={{ background: accent }}>
          Continuer
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Application cliente — téléphone 390 × 800                                 */
/* ------------------------------------------------------------------------ */

export function AppMock({
  brand = "Institut Lys",
  accent = "#9B6A78",
}: {
  brand?: string;
  accent?: string;
}) {
  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#FAF7F5", color: ui.ink }}>
      <div className="px-6 pt-12">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-[0.06em]">{brand}</span>
          <span className="flex size-9 items-center justify-center rounded-full text-[14px] font-medium" style={{ background: "#EFE6E3" }}>
            C
          </span>
        </div>
        <p className="mt-7 text-[14px]" style={{ color: ui.muted }}>Bonjour Claire,</p>
        <p className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Votre prochain rendez-vous</p>
      </div>

      <div className="mx-6 mt-5 rounded-2xl p-5 text-white" style={{ background: accent }}>
        <p className="text-[13px] opacity-80">Vendredi 14 · 10:00</p>
        <p className="mt-1.5 text-[20px] font-semibold">Soin éclat du visage</p>
        <p className="mt-1 text-[14px] opacity-80">60 min · Cabine 2</p>
        <div className="mt-5 flex gap-2">
          <span className="rounded-full bg-white/20 px-3.5 py-2 text-[13px]">Déplacer</span>
          <span className="rounded-full bg-white/20 px-3.5 py-2 text-[13px]">Itinéraire</span>
        </div>
      </div>

      <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
        {[
          ["Réserver", "Un nouveau soin"],
          ["Mes soins", "Historique"],
        ].map(([t, s]) => (
          <div key={t} className="rounded-2xl border p-4" style={{ borderColor: "#EAE0DB", background: "#FFFFFF" }}>
            <p className="text-[15px] font-medium">{t}</p>
            <p className="mt-1 text-[13px]" style={{ color: ui.muted }}>{s}</p>
          </div>
        ))}
      </div>

      <div className="mx-6 mt-6">
        <p className="text-[14px] font-medium">Notifications</p>
        {[
          ["Rappel", "Votre rendez-vous a lieu vendredi à 10:00."],
          ["Nouveau", "Les rendez-vous de décembre sont ouverts."],
        ].map(([t, s]) => (
          <div key={t} className="mt-3 flex gap-3 border-b pb-3" style={{ borderColor: "#EAE0DB" }}>
            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: accent }} />
            <div>
              <p className="text-[14px] font-medium">{t}</p>
              <p className="text-[13px] leading-snug" style={{ color: ui.muted }}>{s}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex justify-around border-t py-4 text-[12px]" style={{ borderColor: "#EAE0DB", color: ui.muted }}>
        <span style={{ color: accent, fontWeight: 500 }}>Accueil</span>
        <span>Réserver</span>
        <span>Profil</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Fiche d'établissement — téléphone 390 × 800                               */
/* Aucune marque de moteur de recherche, aucune note, aucun avis.           */
/* ------------------------------------------------------------------------ */

export function ProfileMock({ photo }: { photo?: string }) {
  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#FFFFFF", color: ui.ink }}>
      <div className="h-[220px] overflow-hidden" style={{ background: "linear-gradient(150deg,#6E7E72,#1F3B2F)" }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- capturé en image
          <img src={photo} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="px-6 pt-5">
        <p className="text-[24px] font-semibold tracking-[-0.02em]">Barberie Aubin</p>
        <p className="mt-1 text-[14px]" style={{ color: ui.muted }}>Barbier · Centre-ville</p>
        <p className="mt-2 text-[14px]">
          <span style={{ color: ui.brand, fontWeight: 500 }}>Ouvert</span>
          <span style={{ color: ui.muted }}> · Ferme à 19:00</span>
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2 text-center text-[12px]">
          {["Itinéraire", "Appeler", "Site web", "Réserver"].map((a, i) => (
            <div key={a} className="flex flex-col items-center gap-1.5">
              <span
                className="flex size-11 items-center justify-center rounded-full border"
                style={i === 3 ? { background: ui.brand, borderColor: ui.brand } : { borderColor: ui.line }}
              >
                <span className="size-3.5 rounded-full" style={{ background: i === 3 ? "#fff" : ui.brand, opacity: i === 3 ? 1 : 0.8 }} />
              </span>
              <span style={{ color: ui.muted }}>{a}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[14px] leading-relaxed" style={{ color: "#3B3833" }}>
          Barbier de quartier : coupe, taille de barbe et rasage à l&apos;ancienne. Sur rendez-vous ou sans attente selon les disponibilités.
        </p>

        <div className="mt-5 border-t pt-4" style={{ borderColor: ui.line }}>
          <p className="text-[14px] font-medium">Services</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {["Coupe homme", "Taille de barbe", "Rasage", "Coupe enfant"].map((s) => (
              <span key={s} className="rounded-full px-3 py-1.5 text-[13px]" style={{ background: ui.soft }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t pt-4 text-[14px]" style={{ borderColor: ui.line }}>
          <p className="font-medium">Horaires</p>
          {[
            ["Mardi – vendredi", "09:30 – 19:00"],
            ["Samedi", "09:00 – 17:00"],
            ["Dimanche, lundi", "Fermé"],
          ].map(([d, h]) => (
            <div key={d} className="mt-2 flex justify-between">
              <span style={{ color: ui.muted }}>{d}</span>
              <span>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Onboarding client — 1280 × 800                                            */
/* ------------------------------------------------------------------------ */

export function OnboardingMock() {
  const steps: { title: string; detail: string; state: "done" | "current" | "todo" }[] = [
    { title: "Présentation de votre entreprise", detail: "Activité, effectif, interlocuteurs", state: "done" },
    { title: "Documents à fournir", detail: "3 documents sur 5 reçus", state: "current" },
    { title: "Accès et informations pratiques", detail: "Outils, comptes, calendrier", state: "todo" },
    { title: "Premier rendez-vous", detail: "Choisir un créneau", state: "todo" },
  ];
  const docs: [string, boolean][] = [
    ["Statuts de la société", true],
    ["Derniers comptes annuels", true],
    ["Organigramme", true],
    ["Prévisionnel en cours", false],
    ["Contrats clés", false],
  ];

  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#F7F9FB", color: "#12161A" }}>
      <div className="flex items-center justify-between border-b px-12 py-6" style={{ borderColor: "#DFE5EB", background: "#fff" }}>
        <span className="text-[18px] font-semibold">Cabinet Aurel</span>
        <span className="text-[14px]" style={{ color: "#5C6873" }}>Espace client · Société Horizon</span>
      </div>

      <div className="grid flex-1 grid-cols-[1.1fr_1fr] gap-12 px-12 py-10">
        <div>
          <p className="text-[14px]" style={{ color: "#5C6873" }}>Bienvenue</p>
          <p className="mt-1.5 text-[34px] font-semibold leading-tight tracking-[-0.02em]">Préparons votre première séance.</p>
          <div className="mt-6 h-2 w-full rounded-full" style={{ background: "#E3E9EF" }}>
            <div className="h-2 w-[45%] rounded-full" style={{ background: "#2F4A63" }} />
          </div>
          <p className="mt-2 text-[13px]" style={{ color: "#5C6873" }}>Étape 2 sur 4</p>

          <div className="mt-7 flex flex-col gap-3">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="flex items-center gap-4 rounded-xl border px-5 py-4"
                style={{
                  background: "#fff",
                  borderColor: s.state === "current" ? "#2F4A63" : "#DFE5EB",
                }}
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] font-medium"
                  style={
                    s.state === "done"
                      ? { background: "#2F4A63", color: "#fff" }
                      : s.state === "current"
                        ? { border: "1.5px solid #2F4A63", color: "#2F4A63" }
                        : { border: "1.5px solid #CBD4DC", color: "#8A96A1" }
                  }
                >
                  {s.state === "done" ? "✓" : i + 1}
                </span>
                <div>
                  <p className="text-[16px] font-medium">{s.title}</p>
                  <p className="text-[13px]" style={{ color: "#5C6873" }}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-7" style={{ background: "#fff", borderColor: "#DFE5EB" }}>
          <p className="text-[18px] font-semibold">Documents à fournir</p>
          <p className="mt-1 text-[14px]" style={{ color: "#5C6873" }}>Déposez-les ici : nous vous prévenons dès réception.</p>
          <div className="mt-5 flex flex-col">
            {docs.map(([name, done]) => (
              <div key={name} className="flex items-center justify-between border-b py-3.5 text-[15px]" style={{ borderColor: "#EEF2F5" }}>
                <span>{name}</span>
                <span
                  className="rounded-md px-2.5 py-1 text-[12px] font-medium"
                  style={done ? { background: "#E6EDF3", color: "#2F4A63" } : { border: "1px dashed #B8C3CD", color: "#5C6873" }}
                >
                  {done ? "Reçu" : "Déposer"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl px-5 py-4 text-[14px]" style={{ background: "#F2F5F8" }}>
            <p className="font-medium">Et ensuite ?</p>
            <p className="mt-1" style={{ color: "#5C6873" }}>
              Une fois les documents reçus, vous choisissez le créneau de votre premier rendez-vous.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Portfolio — 1280 × 800                                                    */
/* ------------------------------------------------------------------------ */

export function PortfolioMock({ photos }: { photos?: string[] }) {
  const tone = (a: string, b: string, angle = 160) => ({
    background: `radial-gradient(60% 55% at 30% 30%, ${b} 0%, transparent 70%), linear-gradient(${angle}deg, ${a}, ${b})`,
  });

  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#F3EFE8", color: "#23201B" }}>
      <div className="flex items-center justify-between px-14 py-7">
        <span className="font-serif text-[22px] font-bold">Bois &amp; Ligne</span>
        <span className="flex gap-8 text-[15px]" style={{ color: "#6B6358" }}>
          <span>L&apos;atelier</span>
          <span style={{ color: "#23201B" }}>Réalisations</span>
          <span>Devis</span>
        </span>
      </div>

      <div className="grid flex-1 grid-cols-[1fr_1.35fr] gap-12 px-14 pb-12 pt-4">
        <div className="flex flex-col">
          <p className="text-[13px] uppercase tracking-[0.22em]" style={{ color: "#8A6A3F" }}>Réalisation</p>
          <p className="mt-3 font-serif text-[46px] leading-[1.05]">Cuisine en chêne massif</p>
          <p className="mt-5 text-[16px] leading-relaxed" style={{ color: "#6B6358" }}>
            Une cuisine ouverte sur le séjour, dessinée pour une pièce sans angle droit. Façades en chêne huilé, plan en pierre.
          </p>
          <div className="mt-8 grid grid-cols-3 border-t pt-5 text-[14px]" style={{ borderColor: "#D8CFBF" }}>
            {[
              ["Lieu", "Maison ancienne"],
              ["Bois", "Chêne huilé"],
              ["Pose", "Par l'atelier"],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ color: "#8C8376" }}>{k}</p>
                <p className="mt-1 font-medium">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto flex gap-2 text-[14px]">
            <span className="rounded-full px-4 py-2 text-white" style={{ background: "#8A6A3F" }}>Après</span>
            <span className="rounded-full border px-4 py-2" style={{ borderColor: "#D8CFBF" }}>Avant</span>
          </div>
        </div>

        <div className="grid grid-cols-2 grid-rows-[1.5fr_1fr] gap-3">
          {[0, 1, 2].map((i) =>
            photos?.[i] ? (
              // eslint-disable-next-line @next/next/no-img-element -- capturé en image
              <img key={i} src={photos[i]} alt="" className={`h-full w-full rounded-md object-cover ${i === 0 ? "col-span-2" : ""}`} />
            ) : (
              <div key={i} className={`rounded-md ${i === 0 ? "col-span-2" : ""}`} style={tone(["#A98A5F", "#8A6A3F", "#6E5635"][i], ["#E3D4B8", "#C9B99C", "#B8A07A"][i], [160, 20, 200][i])} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Maison Élan — carte (1280 × 800)                                          */
/* ------------------------------------------------------------------------ */

export function MenuMock({ photo }: { photo?: string }) {
  const c = { bg: "#14110F", ink: "#F3EBE0", muted: "#A79A8B", line: "#332C26", accent: "#C2703F" };
  const sections: [string, [string, string][]][] = [
    ["Pour commencer", [["Velouté de potimarron, noisettes torréfiées", "Du moment"], ["Truite fumée maison, crème crue", "Du marché"]]],
    ["Plats", [["Joue de bœuf confite, carottes glacées", "Du moment"], ["Merlu de ligne, beurre blanc aux herbes", "Arrivage"], ["Risotto de petit épeautre, champignons", "Végétarien"]]],
    ["Desserts", [["Poire rôtie, sablé breton", "Maison"], ["Chocolat noir, sel fumé", "Maison"]]],
  ];
  return (
    <div className="flex h-full w-full font-serif" style={{ background: c.bg, color: c.ink, fontFamily: "Georgia, serif" }}>
      <div className="relative w-[42%] shrink-0 overflow-hidden">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- capturé en image
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 55%, #14110F 100%)" }} />
        <span className="absolute left-10 top-9 text-[15px] font-semibold uppercase tracking-[0.24em]">Maison Élan</span>
      </div>
      <div className="flex flex-1 flex-col px-14 py-12">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] uppercase tracking-[0.24em]" style={{ color: c.accent }}>La carte · semaine 42</p>
          <span className="rounded-full px-5 py-2.5 text-[14px]" style={{ background: c.accent, color: c.bg }}>Réserver</span>
        </div>
        <p className="mt-5 text-[44px] leading-tight">La carte du moment</p>
        <p className="mt-2 text-[16px]" style={{ color: c.muted }}>Elle change chaque semaine, selon ce que les producteurs apportent.</p>
        <div className="mt-8 grid flex-1 gap-7">
          {sections.map(([title, items]) => (
            <div key={title}>
              <p className="text-[13px] uppercase tracking-[0.2em]" style={{ color: c.muted }}>{title}</p>
              {items.map(([dish, tag]) => (
                <div key={dish} className="mt-3 flex items-baseline justify-between border-b pb-3" style={{ borderColor: c.line }}>
                  <span className="text-[19px]">{dish}</span>
                  <span className="text-[13px] italic" style={{ color: c.muted }}>{tag}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Maison Élan — réservation d'une table, téléphone (390 × 800)             */
/* ------------------------------------------------------------------------ */

export function TableBookingMock() {
  const c = { bg: "#14110F", panel: "#1C1815", ink: "#F3EBE0", muted: "#A79A8B", line: "#332C26", accent: "#C2703F" };
  const times = ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];
  return (
    <div className="flex h-full w-full flex-col" style={{ background: c.bg, color: c.ink }}>
      <div className="px-6 pt-12">
        <p className="text-center text-[14px] font-semibold uppercase tracking-[0.24em]" style={{ fontFamily: "Georgia, serif" }}>Maison Élan</p>
        <p className="mt-8 text-[13px]" style={{ color: c.muted }}>Réserver une table</p>
        <p className="mt-1 text-[28px] leading-tight" style={{ fontFamily: "Georgia, serif" }}>Ce soir, à quelle heure ?</p>
      </div>
      <div className="mx-6 mt-6 flex items-center justify-between rounded-2xl border px-5 py-4" style={{ borderColor: c.line, background: c.panel }}>
        <div>
          <p className="text-[12px]" style={{ color: c.muted }}>Couverts</p>
          <p className="mt-0.5 text-[20px] font-medium">2 personnes</p>
        </div>
        <div className="flex gap-2">
          <span className="flex size-9 items-center justify-center rounded-full border text-[18px]" style={{ borderColor: c.line }}>−</span>
          <span className="flex size-9 items-center justify-center rounded-full border text-[18px]" style={{ borderColor: c.line }}>+</span>
        </div>
      </div>
      <div className="mx-6 mt-3 flex gap-2 text-[14px]">
        {["Ce soir", "Demain", "Sam. 18"].map((d, i) => (
          <span key={d} className="flex-1 rounded-xl border py-2.5 text-center" style={i === 0 ? { background: c.ink, color: c.bg, borderColor: c.ink } : { borderColor: c.line, color: c.muted }}>{d}</span>
        ))}
      </div>
      <div className="mx-6 mt-5 grid grid-cols-3 gap-2">
        {times.map((t) => (
          <span key={t} className="rounded-xl border py-3 text-center text-[16px]" style={t === "20:30" ? { background: c.accent, borderColor: c.accent, color: c.bg, fontWeight: 600 } : t === "20:00" ? { borderColor: c.line, color: "#6b625a", textDecoration: "line-through" } : { borderColor: c.line }}>{t}</span>
        ))}
      </div>
      <p className="mx-6 mt-4 text-[13px] leading-snug" style={{ color: c.muted }}>Une table en terrasse reste disponible à 20:30.</p>
      <div className="mt-auto px-6 pb-9">
        <div className="rounded-2xl py-4 text-center text-[16px] font-semibold" style={{ background: c.accent, color: c.bg }}>Confirmer · 20:30, 2 pers.</div>
        <p className="mt-3 text-center text-[12px]" style={{ color: c.muted }}>Confirmation immédiate par e-mail</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Thermia — fiche d'une demande (1280 × 800)                                */
/* ------------------------------------------------------------------------ */

export function QuoteDetailMock() {
  const steps = ["Reçue", "Qualifiée", "Visite", "Devis envoyé", "Accepté"];
  return (
    <div className="flex h-full w-full" style={{ background: ui.bg, color: ui.ink }}>
      <aside className="flex w-[232px] shrink-0 flex-col gap-1 border-r px-5 py-7" style={{ borderColor: ui.line }}>
        <div className="mb-8 flex items-center gap-2.5">
          <span className="size-7 rounded-md" style={{ background: ui.brand }} />
          <span className="text-[16px] font-semibold">Thermia</span>
        </div>
        {["Demandes", "Clients", "Devis", "Relances", "Planning"].map((item, i) => (
          <span key={item} className="rounded-md px-3 py-2.5 text-[15px]" style={i === 0 ? { background: ui.soft, fontWeight: 500 } : { color: ui.muted }}>{item}</span>
        ))}
      </aside>
      <div className="flex flex-1 flex-col px-10 py-8">
        <p className="text-[13px]" style={{ color: ui.muted }}>Demandes / DEM-0142</p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-[30px] font-semibold tracking-[-0.02em]">Rénovation salle de bain</p>
          <span className="rounded-lg px-4 py-2.5 text-[14px] font-medium text-white" style={{ background: ui.brand }}>Préparer le devis</span>
        </div>
        <div className="mt-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full text-[12px] font-semibold" style={i < 2 ? { background: ui.brand, color: "#fff" } : i === 2 ? { border: `2px solid ${ui.brand}`, color: ui.brand } : { border: `1.5px solid ${ui.line}`, color: ui.faint }}>{i < 2 ? "✓" : i + 1}</span>
              <span className="text-[13px]" style={{ color: i <= 2 ? ui.ink : ui.muted }}>{s}</span>
              {i < steps.length - 1 && <span className="h-px flex-1" style={{ background: i < 2 ? ui.brand : ui.line }} />}
            </div>
          ))}
        </div>
        <div className="mt-8 grid flex-1 grid-cols-[1.25fr_1fr] gap-6">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border p-5" style={{ background: ui.panel, borderColor: ui.line }}>
              <p className="text-[14px] font-medium">Demande du client</p>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#3B3833" }}>Remplacer la baignoire par une douche à l&apos;italienne, reprendre le carrelage et changer le meuble vasque. Appartement au 3ᵉ étage, sans ascenseur.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
                {["Formulaire du site", "Photos jointes : 4", "Surface : 6 m²"].map((t) => (
                  <span key={t} className="rounded-md px-2.5 py-1" style={{ background: ui.soft }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-5" style={{ background: ui.panel, borderColor: ui.line }}>
              <p className="text-[14px] font-medium">Notes internes</p>
              <p className="mt-2 text-[14px]" style={{ color: ui.muted }}>Évacuation à vérifier sur place. Prévoir un créneau de visite en fin de matinée.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-xl p-5" style={{ background: ui.warnSoft }}>
              <p className="text-[14px] font-medium" style={{ color: ui.warn }}>Informations manquantes</p>
              <ul className="mt-2 space-y-1.5 text-[14px]" style={{ color: "#6a3a22" }}>
                <li>• Dimensions exactes de la pièce</li>
                <li>• Type de chauffage actuel</li>
              </ul>
              <p className="mt-3 text-[13px] font-medium" style={{ color: ui.warn }}>Relance envoyée automatiquement hier</p>
            </div>
            <div className="rounded-xl border p-5" style={{ background: ui.panel, borderColor: ui.line }}>
              <p className="text-[14px] font-medium">Prochaine action</p>
              <p className="mt-2 text-[20px] font-semibold">Visite jeudi 14 · 11:00</p>
              <p className="mt-1 text-[13px]" style={{ color: ui.muted }}>Technicien : Karim · rappel la veille</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Thermia — interventions du jour, téléphone (390 × 800)                    */
/* ------------------------------------------------------------------------ */

export function TechnicianMock() {
  const jobs: [string, string, string, boolean][] = [
    ["08:30", "Entretien chaudière", "Rue des Tanneurs", true],
    ["10:15", "Fuite sous évier", "Place du Marché", true],
    ["11:00", "Visite · salle de bain", "Avenue Foch, 3ᵉ ét.", false],
    ["14:30", "Remplacement ballon", "Chemin des Vignes", false],
  ];
  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#0F1418", color: "#EDF1F4" }}>
      <div className="px-6 pt-12">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold uppercase tracking-[0.22em]">Thermia</span>
          <span className="rounded-full px-3 py-1 text-[12px]" style={{ background: "#1d2932", color: "#93A2AD" }}>Karim</span>
        </div>
        <p className="mt-8 text-[13px]" style={{ color: "#93A2AD" }}>Jeudi 14</p>
        <p className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">4 interventions</p>
      </div>
      <div className="mx-6 mt-6 flex flex-col gap-3">
        {jobs.map(([t, what, where, done]) => (
          <div key={t} className="flex gap-4 rounded-2xl border px-4 py-4" style={{ borderColor: "#25303A", background: done ? "#121a20" : "#161D23", opacity: done ? 0.65 : 1 }}>
            <span className="text-[15px] font-semibold" style={{ color: done ? "#93A2AD" : "#E39B5B" }}>{t}</span>
            <div className="flex-1">
              <p className="text-[15px] font-medium">{what}</p>
              <p className="text-[13px]" style={{ color: "#93A2AD" }}>{where}</p>
            </div>
            <span className="text-[12px]" style={{ color: done ? "#6fb58a" : "#93A2AD" }}>{done ? "Fait" : "À venir"}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto px-6 pb-9">
        <div className="rounded-2xl py-4 text-center text-[16px] font-semibold" style={{ background: "#E39B5B", color: "#0F1418" }}>Démarrer la visite de 11:00</div>
        <p className="mt-3 text-center text-[12px]" style={{ color: "#93A2AD" }}>Photos, mesures et signature sur place</p>
      </div>
    </div>
  );
}
