import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Body, Caption, PageHeader } from '@/components/ui';
import { Enter } from '@/components/motion';
import { useMobileLocale } from '@/lib/i18n';
import { useTabBarSpace } from '@/components/glass-tab-bar';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * Outils.
 *
 * Reçus, export comptable et marque étaient rangés sous « Mon espace », entre
 * la langue de l'application et la suppression du compte. Ce ne sont pas des
 * préférences : ce sont trois des raisons d'utiliser DEVISERA. Ils ont donc
 * leur destination, avec des cartes assez grandes pour qu'on comprenne à quoi
 * elles servent sans les ouvrir.
 *
 * L'ordre suit la fréquence réelle : on scanne un reçu chaque semaine, on
 * envoie au comptable chaque mois, on règle sa marque une fois.
 */

type Tool = {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: { fr: string; en: string };
  body: { fr: string; en: string };
  cta: { fr: string; en: string };
};

const FEATURED: Tool[] = [
  {
    href: '/depenses',
    icon: 'camera',
    title: { fr: 'Reçus et dépenses', en: 'Receipts & expenses' },
    body: {
      fr: 'Photographiez un ticket de fournisseur. Le marchand, la date, le montant et la TVA sont relus, puis classés.',
      en: 'Photograph a supplier receipt. Merchant, date, amount and VAT are read back, then filed.',
    },
    cta: { fr: 'Scanner un reçu', en: 'Scan a receipt' },
  },
  {
    href: '/comptable',
    icon: 'share',
    title: { fr: 'Export comptable', en: 'Accountant export' },
    body: {
      fr: 'Ventes, dépenses et encaissements sur la période de votre choix, en trois fichiers qui s’ouvrent dans Excel.',
      en: 'Sales, expenses and payments over the period you choose, as three files that open in Excel.',
    },
    cta: { fr: 'Préparer un envoi', en: 'Prepare an export' },
  },
  {
    href: '/marque',
    icon: 'color-palette',
    title: { fr: 'Ma marque', en: 'My branding' },
    body: {
      fr: 'Votre logo, votre couleur et votre modèle de document. L’aperçu montre le devis tel que votre client le recevra.',
      en: 'Your logo, your colour and your document style. The preview shows the quote exactly as your client receives it.',
    },
    cta: { fr: 'Personnaliser mes documents', en: 'Customise my documents' },
  },
];

const SECONDARY: { href: Href; icon: keyof typeof Ionicons.glyphMap; title: { fr: string; en: string }; body: { fr: string; en: string } }[] = [
  {
    href: '/catalogue',
    icon: 'book-outline',
    title: { fr: 'Catalogue de prix', en: 'Price catalogue' },
    body: { fr: 'Vos prestations et vos tarifs habituels', en: 'Your usual services and prices' },
  },
  {
    href: '/analytique',
    icon: 'bar-chart-outline',
    title: { fr: 'Chiffre d’affaires', en: 'Revenue' },
    body: { fr: 'Ce qui rentre, mois par mois', en: 'What comes in, month by month' },
  },
  {
    href: '/paiements',
    icon: 'card-outline',
    title: { fr: 'Encaissement en ligne', en: 'Online payments' },
    body: { fr: 'Laissez vos clients régler par carte', en: 'Let your clients pay by card' },
  },
  {
    href: '/presentation',
    icon: 'sparkles-outline',
    title: { fr: 'Découvrir DEVISERA', en: 'Discover DEVISERA' },
    body: { fr: 'Ce que l’application sait faire, et les formules', en: 'What the app can do, and the plans' },
  },
];

/** Grande carte : icône pleine, titre, une phrase, et l'action nommée. */
function ToolCard({ tool, en, onPress }: { tool: Tool; en: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={en ? tool.title.en : tool.title.fr}
      accessibilityHint={en ? tool.body.en : tool.body.fr}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radius.xl,
        backgroundColor: colors.canvas,
        padding: spacing.xl,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.line,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...shadows.card,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={tool.icon} size={23} color={colors.accent} />
        </View>
        <Text style={{ flex: 1, fontSize: 19, fontWeight: '700', letterSpacing: -0.4, color: colors.ink }}>
          {en ? tool.title.en : tool.title.fr}
        </Text>
      </View>
      <Body style={{ color: colors.muted, lineHeight: 22 }}>{en ? tool.body.en : tool.body.fr}</Body>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{en ? tool.cta.en : tool.cta.fr}</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.accent} />
      </View>
    </Pressable>
  );
}

export default function OutilsScreen() {
  const router = useRouter();
  const en = useMobileLocale() === 'en';
  const tabBarSpace = useTabBarSpace();
  const go = (href: Href) => {
    void Haptics.selectionAsync().catch(() => undefined);
    router.push(href);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: tabBarSpace, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Enter distance={8}>
          <PageHeader
            eyebrow={en ? 'Tools' : 'Outils'}
            icon="apps"
            title={en ? 'Everything around the job' : 'Tout ce qui entoure le chantier'}
            subtitle={en ? 'Receipts, accounting and the look of your documents.' : 'Les justificatifs, la comptabilité et l’allure de vos documents.'}
          />
        </Enter>

        {FEATURED.map((tool, index) => (
          <Enter key={String(tool.href)} delay={60 + index * 50} distance={8}>
            <ToolCard tool={tool} en={en} onPress={() => go(tool.href)} />
          </Enter>
        ))}

        <Enter delay={240} distance={8}>
          <Caption upper style={{ color: colors.subtle, marginTop: spacing.sm }}>
            {en ? 'Also useful' : 'Utile aussi'}
          </Caption>
        </Enter>

        <Enter delay={280} distance={8}>
          <View style={{ borderRadius: radius.lg, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
            {SECONDARY.map((entry, index) => (
              <Pressable
                key={String(entry.href)}
                accessibilityRole="button"
                accessibilityLabel={en ? entry.title.en : entry.title.fr}
                onPress={() => go(entry.href)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.lg,
                  minHeight: 64,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.line,
                  backgroundColor: pressed ? colors.surface : colors.canvas,
                })}
              >
                <Ionicons name={entry.icon} size={21} color={colors.muted} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>{en ? entry.title.en : entry.title.fr}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{en ? entry.body.en : entry.body.fr}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
              </Pressable>
            ))}
          </View>
        </Enter>

      </ScrollView>
    </SafeAreaView>
  );
}
