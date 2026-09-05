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

export function ApplePaywall() {
  const { session, refresh, signOut } = useAuth();
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
    catch { setError('Les offres Apple ne sont pas disponibles pour le moment. Réessayez dans un instant.'); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => {
    let disposed = false;
    void appleProducts().then((value) => { if (!disposed) setStore(value); })
      .catch(() => { if (!disposed) setError('Les offres Apple ne sont pas disponibles pour le moment. Réessayez dans un instant.'); })
      .finally(() => { if (!disposed) setLoading(false); });
    const stop = observeApplePurchase(setBusy);
    return () => { disposed = true; stop(); };
  }, []);
  const product = store?.products.find((p) => p.id === APPLE_PRODUCTS[selected]);
  const trial = store?.eligible && product?.platform === 'ios' && product.introductoryPricePaymentModeIOS === 'free-trial';
  const trialDays = product?.platform === 'ios'
    ? Number(product.introductoryPriceNumberOfPeriodsIOS) * (product.introductoryPriceSubscriptionPeriodIOS === 'week' ? 7 : product.introductoryPriceSubscriptionPeriodIOS === 'day' ? 1 : 0)
    : 0;
  const euroStore = product?.currency === 'EUR';
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
    <View style={{ gap: spacing.md }}>
      <Caption upper>Votre temps mérite mieux</Caption>
      <Title>{appleActive ? 'Votre abonnement Apple' : 'Moins de devis à faire.\nPlus de temps pour vous.'}</Title>
      <Muted>Choisissez la formule qui accompagne votre activité. Les tarifs français sont en euros ; Apple confirme le prix et la devise de votre achat avant votre accord.</Muted>
      {!appleActive ? <Card style={{ backgroundColor: colors.accentSoft, gap: spacing.sm }}>
        <Heading>3 jours pour essayer DEVISIA</Heading>
        <Body>Gratuit sur chaque formule pour les nouveaux abonnés éligibles. Ensuite, renouvellement mensuel automatique sauf annulation.</Body>
        <Caption>Apple confirme votre éligibilité et la durée exacte avant tout accord.</Caption>
      </Card> : null}
    </View>
    {appleActive ? <Card style={{ backgroundColor: colors.accentDeep, gap: spacing.md }}>
      <Heading style={{ color: colors.white }}>{PLANS[subscription.plan].name} · {subscription.status === 'trialing' ? 'Essai actif' : 'Actif'}</Heading>
      <Body style={{ color: colors.white }}>Échéance : {new Date(subscription.currentPeriodEnd!).toLocaleDateString('fr-FR')}.</Body>
      <Button title="Gérer ou annuler avec Apple" variant="secondary" disabled={busy} onPress={() => void action(manageAppleSubscriptions)} />
      <Button title="Retour à mon atelier" variant="secondary" onPress={() => router.replace('/(app)')} />
    </Card> : null}
    {PLAN_ORDER.map((plan) => {
      const p = store?.products.find((item) => item.id === APPLE_PRODUCTS[plan]);
      const chosen = plan === selected;
      return <PressableCard key={plan} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: chosen }} accessibilityLabel={`Formule ${PLANS[plan].name}`} onPress={() => setSelected(plan)}
        style={{ borderColor: chosen ? colors.accent : colors.line, borderWidth: 2, gap: spacing.md, backgroundColor: chosen ? colors.accentSoft : colors.canvas }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 4 }}><Heading>{PLANS[plan].name}</Heading><Caption>{plan === 'PRO' ? 'Le choix des entreprises' : plan === 'ESSENTIEL' ? 'Pour travailler en solo' : 'Pour votre équipe'}</Caption></View>
            <Ionicons name={chosen ? 'radio-button-on' : 'radio-button-off'} color={chosen ? colors.accent : colors.subtle} size={23} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
            {p?.currency === 'EUR' ? <><Body style={{ fontSize: 30, lineHeight: 38, fontWeight: '700', color: colors.ink }}>{p.displayPrice}</Body><Muted>/ mois</Muted></> : <Price cents={PLANS[plan].monthlyPriceCents} suffix="/ mois" size={30} />}
          </View>
          {p?.currency !== 'EUR' ? <Caption>Tarif de référence en France — pas une conversion du prix Apple.</Caption> : null}
          {p && p.currency !== 'EUR' ? <Muted>Prix retourné par Apple : {p.displayPrice} {p.currency}/mois. Vérifiez le montant final avant de confirmer.</Muted> : null}
          {!appleActive ? <Caption>3 jours gratuits pour les nouveaux abonnés éligibles</Caption> : null}
          {PLANS[plan].highlights.slice(0, 3).map((h) => <View key={h} style={{ flexDirection: 'row', gap: 8 }}><Ionicons name="checkmark" size={17} color={colors.accent} /><Muted style={{ flex: 1 }}>{h}</Muted></View>)}
      </PressableCard>;
    })}
    {trial ? <View style={{ padding: spacing.lg, backgroundColor: colors.canvas, borderRadius: radius.lg, gap: spacing.md }}>
      <Heading>Votre essai, en toute clarté</Heading>
      <Body>Aujourd’hui : {trialDays || 'quelques'} jours gratuits sur {PLANS[selected].name}, confirmés par Apple.</Body>
      <Body>Ensuite : {product?.displayPrice} par mois, automatiquement, sauf annulation.</Body>
      <Muted>Annulez dans vos abonnements Apple au moins 24 heures avant la fin de l’essai pour éviter le renouvellement.</Muted>
    </View> : null}
    {error ? <Banner tone="danger" title={error} /> : null}
    {subscription?.provider === 'stripe' ? <Banner title="Votre abonnement est géré sur le web" description="Gérez l’abonnement existant avant d’en créer un autre avec Apple." /> : <Button
      title={loading ? 'Chargement des offres Apple…' : trial ? 'Commencer mon essai gratuit' : 'Continuer avec Apple'}
      loading={busy || loading} disabled={busy || loading || !product?.displayPrice || session?.organization.role !== 'OWNER'} haptic
      onPress={() => void action(() => purchaseApplePlan(selected, session!.organization.id))}
    />}
    {!loading && product && !euroStore ? <Banner title={`Prix transmis par Apple${product.currency ? ` (${product.currency})` : ''}`} description="Vous pouvez continuer. Le montant et la devise définitifs figurent sur la fenêtre de confirmation Apple : vérifiez-les avant de valider. Les tarifs français sont en euros ; l’environnement de test peut afficher une autre devise." action={<Button title="Recharger les offres" variant="secondary" onPress={() => void load()} />} /> : null}
    {!loading && !product ? <Button title="Recharger les offres" variant="secondary" onPress={() => void load()} /> : null}
    <Button title="Restaurer mes achats" variant="ghost" disabled={busy} onPress={() => void action(async () => { const count = await restoreApplePurchases(); if (!count) Alert.alert('Aucun abonnement trouvé', 'Vérifiez le compte Apple utilisé pour l’achat.'); })} />
    <Muted style={{ textAlign: 'center' }}>Paiement confirmé avec votre compte Apple. Renouvellement mensuel automatique sauf annulation. Une offre d’essai par compte Apple pour ce groupe, sous réserve d’éligibilité.</Muted>
    <Button title="Découvrir DEVISIA" variant="ghost" onPress={() => router.push('/presentation')} />
    <Button title="Corriger mon nom ou mon email" variant="ghost" onPress={() => router.push('/compte')} />
    <Button title="Me déconnecter / utiliser un autre compte" variant="ghost" disabled={busy} onPress={() => void action(signOut)} />
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${API_URL}/confidentialite`)}><Caption>Confidentialité</Caption></Pressable>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}><Caption>Conditions</Caption></Pressable>
    </View>
  </Screen>;
}
