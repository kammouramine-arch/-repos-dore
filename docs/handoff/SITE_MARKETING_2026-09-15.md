# Site marketing — passe de finition premium (2026-09-15)

Le site existant est conservé : même marque, mêmes textes, mêmes formules et
prix (`@/lib/billing/plans`), mêmes liens et mêmes pages SEO. La passe porte
sur la composition, la lumière, le mouvement et la démonstration du produit.
Aucune dépendance ajoutée : CSS (transform/opacité), `IntersectionObserver`,
`requestAnimationFrame`.

## Composants

| Fichier | Rôle |
| --- | --- |
| `src/components/marketing/motion.tsx` | `Reveal` (apparition au défilement), `CountUp`/`CountEuros`, `useReducedMotion`, `usePointerVariables`. |
| `src/components/marketing/hero-backdrop.tsx` | Atmosphère du héros : base claire, lueur bleue guidée par le pointeur, deux formes dérivantes, motif « voix → information → document » masqué au centre. |
| `src/components/marketing/product-stage.tsx` | Surface logicielle du héros : perspective de deux degrés au pointeur (souris seulement), halo, trois repères flottants à partir de 1440 px. |
| `src/components/marketing/app-preview.tsx` | Aperçu vivant : dictée → préparation → devis créé → envoyé → consulté → relance ; ne tourne que visible, onglet actif, non survolé ; état final fixe sous `prefers-reduced-motion`. |
| `src/components/marketing/workflow.tsx` | Parcours en six étapes (Parlez, Ajoutez, DEVISERA structure, Envoyez, Suivez, Relancez) : liste d'onglets accessible, avance seule, panneaux produit. |
| `src/components/marketing/feature-visuals.tsx` | Extraits d'interface pour la grille des fonctionnalités. |
| `src/components/marketing/faq-item.tsx` | Accordéon animé (`grid-template-rows`), bouton `aria-expanded`, panneau `role="region"`. |
| `src/components/marketing/sections.tsx` | `SectionHeading` (révélé, ton clair/sombre), `FeatureCard` (avec `visual`), réexport de `FaqItem`. |
| `src/components/marketing/nav.tsx` | Transparente sur le héros, voile blanc flouté et hauteur compacte au défilement, section courante soulignée, menu mobile animé. |
| `src/components/marketing/pricing.tsx` | Formule recommandée surélevée avec halo, prix mis en avant, boutons avec flèche. |
| `src/components/marketing/footer.tsx` | Filet lumineux, signature, colonnes hiérarchisées. |

Les utilitaires de mouvement vivent dans `src/app/globals.css`
(« Marketing — mouvement et profondeur ») et sont tous désactivés sous
`prefers-reduced-motion: reduce`.

## Vérifications visuelles

Captures dans `captures-site-2026-09-15/` : héros 1440 et 1280, barre de
navigation défilée, fonctionnalités, parcours, récupération, tarifs, FAQ
ouverte, pages complètes tablette (834) et mobile (390), héros sous
réduction de mouvement. Aucun débordement horizontal ni erreur console aux
quatre largeurs ; `/tarifs`, `/logiciel-devis-artisan` et `/assistance`
rendent sans erreur avec les composants partagés.

Contrôles : `tsc`, `eslint`, 464 tests unitaires, 16 tests e2e (chromium et
mobile), `next build`.
