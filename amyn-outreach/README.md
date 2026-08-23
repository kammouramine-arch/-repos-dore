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

## 3. L'opérateur

Une mission commerciale en une phrase :

```bash
npm run amyn -- "Prospecte les coiffeurs indépendants de Lille"
```

L'opérateur enchaîne alors, en s'arrêtant **avant** l'envoi :

```
RECHERCHE → QUALIFICATION → AUDIT → CONTACT → SCORE →
QUALIFICATION (passe finale) → RÉDACTION → CAMPAGNE → votre approbation
```

La qualification tourne deux fois volontairement : une première passe écarte
tout de suite ce qui est bloqué (opposition, contact récent) pour ne pas
auditer inutilement ; la seconde tranche une fois les preuves réunies.

### Le tour d'opérateur

```bash
npm run amyn -- tick        # ou : npm run amyn -- "Fais un tour"
```

Quatre jobs, dans cet ordre : lire la boîte → décider quoi faire des réponses
→ préparer les relances dues → vérifier la cohérence. **Aucun n'envoie
d'email.**

Chaque job pose un verrou en base (`JobRun.lockKey`). Deux crons qui se
chevauchent, un worker relancé après un crash, un double-clic : la seconde
exécution s'arrête sans rien refaire. Le verrou étant en base et non en
mémoire, il survit à un redémarrage. Les relances sont verrouillées à la
**journée**, pas à la minute.

### Décision

Pour chaque réponse, l'opérateur décide — sans jamais exécuter :

| Réponse | Décision | Sans validation ? |
|---|---|---|
| Intéressé, prix, rendez-vous | `REPLY` | seulement si vous l'activez |
| Refus poli | `STOP_SEQUENCE` | oui |
| Opposition | `BLACKLIST` | oui (ne rien envoyer est toujours permis) |
| Ambigu, inconnu, expéditeur non identifié | `HUMAN_REVIEW` | **jamais** |
| Rebond | `STOP_SEQUENCE` | oui |

Trois interdits que **rien** ne contourne, pas même un réglage :
l'opposition, les cas incertains, et l'absence de validation quand elle est
requise. Un test le vérifie en activant la réponse automatique et en
constatant que l'ambiguïté reste humaine.

### Politique d'envoi

```bash
npm run amyn -- policy                    # voir
npm run amyn -- policy dailyLimit 25      # modifier, à chaud
```

Plafond quotidien, délai entre envois, fenêtre horaire, week-end, nombre et
délai de relances, délai de recontact, score minimum, réponse automatique.
Stockée en base : modifiable sans redéploiement.

**`autoReplyEnabled` vaut `false` par défaut.** Toute réponse rédigée attend
votre validation.

### Centre de contrôle

`/operator` — l'état de la chaîne d'envoi, les missions, chaque conversation
avec sa décision et sa réponse proposée, les derniers tours, la politique.
Actions : **Rédiger · Approuver · Écarter · Ne plus contacter**.

---

## 4. Piloter l'agent

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

## 5. Lancer une première campagne de test

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

## 6. Passer à l'envoi réel

### Contrôle avant lancement

```bash
npm run amyn -- preflight
```

Dix points vérifiés. Un seul point rouge empêche le départ — et le même
contrôle s'exécute automatiquement dans `runCampaign` dès que `DRY_RUN=false` :
une campagne réelle mal configurée s'arrête **avant** le premier email.

Ce qui bloque : transport incohérent, expéditeur différent du compte SMTP
(SPF/DKIM échoueraient), IMAP absent en envoi réel (une opposition ne serait
jamais vue), politique absurde (fenêtre vide, délai < 30 s, plafond > 200,
plus de 4 relances, recontact < 30 jours), plafond trop haut en phase pilote,
aucun email de test effectué.

### Délivrabilité

```bash
npm run amyn -- dns
```

