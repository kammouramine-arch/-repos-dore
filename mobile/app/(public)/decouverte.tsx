import * as React from 'react';
import { Animated, Easing, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PLANS, TRIAL_DAYS } from '@devisia/shared';
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Divider,
  Heading,
  Ionicons,
  Muted,
  ProgressDots,
  Title,
} from '@/components/ui';
import { Logo } from '@/components/logo';
import { markOnboardingSeen } from '@/lib/onboarding';
import { colors, motion, radius, spacing } from '@/theme';

/**
 * Découverte du produit, avant toute demande de compte.
 *
 * L'application envoyait l'artisan sur un formulaire de connexion sans lui
 * avoir dit ce que DEVISIA fait. On demandait un engagement avant d'avoir rien
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
      'Décrivez le chantier à voix haute comme à votre apprenti. DEVISIA met en forme les lignes, les quantités et les prix.',
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
      'Un PDF à votre image, un lien que le client ouvre et accepte depuis son téléphone.',
  },
  {
    icon: 'notifications',
    benefit: 'Plus de devis oubliés',
    detail:
      'DEVISIA suit les devis sans réponse et prépare la relance. Vous décidez de l’envoyer.',
  },
];

export default function DecouverteScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = React.useState(0);
  const scroller = React.useRef<ScrollView>(null);
  const fade = React.useMemo(() => new Animated.Value(0), []);

  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: motion.base,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const total = PILLARS.length + 1;
  const last = index === total - 1;

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(total - 1, next));
    setIndex(clamped);
    scroller.current?.scrollTo({ x: clamped * width, animated: true });
    void Haptics.selectionAsync();
  }

  async function leave(destination: '/inscription' | '/connexion') {
    await markOnboardingSeen();
    router.replace(destination);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.canvas }}>
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
            accessibilityLabel="Passer la présentation"
            onPress={() => goTo(total - 1)}
            hitSlop={10}
          >
            <Body style={{ color: colors.muted }}>Passer</Body>
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
          {PILLARS.map((pillar) => (
            <View
              key={pillar.benefit}
              style={{
                width,
                height: '100%',
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing['4xl'],
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xl,
              }}
            >
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: radius.full,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={pillar.icon} size={42} color={colors.accent} />
              </View>
              <View style={{ gap: spacing.md, alignItems: 'center' }}>
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
                <Badge label={`${TRIAL_DAYS} jours d’essai gratuit`} tone="accent" />
              </View>
              <Title style={{ textAlign: 'center' }}>Essayez sans engagement</Title>
              <Muted style={{ textAlign: 'center' }}>
                Aucune carte bancaire pour commencer. Vous choisirez votre formule à la fin de
                l’essai.
              </Muted>
            </View>

            {(['ESSENTIEL', 'PRO'] as const).map((id) => {
              const plan = PLANS[id];
              return (
                <Card key={id} style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                    <Heading>{plan.name}</Heading>
                    {id === 'PRO' ? <Badge label="Le plus choisi" tone="accent" /> : null}
                    <View style={{ flex: 1 }} />
                    <Body style={{ fontWeight: '700' }}>{plan.monthlyPriceCents / 100} €</Body>
                    <Caption style={{ color: colors.subtle }}>/ mois HT</Caption>
                  </View>
                  <Divider />
                  {plan.highlights.slice(0, 3).map((line) => (
                    <View key={line} style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                      <Body style={{ flex: 1, color: colors.inkSoft }}>{line}</Body>
                    </View>
                  ))}
                </Card>
              );
            })}

            <View style={{ gap: spacing.sm }}>
              <Button
                title={`Essayer gratuitement pendant ${TRIAL_DAYS} jours`}
                icon="arrow-forward"
                haptic
                onPress={() => void leave('/inscription')}
              />
              <Button
                title="J’ai déjà un compte"
                variant="ghost"
                onPress={() => void leave('/connexion')}
              />
            </View>
            <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
              L’essai s’arrête tout seul. Rien ne vous est prélevé sans votre accord.
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
                <Button title="Retour" variant="secondary" onPress={() => goTo(index - 1)} />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button title="Suivant" icon="arrow-forward" onPress={() => goTo(index + 1)} />
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
