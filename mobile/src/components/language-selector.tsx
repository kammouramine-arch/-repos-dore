import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth';
import { copy, type MobileLocale } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';
import { Muted } from './ui';
import { useToast } from './toast';

const OPTIONS: { locale: MobileLocale; label: string }[] = [
  { locale: 'fr', label: 'Français' },
  { locale: 'en', label: 'English' },
];

/**
 * Sélecteur Français / English.
 *
 * Tant que rien n'est choisi, l'application suit la langue de l'iPhone ; un
 * appui enregistre un choix explicite (sur l'appareil et sur le compte). Le
 * lien « Suivre la langue de l'iPhone » efface ce choix.
 */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, localeSource, setLanguage, session } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const en = locale === 'en';
  const chosen = localeSource === 'choice' || localeSource === 'account';

  const choose = async (next: MobileLocale | null) => {
    if (busy) return;
    if (next !== null && next === locale && chosen) return;
    setBusy(true);
    void Haptics.selectionAsync().catch(() => undefined);
    try {
      await setLanguage(next);
      const shown = next ?? locale;
      toast({ title: next === null
        ? (shown === 'en' ? 'Following your iPhone language' : 'La langue de l’iPhone est suivie')
        : (next === 'en' ? 'English saved' : 'Français enregistré') });
    } catch {
      toast({ title: en ? 'The language could not be saved. Try again.' : 'La langue n’a pas pu être enregistrée. Réessayez.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={copy(locale, 'language')}
        style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 3, gap: 3 }}
      >
        {OPTIONS.map((option) => {
          const selected = option.locale === locale;
          return (
            <Pressable
              key={option.locale}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected, disabled: busy }}
              accessibilityLabel={option.label}
              disabled={busy}
              onPress={() => void choose(option.locale)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: compact ? 8 : 10,
                borderRadius: radius.md - 3,
                alignItems: 'center',
                // `colors.white` est l'encre du bandeau de marque, pas une
                // surface : posée ici, la pastille sélectionnée restait blanche
                // en mode sombre, avec du texte clair dessus.
                backgroundColor: selected ? colors.canvas : 'transparent',
                shadowColor: '#0B1220',
                shadowOpacity: selected ? 0.08 : 0,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                opacity: pressed && !selected ? 0.7 : 1,
              })}
            >
              <Text style={[typography.bodyStrong, { color: selected ? colors.ink : colors.muted, fontSize: 14.5 }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {chosen ? (
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void choose(null)} hitSlop={6}>
          <Text style={[typography.small, { color: colors.accent, fontWeight: '600' }]}>
            {en ? 'Follow my iPhone language' : 'Suivre la langue de l’iPhone'}
          </Text>
        </Pressable>
      ) : (
        <Muted style={{ fontSize: 12.5 }}>
          {en
            ? `Following your iPhone language${session ? '. Choose one to keep it on every device.' : '.'}`
            : `Suit la langue de l’iPhone${session ? '. Choisissez-en une pour la conserver sur tous vos appareils.' : '.'}`}
        </Muted>
      )}
    </View>
  );
}
