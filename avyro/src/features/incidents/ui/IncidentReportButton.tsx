import { Alert } from "react-native";
import { useServices, useStores } from "@/app/runtime/AppRuntime";
import { canReportIncident } from "@/core/navigation/reportEligibility";
import type { IncidentCategory } from "@/core/domain/ports/incidentReporter";
import { IconButton } from "@/ui/components";

export const IncidentReportButton = () => {
  const { incidentReporter } = useServices();
  const stores = useStores();
  const submit = (category: IncidentCategory) => {
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
    Alert.alert(
      "What did you observe?",
      "Reports are reviewed before they appear to other drivers.",
      [
        { text: "Accident", onPress: () => submit("accident") },
        { text: "Hazard", onPress: () => submit("hazard") },
        { text: "Closure", onPress: () => submit("closure") },
        { text: "Police", onPress: () => submit("police") },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };
  return (
    <IconButton
      name="flag-outline"
      accessibilityLabel="Report an incident while parked"
      onPress={open}
    />
  );
};
