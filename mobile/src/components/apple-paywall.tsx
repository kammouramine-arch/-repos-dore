import * as React from 'react';
import { Alert, AppState, Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ProductSubscription } from 'expo-iap';
import { APPLE_PRODUCTS, PLAN_ORDER, PLANS, accessStateFor, applePurchaseUserMessage, normalizeApplePurchaseError, type PlanId } from '@devisia/shared';
import { Banner, Body, Button, Caption, Card, Heading, Muted, Screen, Title } from './ui';
import { PlanCard } from './plan-card';
import { useAuth } from '@/lib/auth';
import { appleProducts, manageAppleSubscriptions, observeApplePurchase, purchaseApplePlan, recordApplePurchaseFailure, restoreApplePurchases } from '@/lib/apple-purchases';
import { API_URL } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';
import { Logo } from './logo';
import { localizeText, mobileLocale } from '@/lib/i18n';
import { appleOffer } from '@/lib/apple-offer';
import { recordDiagnostic } from '@/lib/diagnostics';
import { DiagnosticReport } from './diagnostic-report';
import Constants from 'expo-constants';

export function ApplePaywall() {
  const { session } = useAuth();
  return <ApplePaywallContent key={`${session?.user.id}:${session?.organization.id}`} />;
}

function ApplePaywallContent() {
  const { session, refresh, signOut } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const router = useRouter();
  const [selected, setSelected] = React.useState<PlanId | null>(null);
  const [store, setStore] = React.useState<{ products: ProductSubscription[]; eligible: boolean; storefront: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ownershipConflict, setOwnershipConflict] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const loadGeneration = React.useRef(0);
  const acting = React.useRef(false);
  const subscription = session?.subscription;
  const load = React.useCallback(async (preserveError = false) => {
    const generation = ++loadGeneration.current;
    setLoading(true); if (!preserveError) setError(null); setStore(null);
    try { const offers = await appleProducts(true); if (generation === loadGeneration.current) setStore(offers); }
    catch (cause) { recordApplePurchaseFailure(cause); if (generation === loadGeneration.current) setError(en ? 'Apple offers are temporarily unavailable. Please try again.' : 'Les offres Apple ne sont pas disponibles pour le moment. Réessayez dans un instant.'); }
    finally { if (generation === loadGeneration.current) setLoading(false); }
  }, [en]);
  React.useEffect(() => {
    let disposed = false;
    const invalidateRequests = () => { loadGeneration.current += 1; };
    const generation = ++loadGeneration.current;
    void appleProducts().then((offers) => { if (!disposed && generation === loadGeneration.current) setStore(offers); })
      .catch((cause) => { recordApplePurchaseFailure(cause); if (!disposed && generation === loadGeneration.current) setError(en ? 'Apple offers are temporarily unavailable. Please try again.' : 'Les offres Apple ne sont pas disponibles pour le moment. Réessayez dans un instant.'); })
      .finally(() => { if (!disposed && generation === loadGeneration.current) setLoading(false); });
    const stop = observeApplePurchase(setBusy);
    const resume = AppState.addEventListener('change', (state) => {
      // Refetch after changing the Apple account/storefront in Settings, but
      // never tear down an active purchase when its native sheet closes.
      if (state === 'active' && !acting.current) void load();
    });
    return () => { disposed = true; invalidateRequests(); stop(); resume.remove(); };
  }, [load, en]);
  const product = selected ? store?.products.find((p) => p.id === APPLE_PRODUCTS[selected]) : undefined;
  const offer = appleOffer(product, store?.eligible === true, en, store?.storefront);
  const trial = offer.trial;
  const trialDays = offer.days;
  // Only current native metadata. Never mix website prices into iOS offers.
  const canPurchase = Boolean(product?.displayPrice) && (!offer.mismatch || Constants.expoConfig?.extra?.storekitDiagnostics === true);
  const wasActive = React.useRef(session?.subscription?.provider === 'apple' && accessStateFor(session.subscription).canWrite);
  const appleActive = subscription?.provider === 'apple' && accessStateFor(subscription).canWrite;
  React.useEffect(() => {
    if (appleActive && !wasActive.current) router.replace('/(app)');
    wasActive.current = appleActive;
  }, [appleActive, router]);
  async function action(fn: () => Promise<unknown>) {
    if (acting.current) return;
    acting.current = true;
    setBusy(true); setError(null);
    try {
      const outcome = await fn();
      if (outcome !== 'cancelled') {
        const fresh = await refresh();
        recordDiagnostic({ area: 'billing', durationMs: 0, code: `SESSION_${fresh?.nextStep ?? 'SIGNED_OUT'}`, category: 'ok' });
        if (fresh?.nextStep === 'app' && fresh.access.canWrite) {
          recordDiagnostic({ area: 'billing', durationMs: 0, code: 'ROUTE_APP', category: 'ok' });
          router.replace('/(app)');
        } else if (outcome === 'purchased') {
          setError(en ? 'Apple confirmed the purchase, but access is not active yet. Restore purchases or contact support.' : 'Apple a confirmé l’achat, mais l’accès n’est pas encore actif. Restaurez vos achats ou contactez le support.');
        }
      }
    }
    catch (cause) { recordApplePurchaseFailure(cause, { productId: product?.id }); const diagnostic = normalizeApplePurchaseError(cause); if (diagnostic.code === 'CONFLICT') setOwnershipConflict(true); setError(applePurchaseUserMessage(diagnostic, locale)); }
    finally { acting.current = false; setBusy(false); void load(true); }
  }
  return <Screen>
    <View style={{ alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
      {Constants.expoConfig?.extra?.storekitDiagnostics ? <DiagnosticReport en={en} /> : <Logo size={30} />}
    </View>
    <View style={{ gap: spacing.md }}>
      <Caption upper>{en ? 'Your time deserves better' : 'Votre temps mérite mieux'}</Caption>
      <Title>{appleActive ? (en ? 'Your Apple subscription' : 'Votre abonnement Apple') : (en ? 'Less quoting.\nMore time for you.' : 'Moins de devis à faire.\nPlus de temps pour vous.')}</Title>
      <Muted>{en ? 'Choose the plan that fits your business. Apple confirms the price before you agree.' : 'Choisissez la formule qui accompagne votre activité. Apple confirme le tarif avant votre accord.'}</Muted>
      {!appleActive && trial ? <Card style={{ backgroundColor: colors.canvas, gap: spacing.sm }}>
        <Heading>{en ? `Try DEVISERA free for ${trialDays} days` : `${trialDays} jours pour essayer DEVISERA`}</Heading>
        <Body>{en ? 'Free on every plan for eligible new subscribers. Then monthly renewal unless cancelled.' : 'Gratuit sur chaque formule pour les nouveaux abonnés éligibles. Ensuite, renouvellement mensuel automatique sauf annulation.'}</Body>
        <Caption>{en ? 'Apple confirms your eligibility and exact duration before you agree.' : 'Apple confirme votre éligibilité et la durée exacte avant tout accord.'}</Caption>
      </Card> : null}
    </View>
    {appleActive ? <Card style={{ backgroundColor: colors.accentDeep, gap: spacing.md }}>
      <Heading style={{ color: colors.white }}>{PLANS[subscription.plan].name} · {subscription.status === 'trialing' ? (en ? 'Trial active' : 'Essai actif') : (en ? 'Active' : 'Actif')}</Heading>
      {subscription.currentPeriodEnd ? <Body style={{ color: colors.white }}>{en ? 'Current access ends: ' : 'Fin de la période d’accès : '}{new Date(subscription.currentPeriodEnd).toLocaleString(en ? 'en-GB' : 'fr-FR')}.</Body> : null}
      {subscription.appleEnvironment === 'Sandbox' ? <Caption style={{ color: colors.white }}>{en ? 'TestFlight testing: Apple may accelerate subscription periods.' : 'Test TestFlight : Apple peut accélérer les périodes d’abonnement.'}</Caption> : null}
      <Button title={en ? 'Manage or cancel with Apple' : 'Gérer ou annuler avec Apple'} variant="secondary" disabled={busy} onPress={() => void action(manageAppleSubscriptions)} />
      <Button title={en ? 'Back to workspace' : 'Retour à mon atelier'} variant="secondary" onPress={() => router.replace('/(app)')} />
    </Card> : null}
    {PLAN_ORDER.map((plan) => {
      const p = store?.products.find((item) => item.id === APPLE_PRODUCTS[plan]);
      const cardOffer = appleOffer(p, store?.eligible === true, en, store?.storefront);
      const chosen = plan === selected;
      return <PlanCard
        key={plan}
        name={PLANS[plan].name}
        tagline={plan === 'PRO' ? (en ? 'The business choice' : 'Le choix des entreprises') : plan === 'ESSENTIEL' ? (en ? 'For solo work' : 'Pour travailler en solo') : (en ? 'For your team' : 'Pour votre équipe')}
        price={cardOffer.price}
        priceSuffix={cardOffer.period}
        note={!p ? (loading ? (en ? 'Waiting for Apple pricing' : 'Prix Apple en cours de chargement') : (en ? 'Reload offers to see the price' : 'Rechargez les offres pour afficher le prix')) : !appleActive ? cardOffer.note : null}
        highlights={PLANS[plan].highlights.slice(0, 3).map((text) => localizeText(locale, text))}
        selected={chosen}
        recommended={plan === 'PRO'}
        disabled={busy}
        onPress={() => setSelected(plan)}
        labels={{ selected: en ? 'Selected' : 'Sélectionné', recommended: en ? 'Recommended' : 'Recommandé', pricePending: cardOffer.mismatch ? (Constants.expoConfig?.extra?.storekitDiagnostics === true ? (en ? 'Apple will confirm the price during purchase.' : 'Le prix sera confirmé par Apple lors de l’achat.') : (en ? 'Apple pricing is temporarily unavailable. Reload offers.' : 'Les tarifs Apple sont temporairement indisponibles. Rechargez les offres.')) : (en ? 'Price will appear when Apple offers load.' : 'Le prix apparaîtra lorsque les offres Apple seront chargées.') }}
      />;
    })}
    {trial && selected ? <View style={{ padding: spacing.lg, backgroundColor: colors.canvas, borderRadius: radius.lg, gap: spacing.md }}>
      <Heading>{en ? 'Your trial, clearly explained' : 'Votre essai, en toute clarté'}</Heading>
      <Body>{en ? 'Today: ' : 'Aujourd’hui : '}{trialDays || 'quelques'} {en ? 'free days on ' : 'jours gratuits sur '}{PLANS[selected].name}, {en ? 'confirmed by Apple.' : 'confirmés par Apple.'}</Body>
      <Body>{en ? 'Then: ' : 'Ensuite : '}{product?.displayPrice} {en ? 'per month, automatically unless cancelled.' : 'par mois, automatiquement, sauf annulation.'}</Body>
      <Muted>{en ? 'Cancel in Apple subscriptions at least 24 hours before the trial ends to avoid renewal.' : 'Annulez dans vos abonnements Apple au moins 24 heures avant la fin de l’essai pour éviter le renouvellement.'}</Muted>
    </View> : null}
    {error ? <Banner tone="danger" title={error} /> : null}
    {subscription?.provider === 'stripe' ? <Banner title="Votre abonnement est géré sur le web" description="Gérez l’abonnement existant avant d’en créer un autre avec Apple." /> : <Button
      title={loading ? (en ? 'Loading Apple offers…' : 'Chargement des offres Apple…') : !selected ? (en ? 'Choose a plan' : 'Choisissez une formule') : !canPurchase ? (en ? 'Apple offers unavailable' : 'Offres Apple indisponibles') : trial ? (en ? 'Start my free trial' : 'Commencer mon essai gratuit') : (en ? 'Continue with Apple' : 'Continuer avec Apple')}
      loading={busy || loading} disabled={ownershipConflict || busy || loading || !canPurchase || session?.organization.role !== 'OWNER'} haptic
      onPress={() => void action(async () => {
        if (!selected) return 'not_selected';
        // requestPurchase itself fetches again natively. Refresh the displayed
        // snapshot immediately before it, not only when the paywall mounted.
        const fresh = await appleProducts(true);
        setStore(fresh);
        const current = fresh.products.find(item => item.id === APPLE_PRODUCTS[selected]);
        if (!current?.displayPrice) throw Object.assign(new Error('Product unavailable'), { code: 'PRODUCT_UNAVAILABLE' });
        if (appleOffer(current, fresh.eligible, en, fresh.storefront).mismatch && Constants.expoConfig?.extra?.storekitDiagnostics !== true) {
          throw Object.assign(new Error('Apple product currency disagrees with storefront'), { code: 'STOREKIT_METADATA_MISMATCH' });
        }
        if (current.displayPrice !== product?.displayPrice || current.currency !== product?.currency) {
          setError(en ? 'Apple updated the price. Review the updated offer, then continue.' : 'Apple a actualisé le prix. Vérifiez l’offre actualisée, puis continuez.');
          return 'price_updated';
        }
        return purchaseApplePlan(selected, session!.organization.id);
      })}
    />}
    {!loading ? <Button title={en ? 'Reload offers' : 'Recharger les offres'} variant="ghost" disabled={busy} onPress={() => void load(ownershipConflict)} /> : null}
    {ownershipConflict ? <Button title={en ? 'Recover my subscription with support' : 'Retrouver mon abonnement avec le support'} variant="ghost" onPress={() => void Linking.openURL('mailto:contact@devisera.fr?subject=DEVISERA%20subscription%20recovery').catch(() => Alert.alert(en ? 'Contact support' : 'Contacter le support', 'contact@devisera.fr'))} /> : null}
    <Button title={en ? 'Restore purchases' : 'Restaurer mes achats'} variant="ghost" disabled={busy} onPress={() => void action(async () => { const count = await restoreApplePurchases(); if (!count) Alert.alert(en ? 'No subscription found' : 'Aucun abonnement trouvé', en ? 'Check the Apple account used for the purchase.' : 'Vérifiez le compte Apple utilisé pour l’achat.'); })} />
    <Muted style={{ textAlign: 'center' }}>{en ? 'Payment confirmed with your Apple account. Monthly renewal unless cancelled. One trial per Apple account for this group, subject to eligibility.' : 'Paiement confirmé avec votre compte Apple. Renouvellement mensuel automatique sauf annulation. Une offre d’essai par compte Apple pour ce groupe, sous réserve d’éligibilité.'}</Muted>
    <Button title={en ? 'Discover DEVISERA' : 'Découvrir DEVISERA'} variant="ghost" onPress={() => router.push('/presentation')} />
    <Button title={en ? 'Correct my name or email' : 'Corriger mon nom ou mon email'} variant="ghost" onPress={() => router.push('/compte')} />
    <Button title={en ? 'Sign out / use another account' : 'Me déconnecter / utiliser un autre compte'} variant="ghost" disabled={busy} onPress={() => void action(signOut)} />
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${API_URL}/confidentialite`)}><Caption>{en ? 'Privacy' : 'Confidentialité'}</Caption></Pressable>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}><Caption>{en ? 'Terms' : 'Conditions'}</Caption></Pressable>
    </View>
  </Screen>;
}
