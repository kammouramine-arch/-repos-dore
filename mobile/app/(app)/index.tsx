import * as React from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { QUOTE_EVENT_LABELS, type DashboardDTO } from '@devisia/shared';
import {
  Amount,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Divider,
  ErrorState,
  Ionicons,
  Muted,
  PageHeader,
  PressableCard,
  Screen,
  SectionHeader,
  Skeleton,
  Title,
} from '@/components/ui';
import { Logo } from '@/components/logo';
import { TrialBanner } from '@/components/trial-banner';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { readToken, readDashboardSnapshot, writeDashboardSnapshot } from '@/lib/storage';
import { cacheEpoch, readQueryCache } from '@/lib/query-cache';
import { colors, radius, spacing, typography } from '@/theme';
import { mobileLocale } from '@/lib/i18n';
import { PremiumGradient } from '@/components/premium-gradient';

/**
 * Accueil.
 *
 * L'écran répondait à un artisan qui vient de s'inscrire par six compteurs à
 * zéro : rien à faire, rien à comprendre, et l'impression d'un produit vide.
 * Tant qu'il n'y a pas d'activité, l'accueil ne montre donc pas de tableau de
 * bord mais un chemin — le premier devis. Les chiffres apparaissent quand ils
 * veulent dire quelque chose.
 */
