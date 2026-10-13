import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useServices } from "@/app/runtime/AppRuntime";
import type { SavedPlaceSlot } from "@/core/domain/entities/conversation";
import type { Place } from "@/core/domain/entities/place";
import { ListRow, IconButton } from "@/ui/components";
import { spacing } from "@/ui/theme";

/** Always show the named destinations; a missing address is an actionable row. */
export const SavedPlacesPanel = ({
  onNavigate,
}: {
  onNavigate(place: Place): void;
}) => {
  const { savedPlacesRepository } = useServices();
  const navigation = useNavigation();
  const [saved, setSaved] = useState<Partial<Record<SavedPlaceSlot, Place>>>(
    {},
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([
        savedPlacesRepository.get("home"),
        savedPlacesRepository.get("work"),
      ])
        .then(([home, work]) => {
          if (active)
            setSaved({ home: home ?? undefined, work: work ?? undefined });
        })
        .catch(() => {
          if (active)
            Alert.alert("Saved places unavailable", "Please try again.");
        });
      return () => {
        active = false;
      };
    }, [savedPlacesRepository]),
  );
  return (
    <View style={styles.panel}>
      {(["home", "work"] as const).map((slot) => (
        <ListRow
          key={slot}
          title={slot === "home" ? "Home" : "Work"}
          subtitle={saved[slot]?.address ?? `Save your ${slot} address`}
          icon={slot === "home" ? "home-outline" : "briefcase-outline"}
          onPress={() => {
            const place = saved[slot];
            if (place) onNavigate(place);
            else navigation.navigate("Search", { saveSlot: slot });
          }}
          trailing={
            saved[slot] ? (
              <IconButton
                name="create-outline"
                accessibilityLabel={`Edit ${slot} address`}
                onPress={() =>
                  navigation.navigate("Search", { saveSlot: slot })
                }
              />
            ) : undefined
          }
        />
      ))}
    </View>
  );
};
const styles = StyleSheet.create({ panel: { marginHorizontal: -spacing.md } });
