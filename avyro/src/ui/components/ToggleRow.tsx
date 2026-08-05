import { Switch } from 'react-native';

import { haptics } from '@/ui/feedback/haptics';
import { colors, palette } from '@/ui/theme';
import { ListRow } from './ListRow';

export interface ToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A settings row whose entire surface is inert — only the switch acts. */
export const ToggleRow = ({ title, subtitle, value, onChange }: ToggleRowProps) => (
  <ListRow
    title={title}
    subtitle={subtitle}
    trailing={
      <Switch
        value={value}
        onValueChange={(next) => {
          haptics.selection();
          onChange(next);
        }}
        trackColor={{ false: colors.surfaceHighlight, true: colors.accent }}
        thumbColor={palette.white}
        ios_backgroundColor={colors.surfaceHighlight}
      />
    }
  />
);
