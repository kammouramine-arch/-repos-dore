import { t, useUiLanguage } from '@/ui/i18n';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, sizing, spacing, typography } from '@/ui/theme';
import { Icon } from '@/ui/components/Icon';

export interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  busy?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/** The search input itself: icon, field, and a clear affordance while typing. */
export const SearchField = ({
  value,
  onChangeText,
  busy = false,
  autoFocus = false,
  onSubmit,
}: SearchFieldProps) => { useUiLanguage(); return ((
  <View style={styles.field}>
    <Icon name="search" size={19} color={colors.textSecondary} />

    <TextInput
      value={value}
      onChangeText={onChangeText}
      autoFocus={autoFocus}
      placeholder={t("Search a place or address")}
      placeholderTextColor={colors.textTertiary}
      selectionColor={colors.accent}
      returnKeyType="search"
      onSubmitEditing={onSubmit}
      autoCorrect={false}
      style={styles.input}
      accessibilityLabel={t("Destination")}
    />

    {busy ? <ActivityIndicator size="small" color={colors.textTertiary} /> : null}

    {value.length > 0 && !busy ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Clear search")}
        hitSlop={12}
        onPress={() => onChangeText('')}
      >
        <Icon name="close-circle" size={19} color={colors.textTertiary} />
      </Pressable>
    ) : null}
  </View>
)); };

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: sizing.controlHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    letterSpacing: typography.body.letterSpacing,
    padding: 0,
  },
});
