import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlannerStore } from '@/stores/planner';
import { useAuthStore } from '@/stores/auth';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { DayPlan } from '@/types';

export default function PlannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { currentPlan, isGenerating, weekOffset, getWeekDates, generatePlan, setWeekOffset, savedPlans, loadSavedPlans, savePlan, isSaving } = usePlannerStore();

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const { label: weekLabel } = getWeekDates();

  useEffect(() => {
    loadSavedPlans();
  }, [loadSavedPlans]);

  const handleGenerate = async () => {
    if (!user) return;
    try {
      const diet = user.dietaryPreferences.includes('vegan')
        ? 'vegan'
        : user.dietaryPreferences.includes('vegetarian')
        ? 'vegetarian'
        : user.dietaryPreferences.includes('keto')
        ? 'ketogenic'
        : user.dietaryPreferences.includes('paleo')
        ? 'paleo'
        : undefined;
      await generatePlan(user.dailyCalorieGoal, diet);
    } catch {
      Alert.alert('Error', 'Failed to generate meal plan. Please try again.');
    }
  };

  const handleSave = async () => {
    await savePlan(templateName.trim() || undefined);
    setSaveModalVisible(false);
    setTemplateName('');
    Alert.alert('Saved!', templateName ? `Template "${templateName}" saved.` : 'Plan saved.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerLabel}>WEEKLY PLANNER</Text>
              <Text style={styles.weekRange}>{weekLabel}</Text>
            </View>
            {currentPlan && (
              <TouchableOpacity onPress={() => setSaveModalVisible(true)} style={styles.saveBtn}>
                <Ionicons name="bookmark-outline" size={20} color={Colors.onSurface} />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Week nav */}
          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset(weekOffset - 1)}>
              <Ionicons name="chevron-back" size={18} color={Colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset(0)}>
              <Text style={styles.weekNavToday}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset(weekOffset + 1)}>
              <Ionicons name="chevron-forward" size={18} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.dailyCalorieGoal ?? 2000}</Text>
            <Text style={styles.statLabel}>Daily Goal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.macroGoals.protein ?? 0}g</Text>
            <Text style={styles.statLabel}>Protein</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.macroGoals.carbs ?? 0}g</Text>
            <Text style={styles.statLabel}>Carbs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.macroGoals.fat ?? 0}g</Text>
            <Text style={styles.statLabel}>Fats</Text>
          </View>
        </View>

        {/* Generate Button */}
        <View style={styles.generateSection}>
          <Button
            label={currentPlan ? 'Regenerate Plan' : 'Generate Plan'}
            onPress={handleGenerate}
            loading={isGenerating}
            fullWidth
            icon={<Ionicons name="sparkles-outline" size={18} color={Colors.onPrimary} />}
          />
        </View>

        {/* Plan Content */}
        {isGenerating ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Building your personalized plan...</Text>
          </View>
        ) : currentPlan ? (
          <View style={styles.planDays}>
            {currentPlan.days.map((day) => (
              <DayCard key={day.date} day={day} onRecipePress={(id) => router.push(`/recipe/${id}`)} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No plan yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a personalized 7-day meal plan based on your calorie goal.
            </Text>
          </View>
        )}

        {/* Saved Templates */}
        {savedPlans.filter((p) => p.isTemplate).length > 0 && (
          <View style={styles.templatesSection}>
            <Text style={styles.sectionTitle}>Saved Templates</Text>
            {savedPlans.filter((p) => p.isTemplate).map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.templateCard}
                onPress={() => usePlannerStore.getState().loadTemplate(plan)}
              >
                <View style={styles.templateIcon}>
                  <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{plan.templateName}</Text>
                  <Text style={styles.templateMeta}>{plan.dailyTarget.toLocaleString()} kcal/day</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.outlineVariant} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Modal */}
      <Modal visible={saveModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setSaveModalVisible(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Save Plan</Text>
            <Text style={styles.modalSubtitle}>Optionally save as a reusable template.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Template name (optional)"
              placeholderTextColor={Colors.outlineVariant}
              value={templateName}
              onChangeText={setTemplateName}
            />
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setSaveModalVisible(false)} />
              <Button label="Save" onPress={handleSave} loading={isSaving} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function DayCard({ day, onRecipePress }: { day: DayPlan; onRecipePress: (id: number) => void }) {
  const isToday = day.date === format(new Date(), 'yyyy-MM-dd');

  return (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <View style={styles.dayLabelRow}>
          <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{day.dayName}</Text>
          {isToday && <View style={styles.todayDot} />}
        </View>
        <Text style={styles.dayDate}>{format(new Date(day.date + 'T12:00:00'), 'MMM d')}</Text>
      </View>

      <View style={styles.dayMeals}>
        {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
          const meal = day.meals[mealType];
          return (
            <View key={mealType}>
              <Text style={styles.mealTypeLabel}>{mealType.toUpperCase()}</Text>
              {meal ? (
                <TouchableOpacity style={styles.mealSlot} onPress={() => onRecipePress(meal.id)}>
                  <Image
                    source={{ uri: meal.image }}
                    style={styles.mealImage}
                    contentFit="cover"
                  />
                  <View style={styles.mealSlotInfo}>
                    <Text style={styles.mealSlotTitle} numberOfLines={1}>{meal.title}</Text>
                    <Text style={styles.mealSlotMeta}>{meal.calories} kcal · {meal.readyInMinutes} min</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
                </TouchableOpacity>
              ) : (
                <View style={styles.mealSlotEmpty}>
                  <Text style={styles.mealSlotEmptyText}>No meal planned</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.dayTotal}>
        <Text style={styles.dayTotalLabel}>TOTAL</Text>
        <Text style={styles.dayTotalValue}>{day.totalCalories.toLocaleString()} kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLabel: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  weekRange: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    ...Shadow.card,
  },
  saveBtnText: {
    ...Typography.labelLg,
    color: Colors.onSurface,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weekNavBtn: {
    backgroundColor: Colors.surfaceLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  weekNavToday: {
    ...Typography.labelLg,
    color: Colors.primary,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLowest,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
  },
  statLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.surfaceHigh,
    marginVertical: 4,
  },
  generateSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  planDays: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  dayCard: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayName: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
  },
  dayNameToday: {
    color: Colors.primary,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  dayDate: {
    ...Typography.labelLg,
    color: Colors.onSurfaceVariant,
  },
  dayMeals: {
    gap: Spacing.sm,
  },
  mealTypeLabel: {
    ...Typography.labelSm,
    color: Colors.outlineVariant,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  mealSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  mealImage: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
  },
  mealSlotInfo: {
    flex: 1,
  },
  mealSlotTitle: {
    ...Typography.titleSm,
    color: Colors.onSurface,
  },
  mealSlotMeta: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  mealSlotEmpty: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  mealSlotEmptyText: {
    ...Typography.bodySm,
    color: Colors.outlineVariant,
  },
  dayTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceHigh,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  dayTotalLabel: {
    ...Typography.labelMd,
    color: Colors.outlineVariant,
    letterSpacing: 0.5,
  },
  dayTotalValue: {
    ...Typography.titleSm,
    color: Colors.onSurface,
  },
  templatesSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.card,
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    ...Typography.titleSm,
    color: Colors.onSurface,
  },
  templateMeta: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    ...Shadow.modal,
  },
  modalTitle: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.surfaceHighest,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
});
