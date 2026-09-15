# Authentification Apple, Google et e-mail (2026-09-15)

## Ce qui existait

- Un compte = une adresse email unique + un mot de passe obligatoire
  (`users.passwordHash NOT NULL`). Session serveur de 30 jours, portée par
  cookie (web) ou jeton porteur (iOS). Inscription mobile : entreprise + mot
  de passe + code de vérification par email. Aucune identité fournisseur.
- Aiguillage : `verify_email → subscription → app`.

## Architecture d'identité

Le compte DEVISERA reste l'identité permanente. L'adresse email en est un
attribut ; les fournisseurs s'y rattachent.

| Table / champ | Rôle |
| --- | --- |
| `auth_identities` | `(provider, providerUserId)` unique → `users.id`. Adresse fournie, vérifiée, relais privé, jeton Apple chiffré. |
| `users.passwordHash` | Désormais optionnel : nul pour un compte Apple/Google sans mot de passe. |
| `organizations.setupPending` | Vrai pour une entreprise créée à la volée après Apple/Google, jusqu'à l'onboarding. |

Règles de rattachement (`src/server/services/identityService.ts`) :

1. Identité connue (fournisseur + `sub`) → ce compte, même si l'adresse a changé.
2. Adresse **vérifiée** par le fournisseur = adresse d'un compte DEVISERA
   **vérifié** → rattachement (les deux ont prouvé la même boîte). Une adresse
   de relais Apple suit la même règle.
3. Adresse d'un compte **jamais vérifié** → le compte est réclamé : mot de
   passe et sessions antérieurs révoqués, identité rattachée. Rattacher sans
   cela offrirait une porte à qui aurait pré-créé le compte.
4. Sinon création : utilisateur vérifié sans mot de passe, entreprise
   `setupPending` au nom provisoire (jamais une adresse relayée), puis
   onboarding.
5. Deux comptes existants ne sont jamais fusionnés. Une adresse Google non
   vérifiée n'est jamais rattachée.

Aiguillage : `verify_email → onboarding → subscription → app`.

## Vérification des jetons (serveur, aucun secret nécessaire)

- Apple : signature RS256 avec les clés publiques `appleid.apple.com`,
  `iss`, `aud` ∈ `APPLE_SIGN_IN_BUNDLE_IDS` (`fr.devisia.app`), `exp`, et
  `nonce` = SHA-256 du nonce brut généré sur l'iPhone. L'adresse Apple (réelle
  ou relayée) est considérée vérifiée : pas de code email après.
- Google : signature avec les clés `googleapis.com`, `iss`, `aud` ∈
  `GOOGLE_SIGN_IN_CLIENT_IDS`, `email_verified`. Pas de code email après.
- Routes : `POST /api/auth/apple`, `POST /api/auth/google`,
  `POST /api/auth/onboarding`. Limitées en débit comme la connexion.

## Suppression, déconnexion, révocation

- Suppression : un compte sans mot de passe supprime avec la session et le mot
  SUPPRIMER ; les identités sont détachées (la personne peut recréer un compte
  neuf). Si la clé Sign in with Apple est configurée, le jeton Apple conservé
  chiffré (AES-GCM, clé dérivée d'`AUTH_SECRET`) est révoqué (exigence
  App Store 5.1.1 (v)).
- Déconnexion : la session Google locale est oubliée pour ne pas resélectionner
  le même compte en silence.