function Stat({
  label,
  children,
  hint,
  tone = 'plain',
  icon,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  tone?: 'plain' | 'accent';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Card
      style={{
        flex: 1,
        gap: spacing.sm,
        minHeight: 132,
        justifyContent: 'space-between',
        backgroundColor: tone === 'accent' ? colors.accentSoft : colors.canvas,
        borderColor: tone === 'accent' ? colors.accentBorder : colors.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Caption upper style={{ color: tone === 'accent' ? colors.accentHover : colors.subtle }}>
          {label}
        </Caption>
        {icon ? (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              backgroundColor: tone === 'accent' ? colors.canvas : colors.surface2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={15} color={tone === 'accent' ? colors.accent : colors.muted} />
          </View>
        ) : null}
      </View>
      <View style={{ gap: 1 }}>
        {children}
        {hint ? <Caption style={{ color: colors.subtle }}>{hint}</Caption> : null}
      </View>
    </Card>
  );
}

/** « aujourd'hui », « hier », puis une date : un artisan ne compte pas en ISO. */
function relativeDay(iso: string, en: boolean): string {
  const date = new Date(iso);
  const jour = 24 * 60 * 60 * 1000;
  const minuit = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const ecart = Math.round((minuit(new Date()) - minuit(date)) / jour);
  if (en) {
    if (ecart <= 0) return 'today';
    if (ecart === 1) return 'yesterday';
    if (ecart < 7) return `${ecart} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  if (ecart <= 0) return 'aujourd’hui';
  if (ecart === 1) return 'hier';
  if (ecart < 7) return `il y a ${ecart} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function AccueilScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const en = mobileLocale(session) === 'en';
  const query = useQuery<DashboardDTO>(async () => {
    const token = await readToken();
    const data = await api.dashboard(30);
    if (token) void writeDashboardSnapshot(token, data);
    return data;
  }, [], 'dashboard:30');
  const setDashboard = query.setData;
  React.useEffect(() => {
    let disposed = false;
    const epoch = cacheEpoch();
    void (async () => {
      const token = await readToken();
      if (!token) return;
      const snapshot = await readDashboardSnapshot<DashboardDTO>(token);
      if (!disposed && epoch === cacheEpoch() && snapshot && !readQueryCache('dashboard:30')) {
        // Never overwrite a network response which finished before disk restoration.
        setDashboard(current => current ?? snapshot);
      }
    })().catch(() => undefined);
    return () => { disposed = true; };
  }, [setDashboard]);

  // Les montants changent pendant que l'artisan travaille : on recharge au retour.
  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const data = query.data;
  const firstName = session?.user.firstName?.trim() || data?.greetingName || '';

  if (query.loading && !data) {
    /*
     * Le démarrage enchaînait deux allers-retours réseau — validation de la
     * session, puis tableau de bord — devant trois rectangles anonymes. Sur un
     * vrai iPhone, cela donnait un écran quasiment vide.
     *
     * Le prénom, lui, est déjà en mémoire dès l'authentification : l'en-tête
     * s'affiche donc immédiatement, et seule la zone des chiffres attend. Le
     * squelette épouse la forme réelle de ce qui va venir, pour que rien ne
     * saute quand les données arrivent.
     */
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
        <Screen>
          <View style={{ marginHorizontal: -spacing.xl, marginTop: -spacing.xl, overflow: 'hidden', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
            <PremiumGradient style={{ flex: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing['2xl'] }}>
              <PageHeader
                eyebrow={en ? 'Your workspace' : 'Votre atelier'}
                title={firstName ? (en ? `Hello ${firstName}.` : `Bonjour ${firstName}.`) : (en ? 'Hello.' : 'Bonjour.')}
                subtitle={en ? 'One moment, gathering your activity.' : 'Un instant, je rassemble votre activité.'}
                action={
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
                    <Logo size={26} showName={false} />
                  </View>
                }
              />
            </PremiumGradient>
          </View>

          <Card style={{ gap: spacing.md }}>
            <Skeleton height={13} width="45%" />
            <Skeleton height={30} width="60%" />
            <Skeleton height={13} width="70%" />
          </Card>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Card style={{ flex: 1, gap: spacing.sm }}>
              <Skeleton height={11} width="70%" />
              <Skeleton height={26} width="80%" />
            </Card>
            <Card style={{ flex: 1, gap: spacing.sm }}>
              <Skeleton height={11} width="70%" />
              <Skeleton height={26} width="55%" />
            </Card>
          </View>
        </Screen>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
        <ErrorState
          description={query.error ?? (en ? 'Your activity could not be loaded.' : 'Votre activité n’a pas pu être chargée.')}
          onRetry={() => void query.reload()}
        />
      </SafeAreaView>
    );
  }

  const started = data.quotesSent > 0 || data.recentActivity.length > 0 || data.newLeads > 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={query.refreshing}
            onRefresh={() => void query.refresh({ force: true })}
            tintColor={colors.accent}
          />
        }
      >
        <View style={{ marginHorizontal: -spacing.xl, marginTop: -spacing.xl, overflow: 'hidden', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
          <PremiumGradient style={{ flex: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing['2xl'] }}>
            <PageHeader
              eyebrow={en ? 'Your workspace' : 'Votre atelier'}
              title={firstName ? (en ? `Hello ${firstName}.` : `Bonjour ${firstName}.`) : (en ? 'Hello.' : 'Bonjour.')}
              subtitle={
                started
                  ? (en ? 'Your activity, clear and ready to move forward.' : 'Votre activité, claire et prête à avancer.')
                  : (en ? 'Your first quote starts here.' : 'Votre premier devis commence ici.')
              }
              action={
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 15,
                    backgroundColor: colors.canvas,
                    borderWidth: 1,
                    borderColor: colors.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Logo size={27} showName={false} />
                </View>
              }
            />
          </PremiumGradient>
        </View>

        {(query.loading || query.refreshing || query.error) && <Caption>{query.error ? (en ? 'Showing latest data — connection needs a retry.' : 'Dernières données disponibles — connexion à réessayer.') : (en ? 'Latest data · refreshing…' : 'Dernières données disponibles · actualisation en cours…')}</Caption>}
        <TrialBanner subscription={session?.subscription ?? null} />

        {!started ? (
          /* Première utilisation : une seule chose à faire, et on explique
             comment elle se passe plutôt que d'afficher des compteurs vides. */
          <>
            <PressableCard
              accessibilityLabel={en ? 'Create my first quote' : 'Créer mon premier devis'}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/devis/nouveau');
              }}
              style={{
                backgroundColor: colors.accentDeep,
                borderColor: colors.accentDeep,
                borderRadius: radius.xl,
                padding: spacing.xl,
                gap: spacing.md,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  backgroundColor: colors.accent,
                  opacity: 0.32,
                  right: -62,
                  top: -76,
                }}
              />
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 17,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="mic" size={24} color={colors.white} />
              </View>
              <Title style={{ color: colors.white, fontSize: 25 }}>{en ? 'Create your first quote' : 'Créez votre premier devis'}</Title>
              <Body style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 22 }}>
                {en ? 'Describe the job out loud. DEVISERA prepares the line items; you review and send.' : 'Décrivez le chantier à voix haute. DEVISERA prépare les lignes, vous vérifiez, vous envoyez.'}
              </Body>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Body style={{ color: colors.white, fontWeight: '600' }}>{en ? 'Start' : 'Commencer'}</Body>
                <Ionicons name="arrow-forward" size={17} color={colors.white} />
              </View>
            </PressableCard>

            <Card style={{ gap: spacing.lg }}>
              <SectionHeader title={en ? 'Set up your workspace' : 'Pour aller plus vite ensuite'} />
              {[
                {
                  icon: 'book-outline' as const,
                  label: en ? 'Add your catalogue' : 'Renseignez votre catalogue',
                  hint: en ? 'Your prices will be applied instead of estimated.' : 'Vos prix seront appliqués au lieu d’être estimés.',
                  href: '/catalogue' as const,
                },
                {
                  icon: 'business-outline' as const,
                  label: en ? 'Complete your business profile' : 'Complétez votre entreprise',
                  hint: en ? 'Business details will appear on your quotes.' : 'SIRET, TVA et mentions apparaîtront sur vos devis.',
                  href: '/entreprise' as const,
                },
                {
                  icon: 'people-outline' as const,
                  label: en ? 'Add a client' : 'Ajoutez un client',
                  hint: en ? 'Or create one while preparing a quote.' : 'Ou créez-le directement pendant un devis.',
                  href: '/clients' as const,
                },
              ].map((item, index, all) => (
                <View key={item.label} style={{ gap: spacing.lg }}>
                  {index > 0 ? <Divider /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    onPress={() => router.push(item.href)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons name={item.icon} size={20} color={colors.inkSoft} />
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: '600' }}>{item.label}</Body>
                      <Muted style={{ fontSize: 13 }}>{item.hint}</Muted>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
                  </Pressable>
                  {index === all.length - 1 ? <View /> : null}
                </View>
              ))}
            </Card>
          </>
        ) : (
          <>
            {data.toRecover.quoteCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={en ? 'View quotes to follow up' : 'Voir les devis à relancer'}
                onPress={() => router.push('/devis')}
              >
                <Stat label="Chiffre d’affaires à récupérer" tone="accent" icon="arrow-redo-outline">
                  <Amount cents={data.toRecover.totalCents} size="metric" tone="accent" />
                  <Body style={{ color: colors.accentHover, marginTop: 2 }}>
                    {en
                      ? `${data.toRecover.quoteCount} quote${data.toRecover.quoteCount === 1 ? '' : 's'} without a reply · follow up`
                      : `${data.toRecover.quoteCount} devis sans réponse · relancez-les`}
                  </Body>
                </Stat>
              </Pressable>
            ) : null}

            {/* Ce qu'un artisan veut voir : ce qu'il a chiffré, et combien de
                devis sont partis. DEVISERA ne demande aucune acceptation au
                client, il n'y a donc pas de taux à afficher. */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Stat label={en ? 'Quoted revenue' : 'CA devisé'} hint={en ? 'over 30 days' : 'sur 30 jours'} icon="trending-up-outline">
                <Amount cents={data.quotedRevenueCents} size="metric" />
              </Stat>
              <Stat label={en ? 'Quotes sent' : 'Devis envoyés'} hint={en ? `${data.pendingQuotes} without a reply` : `${data.pendingQuotes} sans réponse`} icon="paper-plane-outline">
                <Body style={[typography.metric, { color: colors.ink }]}>{data.quotesSent}</Body>
              </Stat>
            </View>

            <Card style={{ gap: spacing.md }}>
              <SectionHeader
                title={en ? 'Recent activity' : 'Activité récente'}
                action={{ label: en ? 'See all' : 'Tout voir', onPress: () => router.push('/devis') }}
              />
              {data.recentActivity.length === 0 ? (
                <Muted>Aucune activité sur les 30 derniers jours.</Muted>
              ) : (
                data.recentActivity.slice(0, 5).map((event, index) => (
                  <View key={event.id} style={{ gap: spacing.md }}>
                    {index > 0 ? <Divider /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Devis ${event.quoteNumber}`}
                      onPress={() => router.push(`/devis/${event.quoteId}`)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Body numberOfLines={1} style={{ fontWeight: '600' }}>
                          {event.quoteTitle}
                        </Body>
                        {/* Sans ce qui est arrivé au devis, deux évènements du
                            même devis se ressemblaient à s'y méprendre. */}
                        <Muted style={{ fontSize: 13 }} numberOfLines={1}>
                        {(en
                          ? ({ CREE: 'Created', MODIFIE: 'Updated', ENVOYE: 'Sent to client', CONSULTE: 'Opened by client', ACCEPTE: 'Opened by client', REFUSE: 'Opened by client', MODIFICATION_DEMANDEE: 'Opened by client', RELANCE: 'Followed up', PDF_TELECHARGE: 'PDF downloaded', ANNULE: 'Cancelled' } as Record<string, string>)[event.type] ?? 'Updated'
                          : QUOTE_EVENT_LABELS[event.type] ?? 'Mis à jour')} ·{' '}
                        {relativeDay(event.createdAt, en)} · {event.quoteNumber}
                        </Muted>
                      </View>
                      <Amount cents={event.totalCents} tone="muted" />
                    </Pressable>
                  </View>
                ))
              )}
            </Card>

            {data.newLeads > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/prospects')}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Badge label={String(data.newLeads)} tone="accent" />
                  <Body style={{ flex: 1, fontWeight: '600' }}>
                    {en
                      ? `${data.newLeads} new quote request${data.newLeads > 1 ? 's' : ''}`
                      : `${data.newLeads} nouvelle${data.newLeads > 1 ? 's' : ''} demande${data.newLeads > 1 ? 's' : ''}`}
                  </Body>
                  <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
                </Card>
              </Pressable>
            ) : null}

            <Button
              title={en ? 'New quote' : 'Nouveau devis'}
              icon="add"
              haptic
              onPress={() => router.push('/devis/nouveau')}
            />
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </Screen>
    </SafeAreaView>
  );
}
