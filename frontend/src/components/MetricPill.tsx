import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    flex: 1,
    padding: 12
  },
  value: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800"
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  }
});
