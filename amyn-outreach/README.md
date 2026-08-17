# AMYN Outreach

Agent opérationnel interne d'AMYN (Web & Growth, Lille) : il trouve des
entreprises réelles, audite leur présence en ligne **avec preuves**, trouve
leur email professionnel **sans jamais le deviner**, rédige un email vérifié,
le soumet à votre approbation, l'envoie, classe les réponses, puis prend en
charge le client signé jusqu'à la livraison et le suivi.

> **Le site vitrine AMYN.agency est un projet séparé. Ce dépôt ne le touche
> pas.** Tout AMYN Outreach vit dans le dossier `amyn-outreach/`.

---

## 1. La règle qui gouverne tout le système

**Aucune invention.** L'agent ne peut affirmer que ce qu'il a vérifié.

Ce n'est pas une consigne écrite dans un prompt : c'est une contrainte de
structure.

| Garantie | Comment elle est tenue |
|---|---|
| Un problème signalé est prouvé | Un `Issue` ne peut exister que s'il est lié à un `AuditCheck` de verdict `VERIFIED` ou `NOT_FOUND`, portant un type, un titre, une observation, une méthode et une URL. Le moteur **refuse** et déclasse tout résultat qui prétend signaler un problème sans preuve. |
| Un email ne cite que des faits | Avant envoi, `verifyEmail()` rejoue la vérification sur le corps réel : problèmes cités inexistants, chiffres non justifiés, promesses, superlatifs, urgence artificielle, absence de désinscription, absence d'identité AMYN. |
| Une adresse email n'est jamais devinée | Aucune source (OSM, Places, Sirene) ne fournit d'email. L'agent lit uniquement les pages que l'entreprise publie elle-même (contact, mentions légales) et conserve l'URL + l'extrait. Sans email fiable, le prospect passe en `BLOCKED` avec la raison. |
| Un chiffre est mesuré, pas estimé | Exemple réel produit par la règle `tech.response_time` : *« Page d'accueil chargée en 4,20 s (4 203 ms), 139 Ko de HTML, mesuré le 2026-08-17T10:35:41Z depuis le serveur d'audit AMYN via une requête HTTP GET unique, sans exécution de JavaScript ni chargement des images. »* |
| Rien n'est silencieux | Toute action importante écrit dans `ActivityLog` (module, acteur, résumé, niveau) — y compris les refus. |
| Rien de contractuel n'est automatique | Signature de contrat et paiement sont `APPROVAL_REQUIRED` par construction. Les documents naissent en `DRAFT`, les paiements en `PAYMENT_PENDING`. |

---

## 2. Démarrer

```bash
cd amyn-outreach
cp .env.example .env      # laisser DRY_RUN=true
npm install
npm run setup             # génère Prisma, crée la base, installe 3 prospects DEMO
npm run dev               # http://localhost:3000
```

`npm run setup` est sans risque : le seed ne supprime que les lignes
`isDemo: true`.

### Vérifier l'état du système

```bash
npm run amyn -- doctor    # ce qui marche, ce qui manque, et pourquoi
npm run amyn -- status    # état du pipeline en chiffres
```

---

## 3. Piloter l'agent

Une instruction en français, depuis la page **Agent** (`/agent`) ou en ligne
de commande :

```bash
npm run amyn -- "Trouve 20 coiffeurs à Lille"
npm run amyn -- "Audite les prospects"
npm run amyn -- "Cherche les emails professionnels"
npm run amyn -- "Prépare les emails"
npm run amyn -- "Prépare une campagne pour Lille"
npm run amyn -- "Nouveau client. Entreprise : Studio Nord. Offre : PREMIUM. Prends le relais."
npm run amyn -- "Fais le point"
```

L'agent traduit l'instruction en plan d'actions, exécute ce qu'il a le droit
d'exécuter, **s'arrête sur tout ce qui demande votre validation**, et trace
l'ensemble dans `AgentRun` / `AgentAction`.

Une instruction non comprise n'est jamais interprétée au hasard : elle est
enregistrée en `UNKNOWN` avec la liste des formulations reconnues.

### Matrice d'autonomie

Modifiable à chaud en base (table `Setting`, clé `autonomy.<action>`), sans
redéploiement. Visible sur `/agent` et `/settings`.

