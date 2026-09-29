# AMYN — site public (amyn.agency)

Site vitrine d'AMYN Agency : sites web, applications et outils digitaux
conçus autour de la façon dont chaque entreprise fonctionne.

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Aucune
dépendance d'exécution en dehors de Next et React : pas de bibliothèque
d'animation, pas d'analytics, pas de script tiers.

## Commandes

```bash
npm install
npm run dev           # http://localhost:3000
npm run build         # build de production
npm run lint
npm run typecheck
npm test              # tests unitaires (node --test)
npm run check:launch  # échoue tant que les mentions légales sont incomplètes
```

## Où modifier quoi

| Sujet | Fichier |
|---|---|
| Nom, e-mail, réseaux sociaux | `src/lib/site.ts` |
| Adresses FR/EN de chaque page | `src/lib/i18n/routes.ts` |
| Textes des pages (FR et EN) | `src/lib/i18n/dictionary.ts` |
| Textes de l'en-tête, du sélecteur et du formulaire | `src/lib/i18n/ui.ts` |
| Services / réalisations en anglais | `src/lib/services.en.ts`, `src/lib/projects.en.ts` |
| Témoignages clients | `src/lib/testimonials.ts` |
| Les sept services et le contenu de leurs pages | `src/lib/services.ts` |
| Prix (devis / à partir de / fixe) | `pricing` de chaque service, formats dans `src/lib/pricing.ts` |
| Réalisations (et leur nature : concept, client…) | `src/lib/projects.ts` |
| FAQ de l'accueil | `src/lib/faq.ts` |
| Méthode et engagements | `src/lib/method.ts` |
| Mentions légales, conditions, durées de conservation | `src/lib/legal.ts` |
| Inventaire des cookies et traceurs | `src/lib/trackers.ts` |
| Couleurs, typographie, animations | `src/app/globals.css` |
| Logo (monogramme) | `src/components/layout/Logo.tsx`, `src/app/icon.svg` |
| Photos (Unsplash) et leurs crédits | `public/photos/`, `src/lib/photos.ts` |
| Captures des concepts | `src/lib/visuals.ts`, `public/visuals/` |

### Changer un prix

Chaque service porte un objet `pricing`. Au lancement, tous sont
`{ mode: "quote", visible: true }` et affichent « Sur devis ». Pour
afficher « À partir de 1 200 € HT » :

```ts
pricing: { mode: "startingFrom", amount: 1200, taxLabel: "HT", visible: true },
```

Aucune page n'est à retoucher.

### Publier une réalisation client

Ajouter un objet à `projects` avec `kind: "client"` — uniquement avec
l'accord du client, et sans résultat chiffré non vérifié.

## Règles de contenu

- Aucun faux client, témoignage, avis, logo, chiffre ou résultat.
- Aucune promesse de classement Google, de trafic, d'avis ou
  d'acceptation sur les stores. Les tests (`tests/content.test.mts`)
  échouent si ces formulations apparaissent.
- Les projets conceptuels sont toujours présentés comme tels.

## Cookies

Le site ne dépose aucun cookie et ne charge aucune ressource tierce
(vérifié en navigateur). Tout ajout d'outil de mesure ou de contenu
externe doit être déclaré dans `src/lib/trackers.ts` et, s'il n'est pas
strictement nécessaire, ne se charger qu'après consentement (accepter /
refuser / personnaliser, et un lien « Gérer mes cookies » permanent).

## Langues : français et anglais

- Français à la racine (`/`, `/services`, `/realisations`…), anglais sous
  `/en` avec des adresses anglaises (`/en/services`, `/en/work`,
  `/en/first-look`…). La correspondance est dans `src/lib/i18n/routes.ts`.
- Deux racines d'application (`src/app/(fr)` et `src/app/en`) : `<html
  lang>` est juste dès le HTML servi et toutes les pages restent statiques.
  Les pages elles-mêmes sont partagées (`src/views`) ; seules les pages
  légales ont un texte par langue (`src/views/legal`).
- La langue suit la navigation par l'adresse : aucun cookie, aucun
  stockage, aucune redirection selon le navigateur.
- SEO : chaque page déclare sa canonique et ses versions `fr`, `en` et
  `x-default` (français) ; le plan du site liste les deux langues.
- Ajouter un texte : l'ajouter en français dans `dictionary.ts` ; le type
  de l'anglais en dérive, la compilation échoue tant qu'il manque.
- Les pages légales anglaises sont des traductions de courtoisie : la
  version française fait foi. Les futures clauses des conditions devront
  aussi être traduites.

## Témoignages

Tout est dans `src/lib/testimonials.ts`. Règle : un témoignage
`verified: false` n'est jamais publié en production — il n'apparaît
qu'en développement et sur les prévisualisations Vercel, sous une mention
« brouillon » visible. La section disparaît d'elle-même tant qu'aucun
témoignage vérifié n'existe dans la langue (la numérotation des chapitres
reste continue). Pour publier un vrai témoignage : remplacer le texte,
le nom, l'entreprise, la fonction (et la note ou la source si le client
les a réellement données), puis passer `verified: true`. Les textes
actuels sont des brouillons de mise en page : aucun n'est vérifié.

Vérification locale d'un build avec les brouillons :
`AMYN_SHOW_DRAFT_TESTIMONIALS=1 npm run build`.

## Visuels

Deux sources d'images, toutes deux libres d'utilisation :

- **Photos** (`public/photos/`) : banque Unsplash, licence Unsplash
  (usage commercial autorisé, sans attribution obligatoire). Chaque
  fichier et son auteur sont listés dans `src/lib/photos.ts`.
- **Captures des concepts** (`public/visuals/`) : écrans conçus par AMYN
  en HTML (`src/components/visuals/`) puis figés en images. Après une
  modification d'une maquette :

  ```bash
  npm run dev                          # premier terminal
  npm i --no-save playwright-core      # une fois
  node scripts/capture-visuals.mjs     # tous les écrans, ou des ids précis
  ```

  La route `/capture/[id]` qui sert de support n'existe qu'en
  développement (404 en production, exclue du robots.txt).

Aucune image n'est reprise d'un moteur de recherche.

## Formulaires

Un seul parcours : `/premier-apercu` (formulaire en trois étapes, sans
question de budget) → `POST /api/premier-apercu`. L'ancienne adresse
`/contact` redirige (301) vers `/premier-apercu`.
Remise à la boîte contact@amyn.agency par le serveur d'envoi OVHcloud, côté serveur uniquement (voir `DEPLOIEMENT.md`).
Sans `SMTP_PASSWORD` : la demande est écrite dans la console en
développement ; en production, le formulaire affiche un message invitant
à écrire à contact@amyn.agency.

Le formulaire existe en anglais (`/en/first-look`) : messages et libellés
traduits, mais les valeurs envoyées restent en français et la demande reçue
indique « Langue : Anglais — répondre en anglais ».

Liens de campagne : `/premier-apercu?source=outreach` signale qu'on arrive
d'un message d'AMYN ; `&business=Nom` pré-remplit l'entreprise ;
`&besoin=<slug de service>` pré-coche le besoin. Ne jamais placer de
donnée personnelle dans une adresse.