Interroge réellement le DNS de `amyn.agency` et rapporte SPF, DKIM, DMARC, MX.
Pour chaque enregistrement manquant, il donne l'hôte, le type et la valeur
exacte à poser.

**Aucune promesse** : ces enregistrements évitent d'être rejeté d'emblée. Ils
ne garantissent pas l'arrivée en boîte principale — cela dépend aussi de la
réputation, du volume, du contenu et du destinataire.

### Le pilote

```bash
npm run amyn -- pilot
```

Sélectionne au maximum **5 prospects** — plafond en dur, non contournable par
la configuration. Exclut ceux en opposition, déjà contactés, sans email, ayant
déjà répondu, et nomme chaque exclusion avec sa raison. Les emails restent en
attente d'approbation ; la campagne pilote ne relance pas.

### Montée en volume — manuelle, jamais automatique

Rien n'augmente le volume tout seul. Vous décidez, palier par palier, et
seulement si le palier précédent s'est bien passé.

| Palier | `dailyLimit` | Passez au suivant si |
|---|---|---|
| Pilote | 5 | les 5 emails partent, aucune erreur SMTP, les réponses arrivent et sont classées |
| Semaine 1 | 10 | 0 rebond dur, 0 plainte, taux d'opposition < 5 % |
| Semaine 2 | 20 | idem, et les réponses `NEEDS_HUMAN` restent rares |
| Semaine 3 | 30 | idem |
| Régime | 40–50 | ne dépassez pas 50/jour sur un domaine de PME |

```bash
npm run amyn -- policy dailyLimit 10
npm run amyn -- report --jours=7     # avant chaque palier
```

Tant que moins de 20 envois réels ont eu lieu, le contrôle refuse un plafond
supérieur à 5.

### Reporting

```bash
npm run amyn -- report
```

Aucune métrique inventée : un taux sans base de calcul affiche
**« indisponible »**, jamais 0 %. Les envois simulés ne comptent pas comme des
envois. Le rapport liste explicitement ce qu'il ne peut pas mesurer — les
ouvertures et les clics ne le sont pas, aucun pixel de traçage n'est inséré.

### La séquence complète

```bash
npm run amyn -- preflight                    # 1. cohérence
npm run amyn -- dns                          # 2. SPF/DKIM/DMARC
npm run amyn -- smtp-check                   # 3. identifiants SMTP
npm run amyn -- imap-check                   # 4. identifiants IMAP
npm run amyn -- test-email contact@amyn.agency   # 5. un email de test
# → vérifiez qu'il arrive, et PAS en spam
npm run amyn -- policy dailyLimit 5          # 6. plafond pilote
# → puis DRY_RUN=false dans .env
npm run amyn -- preflight                    # 7. re-contrôle en mode réel
npm run amyn -- pilot                        # 8. sélection de 5 prospects
npm run amyn -- campaign approve <slug>      # 9. après relecture
npm run amyn -- campaign send <slug>         # 10. envoi réel
npm run amyn -- tick                         # 11. surveillance
```

---

### Fonctionnement automatique

```bash
npm run worker                        # une passe (pour un cron)
npm run worker -- --loop              # boucle continue (pour un service)
```

Un tour = lire la boîte → décider des réponses → préparer les relances dues →
vérifier la cohérence. **Le worker n'envoie jamais.** Il prépare et s'arrête ;
l'envoi reste une action que vous déclenchez après approbation.

Deux fichiers prêts à l'emploi :

| Fichier | Usage |
|---|---|
| `ops/crontab.example` | toutes les 15 min en semaine, un tour le samedi, rapport hebdo, contrôle quotidien |
| `ops/amyn-worker.service` | service systemd en boucle, redémarrage automatique |

Les jobs sont idempotents : deux crons qui se chevauchent, un redémarrage en
plein tour, un double lancement — rien n'est refait deux fois.

---

## 6 bis. Détail du basculement

Trois verrous indépendants doivent tomber, dans cet ordre.