Verrouillés en `APPROVAL_REQUIRED` par défaut : `campaign.send`,
`campaign.followup`, `send.test`, `document.sign_contract`, `payment.charge`,
`payment.refund`, `delivery.publish`, `prospect.delete`.

---

## 4. Lancer une première campagne de test

```bash
# 1. Trouver des entreprises réelles (OpenStreetMap, aucune clé requise)
npm run amyn -- "Trouve 10 restaurants à Lille"

# 2. Auditer : 19 règles, chaque constat avec sa preuve
npm run amyn -- audit --all

# 3. Chercher les emails publiés par les entreprises elles-mêmes
npm run amyn -- contacts

# 4. Scorer et recommander une offre
npm run amyn -- score

# 5. Rédiger — un email par prospect, à partir de SES problèmes prouvés
npm run amyn -- draft

# 6. Créer la campagne, puis relire chaque email sur /campaigns
npm run amyn -- "Prépare une campagne pour Lille"
npm run amyn -- campaign list

# 7. Approuver (APPROVE), puis envoyer (SEND)
npm run amyn -- campaign approve <slug>
npm run amyn -- campaign send <slug>
```

Tant que `DRY_RUN=true`, l'étape 7 **simule** : chaque envoi produit un
`SendLog` en `SIMULATED` avec son rapport de conformité complet, et le
prospect ne passe pas en `CONTACTED`.

---

## 5. Passer à l'envoi réel

Trois verrous indépendants doivent tomber, dans cet ordre.

```bash
# 1. Configurer SMTP dans .env — jamais dans le code, jamais dans Git
SMTP_HOST=proN.mail.ovh.net        # N = numéro de votre serveur OVHcloud
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@amyn.agency
SMTP_PASSWORD=…

# 2. Basculer le transport
MAIL_TRANSPORT=smtp

# 3. Tester la chaîne AVANT d'ouvrir la vanne (toujours en DRY_RUN)
npm run amyn -- test-email contact@amyn.agency
```

Si le test arrive dans votre boîte et pas en spam, alors seulement :

```bash
DRY_RUN=false
npm run amyn -- doctor      # doit afficher « envoi réel possible »
```

Le bandeau de l'interface passe alors en rouge : **ENVOI RÉEL ACTIF**.

Même à ce stade, chaque email passe par les **12 contrôles de conformité** :
`DEMO_GUARD`, `CHECK_EMAIL_PRESENT`, `CHECK_SOURCE`, `CHECK_EMAIL_VALIDITY`,
`CHECK_OPT_OUT`, `CHECK_STATUS`, `CHECK_DUPLICATE`, `CHECK_RELEVANCE`,
`CHECK_CONTENT`, `CHECK_APPROVAL`, `CHECK_CAMPAIGN`, `CHECK_RATE_LIMIT`.
Un seul échec = pas d'envoi, et un `SendLog` en `BLOCKED` qui dit lequel.

---

## 6. Après la signature

```bash
npm run amyn -- "Nouveau client. Entreprise : Studio Nord. Offre : PREMIUM. Prends le relais."
npm run amyn -- client list
npm run amyn -- client project <projectId>
npm run amyn -- client onboarding <projectId> <clé> "valeur"
npm run amyn -- client advance <projectId>
```

La création d'un client génère automatiquement : le projet, son plan de
tâches par phase (ONBOARDING → CONTENT → PRODUCTION → QA → DELIVERY), la
checklist d'onboarding, le devis, le brief, le contrat (en brouillon, à
valider) et l'échéancier (en attente, jamais encaissé).

Une tâche qui dépend d'une information client reste `BLOCKED` tant que
l'information n'est pas reçue : l'agent ne fabrique pas de contenu à la place
du client.

---

## 7. Opposition et RGPD

```bash
npm run amyn -- optout contact@exemple.fr
npm run amyn -- reply contact@exemple.fr "Désinscrivez-moi"
```

Une opposition ajoute l'adresse (ou le domaine) à `Suppression`, bascule le
prospect en `OPTOUT`, et bloque définitivement tout envoi futur — y compris
les relances. Chaque email de prospection porte une mention de
désinscription, sans quoi il est refusé.

---

## 8. Ce qui tourne sans rien configurer

