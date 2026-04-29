import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export type TabKey = "Home" | "Planner" | "Track" | "Recipes" | "Profile";

const tabs: TabKey[] = ["Home", "Planner", "Track", "Recipes", "Profile"];

export function BottomNav({
  activeTab,
  onChange
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const active = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.item, active && styles.activeItem]}
          >
            <Text style={[styles.text, active && styles.activeText]}>{tab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  item: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 10
  },
  activeItem: {
    backgroundColor: colors.primarySoft
  },
  text: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  activeText: {
    color: colors.primaryDark
  }
});
