# AMYN Outreach

Outil interne de prospection AMYN. **Projet totalement indépendant** du site
présent à la racine du dépôt : aucun fichier existant n'est modifié.

> **Lot 1 — socle & dashboard.** Aucun système d'envoi réel n'existe encore.

---

## Démarrer

```bash
cd amyn-outreach
npm install
cp .env.example .env      # DRY_RUN=true est déjà la valeur par défaut
npm run setup             # génère le client Prisma, crée la base, installe les 3 fiches de démo
npm run dev               # → http://localhost:3000
```

## Commandes

| Commande            | Effet                                                        |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Serveur de développement sur http://localhost:3000            |
| `npm run build`     | Build de production                                           |
| `npm run setup`     | Génère + crée la base + installe les données de démonstration |
| `npm run db:seed`   | Réinstalle uniquement les 3 fiches de démonstration           |
| `npm run db:reset`  | Efface **toute** la base puis réinstalle la démo              |
| `npm run db:studio` | Explorateur visuel de la base (Prisma Studio)                 |
| `npm run typecheck` | Vérification TypeScript                                       |

## Sécurité d'envoi

Deux verrous indépendants, actifs par défaut :

1. `DRY_RUN=true` force le transport de simulation, quel que soit `MAIL_TRANSPORT`.
2. **Aucun transport réel n'est implémenté.** `SmtpMailer` lève une erreur si on
   l'appelle. Passer `DRY_RUN=false` ne suffirait donc pas à envoyer un email.

Aucune dépendance SMTP (nodemailer, etc.) n'est installée dans le projet.

## Structure

```
amyn-outreach/
├── app/
│   ├── page.tsx              Dashboard : compteurs + pipeline
│   ├── prospects/            Liste filtrable par statut
│   ├── prospects/[id]/       Fiche : diagnostic, preuves, email, sources, historique
│   ├── settings/             État du système d'envoi + feuille de route
│   └── globals.css           Design system (graphite + accent or)
├── components/               Sidebar, badges, tableau, cartes
├── lib/
│   ├── constants.ts          Statuts, offres AMYN, types de problèmes
│   ├── config.ts             Configuration + verrou d'envoi
│   ├── db.ts                 Client Prisma
│   ├── prospects.ts          Requêtes (compteurs, liste, fiche)
│   ├── mailer/               Transport interchangeable (dry-run | smtp)
│   ├── audit/                → lot 2
│   ├── sources/ contact/     → lot 3
│   └── ai/                   → lot 4
├── prisma/
│   ├── schema.prisma         Modèle de données
│   └── seed.ts               3 fiches de démonstration fictives
└── data/amyn.db              Base SQLite (jamais commitée)
```

## Modèle de données

| Table         | Rôle                                                              |
| ------------- | ----------------------------------------------------------------- |
| `Prospect`    | La fiche entreprise et son statut                                  |
| `Issue`       | Un problème constaté, **toujours accompagné d'une preuve**         |
| `Source`      | Origine de chaque information (obligation RGPD)                    |
| `EmailDraft`  | Brouillon généré + liste des `Issue` réellement citées             |
| `SendLog`     | Journal de tout envoi ou simulation                                |
| `StatusEvent` | Historique complet des changements de statut                       |
| `Suppression` | Liste noire — une adresse ici n'est jamais recontactée             |

**Règle structurelle :** un email ne peut citer qu'un problème présent dans
`Issue` avec sa preuve. Ce n'est pas seulement une consigne donnée à l'IA, c'est
une contrainte du modèle de données.

## Statuts

`FOUND` → `RESEARCHED` → `READY` → `APPROVED` → `SENT` → `REPLIED` /
`INTERESTED` / `NOT_INTERESTED` / `BOUNCED`

## Données de démonstration

Les 3 fiches installées par `npm run db:seed` sont **entièrement fictives**.
Tous les domaines utilisent le TLD réservé `.invalid` (RFC 2606), qui ne peut
par définition jamais être enregistré ni résolu : aucune de ces adresses ne peut
recevoir de message. Chaque fiche porte `isDemo = true` et le préfixe `[DEMO]`.

Aucune recherche de prospection réelle n'a été effectuée.

## Feuille de route

| Lot | Contenu                                        | État     |
| --- | ---------------------------------------------- | -------- |
| 1   | Socle, base, dashboard, fiche prospect         | terminé  |
| 2   | Moteur d'audit de site + preuves               | à venir  |
| 3   | Recherche de prospects + email public          | à venir  |
| 4   | Rédaction par claude-opus-5 + vérification     | à venir  |
| 5   | Transport SMTP OVHcloud / Zimbra               | à venir  |
| 6   | Écran d'approbation + envoi progressif         | à venir  |
