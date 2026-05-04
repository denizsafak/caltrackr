import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores/auth';
import { useDiaryStore } from '@/stores/diary';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { MacroBar } from '@/components/ui/MacroBar';
import { Card } from '@/components/ui/Card';
import type { MealEntry, MealType } from '@/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { diary, isLoading, loadDiary } = useDiaryStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const dateLabel = format(new Date(), 'EEEE, MMM d').toUpperCase();

  useEffect(() => {
    loadDiary(today);
  }, [today, loadDiary]);

  const onRefresh = useCallback(() => {
    loadDiary(today);
  }, [today, loadDiary]);

  const goal = user?.dailyCalorieGoal ?? 2000;
  const consumed = diary?.totalCalories ?? 0;
  const remaining = Math.max(goal - consumed, 0);
  const exceeded = consumed > goal;
  const progressPct = Math.min(consumed / goal, 1);

  const allMealEntries = MEAL_ORDER.flatMap((type) =>
    (diary?.meals[type] ?? []).map((e) => ({ ...e, mealType: type }))
  );

  const getInsight = () => {
    if (consumed === 0) return { emoji: '☀️', text: "Start your day — log your first meal!" };
    if (exceeded) return { emoji: '⚠️', text: `You've exceeded your goal by ${consumed - goal} kcal. Consider a light dinner.` };
    if (remaining < 200) return { emoji: '🎯', text: `Almost at your goal! Only ${remaining} kcal left.` };
    return { emoji: '✅', text: `You're on track! ${remaining} kcal remaining for the day.` };
  };

  const insight = getInsight();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <Text style={styles.todayText}>Today</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user?.name?.charAt(0).toUpperCase() ?? 'U'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Calorie Summary */}
      <Card style={styles.calorieCard} variant="elevated">
        <View style={styles.calorieHeader}>
          <View>
            <Text style={styles.calorieConsumed}>{consumed.toLocaleString()}</Text>
            <Text style={styles.calorieUnit}>kcal consumed</Text>
          </View>
          <View style={styles.calorieRemaining}>
            <Text style={[styles.remainingNum, exceeded && { color: Colors.tertiary }]}>
              {exceeded ? '+' : ''}{exceeded ? consumed - goal : remaining}
            </Text>
            <Text style={styles.remainingLabel}>{exceeded ? 'over' : 'remaining'}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPct * 100}%`, backgroundColor: exceeded ? Colors.tertiary : Colors.primary },
            ]}
          />
        </View>
        <Text style={styles.goalText}>Daily goal: {goal.toLocaleString()} kcal</Text>

        {/* Macros */}
        <View style={styles.macroContainer}>
          <MacroBar
            protein={diary?.totalProtein ?? 0}
            carbs={diary?.totalCarbs ?? 0}
            fat={diary?.totalFat ?? 0}
            proteinGoal={user?.macroGoals.protein}
            carbsGoal={user?.macroGoals.carbs}
            fatGoal={user?.macroGoals.fat}
          />
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/track')}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.onPrimary} />
            <Text style={styles.actionText}>Log Meal</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionSecondary} onPress={() => router.push('/(tabs)/recipes')}>
          <Ionicons name="search-outline" size={20} color={Colors.onSurface} />
          <Text style={styles.actionSecondaryText}>Find Recipe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionSecondary} onPress={() => router.push('/(tabs)/planner')}>
          <Ionicons name="calendar-outline" size={20} color={Colors.onSurface} />
          <Text style={styles.actionSecondaryText}>Weekly Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Meals */}
      <View style={styles.mealsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/track')}>
            <Text style={styles.sectionAction}>Edit Journal</Text>
          </TouchableOpacity>
        </View>

        {isLoading && allMealEntries.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : allMealEntries.length === 0 ? (
          <Card variant="flat" style={styles.emptyCard}>
            <Ionicons name="nutrition-outline" size={32} color={Colors.outlineVariant} />
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptySubtitle}>Tap &quot;Log Meal&quot; to start tracking your food.</Text>
          </Card>
        ) : (
          MEAL_ORDER.map((mealType) => {
            const entries = diary?.meals[mealType] ?? [];
            if (entries.length === 0) return null;
            const mealCals = entries.reduce((s, e) => s + e.calories, 0);
            return (
              <View key={mealType} style={styles.mealGroup}>
                <Text style={styles.mealTypeLabel}>{MEAL_LABELS[mealType].toUpperCase()}</Text>
                {entries.map((entry) => (
                  <MealEntryCard key={entry.id} entry={entry} />
                ))}
                <View style={styles.mealTotal}>
                  <Text style={styles.mealTotalText}>TOTAL</Text>
                  <Text style={styles.mealTotalCals}>{mealCals} kcal</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Insight Card */}
      <Card variant="flat" style={styles.insightCard}>
        <Text style={styles.insightEmoji}>{insight.emoji}</Text>
        <Text style={styles.insightText}>{insight.text}</Text>
      </Card>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function MealEntryCard({ entry }: { entry: MealEntry }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.mealEntry}
      onPress={() => entry.sourceId && router.push(`/recipe/${entry.sourceId}`)}
      activeOpacity={entry.sourceId ? 0.8 : 1}
    >
      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.entryImage} contentFit="cover" />
      ) : (
        <View style={[styles.entryImage, styles.entryImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={18} color={Colors.outlineVariant} />
        </View>
      )}
      <View style={styles.entryInfo}>
        <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
        <Text style={styles.entryMeta}>
          {entry.servingSize} {entry.servingUnit} · {entry.protein}g protein
        </Text>
      </View>
      <Text style={styles.entryCals}>{entry.calories}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  dateLabel: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  todayText: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurface,
    letterSpacing: -1,
    marginTop: 2,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.headlineSm,
    color: Colors.secondary,
  },
  calorieCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  calorieConsumed: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurface,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  calorieUnit: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  calorieRemaining: {
    alignItems: 'flex-end',
  },
  remainingNum: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: -1,
  },
  remainingLabel: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  goalText: {
    ...Typography.labelMd,
    color: Colors.outlineVariant,
    marginBottom: Spacing.lg,
  },
  macroContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceHigh,
    paddingTop: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  actionBtn: {
    flex: 1.5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 14,
  },
  actionText: {
    ...Typography.titleSm,
    color: Colors.onPrimary,
  },
  actionSecondary: {
    flex: 1,
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    ...Shadow.card,
  },
  actionSecondaryText: {
    ...Typography.labelMd,
    color: Colors.onSurface,
  },
  mealsSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
  },
  sectionAction: {
    ...Typography.labelLg,
    color: Colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  mealGroup: {
    marginBottom: Spacing.xl,
  },
  mealTypeLabel: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  mealTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceHigh,
    marginTop: Spacing.xs,
  },
  mealTotalText: {
    ...Typography.labelMd,
    color: Colors.outlineVariant,
    letterSpacing: 0.5,
  },
  mealTotalCals: {
    ...Typography.labelLg,
    color: Colors.onSurface,
  },
  mealEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  entryImage: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
  },
  entryImagePlaceholder: {
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    ...Typography.titleSm,
    color: Colors.onSurface,
  },
  entryMeta: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  entryCals: {
    ...Typography.titleSm,
    color: Colors.onSurface,
  },
  insightCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  insightEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  insightText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 22,
  },
});
