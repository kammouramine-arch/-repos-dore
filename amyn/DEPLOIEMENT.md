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

## Avant d'ouvrir la nouvelle version au public

```bash
cd amyn
npm run check:launch
```

La commande liste tout ce qui manque. Aujourd'hui :

1. **Mentions légales** — dans `src/lib/legal.ts`, objet `legal` :
   dénomination, forme juridique, adresse, SIREN (et SIRET,
   immatriculation, TVA ou mention d'exonération selon le statut),
   directeur de la publication.
2. **Conditions des services** — objet `terms` : paiement, propriété
   intellectuelle, responsabilité, résiliation, droit applicable. À rédiger
   idéalement avec un conseil juridique.
3. **Hébergeur** — vérifier l'adresse de Vercel indiquée dans `hosting`,
   puis passer `verified: true`.
4. **Durées de conservation** — `retention` : valider les durées
   annoncées dans la politique de confidentialité, puis les appliquer dans
   la boîte mail et l'outil de prospection.
5. **Envoi des formulaires** — voir ci-dessous (`SMTP_PASSWORD`).

Tant que les mentions légales sont incomplètes, les pages concernées
affichent des emplacements « [À COMPLÉTER — …] », sont en `noindex` et
absentes du plan du site.

## Activer l'envoi des formulaires

Les deux formulaires arrivent dans la boîte existante **contact@amyn.agency**,
par le serveur d'envoi d'OVHcloud (`ssl0.ovh.net`, port 465). Le domaine
publie déjà SPF (`include:mx.ovh.com`), DKIM OVH et DMARC : aucun service
tiers, aucune nouvelle adresse, aucun changement DNS.

1. Vercel → Project → Settings → Environment Variables → ajouter
   `SMTP_PASSWORD` = mot de passe de la boîte contact@amyn.agency,
   type **Sensitive**, environnements **Production** et **Preview**.
2. Redéployer la preview, envoyer une demande de test depuis
   `/premier-apercu` et depuis `/contact`, vérifier leur arrivée dans la
   boîte (expéditeur « Site AMYN », « Répondre » écrit au demandeur).

> Si le mot de passe de la boîte change, mettre à jour la variable.
> Ne jamais committer de secret : `.env*` est ignoré par git.

## Après la mise en ligne

- Déclarer le site dans Google Search Console et soumettre
  `https://amyn.agency/sitemap.xml`.
- Une fois les mentions complétées, vérifier que `/mentions-legales`,
  `/confidentialite` et `/conditions-services` ne sont plus en `noindex`.
