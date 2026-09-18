import * as React from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Body, Caption, Card, Muted, Screen } from '@/components/ui';
import { useAppearance, type AppearanceChoice } from '@/lib/appearance';
import { useMobileLocale } from '@/lib/i18n';
import { colors, spacing, useThemeScheme } from '@/theme';

/**
 * Apparence.
 *
 * Trois lignes, une coche. Le réglage s'applique à l'instant où on le touche —
 * il n'y a rien à valider, et l'écran lui-même change de couleur sous le
 * doigt : c'est la meilleure démonstration possible de ce qu'on vient de
 * choisir.
 *
 * « Automatique » suit l'iPhone en direct, y compris quand celui-ci bascule
 * tout seul au coucher du soleil. Les deux autres sont des décisions et
 * tiennent contre le système.
 */

const OPTIONS: { value: AppearanceChoice; icon: keyof typeof Ionicons.glyphMap; title: { fr: string; en: string }; body: { fr: string; en: string } }[] = [
  {
    value: 'system',
    icon: 'phone-portrait-outline',
    title: { fr: 'Automatique', en: 'Automatic' },
    body: { fr: 'Suit l’apparence de votre iPhone', en: 'Follows your iPhone’s appearance' },
  },
  {
    value: 'light',
    icon: 'sunny-outline',
    title: { fr: 'Clair', en: 'Light' },
    body: { fr: 'Toujours l’apparence claire', en: 'Always use the Light appearance' },
  },
  {
    value: 'dark',
    icon: 'moon-outline',
    title: { fr: 'Sombre', en: 'Dark' },
    body: { fr: 'Toujours l’apparence sombre', en: 'Always use the Dark appearance' },
  },
];

/** Aperçu miniature : une page, une carte, un bouton — dans le thème visé. */
const SAMPLE = {
  light: { page: '#F5F7FB', card: '#FFFFFF', line: '#D8DEE8', accent: '#2F52E8' },
  dark: { page: '#0B0F17', card: '#131924', line: '#303A4B', accent: '#5C7CFF' },
} as const;

function Face({ tone }: { tone: 'light' | 'dark' }) {
  const { page, card, accent } = SAMPLE[tone];
  return (
    <View style={{ width: 46, height: 46, backgroundColor: page, padding: 6, gap: 4 }}>
      <View style={{ height: 8, borderRadius: 3, backgroundColor: accent, width: '70%' }} />
      <View style={{ flex: 1, borderRadius: 5, backgroundColor: card }} />
    </View>
  );
}

/**
 * L'aperçu d'une option.
 *
 * « Clair » et « Sombre » montrent le thème qu'ils imposent. « Automatique »
 * n'impose rien : son aperçu est **coupé en deux**, une moitié claire et une
 * moitié sombre. L'ancienne version lui donnait le thème résolu du moment, si
 * bien qu'il était indiscernable de « Sombre » sur un iPhone sombre — la
 * vignette ne disait plus ce que l'option fait, seulement ce qu'elle donne
 * aujourd'hui.
 */
function Sample({ tone }: { tone: 'light' | 'dark' | 'auto' }) {
  const border = tone === 'light' ? SAMPLE.light.line : SAMPLE.dark.line;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden' }}
    >
      {tone === 'auto' ? (
        <View style={{ flexDirection: 'row', width: 46, height: 46 }}>
          {/* Deux moitiés, chacune rendue en pleine largeur puis rognée : les
              proportions du dessin restent celles des deux autres vignettes. */}
          <View style={{ width: 23, overflow: 'hidden' }}><Face tone="light" /></View>
          <View style={{ width: 23, overflow: 'hidden' }}>
            <View style={{ marginLeft: -23 }}><Face tone="dark" /></View>
          </View>
        </View>
      ) : (
        <Face tone={tone} />
      )}
    </View>
  );
}

export default function ApparenceScreen() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const en = useMobileLocale() === 'en';
  const { choice, setChoice } = useAppearance();

  return (
    <Screen>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {OPTIONS.map((option, index) => {
          const selected = choice === option.value;
          // La coche suit la **préférence**, jamais le thème résolu :
          // « Automatique » reste coché sur un iPhone passé en sombre.
          const tone = option.value === 'system' ? 'auto' : option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={en ? option.title.en : option.title.fr}
              onPress={() => {
                if (selected) return;
                void Haptics.selectionAsync().catch(() => undefined);
                setChoice(option.value);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                minHeight: 68,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.line,
                backgroundColor: pressed ? colors.surface2 : 'transparent',
              })}
            >
              <Sample tone={tone} />
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '600' }}>{en ? option.title.en : option.title.fr}</Body>
                <Muted style={{ fontSize: 13 }}>{en ? option.body.en : option.body.fr}</Muted>
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={selected ? colors.accent : colors.lineStrong}
              />
            </Pressable>
          );
        })}
      </Card>

      <Caption style={{ color: colors.subtle, paddingHorizontal: 4, lineHeight: 17 }}>
        {en
          ? 'Automatic follows your iPhone’s Light or Dark appearance, as it changes. Your choice is kept on this iPhone. Documents you send keep your brand colour in both appearances — a PDF is printed, not looked at on a screen.'
          : 'Automatique suit l’apparence claire ou sombre de votre iPhone, au fil de ses changements. Votre choix est conservé sur cet iPhone. Les documents que vous envoyez gardent votre couleur de marque dans les deux apparences — un PDF s’imprime, il ne se regarde pas sur un écran.'}
      </Caption>
    </Screen>
  );
}