```bash
# 1. Configurer SMTP dans .env — jamais dans le code, jamais dans Git
#    Valeurs OVHcloud pour une boîte MX Plan / Zimbra :
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@amyn.agency      # l'adresse complète, pas un login court
SMTP_PASSWORD=…

# 2. Basculer le transport
MAIL_TRANSPORT=smtp

# 3. Vérifier la connexion SANS rien envoyer (fonctionne en DRY_RUN=true)
npm run amyn -- smtp-check

# 4. Une fois la connexion validée seulement, ouvrir la vanne puis tester
DRY_RUN=false
npm run amyn -- test-email contact@amyn.agency
```

`smtp-check` ouvre une connexion, s'authentifie et referme : aucun message
n'est transmis, aucun destinataire n'est contacté. C'est l'étape à faire avant
de toucher au verrou.

Autres solutions OVHcloud : Email Pro utilise `proN.mail.ovh.net` et Hosted
Exchange `exN.mail.ovh.net`. Le serveur exact est indiqué dans votre espace
client OVHcloud.

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

## 7. Après la signature

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

## 8. Lire les réponses reçues

AMYN lit la boîte `contact@amyn.agency` en **lecture seule** et transforme les
réponses en événements CRM. Aucun message n'est supprimé, déplacé, ni marqué
comme lu — vos emails restent intacts dans votre client habituel.

```bash
# 1. Configurer l'accès dans .env (valeurs OVHcloud MX Plan / Zimbra)
IMAP_HOST=ssl0.ovh.net
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=contact@amyn.agency
IMAP_PASSWORD=…

# 2. Vérifier la connexion SANS rien lire
npm run amyn -- imap-check

# 3. Lire les nouvelles réponses
npm run amyn -- sync-replies

# 4. État du centre de tri
npm run amyn -- inbox
```

Ou en langage naturel : `npm run amyn -- "Vérifie les nouvelles réponses"`.

### Ce que fait la lecture

| Étape | Garantie |
|---|---|
| Citation retirée | Le texte de notre email d'origine est coupé **avant** analyse. Sans cela, notre propre « Répondez STOP » serait lu comme une opposition du prospect. |
| Déduplication | Le `Message-ID` est la clé unique. Une relecture complète de la boîte ne crée aucun doublon. |
| Rattachement | Uniquement sur preuve : adresse enregistrée dans une fiche, ou adresse à laquelle nous avons réellement écrit. Un domaine partagé par deux prospects est **refusé** plutôt que deviné. |
| Expéditeur inconnu | La réponse est conservée sans prospect (`matchedBy: NONE`) plutôt que perdue ou rattachée au hasard. |
| Opposition | Traitée **avant** tout le reste, et même si l'expéditeur est inconnu. |
| Aucun envoi | Les modules de lecture n'importent pas le mailer. Un test le vérifie. |

### Voir le parcours complet en une commande

```bash
npm run demo
```

Rejoue la chaîne entière sur une base **jetable** (`prisma/demo.db`, supprimée
à la fin) : 7 prospects, audit prouvé, emails rédigés, campagne bloquée sans
approbation, envoi simulé, 7 réponses réalistes lues dans une boîte simulée,
classement, mise à jour CRM, blocage d'un envoi après opposition, calcul des
relances. Votre base de travail n'est jamais touchée, aucun email ne part,
aucun accès réseau.

### Catégories

`INTERESTED` · `PRICE_REQUEST` · `MEETING_REQUEST` · `QUESTION` · `POSITIVE` ·
`LATER` · `NOT_INTERESTED` · `NEGATIVE` · `OPT_OUT` · `BOUNCE` ·
`NEEDS_HUMAN` · `UNKNOWN`

Un message **contradictoire** (des expressions favorables et défavorables sans
qu'aucune ne l'emporte) devient `NEEDS_HUMAN` : l'agent ne tranche pas au
hasard. Un message dont rien n'est reconnu devient `UNKNOWN`.

