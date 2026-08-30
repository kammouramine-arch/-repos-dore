# DEVISIA

**L'IA qui transforme votre travail en devis.**
Ne perdez plus un client faute de temps.

DEVISIA est une application SaaS destinée aux artisans et aux petites entreprises de services
françaises. L'artisan décrit son chantier à l'oral, ajoute des photos, et l'application prépare un
devis professionnel qu'il vérifie, envoie, suit et relance — depuis le chantier, en moins d'une
minute.

---

## Sommaire

- [Ce que fait le produit](#ce-que-fait-le-produit)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données, migrations et seed](#base-de-données-migrations-et-seed)
- [Configuration de l'IA](#configuration-de-lia)
- [Configuration des emails](#configuration-des-emails)
- [Configuration du stockage](#configuration-du-stockage)
- [Configuration de Stripe](#configuration-de-stripe)
- [Tâches planifiées](#tâches-planifiées)
- [Tests](#tests)
- [Scripts](#scripts)
- [Déploiement](#déploiement)
- [Checklist de mise en production](#checklist-de-mise-en-production)
- [Décisions de conception](#décisions-de-conception)
- [Limites connues](#limites-connues)

---

## Ce que fait le produit

| Domaine | Couverture |
| --- | --- |
| **Devis par IA** | Description libre, dictée vocale, photos de chantier. Rapprochement automatique avec le catalogue de prix de l'entreprise. |
| **Éditeur de devis** | Lignes modifiables, réordonnables, duplicables ; remises, TVA multi-taux, acompte, marge estimée. |
| **PDF** | Génération d'un devis PDF conforme (mentions légales, ventilation de TVA, zone « bon pour accord »), à l'image de l'entreprise. |
| **Page client** | URL publique sécurisée par jeton, acceptation / refus / demande de modification en ligne, suivi des consultations. |
| **Relances** | Séquences configurables (24 h, 3 j, 7 j), messages rédigés puis validés par l'utilisateur, jamais envoyés seuls par défaut. |
| **Récupération de CA** | Calcul permanent du chiffre d'affaires envoyé sans réponse, par client et par devis. |
| **Clients / Prospects** | Fiches complètes, pipeline commercial, conversion prospect → client + chantier, formulaire public de demande de devis. |
| **Catalogue de prix** | Articles, prix d'achat/vente, marges, import/export CSV, mots-clés utilisés par le moteur de rapprochement. |
| **Tableau de bord** | CA gagné et potentiel, taux d'acceptation, panier moyen, tunnel de conversion, activité récente. |
| **Assistant** | Questions en langage naturel répondues à partir des données réelles de l'entreprise. |
| **Multi-tenant** | Organisations, rôles (propriétaire / administrateur / membre), isolation vérifiée côté serveur. |
| **Abonnements** | Trois formules, période d'essai, quotas d'usage, Stripe Checkout + portail + webhooks. |
| **Administration** | Espace interne DEVISIA : entreprises, abonnements, usage IA, erreurs. |

### DEVISIA mobile

L'application mobile n'est ni une WebView ni un site responsive : c'est une
application React Native qui parle au même backend.

| Capacité | Détail |
| --- | --- |
| Dictée | Enregistrement natif, transcription serveur, gestion explicite des refus de permission |
| Photos | Appareil photo et galerie, compression avant envoi, retrait individuel |
| Devis | Génération par IA, vérification, enregistrement, envoi |
| Partage | Feuille de partage native (WhatsApp, Messages, email, copie du lien) |
| Relances | Rédaction assistée avec choix du ton, envoi après validation |
| Notifications | Push iOS et Android, badge d'application, désinscription à la déconnexion |
| Abonnement | Consommation, changement de formule, portail de facturation, résiliation |
| Session | Jeton stocké dans le trousseau iOS / Keystore Android |

### Le parcours principal

```
OUVRIR DEVISIA → NOUVEAU DEVIS → PARLER → IA → VÉRIFIER → ENVOYER
   → CLIENT CONSULTE → CLIENT ACCEPTE → NOTIFICATION → RELANCE SI NÉCESSAIRE → CHIFFRE D'AFFAIRES
```

---

## Architecture

DEVISIA est un dépôt à trois briques : une application web, une application
mobile et un paquet de code partagé, tous adossés au même backend et à la même
base PostgreSQL.

```
.
├── src/                 Application web + backend (Next.js, API, services)
├── mobile/              Application iOS et Android (Expo, React Native)
├── packages/shared/     Code partagé web ↔ mobile (TypeScript pur)
└── prisma/              Schéma, migrations et données de démonstration
```

Le paquet partagé contient ce qui ne doit jamais diverger entre les plateformes :

| Module | Contenu |
| --- | --- |
| `money.ts` | Moteur financier : centimes entiers, TVA multi-taux, remises, marges |
| `plans.ts` | Formules, prix, limites et fonctionnalités |
| `entitlements.ts` | Droits d'accès, essai gratuit, montée et descente en gamme |
| `contracts.ts` | Types exacts des réponses de l'API |
| `api-client.ts` | Client d'API typé utilisé par le mobile |
| `labels.ts` | Libellés métier (statuts de devis, de prospects, tons de relance) |

```
src/
├── app/
│   ├── (marketing)/        Landing page, tarifs, pages SEO métier, pages légales
│   ├── (auth)/             Inscription, connexion, mot de passe, vérification email
│   ├── (app)/              Espace applicatif protégé + espace d'administration
│   ├── devis/[token]/      Page publique du devis (client final)
│   ├── demande/[token]/    Formulaire public de demande de devis
│   └── api/                API REST (validation Zod, erreurs typées)
├── components/
│   ├── ui/                 Design system (bouton, champ, carte, dialogue, toast…)
│   ├── app/                Composants applicatifs (shell, éditeur, capture, graphiques)
│   └── marketing/          Composants de la vitrine
├── lib/
│   ├── ai/                 Abstraction fournisseur IA, prompts, anti-injection, moteur local
│   ├── auth/               Sessions, mots de passe, jetons, permissions
│   ├── billing/            Configuration centrale des formules + client Stripe
│   ├── email/              Abstraction fournisseur email + modèles français
│   ├── storage/            Abstraction stockage (disque / S3) + validation des fichiers
│   ├── messaging/          Abstraction SMS / WhatsApp (extension future)
│   ├── pdf/                Génération du PDF de devis
│   ├── i18n/               Locales, dictionnaires, formatage
│   ├── money.ts            Cœur financier déterministe (centimes, TVA, remises, marges)
│   └── errors.ts           Erreurs applicatives typées
└── server/
    ├── services/           Logique métier (devis, relances, clients, prospects, facturation…)
    ├── api.ts              Enveloppe des routes API
    ├── dto.ts              Sérialisation Prisma → objets simples
    └── validation.ts       Schémas Zod partagés
```

### Principes structurants

1. **L'IA propose, le système calcule.** Aucun montant n'est produit par un modèle : `lib/money.ts`
   effectue toutes les multiplications, remises, TVA et totaux en arithmétique entière sur des
   centimes.
2. **Le catalogue de l'entreprise fait foi.** Une ligne proposée est rapprochée d'un article du
   catalogue ; à défaut, l'application demande le prix au lieu de l'inventer.
3. **Aucune logique métier dans les composants.** Les pages appellent des services ; les services
   appellent Prisma.
4. **Isolation stricte des organisations.** Chaque requête filtre sur `organizationId`, vérifié
   côté serveur, jamais sur la base d'un paramètre client.
5. **Tout contenu externe est non fiable.** Descriptions, photos, messages clients sont neutralisés
   et encapsulés avant d'atteindre un modèle (`lib/ai/sanitize.ts`).

---

## Cycle commercial

```
Inscription → Onboarding → 7 jours d'essai → Utilisation → Abonnement
```

- **Essai de 7 jours, sans carte bancaire.** `trialStartedAt` et `trialEndsAt`
  sont enregistrés à la création de l'entreprise ; l'échéance est calculée par
  `packages/shared/src/entitlements.ts`, seule source de vérité.
- **À l'expiration**, l'écriture se ferme (création et envoi de devis, relances)
  et la page d'abonnement s'ouvre. **Rien n'est supprimé** : les données restent
  lisibles et exportables.
- **Changement de formule** : la montée en gamme prend effet immédiatement avec
  proratisation, la descente à la fin de la période déjà payée.
- **Résiliation** : par défaut à l'échéance, réversible d'un clic tant que la
  période court.
- **Paiement échoué** : l'abonnement passe en `past_due`, l'accès reste ouvert et
  un bandeau invite à mettre à jour le moyen de paiement.
- **Stripe est la seule source de vérité** de l'état d'abonnement : le frontend
  n'écrit jamais cet état, les webhooks sont vérifiés et idempotents.

## Technologies

- **Next.js 16** (App Router, Server Components, Server Actions) · **React 19** · **TypeScript strict**
- **Tailwind CSS 4** + design system maison (Radix UI pour les primitives accessibles, Lucide pour les icônes)
- **PostgreSQL** + **Prisma 6**
- **Zod 4** pour la validation des entrées
- **pdf-lib** pour la génération de PDF (aucun navigateur headless requis)
- **Recharts** pour la visualisation
- **Stripe** pour les abonnements · **Resend** pour les emails · **S3** pour le stockage
- **Vitest** (unitaire + intégration) et **Playwright** (bout en bout)
- **Expo SDK 57**, **React Native**, **expo-router** pour iOS et Android

Authentification maison : sessions serveur en base, cookies `httpOnly`, jetons hachés (SHA-256),
mots de passe `bcrypt` (12 tours), révocation globale au changement de mot de passe.

---

## Installation

```bash
# 1. Dépendances
npm install

# 2. Configuration
cp .env.example .env
#   → renseignez au minimum DATABASE_URL et AUTH_SECRET

# 3. Base de données
npm run db:migrate

# 4. Données de démonstration (facultatif, développement uniquement)
npm run db:seed

# 5. Démarrage
npm run dev
```

L'application est disponible sur <http://localhost:3000>.

Après le seed, un compte de démonstration est créé :

```
Entreprise : Plomberie Martin
Email      : demo@devisia.fr
Mot de passe : devisia-demo-2026
```

> Aucune clé d'API n'est nécessaire pour démarrer : sans fournisseur d'IA configuré, DEVISIA
> utilise son moteur local (rapprochement catalogue, extraction des quantités et des durées) et
> l'indique clairement dans l'interface.

---

## Variables d'environnement

Toutes les variables sont documentées dans [`.env.example`](./.env.example). Les essentielles :

| Variable | Rôle | Requis |
| --- | --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL | ✅ |
| `AUTH_SECRET` | Secret de session (`openssl rand -base64 48`) | ✅ |
| `APP_URL` | URL publique (emails, liens de devis, cookies sécurisés) | ✅ |
| `ANTHROPIC_API_KEY` | Génération enrichie et analyse des photos (Claude). Sa seule présence active le fournisseur ; `ANTHROPIC_MODEL` et `AI_PROVIDER` sont facultatifs | — |
| `TRANSCRIPTION_PROVIDER` / `TRANSCRIPTION_API_KEY` | Transcription audio serveur | — |
| `EMAIL_PROVIDER` / `RESEND_API_KEY` | Envoi réel des emails | Production |
| `STORAGE_PROVIDER` + `S3_*` | Stockage des fichiers | Production |
| `STRIPE_*` | Abonnements | Production |
| `CRON_SECRET` | Protection de la tâche de relance | Production |

Aucune clé secrète n'est exposée au client : seules les variables `NEXT_PUBLIC_*` traverseraient
cette frontière, et le projet n'en utilise aucune.

---

## Base de données, migrations et seed

```bash
npm run db:migrate     # crée/applique une migration en développement
npm run db:deploy      # applique les migrations en production
npm run db:reset       # réinitialise la base (destructif, développement)
npm run db:seed        # jeu de démonstration « Plomberie Martin »
npm run db:studio      # explorateur Prisma
```

Le schéma couvre 28 modèles : utilisateurs et sessions, organisations et membres, profil
d'entreprise, clients, prospects, chantiers, devis et lignes, événements de devis, catalogue de
prix, relances et automatisations, conversations, factures et paiements, abonnements et usage,
fichiers, requêtes IA, journal d'audit, notifications, intégrations, événements analytiques et
webhooks.

Les données financières ne sont jamais supprimées physiquement : suppression logique
(`deletedAt`) et refus de supprimer un devis accepté.

---

## Configuration de l'IA

`src/lib/ai/` expose une abstraction de fournisseur. Changer de moteur revient à ajouter un fichier.

```ts
interface AIProvider {
  generateStructuredOutput<T>(request): Promise<AIResult<T>>; // sortie JSON validée par Zod
  generateText(request): Promise<AIResult<string>>;
  analyzeImage(request): Promise<AIResult<ImageAnalysis>>;
}

interface TranscriptionProvider {
  transcribeAudio(request): Promise<AIResult<{ text: string }>>;
}
```

- **`AI_PROVIDER=local`** (défaut) — moteur interne : rapprochement du catalogue, extraction des
  quantités (`2 radiateurs`, `12 m²`) et des durées (`une heure`, `2h30`, `une demi-journée`),
  détection des informations manquantes. Aucun appel réseau.
- **Claude (Anthropic)** — génération structurée via appel d'outil, analyse des photos de
  chantier. Il suffit de définir `ANTHROPIC_API_KEY` dans l'environnement du serveur : le
  fournisseur s'active seul, et le moteur local reste le repli automatique en cas de panne, de
  quota atteint ou de clé invalide. `ANTHROPIC_MODEL` (défaut `claude-opus-5`) permet de choisir
  le modèle, `AI_PROVIDER=local` de désactiver Claude sans retirer la clé. La clé est lue
  uniquement côté serveur et n'est jamais transmise au navigateur ni à l'application mobile.
- **Transcription** — la dictée du navigateur est utilisée quand elle est disponible ; sinon
  l'audio est envoyé à `/api/ai/transcribe`, qui parle à une API compatible OpenAI
  (`TRANSCRIPTION_BASE_URL` est configurable : OpenAI, Groq, Whisper auto-hébergé…).

Garde-fous appliqués systématiquement : contenu client encapsulé dans une balise de données inerte,
filtrage des tentatives d'injection, interdiction d'inventer marque/modèle/puissance/référence,
remontée des informations manquantes dans `questions`, et **aucun calcul de montant par le modèle**.

---

## Configuration des emails

`EMAIL_PROVIDER=console` (défaut) journalise les emails sans rien envoyer. En production,
`EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` (domaine vérifié chez Resend).

Modèles disponibles, tous en français et responsive : bienvenue, vérification d'email,
réinitialisation de mot de passe, envoi de devis (PDF joint), relance, devis accepté,
nouveau prospect, invitation d'équipe, confirmation d'abonnement.

---

## Configuration du stockage

`STORAGE_PROVIDER=local` écrit dans `STORAGE_LOCAL_DIR` — pratique en développement, inadapté aux
plateformes à système de fichiers éphémère.

En production, `STORAGE_PROVIDER=s3` avec un bucket **privé** (AWS S3, Supabase Storage,
Cloudflare R2, MinIO — `S3_ENDPOINT` permet tous les compatibles). Les fichiers ne sont jamais
publics : ils passent par `/api/files/[id]` (contrôle d'organisation) ou par une URL signée de
courte durée. Chaque téléversement est validé (type MIME, extension, taille, signature binaire).

---

## Configuration de Stripe

1. Créer trois produits/tarifs récurrents mensuels correspondant aux formules
   (`ESSENTIEL`, `PRO`, `ENTREPRISE`) et renseigner `STRIPE_PRICE_*`.
2. Renseigner `STRIPE_SECRET_KEY`.
3. Créer un webhook vers `POST /api/webhooks/stripe` et renseigner `STRIPE_WEBHOOK_SECRET`.
   Événements écoutés : `checkout.session.completed`, `customer.subscription.*`,
   `invoice.payment_succeeded`, `invoice.payment_failed`.

En local :

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

La signature est vérifiée avant tout traitement, chaque événement est enregistré pour garantir
l'idempotence, et **l'état d'abonnement provient uniquement de Stripe** — jamais du frontend.

Les prix et quotas sont centralisés dans `src/lib/billing/plans.ts`.

---

## Tâches planifiées

`POST /api/cron/relances` traite les relances arrivées à échéance et expire les devis dépassés.
Protégé par `Authorization: Bearer $CRON_SECRET`.

Sur Vercel, la planification est déclarée dans `vercel.json` :

```json
{ "crons": [{ "path": "/api/cron/relances", "schedule": "0 7 * * *" }] }
```

Une exécution quotidienne, à 07:00 UTC (début de matinée en France), compatible avec le plan
Hobby de Vercel, qui refuse les expressions s'exécutant plus d'une fois par jour et applique une
précision à l'heure près (déclenchement entre 07:00 et 07:59 UTC). La route traite à chaque
passage **toutes** les relances arrivées à échéance depuis la précédente : le classement et le
contenu des relances sont inchangés, seule la fréquence de passage l'est. Un plan Pro permet de
revenir à `0 * * * *` pour un traitement horaire.

En dehors de Vercel, n'importe quel ordonnanceur convient (cron système, GitHub Actions,
Cloudflare Workers…) : il suffit d'appeler la route avec l'en-tête `Authorization`.

---

## Application mobile

```bash
cd mobile
cp .env.example .env            # EXPO_PUBLIC_API_URL vers votre API
npm install
npm start                       # Expo Go / build de développement
```

### Builds et publication

```bash
npx eas login
npx eas init                    # crée le projet EAS (une seule fois)

# URL de l'API, définie une fois côté EAS plutôt que figée dans le dépôt
npx eas env:create --name EXPO_PUBLIC_API_URL \
  --value https://devisia-bice.vercel.app \
  --environment production --environment preview --visibility plaintext

npm run build:preview           # APK Android + build interne iOS
npm run build:production        # builds stores
npm run submit:ios              # App Store Connect
npm run submit:android          # Google Play
```

La configuration native est prête (`app.config.ts`, `eas.json`) : identifiants de
bundle `fr.devisia.app` sur les deux plateformes, permissions rédigées en
français, icônes, écran de démarrage, schéma `devisia://`, canal de notification
Android, et retrait explicite des permissions Android superflues ajoutées par les
dépendances (`SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`), qui
alourdiraient inutilement la revue Google Play.

**Deux conditions côté Vercel avant tout build.** L'application mobile
s'authentifie par jeton porteur sur l'API : elle a besoin d'une URL qui réponde
en JSON, publiquement et durablement.

1. **Désactiver la protection de déploiement** — tant que *Vercel Authentication*
   est active, chaque appel d'API renvoie `401 Protected deployment` et une
   redirection vers `vercel.com/sso-api`. Aucune connexion n'est possible depuis
   l'application. Vercel → Project → Settings → Deployment Protection →
   *Vercel Authentication* → **Disabled** (les routes restent protégées par
   l'authentification de DEVISIA elle-même).
2. **Utiliser l'alias stable**, pas l'URL d'un déploiement. Vercel attribue à
   chaque déploiement une URL portant son empreinte
   (`devisia-<empreinte>-amyn1.vercel.app`) qui cesse de désigner la production
   au déploiement suivant ; un binaire publié sur les stores, lui, est figé.
   L'alias du projet se lit dans Vercel → Project → Domains.

**`EXPO_PUBLIC_API_URL` n'est pas versionnée.** Un build EAS échoue
volontairement si elle est absente, vaut `localhost`, n'est pas en HTTPS ou
désigne un déploiement précis plutôt que l'alias :
une application distribuée qui ne joint pas son backend s'installe sans erreur
et ne se voit qu'à l'usage. La contrepartie est qu'il faut la définir une fois,
avec la commande ci-dessus.

**Liens universels.** Ils sont volontairement absents : ils exigent un domaine
dont le projet est propriétaire, pour y publier les fichiers de vérification
d'Apple et de Google. Le schéma `devisia://` couvre la navigation interne. Pour
les activer plus tard, ajoutez `ios.associatedDomains` et
`android.intentFilters` dans `app.config.ts` une fois le domaine en place.

Seuls les identifiants de comptes développeur restent à renseigner — voir
« Credentials à fournir ».

## Tests

```bash
npm run test        # unitaires + intégration (Vitest)
npm run test:e2e    # parcours complet (Playwright, desktop + mobile)
npm run typecheck   # TypeScript strict
npm run lint        # ESLint
```

**Couverture actuelle**

- *Unitaires* — arithmétique monétaire (arrondis, TVA multi-taux, remises, marges, répartition sans
  perte), permissions par rôle, anti-injection de prompt, analyse du français (durées, quantités),
  rapprochement catalogue, moteur local de devis, gabarits de relance.
- *Intégration (base réelle)* — numérotation concurrente sans collision, cycle de vie du devis,
  isolation stricte entre organisations, import CSV du catalogue, génération PDF, envoi de devis,
  planification et traitement des relances, décision client, indicateurs du tableau de bord,
  webhooks Stripe et idempotence, quotas de formule.
- *Bout en bout* — inscription → onboarding → catalogue → client → devis par description →
  vérification → PDF → envoi → consultation par le client → acceptation → notification, joué en
  desktop et en mobile.

Les tests d'intégration utilisent la base `TEST_DATABASE_URL` et appliquent les migrations
automatiquement.

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Génération du client Prisma puis build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sans émission |
| `npm run test` | Vitest (unitaire + intégration) |
| `npm run test:e2e` | Playwright |
| `npm run db:migrate` / `db:deploy` / `db:reset` / `db:seed` / `db:studio` | Base de données |

---

## Déploiement

Compatible Vercel (ou toute plateforme Node 20+).

1. Base PostgreSQL managée (Supabase, Neon, RDS…) — voir « Base de données de production ».
2. Variables d'environnement de production, `APP_URL` en `https://` (active les cookies `Secure`).
3. `npm run db:deploy:production` une fois, avant le premier déploiement utile.
4. Webhook Stripe et tâche planifiée des relances.
5. Bucket de stockage privé.

### Base de données de production

Le schéma déclare deux connexions, et la distinction n'est pas cosmétique :

| Variable | Rôle | Forme attendue |
| --- | --- | --- |
| `DATABASE_URL` | Requêtes de l'application | Connexion **en pool**, port `6543`, avec `?pgbouncer=true` |
| `DIRECT_URL` | Migrations uniquement | Connexion **directe**, port `5432` |

Les fonctions serverless ouvrent beaucoup de connexions très courtes : sans
pooler, la base sature. Mais le mode transaction d'un pooler ne sait ni tenir
les verrous consultatifs de Prisma ni exécuter du DDL : une migration lancée à
travers lui échoue, ou s'arrête au milieu. D'où les deux URL.

Chez Supabase, les deux se lisent dans **Project Settings → Database →
Connection string → URI** : la case *Use connection pooling* cochée donne
`DATABASE_URL` (mode **Transaction**), décochée donne `DIRECT_URL`. Le mot de
passe est celui choisi à la création du projet ; il se régénère dans
**Database → Reset database password**.

#### Migrer la base de production

Deux chemins, au même résultat. Le second n'exige ni le dépôt ni Node, et le mot
de passe ne quitte jamais l'interface Supabase.

**Depuis le dépôt** — à privilégier lorsqu'on l'a déjà :

```bash
DIRECT_URL="postgresql://…:5432/postgres" npm run db:deploy:production
```

Le script refuse de partir si l'URL passe par un pooler, affiche les migrations
en attente avant de les appliquer, puis vérifie en base le nombre de tables, les
migrations achevées et une lecture applicative réelle. Les URL sont masquées
dans toutes ses sorties : aucun mot de passe n'apparaît dans un journal.

**Depuis l'éditeur SQL de Supabase** — pour une première initialisation sans
outillage local : copier `prisma/production-init.sql` dans **SQL Editor → New
query → Run**. Le fichier réunit toutes les migrations, crée la table
`_prisma_migrations` et y inscrit chaque migration avec sa somme de contrôle
réelle, si bien que `prisma migrate status` considère ensuite la base à jour et
que les migrations suivantes s'appliquent normalement. Il est transactionnel, et
refuse de s'exécuter si les tables DEVISIA existent déjà.

`prisma/production-init.sql` est régénéré par `npm run db:sql:production` après
toute nouvelle migration.

---

## Checklist de mise en production

- [ ] `AUTH_SECRET` généré aléatoirement et propre à l'environnement
- [ ] `APP_URL` en HTTPS
- [ ] `STORAGE_PROVIDER=s3` avec un bucket privé
- [ ] `EMAIL_PROVIDER=resend` avec un domaine d'envoi vérifié (SPF/DKIM)
- [ ] Webhook Stripe configuré et testé, tarifs renseignés
- [ ] `CRON_SECRET` défini et tâche planifiée active
- [ ] Sauvegardes automatiques de la base
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` au vert
- [ ] Mentions légales complétées par un conseil juridique (CGU, confidentialité, cookies)
- [ ] Compte administrateur plateforme créé (`isPlatformAdmin = true`) pour accéder à `/admin`
- [ ] Limitation de débit branchée sur un store partagé si plusieurs instances
  (`setRateLimitStore` dans `src/lib/rate-limit.ts`)

---

## Décisions de conception

- **Montants en centimes entiers.** Aucune valeur monétaire n'est manipulée en flottant ; les
  quantités passent par une arithmétique en millièmes. La remise globale est répartie au prorata
  avec correction du reliquat pour que la ventilation de TVA corresponde exactement au total.
- **Authentification maison plutôt qu'un fournisseur externe.** Sessions révocables en base,
  aucune dépendance à un service tiers pour se connecter, et un modèle de permissions explicite.
- **PDF sans navigateur headless.** `pdf-lib` produit un document léger, rapide et déployable en
  serverless, là où une solution Chromium alourdirait fortement l'exécution.
- **Mode dégradé assumé.** Sans clé d'IA, le produit reste pleinement utilisable et le signale :
  aucune fonctionnalité n'est simulée.
- **Français par défaut.** L'infrastructure i18n (locales, dictionnaires, formatage, sélecteur de
  langue) est en place ; l'interface applicative principale est traduite, le reste du produit est
  rédigé en français source.

---

## Credentials à fournir

Tout est intégré côté code : ces valeurs sont les seules choses qui manquent
pour un lancement commercial.

| Domaine | À renseigner | Où |
| --- | --- | --- |
| IA | `ANTHROPIC_API_KEY` (seule variable requise) | `.env` en local, variables d'environnement de l'hébergeur en production |
| Transcription | `TRANSCRIPTION_API_KEY` (+ `TRANSCRIPTION_PROVIDER=openai`) | `.env` |
| Emails | `RESEND_API_KEY`, `EMAIL_FROM` sur domaine vérifié | `.env` |
| Stockage | `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | `.env` |
| Paiements | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, les trois `STRIPE_PRICE_*` | `.env` |
| Push | `EXPO_ACCESS_TOKEN` (facultatif), clé APNs et compte de service FCM | `.env` + EAS |
| iOS | Compte Apple Developer, `appleId`, `ascAppId`, `appleTeamId` | `mobile/eas.json` |
| Android | Compte Google Play, `google-play-service-account.json` | `mobile/` (non versionné) |
| EAS | `EAS_PROJECT_ID` généré par `eas init` | `mobile/.env` |
| Tâches | `CRON_SECRET` | `.env` |

## Limites connues

- La facturation client (émission de factures à partir d'un devis accepté) est modélisée en base et
  visible dans les fiches, mais l'écran de création de facture reste à construire : le MVP se
  concentre sur le devis et la récupération de chiffre d'affaires.
- Les invitations d'équipe sont modélisées et affichées ; l'envoi et l'acceptation d'invitation
  restent à finaliser.
- Les intégrations autres que Stripe et Resend sont déclarées comme « bientôt disponibles » et ne
  sont volontairement pas simulées.
- La traduction anglaise couvre la coque applicative et les écrans principaux ; les contenus
  marketing et légaux sont en français.
