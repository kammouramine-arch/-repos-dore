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

### Le parcours principal

```
OUVRIR DEVISIA → NOUVEAU DEVIS → PARLER → IA → VÉRIFIER → ENVOYER
   → CLIENT CONSULTE → CLIENT ACCEPTE → NOTIFICATION → RELANCE SI NÉCESSAIRE → CHIFFRE D'AFFAIRES
```

---

## Architecture

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

## Technologies

- **Next.js 16** (App Router, Server Components, Server Actions) · **React 19** · **TypeScript strict**
- **Tailwind CSS 4** + design system maison (Radix UI pour les primitives accessibles, Lucide pour les icônes)
- **PostgreSQL** + **Prisma 6**
- **Zod 4** pour la validation des entrées
- **pdf-lib** pour la génération de PDF (aucun navigateur headless requis)
- **Recharts** pour la visualisation
- **Stripe** pour les abonnements · **Resend** pour les emails · **S3** pour le stockage
- **Vitest** (unitaire + intégration) et **Playwright** (bout en bout)

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
| `AI_PROVIDER` / `ANTHROPIC_API_KEY` | Génération enrichie et analyse des photos | — |
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
- **`AI_PROVIDER=anthropic`** — génération structurée via appel d'outil, analyse des photos de
  chantier. Renseigner `ANTHROPIC_API_KEY`.
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

Sur Vercel, ajouter à `vercel.json` :

```json
{ "crons": [{ "path": "/api/cron/relances", "schedule": "0 * * * *" }] }
```

---

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

1. Base PostgreSQL managée (Supabase, Neon, RDS…). Si un pooler est utilisé, renseigner `DIRECT_URL`
   pour les migrations.
2. Variables d'environnement de production, `APP_URL` en `https://` (active les cookies `Secure`).
3. `npm run db:deploy` au déploiement.
4. Webhook Stripe et tâche planifiée des relances.
5. Bucket de stockage privé.

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
