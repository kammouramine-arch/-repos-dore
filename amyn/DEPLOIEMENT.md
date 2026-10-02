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

## Informations légales

Identité officielle (2 octobre 2026), dans l'objet `legal` de
`src/lib/legal.ts` : Amine Kammour, entrepreneur individuel (EI), nom
commercial AMYN, SIREN 130 867 757, SIRET 130 867 757 00010, 18 rue
Blériot, 59139 Wattignies. Hébergeur : Vercel Inc. (objet `hosting`).

```bash
cd amyn
npm run check:launch
```

La commande liste ce qui manque encore. À compléter dès que disponible :

1. `phone` — numéro de téléphone publiable (LCEN, art. 1-1). Tant qu'il
   manque, la page Mentions légales reste en `noindex` et hors du plan du
   site.
2. `vatMention` ou `vatNumber` — « TVA non applicable, art. 293 B du CGI »
   en franchise en base, sinon le numéro de TVA intracommunautaire.
3. `registration` — seulement si l'activité est immatriculée au RCS
   (activité commerciale) : « RCS de … ».

Puis mettre à jour `LEGAL_UPDATED`, lancer `npm test` et
`npm run check:launch`, et pousser sur la branche de production.

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
