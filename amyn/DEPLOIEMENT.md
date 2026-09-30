# Mise en ligne d'AMYN

## État constaté

| Élément | État |
|---|---|
| Domaine `amyn.agency` | Pointe vers Vercel (`216.198.79.1`), redirige vers `www.amyn.agency` |
| HTTPS | Actif (certificat Vercel, HSTS) |
| Hébergeur | Vercel (en-têtes `server: Vercel`) |
| Messagerie | OVH (enregistrements MX `mx*.mail.ovh.net`) |
| Version en ligne | Le dernier commit poussé sur `claude/amyn-official-website-k4cbwx` |

> ⚠️ La version en ligne correspond au dernier commit poussé sur la
> branche ci-dessus : **un push sur cette branche est probablement une mise
> en production.** Vérifier dans Vercel (Project → Settings → Git →
> Production Branch) avant de pousser.

Le projet Next.js vit dans le sous-dossier **`amyn/`** (Root Directory du
projet Vercel).

## Informations légales en attente

```bash
cd amyn
npm run check:launch
```

La commande liste ce qui manque encore. Le site ne montre jamais
d'emplacement « à compléter » : les pages disent en toutes lettres que
l'entreprise est en cours de création (`registrationPending` dans
`src/lib/legal.ts`), et les mentions légales restent en `noindex` (hors du
plan du site) tant que des champs obligatoires manquent.

Dès réception des identifiants, compléter l'objet `legal` de
`src/lib/legal.ts` :

1. `legalForm` — forme juridique (ex. « Entrepreneur individuel (EI) »).
2. `siren`, `siret` — tels qu'ils figurent sur l'avis de situation.
3. `registration` — immatriculation au RNE (et RCS le cas échéant).
4. `vatMention` ou `vatNumber` — « TVA non applicable, art. 293 B du CGI »
   en franchise en base, sinon le numéro de TVA intracommunautaire.
5. `address` — adresse publiable de l'établissement (domiciliation
   possible ; ne pas publier une adresse privée non choisie pour cela).
6. `phone` — numéro de téléphone publiable (LCEN, art. 1-1).

Puis `npm test`, `npm run check:launch`, commit et push sur la branche de
production. Les mentions légales repassent alors automatiquement en
indexable et dans le plan du site. Mettre aussi à jour `LEGAL_UPDATED`.

## Activer l'envoi des formulaires

Le formulaire « Recevoir un premier aperçu » arrive dans la boîte existante **contact@amyn.agency**,
par le serveur d'envoi d'OVHcloud (`ssl0.ovh.net`, port 465). Le domaine
publie déjà SPF (`include:mx.ovh.com`), DKIM OVH et DMARC : aucun service
tiers, aucune nouvelle adresse, aucun changement DNS.

1. Vercel → Project → Settings → Environment Variables → ajouter
   `SMTP_PASSWORD` = mot de passe de la boîte contact@amyn.agency,
   type **Sensitive**, environnements **Production** et **Preview**.
2. Redéployer la preview, envoyer une demande de test depuis
   `/premier-apercu` (`/contact` y redirige), vérifier son arrivée dans la
   boîte (expéditeur « Site AMYN », « Répondre » écrit au demandeur).

> Repli : si `SMTP_PASSWORD` n'est pas défini mais que `RESEND_API_KEY`
> l'est (configuration de la version précédente du site), les demandes
> partent par l'API Resend (expéditeur `CONTACT_FROM_EMAIL`), toujours vers
> contact@amyn.agency avec le demandeur en Reply-To.
>
> Si le mot de passe de la boîte change, mettre à jour la variable.
> Ne jamais committer de secret : `.env*` est ignoré par git.

## Après la mise en ligne

- Déclarer le site dans Google Search Console et soumettre
  `https://www.amyn.agency/sitemap.xml`.
- Une fois les mentions complétées, vérifier que `/mentions-legales` n'est
  plus en `noindex` (confidentialité, conditions et cookies sont déjà
  indexables).
