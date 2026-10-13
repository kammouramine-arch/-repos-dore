import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocationStore, usePreferencesStore } from "@/app/stores/hooks";
import { AppText, GlassPanel } from "@/ui/components";
import { spacing } from "@/ui/theme";
import { formatSpeed, speedUnitLabel } from "@/utils/format";
import { useRoadInformation } from '../hooks/useRoadInformation';

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
  const fresh =
    fix &&
    fix.timestamp <= now &&
    now - fix.timestamp < 10000 &&
    fix.accuracy !== null &&
    fix.accuracy <= 30;
  const speed =
    fresh && fix.speed !== null && Number.isFinite(fix.speed) && fix.speed >= 0
      ? formatSpeed(fix.speed, unit)
      : null;
  return (
    <GlassPanel style={styles.panel}>
      <AppText variant="caption" tone="secondary">
        GPS SPEED
      </AppText>
      <View style={styles.speed}>
        <AppText variant="title1">{speed ?? "—"}</AppText>
        <AppText variant="caption" tone="tertiary">
          {speedUnitLabel(unit)}
        </AppText>
      </View>
      <AppText variant="caption" tone="tertiary">
        {road?.speedLimit ? `Mapped limit ${road.speedLimit.value} ${road.speedLimit.unit}` : 'Limit unavailable'}
      </AppText>
      {road?.speedLimit ? <AppText variant="caption" tone="tertiary">TomTom · follow road signs</AppText> : null}
    </GlassPanel>
  );
};
const styles = StyleSheet.create({
  panel: { padding: spacing.sm, gap: spacing.xxs, alignSelf: "flex-end" },
  speed: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
});
