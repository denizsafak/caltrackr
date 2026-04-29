import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { CalorieCalculatorAPI } from "../core/calorieCalculator";
import { colors } from "../theme/colors";
import { DailySummary, MealInput } from "../types";

const initialMeal: MealInput = {
  name: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0
};

export function TrackScreen({
  calorieCalculator,
  summary
}: {
  calorieCalculator: CalorieCalculatorAPI;
  summary: DailySummary | null;
}) {
  const [meal, setMeal] = useState(initialMeal);
  const [status, setStatus] = useState("");

  async function submitMeal() {
    setStatus("Saving meal...");
    try {
      await calorieCalculator.addMeal(meal);
      setMeal(initialMeal);
      setStatus("Meal saved and observers updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save meal.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Log meal</Text>
      <Text style={styles.subtitle}>Add food and CalTrackr updates your day instantly.</Text>

      <Card>
        <TextInput
          placeholder="Meal name"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={meal.name}
          onChangeText={(name) => setMeal((current) => ({ ...current, name }))}
        />
        {(["calories", "protein", "carbs", "fats"] as const).map((field) => (
          <TextInput
            key={field}
            keyboardType="numeric"
            placeholder={field}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={meal[field] ? String(meal[field]) : ""}
            onChangeText={(value) =>
              setMeal((current) => ({ ...current, [field]: Number(value || 0) }))
            }
          />
        ))}
        <Pressable style={styles.primaryButton} onPress={submitMeal}>
          <Text style={styles.primaryButtonText}>Add meal</Text>
        </Pressable>
        {!!status && <Text style={styles.status}>{status}</Text>}
      </Card>

      <Card>
        <Text style={styles.cardLabel}>Live progress</Text>
        <ProgressBar percent={summary?.progressPercent || 0} />
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{summary?.consumed || 0} kcal consumed</Text>
          <Text style={styles.progressText}>{summary?.remaining || 0} kcal left</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 16,
    marginTop: 4
  },
  input: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 10,
    padding: 13
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  status: {
    color: colors.primaryDark,
    fontWeight: "700",
    marginTop: 12
  },
  cardLabel: {
    color: colors.muted,
    fontWeight: "800",
    marginBottom: 12
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12
  },
  progressText: {
    color: colors.muted,
    fontWeight: "700"
  }
});