- Connexion par mot de passe sur un compte sans mot de passe : refus générique
  (aucune révélation d'existence). « Mot de passe oublié » permet d'en créer un.

## iOS

- `usesAppleSignIn: true` → entitlement `com.apple.developer.applesignin`
  (EAS synchronise la capacité sur l'App ID). Bouton natif
  `AppleAuthenticationButton` (« Continuer avec Apple », libellé par iOS).
- Google : `@react-native-google-signin/google-signin` (feuille native, portées
  `email`/`profile` seulement). Le greffon n'est activé, et le bouton affiché,
  que si `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` est fourni au build.
- Écrans : `(auth)/index` (trois options), `bienvenue` (onboarding entreprise :
  nom, prénom/nom pré-remplis, téléphone, métier), `connexion` / `inscription`
  inchangés avec un retour vers l'entrée.

## Configuration manuelle requise

### Build TestFlight livré

Build 47 (1.0.1), EAS b32319ac-2373-4120-8304-7af7f18935c9, soumission
9d29258a-96de-449a-a644-d366a03ef923 terminée le 15 septembre 2026 à
16:54 UTC. Profil de provisionnement régénéré (Developer Portal
FVF33P2L4W) ; l'IPA embarque `com.apple.developer.applesignin = [Default]`,
`aps-environment = production`, localisations fr et en. Google reste
inactif tant que l'identifiant client iOS n'est pas fourni.

### Apple Developer (Certificates, Identifiers & Profiles)

1. **Fait le 15 septembre 2026.** Identifiers → App ID
   `fr.devisia.app` → cocher **Sign In with Apple** (Enable as a primary App
   ID) → Save. Les builds 44 (EAS 333c32e3-4e5d-4353-9b40-f2bbfeb59b66) et
   46 (68f4b966-e218-4e95-8901-5f24866196c3) ont échoué à la signature :
   « Provisioning profile … doesn't include the Sign In with Apple
   capability ». En mode non interactif, EAS ne synchronise pas les capacités
   de l'App ID avant de réutiliser le profil existant. Une fois la capacité
   cochée, Apple invalide le profil actuel et le build suivant le régénère
   avec l'entitlement : `cd mobile && eas build --platform ios --profile
   production --auto-submit --non-interactive` avec l'identifiant d'équipe
   Apple fourni à la CLI (variables `EXPO_APPLE_TEAM_ID` et
   `EXPO_APPLE_TEAM_TYPE`), ou `eas build -p ios --profile production` en
   interactif sur un Mac, qui synchronise la capacité tout seul.
2. **Hide My Email** : Services → *Sign in with Apple for Email
   Communication* → enregistrer le domaine `devisera.fr` et l'adresse
   d'envoi `contact@devisera.fr`, puis vérifier le SPF. Sans cela, les emails
   DEVISERA (codes, devis, relances) vers `@privaterelay.appleid.com` ne sont
   pas relayés.
3. Optionnel mais recommandé (révocation à la suppression) : Keys → nouvelle
   clé avec *Sign in with Apple* activé (Primary App ID `fr.devisia.app`) →
   télécharger le `.p8`. Renseigner `APPLE_SIGN_IN_TEAM_ID` (`9Q6YL8R33R`),
   `APPLE_SIGN_IN_KEY_ID`, `APPLE_SIGN_IN_PRIVATE_KEY` (contenu du `.p8`,
   sauts de ligne `\n`) sur Vercel.

### Google Cloud

1. APIs & Services → OAuth consent screen : application externe, nom
   DEVISERA, domaine `devisera.fr`, portées `email`, `profile`, `openid`.
2. Credentials → *Create OAuth client ID* → type **iOS**, bundle
   `fr.devisia.app`, App Store ID `6806865251`, Team ID `9Q6YL8R33R`.
   Récupérer l'identifiant `xxxx.apps.googleusercontent.com` (public).
3. EAS : `eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value xxxx.apps.googleusercontent.com --visibility plaintext`
   (et `preview` si utile). Reconstruire : le greffon ajoute le schéma d'URL
   `com.googleusercontent.apps.xxxx` et le bouton apparaît.

### Vercel (production et preview)

| Variable | Valeur |
| --- | --- |
| `GOOGLE_SIGN_IN_CLIENT_IDS` | l'identifiant client iOS (et web plus tard), séparés par des virgules |
| `APPLE_SIGN_IN_BUNDLE_IDS` | `fr.devisia.app` (valeur par défaut, à ne changer que si un bundle Services ID web est ajouté) |
| `APPLE_SIGN_IN_TEAM_ID`, `APPLE_SIGN_IN_KEY_ID`, `APPLE_SIGN_IN_PRIVATE_KEY` | optionnels, révocation Apple |

La migration `20260915150000_auth_identities` est appliquée par le build
Vercel (`scripts/migrate-hosted.mjs`).

### App Store Connect

- Rien d'obligatoire pour Apple. Pour la prochaine soumission publique :
  *App Privacy* inchangé (email, nom) ; les captures d'écran de connexion
  peuvent être mises à jour.

## Checklist iPhone réel (TestFlight)

Prérequis : un iPhone en français, un second (ou le même après changement de
langue) en anglais ; un compte email de test ; un identifiant Apple de test.

1. **Installation propre** : supprimer l'application, installer la version
   TestFlight, ouvrir → présentation → « Bienvenue sur DEVISERA » avec trois
   options (Apple, Google si configuré, e-mail). Aucun éclair de mise en page.
2. **Apple, première fois** : « Continuer avec Apple » → feuille Face ID →
   choisir *Masquer mon adresse* → arrivée directe sur « Enchanté » (aucun code
   email) → nommer l'entreprise, choisir un métier → « Ouvrir mon atelier » →
   écran Abonnement (achat Apple) → application. Mon espace → Mon compte : nom
   pré-rempli, adresse `@privaterelay.appleid.com`.
3. **Apple, retour** : se déconnecter, relancer, « Continuer avec Apple » →
   même atelier, mêmes clients et devis, sans onboarding.
4. **Apple, relance de l'application** : tuer l'application, rouvrir → session
   restaurée sans écran de connexion.
5. **Annulation** : ouvrir la feuille Apple puis annuler → retour à l'écran
   d'entrée, aucun message d'erreur.
6. **Google, première fois** (si l'identifiant client est configuré) :
   « Continuer avec Google » → feuille de comptes Google → onboarding →
   abonnement → application. Aucun code email.
7. **Google, retour** : déconnexion puis reconnexion Google → même atelier.
8. **Rattachement** : avec un compte e-mail vérifié existant (adresse Gmail),
   « Continuer avec Google » → arrive dans le même atelier, sans doublon ;
   Mon compte affiche le même email.
9. **E-mail existant** : « Continuer avec l'adresse e-mail » → connexion avec
   mot de passe → application inchangée.
10. **E-mail, nouveau compte** : « Créer un compte avec une adresse e-mail »
    → formulaire → code à six chiffres → application. Parcours inchangé.
11. **Mode avion** : « Continuer avec Apple » → message « n'a pas abouti »,
    application toujours utilisable, retour possible.
12. **Langue** : iPhone en anglais → « Continue with Apple / Google / email »,
    onboarding en anglais ; en français → libellés français.
13. **Suppression** : Mon espace → Supprimer mon compte → pour un compte
    Apple, aucun mot de passe demandé, mot SUPPRIMER puis suppression →
    reconnexion Apple → nouveau compte neuf (onboarding). Réglages iOS →
    identifiant Apple → *Se connecter avec Apple* : DEVISERA n'y figure plus si
    la clé de révocation est configurée.
14. **Web** : le compte créé sur iPhone se connecte sur le web après « Mot de
    passe oublié » (l'adresse relayée reçoit l'email si le domaine est
    enregistré chez Apple).
