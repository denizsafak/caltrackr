import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ApiClient } from "./src/api/client";
import { BottomNav, TabKey } from "./src/components/BottomNav";
import { CalorieCalculatorAPI } from "./src/core/calorieCalculator";
import { LimitAlertObserver } from "./src/core/observers/LimitAlertObserver";
import { ProgressBarObserver } from "./src/core/observers/ProgressBarObserver";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PlannerScreen } from "./src/screens/PlannerScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RecipeScreen } from "./src/screens/RecipeScreen";
import { TrackScreen } from "./src/screens/TrackScreen";
import { colors } from "./src/theme/colors";
import { DailySummary } from "./src/types";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("Home");
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [alertMessage, setAlertMessage] = useState("Loading your day...");

  const api = useMemo(() => new ApiClient(), []);
  const calorieCalculator = useMemo(() => {
    const service = new CalorieCalculatorAPI(api);
    service.addObserver(new ProgressBarObserver(setSummary));
    service.addObserver(new LimitAlertObserver(setAlertMessage));
    return service;
  }, [api]);

  async function refreshToday() {
    const today = await calorieCalculator.getToday();
    setSummary(today);
    setAlertMessage(today.alert);
  }

  useEffect(() => {
    refreshToday().catch(() => {
      setAlertMessage("Start the backend API to sync CalTrackr.");
    });
  }, []);

  const screen = {
    Home: <HomeScreen summary={summary} alertMessage={alertMessage} onRefresh={refreshToday} />,
    Planner: <PlannerScreen api={api} />,
    Track: <TrackScreen calorieCalculator={calorieCalculator} summary={summary} />,
    Recipes: <RecipeScreen api={api} calorieCalculator={calorieCalculator} />,
    Profile: <ProfileScreen api={api} onGoalSaved={refreshToday} />
  }[activeTab];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.content}>{screen}</View>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1
  }
});