| Capacité | État | Ce qu'il faut |
|---|---|---|
| Recherche d'entreprises | ✅ OpenStreetMap (Overpass) | rien — source ouverte, ODbL |
| Recherche élargie | ⚙️ prête, inactive | `GOOGLE_PLACES_API_KEY` |
| Données légales entreprise | ⚙️ prête, inactive | `SIRENE_API_KEY` (INSEE, gratuit) |
| Audit de présence en ligne | ✅ 19 règles | rien |
| Découverte d'email | ✅ pages publiques | rien |
| Scoring et recommandation d'offre | ✅ | rien |
| Rédaction — moteur template | ✅ déterministe | rien |
| Rédaction — Claude | ⚙️ prête, inactive | `ANTHROPIC_API_KEY` |
| Vérification anti-invention | ✅ | rien |
| Campagnes, conformité, opt-out | ✅ | rien |
| Envoi simulé | ✅ | rien |
| **Envoi réel** | ⚙️ prêt, verrouillé | SMTP + `MAIL_TRANSPORT=smtp` + `DRY_RUN=false` |
| Lecture automatique des réponses | ❌ non construit | une intégration IMAP ; en attendant, `npm run amyn -- reply` |
| CRM, projets, onboarding, Care | ✅ | rien |

L'interface et le CLI disent toujours l'état réel : une capacité qui dépend
d'une clé absente est affichée comme indisponible, jamais comme fonctionnelle.

---

## 9. Interface

| Page | Contenu |
|---|---|
| `/` | Tableau de bord : prospection, commercial, revenus, envois, réponses, journal |
| `/agent` | Console d'instruction, exécutions récentes, matrice d'autonomie |
| `/prospects` | Fiches, filtres par statut |
| `/prospects/[id]` | Toutes les vérifications avec verdict et preuve, score détaillé, email généré, historique |
| `/campaigns` | Campagnes, membres, emails, journal d'envoi avec rapports de conformité |
| `/clients` | Portefeuille, projets, avancement, onboarding, documents, échéancier, Care |
| `/replies` | Réponses classées avec les expressions qui ont déclenché le classement + liste d'opposition |
| `/activity` | Journal complet, filtrable par niveau et par module |
| `/settings` | Ce qui marche, ce qui manque, ce qu'il faut configurer |

---

## 10. Développement

```bash
npm run dev          # serveur de développement
npm run build        # build de production
npm run typecheck    # TypeScript, zéro erreur attendue
npm run lint         # ESLint, zéro avertissement toléré
npm test             # 137 tests, base isolée, aucun appel réseau
npm run db:studio    # explorer la base
npm run amyn -- rules   # lister les 19 règles d'audit
```

Les tests s'exécutent sur `prisma/test.db` via `scripts/run-tests.ts`. Un
garde-fou dans `tests/helpers.ts` **refuse de démarrer** si `DATABASE_URL` ne
pointe pas sur une base de test — la base de travail ne peut pas être effacée
par erreur.

### Ajouter une règle d'audit

1. Écrire la règle dans `lib/audit/rules/<catégorie>.ts` (elle doit retourner
   une observation factuelle, une méthode, et une preuve).
2. L'ajouter à `ALL_RULES` dans `lib/audit/rules/index.ts`.
3. Ajouter son type de problème à `ISSUE_TYPES` et son angle de rédaction à
   `lib/email/angles.ts`.

Les tests vérifient automatiquement que toute nouvelle règle respecte le
contrat de preuve.

---

## 11. Architecture

```
app/          pages Next.js (App Router, composants serveur)
components/   éléments d'interface partagés
lib/
  research/   sources de prospects (OSM, Google Places, Sirene)
  audit/      moteur d'audit — http, html, rules/, engine, persist
  contact/    découverte d'email (jamais de supposition)
  scoring/    score justifié + recommandation d'offre
  email/      angles, génération (template & Claude), vérification
  campaign/   conformité, envoi, relances
  mailer/     transports interchangeables (dry-run, SMTP)
  replies/    classement déterministe des réponses
  crm/        clients, projets, tâches, onboarding, documents
  agent/      intentions, planification, autonomie, exécuteurs
prisma/       schéma et seed de démonstration
scripts/      CLI `amyn` et lanceur de tests
tests/        137 tests
```
