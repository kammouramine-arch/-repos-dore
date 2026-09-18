# Localisation iOS — correction à la racine (2026-09-15)

## Symptôme

Un iPhone réglé en français lançait DEVISERA en anglais, et la fiche App Store
annonçait « Langue : EN, anglais seulement ».

## Causes

1. **Binaire sans localisation déclarée.** L'`Info.plist` généré ne portait ni
   `CFBundleDevelopmentRegion` ni `CFBundleLocalizations` : iOS considérait
   l'application comme anglaise (fiche App Store, boutons système « OK /
   Annuler », dialogues d'autorisation, langue transmise à l'application).
2. **Détection de langue par `Intl` de Hermes**, qui répond « en-US » sur un
   iPhone français. La valeur fausse était mémorisée localement
   (`devisera.locale`) puis envoyée au compte à l'inscription.
3. **Le compte primait sur l'appareil.** `user.locale`, simplement déduit,
   pilotait l'interface : un « en » accidentel survivait à toute réinstallation.

## Règle appliquée

Priorité, partout et sans exception :
**choix explicite** (dans l'application ou sur le compte) **> langue de
l'iPhone > français**. Une langue non prise en charge (allemand, italien…)
retombe sur le français.

## Ce qui change

| Couche | Fichier | Changement |
| --- | --- | --- |
| Natif | `mobile/app.config.ts`, `mobile/locales/{fr,en}.json` | `CFBundleDevelopmentRegion = fr`, `CFBundleLocalizations = [fr, en]`, `CFBundleAllowMixedLocalizations`, chaînes d'autorisation (micro, caméra, photos, reconnaissance vocale, Face ID, notifications) traduites via `fr.lproj` / `en.lproj/InfoPlist.strings`. Vérifié sur un prebuild propre (`npx expo prebuild --platform ios`). |
| Détection | `mobile/src/lib/device-locale.ts` | `expo-localization` (`getLocales()`), langues préférées d'iOS dans l'ordre ; `Intl` seulement en repli hors natif. |
| Résolution | `mobile/src/lib/locale-resolution.ts` | Fonction pure `resolveMobileLocale` ; deux choix explicites → le plus récent gagne ; `accountLocaleNeedsSync` signale un compte déduit à aligner. |
| Stockage | `mobile/src/lib/storage.ts` | Seul un choix explicite est conservé (`devisera.locale.choice`, horodaté). L'ancienne clé déduite est effacée au lancement et n'est plus lue. |
| Fournisseur | `mobile/src/lib/auth.tsx` | Langue résolue dès le premier rendu (écran de lancement compris) ; `setLanguage(locale \| null)` ; un compte déduit qui diffère de la langue affichée est aligné en `inferred` ; un choix fait sur le web ou un autre appareil est repris. |
| Écrans | `useMobileLocale()` partout | `mobileLocale(session)` (valeur brute du compte) a disparu de l'interface. |
| Réglage | `mobile/src/components/language-selector.tsx` | Sélecteur Français / English dans *Mon espace* et *Mon compte* ; « Suivre la langue de l'iPhone » efface le choix. |
| Contrat | `packages/shared` | `SessionUserDTO.localeChosenAt`, `updateLanguage(language, source)` avec `explicit` / `inferred` / `reset`. |
| Serveur | `prisma` (`users.localeChosenAt`), `languageService`, `/api/auth/langue` | Un choix explicite est horodaté ; une valeur déduite ne remplace jamais un choix ; `reset` revient à la langue de l'appareil. Le sélecteur web reste un choix explicite. |

## Comptes existants

Les valeurs `locale` en base sont conservées mais considérées comme déduites
(`localeChosenAt` nul). Un compte « en » créé par erreur repasse en français
dès la première ouverture depuis un iPhone français, et les emails et documents
suivent. Seul un choix fait dans l'application ou sur le web est définitif.

## Vérifications

- Tests unitaires : résolution (fr-FR, en-GB, de-DE, comptes déduits, deux
  choix), service serveur (explicite / déduit / retour), couverture anglaise des
  libellés mobiles (`tests/unit/mobile-i18n-coverage.test.ts`).
- `Info.plist` du prebuild : `CFBundleDevelopmentRegion = fr`,
  `CFBundleLocalizations = [fr, en]`, `fr.lproj` et `en.lproj` présents.
- Bundle web du mobile lancé avec un navigateur `fr-FR` puis `en-GB`.
- Migration `20260915090000_user_locale_chosen_at` appliquée en production par
  le build Vercel (`scripts/migrate-hosted.mjs`) ; production sur 2af5787.
- Build iOS 42 (EAS a0450847-aab7-4274-92e2-df2d377c90bc) : l'IPA produit
  contient `CFBundleDevelopmentRegion = fr`, `CFBundleLocalizations = [fr, en]`,
  `fr.lproj` et `en.lproj` avec leurs `InfoPlist.strings`. Ses deux soumissions
  (1dd74673-10ff-48d6-8639-039df97476a3, adafae02-650e-47be-aae6-f73fbda9b945)
  ont été refusées : la version 1.0.0 est sortie sur l'App Store le
  15 septembre 2026 à 07:37 UTC, avant ce build, et Apple n'accepte plus aucun
  build portant `CFBundleShortVersionString = 1.0.0`
  (`SUBMISSION_SERVICE_IOS_OLD_APP_VERSION`).
- Version 1.0.1 : Build 43 (EAS 6fc71b73-b83a-4e44-b2eb-0d2d274964c4,
  soumission 0c383f11-6412-438d-bd6a-fda4bbd7dd52, terminée le 15 septembre
  2026 à 13:55 UTC). IPA vérifié : `CFBundleShortVersionString = 1.0.1`,
  `CFBundleVersion = 43`, `fr.devisia.app`, localisations fr et en. Même code
  que le Build 42 ; seule la version marketing change.