L'opposition et le rebond ne sont **jamais** dégradés par cette règle : dans le
doute, on protège le destinataire.

### Action recommandée

Chaque réponse porte une action suggérée — **jamais exécutée** :
`INTERESTED → Proposer un appel`, `QUESTION → Préparer une réponse`,
`NOT_INTERESTED → Arrêter la séquence`, `OPT_OUT → Aucune action — blacklist`,
`NEEDS_HUMAN → Intervention humaine requise`.

Aucune réponse automatique n'est envoyée à personne.

---

## 9. Opposition et RGPD

```bash
npm run amyn -- optout contact@exemple.fr
npm run amyn -- reply contact@exemple.fr "Désinscrivez-moi"
```

Une opposition ajoute l'adresse (ou le domaine) à `Suppression`, bascule le
prospect en `OPTOUT`, et bloque définitivement tout envoi futur — y compris
les relances. Chaque email de prospection porte une mention de
désinscription, sans quoi il est refusé.

---

## 10. Ce qui tourne sans rien configurer

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
| Lecture des réponses (IMAP) | ⚙️ prête, verrouillée | `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD` dans `.env` |
| Qualification des prospects | ✅ | rien |
| Décision sur les réponses | ✅ | rien |
| Rédaction des réponses et relances | ✅ | rien |
| Politique d'envoi | ✅ | rien |
| Jobs idempotents | ✅ | un cron pour les déclencher (voir §12) |
| **Réponse automatique** | ⚙️ prête, désactivée | `policy autoReplyEnabled true` — après validation manuelle prolongée |
| CRM, projets, onboarding, Care | ✅ | rien |

L'interface et le CLI disent toujours l'état réel : une capacité qui dépend
d'une clé absente est affichée comme indisponible, jamais comme fonctionnelle.

---

## 11. Interface

| Page | Contenu |
|---|---|
| `/` | Tableau de bord : prospection, commercial, revenus, envois, réponses à traiter, journal |
| `/agent` | Console d'instruction, exécutions récentes, matrice d'autonomie |
| `/operator` | Centre de contrôle : missions, conversations, décisions, réponses proposées, jobs, politique |
| `/prospects` | Fiches, filtres par statut |
| `/prospects/[id]` | Toutes les vérifications avec verdict et preuve, score détaillé, email généré, historique |
| `/campaigns` | Campagnes, membres, emails, journal d'envoi avec rapports de conformité |
| `/clients` | Portefeuille, projets, avancement, onboarding, documents, échéancier, Care |
| `/replies` | Centre de traitement : inbox, catégorie, prospect, aperçu, confiance, action recommandée, états NEW / REVIEWED / ACTION_REQUIRED / RESOLVED |
| `/replies/[id]` | Détail d'une réponse : message nettoyé, expressions détectées, action suggérée, provenance IMAP, opposition |
| `/activity` | Journal complet, filtrable par niveau et par module |
| `/settings` | Ce qui marche, ce qui manque, ce qu'il faut configurer |

---

## 12. Développement

```bash
npm run dev          # serveur de développement
npm run build        # build de production
npm run typecheck    # TypeScript, zéro erreur attendue
npm run lint         # ESLint, zéro avertissement toléré
npm test             # 264 tests, base isolée, aucun appel réseau
npm run demo         # rejoue TOUT le parcours sur une base jetable
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

## 13. Architecture

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
  policy/     politique d'envoi centralisée, modifiable à chaud
  qualification/ le prospect mérite-t-il d'être contacté ?
  operator/   orchestrateur de mission + moteur de décision
  scheduler/  jobs idempotents (verrou en base)
  imap/       lecture seule de la boîte (config, client, parsing)
  replies/    classement, rattachement, ingestion, synchronisation
  crm/        clients, projets, tâches, onboarding, documents
  agent/      intentions, planification, autonomie, exécuteurs
prisma/       schéma et seed de démonstration
scripts/      CLI `amyn` et lanceur de tests
tests/        264 tests
```
