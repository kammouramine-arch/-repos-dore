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
 * Deux lignes, une coche. Le réglage s'applique à l'instant où on le touche —
 * il n'y a rien à valider, et l'écran lui-même change de couleur sous le
 * doigt : c'est la meilleure démonstration possible de ce qu'on vient de
 * choisir.
 *
 * « Automatique » a été retiré. Il obligeait l'application à lire l'apparence
 * de l'iPhone en continu tout en lui imposant un thème, ce qui revenait à lire
 * sa propre écriture ; il finissait par rendre le contraire du mode précédent.
 * L'apparence du téléphone ne sert plus qu'une fois, au premier lancement,
 * pour choisir la valeur de départ.
 */

const OPTIONS: { value: AppearanceChoice; icon: keyof typeof Ionicons.glyphMap; title: { fr: string; en: string }; body: { fr: string; en: string } }[] = [
  {
    value: 'light',
    icon: 'sunny-outline',
    title: { fr: 'Clair', en: 'Light' },
    body: { fr: 'Fond clair, encre sombre', en: 'Light background, dark ink' },
  },
  {
    value: 'dark',
    icon: 'moon-outline',
    title: { fr: 'Sombre', en: 'Dark' },
    body: { fr: 'Fond de nuit, encre claire', en: 'Night background, light ink' },
  },
];

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
 * L'aperçu d'une option : le thème qu'elle impose, en miniature.
 */
function Sample({ tone }: { tone: 'light' | 'dark' }) {
  const border = tone === 'light' ? SAMPLE.light.line : SAMPLE.dark.line;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden' }}
    >
      <Face tone={tone} />
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
          const tone = option.value;
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
          ? 'Your choice applies immediately and is kept on this iPhone. Documents you send keep your brand colour in both appearances — a PDF is printed, not looked at on a screen.'
          : 'Votre choix s’applique aussitôt et reste enregistré sur cet iPhone. Les documents que vous envoyez gardent votre couleur de marque dans les deux apparences — un PDF s’imprime, il ne se regarde pas sur un écran.'}
      </Caption>
    </Screen>
  );
}
