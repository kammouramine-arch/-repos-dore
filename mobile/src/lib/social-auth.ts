import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { AppleSignInInput, GoogleSignInInput } from '@devisia/shared';

/**
 * Connexion native Apple et Google.
 *
 * Les deux modules ouvrent les feuilles système ; aucune page web n'est
 * affichée. Le résultat est un jeton d'identité que seul le serveur vérifie.
 * Une annulation par l'utilisateur est une issue normale, jamais une erreur.
 */
export class SocialAuthCancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'SocialAuthCancelled';
  }
}

export class SocialAuthUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocialAuthUnavailable';
  }
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : undefined;
}

/** Sign in with Apple : disponible sur iOS 13+ ; jamais sur le web ni Android. */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithAppleNative(): Promise<Omit<AppleSignInInput, 'deviceName' | 'locale'>> {
  // Le nonce brut reste sur l'appareil ; Apple reçoit son empreinte et la
  // renvoie dans le jeton. Le serveur recalcule l'empreinte du nonce brut :
  // un jeton rejoué depuis ailleurs ne correspondrait pas.
  const nonce = Crypto.randomUUID().replace(/-/g, '');
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') throw new SocialAuthCancelled();
    throw error;
  }
  if (!credential.identityToken) throw new SocialAuthUnavailable('Apple n’a pas renvoyé de jeton d’identité.');
  return {
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    nonce,
    // Fourni par Apple à la première autorisation seulement : transmis tout de
    // suite au serveur, qui le conserve sur le compte.
    fullName: credential.fullName ? { givenName: credential.fullName.givenName, familyName: credential.fullName.familyName } : null,
  };
}

/** Identifiant client OAuth iOS, injecté au build ; sans lui, Google n'est pas proposé. */
export function googleIosClientId(): string | null {
  const value = Constants.expoConfig?.extra?.googleIosClientId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function googleSignInAvailable(): boolean {
  return Platform.OS !== 'web' && googleIosClientId() !== null;
}

let googleConfigured = false;

export async function signInWithGoogleNative(): Promise<Omit<GoogleSignInInput, 'deviceName' | 'locale'>> {
  const iosClientId = googleIosClientId();
  if (!iosClientId) throw new SocialAuthUnavailable('La connexion Google n’est pas disponible dans cette version.');
  // Chargé à la demande : le module natif n'existe que dans un binaire
  // construit avec le greffon Google, jamais sur le web de développement.
  const { GoogleSignin, isSuccessResponse, statusCodes } = await import('@react-native-google-signin/google-signin');
  if (!googleConfigured) {
    // Seuls les champs d'identité de base : aucune portée supplémentaire.
    GoogleSignin.configure({ iosClientId, scopes: [] });
    googleConfigured = true;
  }
  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new SocialAuthCancelled();
    if (!response.data.idToken) throw new SocialAuthUnavailable('Google n’a pas renvoyé de jeton d’identité.');
    return { idToken: response.data.idToken };
  } catch (error) {
    if (error instanceof SocialAuthCancelled || error instanceof SocialAuthUnavailable) throw error;
    const code = errorCode(error);
    if (code === statusCodes.SIGN_IN_CANCELLED) throw new SocialAuthCancelled();
    if (code === statusCodes.IN_PROGRESS) throw new SocialAuthCancelled();
    throw error;
  }
}

/** Oublie la session Google locale : la déconnexion DEVISERA ne doit pas resélectionner le même compte en silence. */
export async function forgetGoogleSession(): Promise<void> {
  if (!googleSignInAvailable() || !googleConfigured) return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Rien à faire : la session DEVISERA est déjà fermée.
  }
}
