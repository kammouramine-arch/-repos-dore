import { Alert, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { MobileLocale } from './i18n';

const KEY = 'devisera.review.prompt.v1';
const MIN_SUCCESSFUL_QUOTES = 2;
const PROMPT_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
const IOS_APP_ID = '6806865251';

type ReviewState = { successfulQuotes: number; promptedAt: number | null };

async function readState(): Promise<ReviewState> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (!raw) return { successfulQuotes: 0, promptedAt: null };
    const parsed = JSON.parse(raw) as Partial<ReviewState>;
    return { successfulQuotes: typeof parsed.successfulQuotes === 'number' ? parsed.successfulQuotes : 0, promptedAt: typeof parsed.promptedAt === 'number' ? parsed.promptedAt : null };
  } catch { return { successfulQuotes: 0, promptedAt: null }; }
}

async function writeState(state: ReviewState) {
  try {
    const raw = JSON.stringify(state);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch { /* A review prompt must never affect quote creation. */ }
}

async function openReviewPage() {
  const url = Platform.OS === 'ios' ? `itms-apps://itunes.apple.com/app/id${IOS_APP_ID}?action=write-review` : 'https://play.google.com/store/apps/details?id=fr.devisia.app';
  try { if (await Linking.canOpenURL(url)) await Linking.openURL(url); } catch { /* Store availability is outside the app's control. */ }
}

/** Counts successful quote workflows and asks only after the second one. */
export async function recordSuccessfulQuoteAndMaybeAskForReview(locale: MobileLocale = 'fr') {
  const state = await readState();
  const next = { ...state, successfulQuotes: state.successfulQuotes + 1 };
  const eligible = next.successfulQuotes >= MIN_SUCCESSFUL_QUOTES && (!next.promptedAt || Date.now() - next.promptedAt >= PROMPT_COOLDOWN_MS);
  if (!eligible) { await writeState(next); return; }
  next.promptedAt = Date.now();
  await writeState(next);
  const en = locale === 'en';
  Alert.alert(en ? 'Your feedback matters' : 'Votre avis compte', en ? 'You have just prepared several quotes with DEVISERA. Is the app helping you day to day?' : 'Vous venez de préparer plusieurs devis avec DEVISERA. L’application vous aide-t-elle au quotidien ?', [
    { text: en ? 'Later' : 'Plus tard', style: 'cancel' },
    { text: en ? 'Rate the app' : 'Donner mon avis', onPress: () => { void openReviewPage(); } },
  ]);
}
