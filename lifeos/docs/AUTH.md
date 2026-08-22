# Authentication

## What works today

* Email and password sign-up and sign-in (Supabase Auth).
* Sessions persisted in the device keychain / keystore via `expo-secure-store`, chunked
  so a long JWT does not hit the 2 KB item limit.
* Automatic token refresh while the app is in the foreground only.
* Password reset by email.
* Sign out, which also clears the local cache and the offline queue.
* Account deletion (`delete_my_account()`), which cascades every table.

A new account is set up by a database trigger: profile, preferences, a free
subscription row and five default life areas. There is no "empty account" state to
special-case.

## Email confirmation

If your Supabase project has email confirmation on (the default), sign-up returns no
session and the app tells the user to open the link. Turn it off under
Authentication → Providers → Email for a frictionless local run.

## Apple and Google sign-in

Not enabled. `src/config/features.ts` has `appleSignIn` and `googleSignIn` set to
`false`, and the sign-in screen says so rather than showing buttons that do nothing.

To add them:

1. Enable the provider in Supabase (Authentication → Providers) with the client id and
   secret from Apple Developer / Google Cloud Console.
2. `npx expo install expo-apple-authentication expo-auth-session`.
3. Add the native config: `usesAppleSignIn: true` under `ios` in `app.config.ts`, and
   the reversed client id as a URL scheme for Google.
4. Call `supabase.auth.signInWithIdToken({ provider, token })` from the sign-in screen.
5. Flip the flag in `src/config/features.ts` — the UI reads it.

Everything downstream of auth already works from `auth.uid()`, so no schema or policy
changes are needed.

## Sessions and security notes

* The anon key is public by design; it grants nothing without a session because every
  table is behind RLS.
* The app never sends a `user_id`. It is defaulted server-side from the session.
* `supabase.auth.getUser()` is used in the edge functions (which validates the JWT with
  the auth server) rather than trusting a decoded token.
