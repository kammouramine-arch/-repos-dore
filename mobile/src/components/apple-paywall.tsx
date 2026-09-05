import * as React from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ProductSubscription } from 'expo-iap';
import { APPLE_PRODUCTS, PLAN_ORDER, PLANS, accessStateFor, type PlanId } from '@devisia/shared';
import { Banner, Body, Button, Caption, Card, Heading, Ionicons, Muted, Screen, Title } from './ui';
import { useAuth } from '@/lib/auth';
import { appleProducts, manageAppleSubscriptions, observeApplePurchase, purchaseApplePlan, restoreApplePurchases } from '@/lib/apple-purchases';
import { API_URL } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';

export function ApplePaywall() {
  const { session, refresh } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = React.useState<PlanId>('PRO');
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
  const trial = store?.eligible && product?.platform === 'ios' && product.introductoryPricePaymentModeIOS === 'free-trial'
    && product.introductoryPriceSubscriptionPeriodIOS === 'week' && Number(product.introductoryPriceNumberOfPeriodsIOS) === 1;
  const acting = React.useRef(false);
  const appleActive = subscription?.provider === 'apple' && accessStateFor(subscription).canWrite;
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
      <Muted>Choisissez la formule qui accompagne votre activité. Les offres et prix ci-dessous sont confirmés par Apple.</Muted>
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
      return <Pressable key={plan} accessibilityRole="radio" accessibilityState={{ selected: chosen }} accessibilityLabel={`Formule ${PLANS[plan].name}`} onPress={() => setSelected(plan)}>
        <Card style={{ borderColor: chosen ? colors.accent : colors.line, borderWidth: chosen ? 2 : 1, gap: spacing.md, backgroundColor: chosen ? colors.accentSoft : colors.canvas }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 4 }}><Heading>{PLANS[plan].name}</Heading><Caption>{plan === 'PRO' ? 'Le choix des entreprises' : plan === 'ESSENTIEL' ? 'Pour travailler en solo' : 'Pour votre équipe'}</Caption></View>
            <Ionicons name={chosen ? 'radio-button-on' : 'radio-button-off'} color={chosen ? colors.accent : colors.subtle} size={23} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
            <Body style={{ fontSize: 30, lineHeight: 38, fontWeight: '700', color: colors.ink }}>{p?.displayPrice ?? '—'}</Body><Muted>/ mois</Muted>
          </View>
          {PLANS[plan].highlights.slice(0, 3).map((h) => <View key={h} style={{ flexDirection: 'row', gap: 8 }}><Ionicons name="checkmark" size={17} color={colors.accent} /><Muted style={{ flex: 1 }}>{h}</Muted></View>)}
        </Card>
      </Pressable>;
    })}
    {trial ? <View style={{ padding: spacing.lg, backgroundColor: colors.canvas, borderRadius: radius.lg, gap: spacing.md }}>
      <Heading>Votre essai, en toute clarté</Heading>
      <Body>Aujourd’hui : 7 jours gratuits sur {PLANS[selected].name}.</Body>
      <Body>Ensuite : {product?.displayPrice} par mois, automatiquement, sauf annulation.</Body>
      <Muted>Annulez dans vos abonnements Apple au moins 24 heures avant la fin de l’essai pour éviter le renouvellement.</Muted>
    </View> : null}
    {error ? <Banner tone="danger" title={error} /> : null}
    {subscription?.provider === 'stripe' ? <Banner title="Votre abonnement est géré sur le web" description="Gérez l’abonnement existant avant d’en créer un autre avec Apple." /> : <Button
      title={loading ? 'Chargement des offres Apple…' : trial ? 'Commencer mes 7 jours gratuits' : `S’abonner${product ? ` · ${product.displayPrice}/mois` : ''}`}
      loading={busy || loading} disabled={busy || loading || !product || session?.organization.role !== 'OWNER'} haptic
      onPress={() => void action(() => purchaseApplePlan(selected, session!.organization.id))}
    />}
    {!loading && !product ? <Button title="Recharger les offres" variant="secondary" onPress={() => void load()} /> : null}
    <Button title="Restaurer mes achats" variant="ghost" disabled={busy} onPress={() => void action(async () => { const count = await restoreApplePurchases(); if (!count) Alert.alert('Aucun abonnement trouvé', 'Vérifiez le compte Apple utilisé pour l’achat.'); })} />
    <Muted style={{ textAlign: 'center' }}>Paiement confirmé avec votre compte Apple. Renouvellement mensuel automatique sauf annulation. Une offre d’essai par compte Apple pour ce groupe, sous réserve d’éligibilité.</Muted>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${API_URL}/confidentialite`)}><Caption>Confidentialité</Caption></Pressable>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}><Caption>Conditions</Caption></Pressable>
    </View>
  </Screen>;
}
