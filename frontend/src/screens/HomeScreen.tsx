import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { MetricPill } from "../components/MetricPill";
import { ProgressBar } from "../components/ProgressBar";
import { colors } from "../theme/colors";
import { DailySummary } from "../types";

export function HomeScreen({
  summary,
  alertMessage,
  onRefresh
}: {
  summary: DailySummary | null;
  alertMessage: string;
  onRefresh: () => void;
}) {
  const progress = summary?.progressPercent || 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>CalTrackr</Text>
          <Text style={styles.title}>Today</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <Card>
        <Text style={styles.cardLabel}>Calories</Text>
        <Text style={styles.heroNumber}>
          {summary?.consumed || 0}
          <Text style={styles.goalText}> / {summary?.goal || 2000} kcal</Text>
        </Text>
        <ProgressBar percent={progress} />
        <Text style={styles.progressText}>{progress}% of daily goal</Text>
      </Card>

      <View style={styles.metricRow}>
        <MetricPill label="Protein" value={`${summary?.macros.protein || 0}g`} />
        <MetricPill label="Carbs" value={`${summary?.macros.carbs || 0}g`} />
        <MetricPill label="Fats" value={`${summary?.macros.fats || 0}g`} />
      </View>

      <Card>
        <Text style={styles.cardLabel}>Limit alert</Text>
        <Text style={styles.alertText}>{alertMessage}</Text>
      </Card>

      <Card>
        <Text style={styles.cardLabel}>Meals logged</Text>
        {(summary?.meals || []).length === 0 ? (
          <Text style={styles.muted}>No meals logged yet.</Text>
        ) : (
          summary?.meals.map((meal) => (
            <View key={meal.id} style={styles.mealRow}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 32
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900"
  },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  refreshText: {
    color: colors.surface,
    fontWeight: "800"
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase"
  },
  heroNumber: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 12
  },
  goalText: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "700"
  },
  progressText: {
    color: colors.muted,
    marginTop: 10
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  alertText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  muted: {
    color: colors.muted
  },
  mealRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10
  },
  mealName: {
    color: colors.text,
    fontWeight: "700"
  },
  mealCalories: {
    color: colors.primaryDark,
    fontWeight: "800"
  }
});
