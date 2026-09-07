import * as React from 'react';
import { Animated, Easing, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TRIAL_DAYS } from '@devisia/shared';
import { useAuth } from '@/lib/auth';
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  Ionicons,
  Muted,
  ProgressDots,
  Title,
} from '@/components/ui';
import { Logo } from '@/components/logo';
import { markOnboardingSeen } from '@/lib/onboarding';
import { useMobileLocale } from '@/lib/i18n';
import { colors, motion, radius, spacing } from '@/theme';

/**
 * Découverte du produit, avant toute demande de compte.
 *
 * L'application envoyait l'artisan sur un formulaire de connexion sans lui
 * avoir dit ce que DEVISERA fait. On demandait un engagement avant d'avoir rien
 * promis. Quatre écrans suffisent à énoncer la valeur, puis un cinquième
 * présente l'essai et les formules — et l'essai ne démarre que sur un geste
 * explicite.
 */
interface Pillar {
  icon: keyof typeof Ionicons.glyphMap;
  benefit: string;
  detail: string;
}

const PILLARS: Pillar[] = [
  {
    icon: 'mic',
    benefit: 'Dictez, le devis s’écrit',
    detail:
      'Décrivez le chantier à voix haute comme à votre apprenti. DEVISERA met en forme les lignes, les quantités et les prix.',
  },
  {
    icon: 'camera',
    benefit: 'Vos photos comptent',
    detail:
      'Ajoutez des photos du chantier : elles servent à décrire le travail et restent jointes au devis.',
  },
  {
    icon: 'document-text',
    benefit: 'Un devis net, envoyé en deux gestes',
    detail:
      'Un PDF à votre image, prêt à être vérifié puis envoyé directement à votre client.',
  },
  {
    icon: 'notifications',
    benefit: 'Plus de devis oubliés',
    detail:
      'DEVISERA suit les devis sans réponse et prépare la relance. Vous décidez de l’envoyer.',
  },
];

const PILLARS_EN: Pillar[] = [
  { icon: 'mic', benefit: 'Speak it, the quote writes itself', detail: 'Describe the job out loud as if talking to your apprentice. DEVISERA turns your words into clear line items, quantities and prices.' },
  { icon: 'camera', benefit: 'Your photos add context', detail: 'Add job-site photos: they help describe the work and stay attached to the quote.' },
  { icon: 'document-text', benefit: 'A clean quote, sent in two taps', detail: 'A professional PDF in your brand, ready to review and send directly to your customer.' },
  { icon: 'notifications', benefit: 'Fewer forgotten quotes', detail: 'DEVISERA follows quotes without a reply and prepares the follow-up. You decide when to send it.' },
];

