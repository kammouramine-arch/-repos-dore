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
    body: { fr: 'Toujours clair, même la nuit', en: 'Always light, even at night' },
  },
  {
    value: 'dark',
    icon: 'moon-outline',
    title: { fr: 'Sombre', en: 'Dark' },
    body: { fr: 'Toujours sombre, même en plein jour', en: 'Always dark, even in daylight' },
  },
];

/** Aperçu miniature : une page, une carte, un bouton — dans le thème visé. */
function Sample({ dark }: { dark: boolean }) {
  const page = dark ? '#0B0F17' : '#F5F7FB';
  const card = dark ? '#131924' : '#FFFFFF';
  const line = dark ? '#303A4B' : '#D8DEE8';
  const accent = dark ? '#5C7CFF' : '#2F52E8';
  return (
    <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: page, borderWidth: 1, borderColor: line, padding: 6, gap: 4, overflow: 'hidden' }}>
      <View style={{ height: 8, borderRadius: 3, backgroundColor: accent, width: '70%' }} />
      <View style={{ flex: 1, borderRadius: 5, backgroundColor: card, borderWidth: 1, borderColor: line }} />
    </View>
  );
}

export default function ApparenceScreen() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const en = useMobileLocale() === 'en';
  const { choice, scheme, setChoice } = useAppearance();

  return (
    <Screen>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {OPTIONS.map((option, index) => {
          const selected = choice === option.value;
          // L'aperçu d'« Automatique » montre ce que le système donne en ce
          // moment : c'est la seule réponse honnête à « ça donnera quoi ? ».
          const previewDark = option.value === 'dark' || (option.value === 'system' && scheme === 'dark');
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
              <Sample dark={previewDark} />
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
          ? 'Your choice is kept on this iPhone and applies the next time you open DEVISERA. Documents you send keep your brand colour in both appearances — a PDF is printed, not looked at on a screen.'
          : 'Votre choix est conservé sur cet iPhone et s’applique au prochain lancement. Les documents que vous envoyez gardent votre couleur de marque dans les deux apparences — un PDF s’imprime, il ne se regarde pas sur un écran.'}
      </Caption>
    </Screen>
  );
}
