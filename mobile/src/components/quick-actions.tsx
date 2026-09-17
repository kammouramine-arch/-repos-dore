import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, shadows, spacing } from '@/theme';
import { useMobileLocale } from '@/lib/i18n';

/**
 * Accès rapides de l'accueil.
 *
 * Un artisan qui vient de rentrer du chantier a deux gestes en tête :
 * photographier les tickets de la journée, et voir qui lui doit de l'argent.
 * Ces gestes n'ont pas à attendre qu'il explore la navigation. La rangée les
 * met sous le pouce, dès l'accueil, et les nomme par ce qu'ils font.
 *
 * Elle double délibérément l'onglet Outils : un raccourci n'est pas une
 * cachette, c'est la même destination atteinte plus vite.
 *
 * ## Un raccourci pousse, il ne déplace pas
 *
 * « Mes factures » menait à `/(app)/devis?onglet=factures` : l'application
 * basculait sur l'onglet Documents, et l'artisan parti de l'accueil se
 * retrouvait ailleurs, sans retour. Un raccourci n'a pas à décider où l'on
 * habite. Chacun pousse maintenant son propre écran, avec le retour iOS
 * habituel, et l'onglet sélectionné reste celui d'où l'on est parti.
 */

const ACTIONS: { href: Href; icon: keyof typeof Ionicons.glyphMap; label: { fr: string; en: string } }[] = [
  { href: '/depenses', icon: 'camera', label: { fr: 'Scanner\nun reçu', en: 'Scan a\nreceipt' } },
  { href: '/factures', icon: 'cash-outline', label: { fr: 'Mes\nfactures', en: 'My\ninvoices' } },
  { href: '/comptable', icon: 'share-outline', label: { fr: 'Export\ncomptable', en: 'Accountant\nexport' } },
  { href: '/signature', icon: 'create-outline', label: { fr: 'Ma\nsignature', en: 'My\nsignature' } },
  { href: '/marque', icon: 'color-palette-outline', label: { fr: 'Ma\nmarque', en: 'My\nbranding' } },
];

export function QuickActions({ onBrand = false }: { onBrand?: boolean }) {
  const router = useRouter();
  const en = useMobileLocale() === 'en';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.md, paddingVertical: 2 }}
    >
      {ACTIONS.map((action) => (
        <Pressable
          key={String(action.href)}
          accessibilityRole="button"
          accessibilityLabel={(en ? action.label.en : action.label.fr).replace('\n', ' ')}
          onPress={() => {
            void Haptics.selectionAsync().catch(() => undefined);
            router.push(action.href);
          }}
          style={({ pressed }) => ({
            width: 96,
            paddingVertical: spacing.lg,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.lg,
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.canvas,
            borderWidth: onBrand ? 0 : 1,
            borderColor: colors.line,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            ...shadows.card,
          })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={action.icon} size={19} color={colors.accent} />
          </View>
          <Text style={{ fontSize: 12.5, fontWeight: '600', lineHeight: 16, textAlign: 'center', color: colors.inkSoft }}>
            {en ? action.label.en : action.label.fr}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
