import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ApiClient } from "../api/client";
import { Card } from "../components/Card";
import { colors } from "../theme/colors";
import { WeeklyPlan } from "../types";

export function PlannerScreen({ api }: { api: ApiClient }) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [status, setStatus] = useState("");

  async function generatePlan() {
    setStatus("Generating plan...");
    try {
      const nextPlan = await api.generatePlan();
      setPlan(nextPlan);
      setStatus("Weekly plan ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate plan.");
    }
  }

  async function saveTemplate() {
    setStatus("Saving template...");
    try {
      await api.savePlanTemplate("Balanced weekly plan");
      setStatus("Template saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save template.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Weekly planner</Text>
      <Text style={styles.subtitle}>Generate a simple seven-day structure.</Text>

      <View style={styles.buttonRow}>
        <Pressable style={styles.primaryButton} onPress={generatePlan}>
          <Text style={styles.primaryText}>Generate</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={saveTemplate}>
          <Text style={styles.secondaryText}>Save template</Text>
        </Pressable>
      </View>
      {!!status && <Text style={styles.status}>{status}</Text>}

      {(plan?.days || []).map((day) => (
        <Card key={day.date}>
          <Text style={styles.dayTitle}>Day {day.day}</Text>
          <MealLine label="Breakfast" name={day.breakfast.name} calories={day.breakfast.calories} />
          <MealLine label="Lunch" name={day.lunch.name} calories={day.lunch.calories} />
          <MealLine label="Dinner" name={day.dinner.name} calories={day.dinner.calories} />
        </Card>
      ))}
    </ScrollView>
  );
}

function MealLine({ label, name, calories }: { label: string; name: string; calories: number }) {
  return (
    <View style={styles.mealLine}>
      <View>
        <Text style={styles.mealLabel}>{label}</Text>
        <Text style={styles.mealName}>{name}</Text>
      </View>
      <Text style={styles.calories}>{calories}</Text>
    </View>
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
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    flex: 1,
    padding: 14
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    flex: 1,
    padding: 14
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900"
  },
  secondaryText: {
    color: colors.primaryDark,
    fontWeight: "900"
  },
  status: {
    color: colors.primaryDark,
    fontWeight: "700",
    marginBottom: 12
  },
  dayTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  mealLine: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10
  },
  mealLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  mealName: {
    color: colors.text,
    fontWeight: "700",
    marginTop: 2
  },
  calories: {
    color: colors.primaryDark,
    fontWeight: "900"
  }
});
