import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.min(percent, 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 14,
    overflow: "hidden",
    width: "100%"
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: "100%"
  }
});
