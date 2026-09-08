import * as React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '@/theme';
import { Card, ListRow } from './ui';
import { localizeText, useMobileLocale } from '@/lib/i18n';

/**
 * Primitives des écrans de réglages.
 *
 * « Mon espace » et « Mon compte » alignaient des cartes flottantes de
 * hauteurs différentes, chacune avec ses titres et ses boutons : rien ne
 * hiérarchisait. Ici, un groupe = un intitulé discret + une carte de lignes
 * homogènes, séparées d'un filet. Les lignes, pas les cartes, portent
 * l'action.
 */
export function SettingsGroup({
  title,
  children,
  footer,
  style,
  onBrand = false,
}: {
  title?: string;
  children: React.ReactNode;
  footer?: string;
  style?: ViewStyle;
  /** Groupe posé sur la surface bleue : intitulé blanc, sinon il disparaît. */
  onBrand?: boolean;
}) {
  const locale = useMobileLocale();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {title ? (
        <Text style={[typography.caption, { color: onBrand ? 'rgba(255,255,255,0.86)' : colors.muted, textTransform: 'uppercase', paddingHorizontal: 4 }]}>
          {localizeText(locale, title)}
        </Text>
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {rows.map((row, index) =>
          React.isValidElement<{ last?: boolean }>(row) ? React.cloneElement(row, { last: index === rows.length - 1 }) : row,
        )}
      </Card>
      {footer ? (
        <Text style={[typography.small, { color: colors.subtle, paddingHorizontal: 4, lineHeight: 18 }]}>
          {localizeText(locale, footer)}
        </Text>
      ) : null}
    </View>
  );
}

/** Ligne de réglage : icône teintée, titre, sous-titre, valeur, chevron. */
export function SettingsRow(props: React.ComponentProps<typeof ListRow>) {
  return <ListRow {...props} />;
}

/**
 * Pastille d'état : « adresse confirmée », « essai en cours »… Un état n'est
 * pas une alerte ; il ne doit pas occuper la largeur de l'écran.
 */
export function StatusChip({
  tone = 'success',
  icon,
  label,
  onLight = false,
}: {
  tone?: 'success' | 'warning' | 'info' | 'neutral';
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Posée sur la surface bleue : version translucide blanche. */
  onLight?: boolean;
}) {
  const locale = useMobileLocale();
  const palette = onLight
    ? { bg: 'rgba(255,255,255,0.18)', fg: colors.white, border: 'rgba(255,255,255,0.32)' }
    : {
        success: { bg: colors.successSoft, fg: colors.success, border: 'transparent' },
        warning: { bg: colors.warningSoft, fg: colors.warning, border: 'transparent' },
        info: { bg: colors.accentSoft, fg: colors.accentHover, border: 'transparent' },
        neutral: { bg: colors.surface2, fg: colors.inkSoft, border: 'transparent' },
      }[tone];
  const glyph = icon ?? (tone === 'success' ? 'checkmark-circle' : tone === 'warning' ? 'alert-circle' : 'information-circle');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.full,
        backgroundColor: palette.bg,
        borderWidth: onLight ? StyleSheet.hairlineWidth : 0,
        borderColor: palette.border,
      }}
    >
      <Ionicons name={glyph} size={14} color={palette.fg} />
      <Text style={{ color: palette.fg, fontSize: 12.5, fontWeight: '600', letterSpacing: -0.1 }}>{localizeText(locale, label)}</Text>
    </View>
  );
}

/** Identité de l'artisan sur la surface de marque : initiale, nom, entreprise, états. */
export function IdentityHeader({
  initial,
  avatar,
  name,
  subtitle,
  chips,
}: {
  initial: string;
  avatar?: React.ReactNode;
  name: string;
  subtitle?: string | null;
  chips?: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        {avatar ?? <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.32)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>{initial}</Text>
        </View>}
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={[typography.title, { color: colors.white, fontSize: 26, lineHeight: 32 }]}>{name}</Text>
          {subtitle ? <Text numberOfLines={1} style={[typography.body, { color: 'rgba(255,255,255,0.84)' }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {chips ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{chips}</View> : null}
    </View>
  );
}
