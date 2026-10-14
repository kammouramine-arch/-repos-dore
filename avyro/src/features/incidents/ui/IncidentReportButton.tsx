import { Alert, Modal, StyleSheet, View } from "react-native";
import { useState } from 'react';
import { useServices, useStores } from "@/app/runtime/AppRuntime";
import { canReportIncident } from "@/core/navigation/reportEligibility";
import type { IncidentCategory } from "@/core/domain/ports/incidentReporter";
import { AppText, Button, GlassPanel, IconButton, PressableScale } from "@/ui/components";
import { colors, spacing } from '@/ui/theme';

const categories: { category: IncidentCategory; title: string; symbol: string }[] = [
  { category: 'traffic', title: 'Traffic', symbol: '≋' },
  { category: 'police', title: 'Police', symbol: '◈' },
  { category: 'accident', title: 'Crash', symbol: '!' },
  { category: 'hazard', title: 'Hazard', symbol: '△' },
  { category: 'closure', title: 'Closure', symbol: '⊘' },
  { category: 'blocked-lane', title: 'Blocked lane', symbol: '↥' },
  { category: 'weather', title: 'Weather', symbol: '☂' },
  { category: 'map-issue', title: 'Map issue', symbol: '⌖' },
];

export const IncidentReportButton = () => {
  const { incidentReporter } = useServices();
  const stores = useStores();
  const [visible, setVisible] = useState(false);
  const submit = (category: IncidentCategory) => {
    setVisible(false);
    Alert.alert(
      "Share this observation?",
      "Avyro will send your current location and report category for moderation. Other drivers see an approximate location only after approval. Report only what you observed; stay safely parked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send report",
          onPress: () => {
            const fix = stores.location.getState().position;
            if (!fix || !canReportIncident(fix, Date.now())) {
              Alert.alert(
                "Report paused",
                "Stay safely parked and wait for an accurate location.",
              );
              return;
            }
            void incidentReporter
              .submit(category, fix)
              .then(() =>
                Alert.alert(
                  "Submitted for review",
                  "Your observation is pending moderation.",
                ),
              )
              .catch(() =>
                Alert.alert(
                  "Report not sent",
                  "Please try again while safely parked.",
                ),
              );
          },
        },
      ],
    );
  };
  const open = () => {
    if (!canReportIncident(stores.location.getState().position, Date.now())) {
      Alert.alert(
        "Report while parked",
        "Stop in a safe place before reporting.",
      );
      return;
    }
    if (!incidentReporter.isConfigured()) {
      Alert.alert(
        "Community reports unavailable",
        "The moderation service has not been connected yet.",
      );
      return;
    }
    setVisible(true);
  };
  return (
    <><IconButton
      name="flag-outline"
      accessibilityLabel="Report an incident while parked"
      onPress={open}
    />
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}><GlassPanel style={styles.sheet}>
        <AppText variant="title2">What did you see?</AppText>
        <AppText variant="footnote" tone="secondary">Report while parked. Observations remain pending until reviewed.</AppText>
        <View style={styles.grid}>{categories.map(item => <PressableScale key={item.category} style={styles.tile} accessibilityRole="button" accessibilityLabel={`Report ${item.title}`} onPress={() => submit(item.category)}><AppText variant="title1" tone="accent">{item.symbol}</AppText><AppText variant="subhead">{item.title}</AppText></PressableScale>)}</View>
        <Button label="Close" variant="ghost" onPress={() => setVisible(false)} />
      </GlassPanel></View>
    </Modal></>
  );
};
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: spacing.md, paddingBottom: spacing.xl, backgroundColor: colors.scrim },
  sheet: { padding: spacing.lg, gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '30%', paddingVertical: spacing.md, alignItems: 'center', gap: spacing.xs, borderRadius: 18, backgroundColor: colors.accentMuted },
});
