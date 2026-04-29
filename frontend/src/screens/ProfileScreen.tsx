import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { ApiClient } from "../api/client";
import { Card } from "../components/Card";
import { colors } from "../theme/colors";

export function ProfileScreen({
  api,
  onGoalSaved
}: {
  api: ApiClient;
  onGoalSaved: () => void;
}) {
  const [goal, setGoal] = useState("2000");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .getProfile()
      .then((profile) => setGoal(String(profile.daily_calorie_goal)))
      .catch(() => setStatus("Start the backend API to load profile."));
  }, [api]);

  async function saveGoal() {
    setStatus("Saving goal...");
    try {
      await api.updateGoal(Number(goal));
      await onGoalSaved();
      setStatus("Daily calorie goal updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save goal.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Tune CalTrackr around your daily target.</Text>

      <Card>
        <Text style={styles.label}>Daily calorie goal</Text>
        <TextInput
          keyboardType="numeric"
          style={styles.input}
          value={goal}
          onChangeText={setGoal}
          placeholder="2000"
          placeholderTextColor={colors.muted}
        />
        <Pressable style={styles.primaryButton} onPress={saveGoal}>
          <Text style={styles.primaryText}>Save goal</Text>
        </Pressable>
        {!!status && <Text style={styles.status}>{status}</Text>}
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
  label: {
    color: colors.muted,
    fontWeight: "800",
    marginBottom: 10
  },
  input: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    marginBottom: 12,
    padding: 13
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "900"
  },
  status: {
    color: colors.primaryDark,
    fontWeight: "700",
    marginTop: 12
  }
});
