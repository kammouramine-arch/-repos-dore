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
- Migration à appliquer en production : `20260915090000_user_locale_chosen_at`.
