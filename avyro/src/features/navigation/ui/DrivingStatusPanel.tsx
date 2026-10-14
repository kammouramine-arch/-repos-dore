import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocationStore, usePreferencesStore } from "@/app/stores/hooks";
import { AppText, GlassPanel } from "@/ui/components";
import { spacing } from "@/ui/theme";
import { formatSpeed, speedUnitLabel } from "@/utils/format";
import { useRoadInformation } from '../hooks/useRoadInformation';
import { aboveMappedLimit, measuredSpeed } from '@/core/navigation/measuredSpeed';

/** GPS speed is a measurement, never a statement about the legal road limit. */
export const DrivingStatusPanel = () => {
  const fix = useLocationStore((state) => state.position);
  const unit = usePreferencesStore((state) => state.preferences.distanceUnit);
  const [now, setNow] = useState(Date.now);
  const road = useRoadInformation(now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const measurement = measuredSpeed(fix, now);
  const speed = formatSpeed(measurement, unit);
  const limit = road?.speedLimit;
  const overLimit = aboveMappedLimit(measurement, limit);
  return (
    <GlassPanel style={styles.panel}>
      <AppText variant="caption" tone="secondary">
        GPS SPEED
      </AppText>
      <View style={styles.speed}>
        <AppText variant="title1" tone={overLimit ? 'danger' : 'primary'}>{speed ?? "—"}</AppText>
        <AppText variant="caption" tone="tertiary">
          {speedUnitLabel(unit)}
        </AppText>
      </View>
      {limit ? <View style={styles.limit}><AppText variant="headline">{limit.value}</AppText><AppText variant="caption">{limit.unit}</AppText></View> : <AppText variant="caption" tone="tertiary">Limit unavailable</AppText>}
      {overLimit ? <AppText variant="caption" tone="danger">Above mapped limit</AppText> : null}
      {road?.speedLimit ? <AppText variant="caption" tone="tertiary">TomTom · follow road signs</AppText> : null}
    </GlassPanel>
  );
};
const styles = StyleSheet.create({
  panel: { padding: spacing.sm, gap: spacing.xxs, alignSelf: "flex-end" },
  speed: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  limit: { borderWidth: 3, borderColor: '#C83F49', borderRadius: 32, minWidth: 58, minHeight: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});
