import * as React from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ProductSubscription } from 'expo-iap';
import { APPLE_PRODUCTS, PLAN_ORDER, PLANS, accessStateFor, type PlanId } from '@devisia/shared';
import { Banner, Body, Button, Caption, Card, Heading, Ionicons, Muted, PressableCard, Price, Screen, Title } from './ui';
import { useAuth } from '@/lib/auth';
import { appleProducts, manageAppleSubscriptions, observeApplePurchase, purchaseApplePlan, restoreApplePurchases } from '@/lib/apple-purchases';
import { API_URL } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';
import { Logo } from './logo';
import { mobileLocale } from '@/lib/i18n';

export function ApplePaywall() {
  const { session, refresh, signOut } = useAuth();
  const en = mobileLocale(session) === 'en';
  const router = useRouter();
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const [selected, setSelected] = React.useState<PlanId>(() => PLAN_ORDER.find((id) => id === plan) ?? 'PRO');
  const [store, setStore] = React.useState<{ products: ProductSubscription[]; eligible: boolean } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const subscription = session?.subscription;
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { setStore(await appleProducts()); }
    catch { setError(en ? 'Apple offers are temporarily unavailable. Please try again.' : 'Les offres Apple ne sont pas disponibles pour le moment. Réessayez dans un instant.'); }
    finally { setLoading(false); }
  }, [en]);
  React.useEffect(() => {
    let disposed = false;
    void appleProducts().then((value) => { if (!disposed) setStore(value); })
      .catch(() => { if (!disposed) setError(en ? 'Apple offers are temporarily unavailable. Please try again.' : 'Les offres Apple ne sont pas disponibles pour le moment. Réessayez dans un instant.'); })
      .finally(() => { if (!disposed) setLoading(false); });
    const stop = observeApplePurchase(setBusy);
    return () => { disposed = true; stop(); };
  }, [en]);
  const product = store?.products.find((p) => p.id === APPLE_PRODUCTS[selected]);
  const trial = store?.eligible && product?.platform === 'ios' && product.introductoryPricePaymentModeIOS === 'free-trial';
  const trialDays = product?.platform === 'ios'
    ? Number(product.introductoryPriceNumberOfPeriodsIOS) * (product.introductoryPriceSubscriptionPeriodIOS === 'week' ? 7 : product.introductoryPriceSubscriptionPeriodIOS === 'day' ? 1 : 0)
    : 0;
  // StoreKit is the authority for the amount and currency. Do not fabricate a
  // conversion in the app: a sandbox storefront may legitimately return USD
  // while the production French storefront returns EUR. A product returned by
  // StoreKit is still actionable; the confirmation sheet remains the final
  // source of truth for the customer.
  const canPurchase = Boolean(product?.displayPrice);
  const wasActive = React.useRef(session?.subscription?.provider === 'apple' && accessStateFor(session.subscription).canWrite);
  const acting = React.useRef(false);
  const appleActive = subscription?.provider === 'apple' && accessStateFor(subscription).canWrite;
  React.useEffect(() => {
    if (appleActive && !wasActive.current) router.replace('/(app)');
    wasActive.current = appleActive;
  }, [appleActive, router]);
  async function action(fn: () => Promise<unknown>) {
    if (acting.current) return;
    acting.current = true;
    setBusy(true); setError(null);
    try { await fn(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Réessayez dans un instant.'); }
    finally { acting.current = false; setBusy(false); }
  }
  return <Screen>
    <View style={{ alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
      <Logo size={30} />
    </View>
    <View style={{ gap: spacing.md }}>
      <Caption upper>{en ? 'Your time deserves better' : 'Votre temps mérite mieux'}</Caption>
      <Title>{appleActive ? (en ? 'Your Apple subscription' : 'Votre abonnement Apple') : (en ? 'Less quoting.\nMore time for you.' : 'Moins de devis à faire.\nPlus de temps pour vous.')}</Title>
      <Muted>{en ? 'Choose the plan that fits your business. Apple confirms the final price and currency before you agree.' : 'Choisissez la formule qui accompagne votre activité. Les tarifs français sont en euros ; Apple confirme le prix et la devise de votre achat avant votre accord.'}</Muted>
      {!appleActive ? <Card style={{ backgroundColor: colors.accentSoft, gap: spacing.sm }}>
        <Heading>{en ? 'Try DEVISERA free for 3 days' : '3 jours pour essayer DEVISERA'}</Heading>
        <Body>{en ? 'Free on every plan for eligible new subscribers. Then monthly renewal unless cancelled.' : 'Gratuit sur chaque formule pour les nouveaux abonnés éligibles. Ensuite, renouvellement mensuel automatique sauf annulation.'}</Body>
        <Caption>{en ? 'Apple confirms your eligibility and exact duration before you agree.' : 'Apple confirme votre éligibilité et la durée exacte avant tout accord.'}</Caption>
      </Card> : null}
    </View>
    {appleActive ? <Card style={{ backgroundColor: colors.accentDeep, gap: spacing.md }}>
      <Heading style={{ color: colors.white }}>{PLANS[subscription.plan].name} · {subscription.status === 'trialing' ? (en ? 'Trial active' : 'Essai actif') : (en ? 'Active' : 'Actif')}</Heading>
      <Body style={{ color: colors.white }}>{en ? 'Renews: ' : 'Échéance : '}{new Date(subscription.currentPeriodEnd!).toLocaleDateString(en ? 'en-GB' : 'fr-FR')}.</Body>
      <Button title={en ? 'Manage or cancel with Apple' : 'Gérer ou annuler avec Apple'} variant="secondary" disabled={busy} onPress={() => void action(manageAppleSubscriptions)} />
      <Button title={en ? 'Back to workspace' : 'Retour à mon atelier'} variant="secondary" onPress={() => router.replace('/(app)')} />
    </Card> : null}
    {PLAN_ORDER.map((plan) => {
      const p = store?.products.find((item) => item.id === APPLE_PRODUCTS[plan]);
      const chosen = plan === selected;
      return <PressableCard key={plan} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: chosen }} accessibilityLabel={`Formule ${PLANS[plan].name}`} onPress={() => setSelected(plan)}
        style={{ borderColor: chosen ? colors.accent : colors.line, borderWidth: 2, gap: spacing.md, backgroundColor: chosen ? colors.accentSoft : colors.canvas }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 4 }}><Heading>{PLANS[plan].name}</Heading><Caption>{plan === 'PRO' ? (en ? 'The business choice' : 'Le choix des entreprises') : plan === 'ESSENTIEL' ? (en ? 'For solo work' : 'Pour travailler en solo') : (en ? 'For your team' : 'Pour votre équipe')}</Caption></View>
            <Ionicons name={chosen ? 'radio-button-on' : 'radio-button-off'} color={chosen ? colors.accent : colors.subtle} size={23} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
            {p?.displayPrice ? <><Body style={{ fontSize: 30, lineHeight: 38, fontWeight: '700', color: colors.ink }}>{p.displayPrice}</Body><Muted>/ mois</Muted></> : <Price cents={PLANS[plan].monthlyPriceCents} suffix="/ mois" size={30} />}
          </View>
          {!p ? <Caption>Prix Apple en cours de chargement</Caption> : null}
          {!appleActive ? <Caption>{en ? '3 days free for eligible new subscribers' : '3 jours gratuits pour les nouveaux abonnés éligibles'}</Caption> : null}
          {PLANS[plan].highlights.slice(0, 3).map((h) => <View key={h} style={{ flexDirection: 'row', gap: 8 }}><Ionicons name="checkmark" size={17} color={colors.accent} /><Muted style={{ flex: 1 }}>{h}</Muted></View>)}
      </PressableCard>;
    })}
    {trial ? <View style={{ padding: spacing.lg, backgroundColor: colors.canvas, borderRadius: radius.lg, gap: spacing.md }}>
      <Heading>{en ? 'Your trial, clearly explained' : 'Votre essai, en toute clarté'}</Heading>
      <Body>{en ? 'Today: ' : 'Aujourd’hui : '}{trialDays || 'quelques'} {en ? 'free days on ' : 'jours gratuits sur '}{PLANS[selected].name}, {en ? 'confirmed by Apple.' : 'confirmés par Apple.'}</Body>
      <Body>{en ? 'Then: ' : 'Ensuite : '}{product?.displayPrice} {en ? 'per month, automatically unless cancelled.' : 'par mois, automatiquement, sauf annulation.'}</Body>
      <Muted>{en ? 'Cancel in Apple subscriptions at least 24 hours before the trial ends to avoid renewal.' : 'Annulez dans vos abonnements Apple au moins 24 heures avant la fin de l’essai pour éviter le renouvellement.'}</Muted>
    </View> : null}
    {error ? <Banner tone="danger" title={error} /> : null}
    {subscription?.provider === 'stripe' ? <Banner title="Votre abonnement est géré sur le web" description="Gérez l’abonnement existant avant d’en créer un autre avec Apple." /> : <Button
      title={loading ? (en ? 'Loading Apple offers…' : 'Chargement des offres Apple…') : !canPurchase ? (en ? 'Apple offers unavailable' : 'Offres Apple indisponibles') : trial ? (en ? 'Start my free trial' : 'Commencer mon essai gratuit') : (en ? 'Continue with Apple' : 'Continuer avec Apple')}
      loading={busy || loading} disabled={busy || loading || !canPurchase || session?.organization.role !== 'OWNER'} haptic
      onPress={() => void action(() => purchaseApplePlan(selected, session!.organization.id))}
    />}
    {!loading && product && product.currency !== 'EUR' ? <Banner title={`Devise du storefront Apple : ${product.currency ?? 'inconnue'}`} description="Le montant affiché vient directement d’Apple. En France, le storefront de production doit retourner EUR ; un environnement sandbox peut afficher une autre devise. Vérifiez le montant final avant de valider." action={<Button title="Recharger les offres" variant="secondary" onPress={() => void load()} />} /> : null}
    {!loading && !product ? <Button title="Recharger les offres" variant="secondary" onPress={() => void load()} /> : null}
    <Button title={en ? 'Restore purchases' : 'Restaurer mes achats'} variant="ghost" disabled={busy} onPress={() => void action(async () => { const count = await restoreApplePurchases(); if (!count) Alert.alert(en ? 'No subscription found' : 'Aucun abonnement trouvé', en ? 'Check the Apple account used for the purchase.' : 'Vérifiez le compte Apple utilisé pour l’achat.'); })} />
    <Muted style={{ textAlign: 'center' }}>{en ? 'Payment confirmed with your Apple account. Monthly renewal unless cancelled. One trial per Apple account for this group, subject to eligibility.' : 'Paiement confirmé avec votre compte Apple. Renouvellement mensuel automatique sauf annulation. Une offre d’essai par compte Apple pour ce groupe, sous réserve d’éligibilité.'}</Muted>
    <Button title={en ? 'Discover DEVISERA' : 'Découvrir DEVISERA'} variant="ghost" onPress={() => router.push('/presentation')} />
    <Button title={en ? 'Correct my name or email' : 'Corriger mon nom ou mon email'} variant="ghost" onPress={() => router.push('/compte')} />
    <Button title={en ? 'Sign out / use another account' : 'Me déconnecter / utiliser un autre compte'} variant="ghost" disabled={busy} onPress={() => void action(signOut)} />
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${API_URL}/confidentialite`)}><Caption>Confidentialité</Caption></Pressable>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}><Caption>Conditions</Caption></Pressable>
    </View>
  </Screen>;
}