export default function DecouverteScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const locale = useMobileLocale();
  const en = locale === 'en';
  const { width } = useWindowDimensions();
  const [index, setIndex] = React.useState(0);
  const scroller = React.useRef<ScrollView>(null);
  const fade = React.useMemo(() => new Animated.Value(1), []);

  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: motion.base,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const pillars = en ? PILLARS_EN : PILLARS;
  const total = pillars.length + 1;
  const last = index === total - 1;

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(total - 1, next));
    setIndex(clamped);
    scroller.current?.scrollTo({ x: clamped * width, animated: true });
    void Haptics.selectionAsync().catch(() => undefined);
  }

  async function leave(destination: '/inscription' | '/connexion') {
    await markOnboardingSeen();
    router.replace(status === 'connecte' ? '/abonnement' : destination);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <Logo size={26} />
        {!last ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={en ? 'Skip introduction' : 'Passer la présentation'}
            onPress={() => goTo(total - 1)}
            hitSlop={10}
          >
            <View style={{ backgroundColor: colors.canvas, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Body style={{ color: colors.muted, fontSize: 13 }}>{en ? 'Skip' : 'Passer'}</Body>
            </View>
          </Pressable>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {pillars.map((pillar, pillarIndex) => (
            <View
              key={pillar.benefit}
              style={{
                width,
                height: '100%',
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing['4xl'],
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing['3xl'],
              }}
            >
              <View
                style={{
                  width: Math.min(width - 48, 270),
                  height: 238,
                  borderRadius: 34,
                  backgroundColor: colors.accentDeep,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: colors.accent, opacity: 0.34, right: -54, top: -64 }} />
                <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: colors.accentBright, opacity: 0.12, left: -46, bottom: -30 }} />
                <View
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 25,
                    backgroundColor: 'rgba(255,255,255,0.14)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={pillar.icon} size={36} color={colors.white} />
                </View>
                <View style={{ position: 'absolute', left: 30, right: 30, bottom: 28, flexDirection: 'row', gap: 7 }}>
                  {Array.from({ length: total }, (_, bar) => (
                    <View key={bar} style={{ flex: bar === pillarIndex ? 1.6 : 1, height: 4, borderRadius: 2, backgroundColor: bar === pillarIndex ? colors.white : 'rgba(255,255,255,0.25)' }} />
                  ))}
                </View>
              </View>
              <View style={{ gap: spacing.md, alignItems: 'center' }}>
                <Caption upper style={{ color: colors.accent }}>{String(pillarIndex + 1).padStart(2, '0')} · {String(total).padStart(2, '0')}</Caption>
                <Title style={{ textAlign: 'center' }}>{pillar.benefit}</Title>
                <Body style={{ color: colors.muted, textAlign: 'center', lineHeight: 23 }}>
                  {pillar.detail}
                </Body>
              </View>
            </View>
          ))}

          {/* Écran de conversion : l'essai est nommé, daté, et jamais implicite. */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg }}
          >
            <View style={{ gap: spacing.sm, alignItems: 'center', paddingTop: spacing.md }}>
              {/* Badge est aligné à gauche par défaut : on le recentre ici. */}
              <View>
                <Badge label={en ? `${TRIAL_DAYS}-day free trial` : `${TRIAL_DAYS} jours d’essai gratuit`} tone="accent" />
              </View>
              <Title style={{ textAlign: 'center' }}>{en ? 'Try it with no commitment' : 'Essayez sans engagement'}</Title>
              <Muted style={{ textAlign: 'center' }}>
                {en
                  ? `Choose your plan and confirm with Apple. After the ${TRIAL_DAYS} free days, your subscription renews automatically unless cancelled. For eligible accounts.`
                  : `Choisissez votre formule, puis confirmez avec Apple. Après les ${TRIAL_DAYS} jours gratuits, l’abonnement se renouvelle automatiquement sauf annulation. Offre réservée aux comptes éligibles.`}
              </Muted>
            </View>

            <Card style={{ gap: spacing.lg }}>
              <Heading>{en ? 'Your first quote starts here' : 'Votre premier devis commence ici'}</Heading>
              <Body>{en ? 'Describe a real job, find your customers and prepare your first PDF.' : 'Décrivez un vrai chantier, retrouvez vos clients et préparez votre premier PDF.'}</Body>
              <Muted>{en ? 'Choose your plan once on the next screen. Apple shows the final price and terms before you confirm.' : 'Vous choisirez une seule fois votre formule sur l’écran suivant, avec son prix et les conditions Apple avant de confirmer.'}</Muted>
            </Card>

            <View style={{ gap: spacing.sm }}>
              <Button
                title={status === 'connecte' ? (en ? 'View plans' : 'Voir les formules') : (en ? 'Create my account' : 'Créer mon compte')}
                icon="arrow-forward"
                haptic
                onPress={() => void leave('/inscription')}
              />
              {status !== 'connecte' ? <Button
                title={en ? 'I already have an account' : 'J’ai déjà un compte'}
                variant="ghost"
                onPress={() => void leave('/connexion')}
              /> : null}
            </View>
            <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
              {en
                ? 'Reference prices for France. Apple confirms the final price, currency and trial eligibility before you agree.'
                : 'Tarifs de référence en France. Le prix final, la devise et votre éligibilité à l’essai sont confirmés par Apple avant votre accord.'}
            </Caption>
          </ScrollView>
        </ScrollView>
      </Animated.View>

      <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.lg }}>
        <ProgressDots total={total} current={index} />
        {!last ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {index > 0 ? (
              <View style={{ flex: 1 }}>
                <Button title={en ? 'Back' : 'Retour'} variant="secondary" onPress={() => goTo(index - 1)} />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button title={en ? 'Next' : 'Suivant'} icon="arrow-forward" onPress={() => goTo(index + 1)} />
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
