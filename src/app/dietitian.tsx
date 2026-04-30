import { CalendarPlus, Save, Sparkles, Users, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, Chip, Field, LoadingState, PageHeader, SectionTitle } from '@/components/ui';
import { colors, fonts, formatCalories, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';
import { MealType, PlanDay, PlanMeal, Recipe, UserProfile, WeeklyPlan } from '@/types/domain';

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type PickerState = {
  dayDate: string;
  dayLabel: string;
  mealId: string;
  currentTitle: string;
};

export default function DietitianScreen() {
  return (
    <Protected>
      <DietitianContent />
    </Protected>
  );
}

function DietitianContent() {
  const { profile, assignedClients, recipes, loading, buildClientPlanDraft, savePlanForClient } = useAppData();
  const [builderClient, setBuilderClient] = useState<UserProfile | null>(null);
  const [draftPlan, setDraftPlan] = useState<WeeklyPlan | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [pickerMealType, setPickerMealType] = useState<MealType>('Breakfast');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [autoFilling, setAutoFilling] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const pickerRecipes = useMemo(() => {
    const term = recipeSearch.trim().toLowerCase();
    return recipes
      .filter((recipe) => recipe.mealType === pickerMealType)
      .filter((recipe) => {
        if (!term) return true;
        return [recipe.title, recipe.summary, ...recipe.ingredients, ...recipe.tags].join(' ').toLowerCase().includes(term);
      })
      .slice(0, 24);
  }, [pickerMealType, recipeSearch, recipes]);

  if (loading || !profile) return <LoadingState />;

  if (profile.role !== 'dietitian') {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Client planning"
          title="Dietitian access"
          subtitle="This workspace is available after the account role is set to dietitian."
        />
        <Card tone="low">
          <Text style={styles.cardTitle}>No dietitian role on this account</Text>
          <Text style={styles.cardCopy}>Ask an admin to change your role from the Admin page.</Text>
        </Card>
      </AppShell>
    );
  }

  const openBuilder = async (client: UserProfile, mode: 'empty' | 'current' = 'empty') => {
    setBuilderClient(client);
    setPicker(null);
    try {
      const draft = await buildClientPlanDraft(client.id, mode);
      setDraftPlan(draft);
    } catch (error) {
      Alert.alert('Could not open builder', error instanceof Error ? error.message : 'Try again in a moment.');
      setBuilderClient(null);
    }
  };

  const closeBuilder = () => {
    setBuilderClient(null);
    setDraftPlan(null);
    setPicker(null);
  };

  const handleAutoFill = async () => {
    if (!builderClient) return;
    setAutoFilling(true);
    try {
      const draft = await buildClientPlanDraft(builderClient.id, 'auto');
      setDraftPlan(draft);
      setPicker(null);
    } catch (error) {
      Alert.alert('Could not auto-fill', error instanceof Error ? error.message : 'Add recipes for this client first.');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleResetEmpty = async () => {
    if (!builderClient) return;
    try {
      const draft = await buildClientPlanDraft(builderClient.id, 'empty');
      setDraftPlan(draft);
      setPicker(null);
    } catch (error) {
      Alert.alert('Could not reset', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const openPicker = (day: PlanDay, meal: PlanMeal) => {
    setPicker({
      dayDate: day.date,
      dayLabel: day.dayLabel,
      mealId: meal.id,
      currentTitle: meal.title,
    });
    setPickerMealType(meal.mealType);
    setRecipeSearch('');
  };

  const handleChooseRecipe = (recipe: Recipe) => {
    if (!draftPlan || !picker) return;
    setDraftPlan({
      ...draftPlan,
      days: draftPlan.days.map((day) => {
        if (day.date !== picker.dayDate) return day;
        return {
          ...day,
          meals: day.meals.map((meal) => {
            if (meal.id !== picker.mealId) return meal;
            return {
              ...meal,
              title: recipe.title,
              calories: recipe.calories,
              recipeId: recipe.id,
            };
          }),
        };
      }),
    });
    setPicker(null);
  };

  const handleClearMeal = (dayDate: string, mealId: string) => {
    if (!draftPlan) return;
    setDraftPlan({
      ...draftPlan,
      days: draftPlan.days.map((day) => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          meals: day.meals.map((meal) => {
            if (meal.id !== mealId) return meal;
            const { recipeId: _omit, ...rest } = meal;
            return { ...rest, title: 'No meal selected', calories: 0 };
          }),
        };
      }),
    });
  };

  const handleSavePlan = async () => {
    if (!builderClient || !draftPlan) return;
    setSavingPlan(true);
    try {
      await savePlanForClient(builderClient.id, draftPlan);
      Alert.alert('Plan sent', `${builderClient.name} will see this plan on their planner.`);
      closeBuilder();
    } catch (error) {
      Alert.alert('Could not save plan', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setSavingPlan(false);
    }
  };

  if (builderClient && draftPlan) {
    const filledMeals = draftPlan.days.reduce(
      (sum, day) => sum + day.meals.filter((meal) => meal.recipeId).length,
      0,
    );
    const totalSlots = draftPlan.days.reduce((sum, day) => sum + day.meals.length, 0);
    const dailyAverage = Math.round(
      draftPlan.days.reduce((sum, day) => sum + day.meals.reduce((mealSum, meal) => mealSum + meal.calories, 0), 0) /
        draftPlan.days.length,
    );

    return (
      <AppShell>
        <PageHeader
          eyebrow="Build weekly plan"
          title={`${builderClient.name}'s week`}
          subtitle={`${filledMeals} of ${totalSlots} slots filled · ${formatCalories(dailyAverage)} daily average`}
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close builder"
              onPress={closeBuilder}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <X size={18} color={colors.muted} />
            </Pressable>
          }
        />

        <View style={styles.builderActions}>
          <Button icon={Sparkles} variant="secondary" onPress={handleAutoFill} disabled={autoFilling}>
            {autoFilling ? 'Auto-filling...' : 'Auto-fill from catalog'}
          </Button>
          <Button variant="ghost" onPress={handleResetEmpty}>
            Reset to empty
          </Button>
          <Button icon={Save} onPress={handleSavePlan} disabled={savingPlan || filledMeals === 0}>
            {savingPlan ? 'Saving...' : 'Save & send to client'}
          </Button>
        </View>

        {picker ? (
          <Card style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View style={styles.pickerTitleBlock}>
                <Text style={styles.cardLabel}>{picker.dayLabel} · {picker.mealId.includes('-') ? '' : ''}</Text>
                <Text style={styles.cardTitle}>Pick a meal</Text>
                <Text style={styles.cardCopy}>Replacing {picker.currentTitle}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close meal picker"
                onPress={() => setPicker(null)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.chipRow}>
              {mealTypes.map((type) => (
                <Chip key={type} label={type} active={pickerMealType === type} onPress={() => setPickerMealType(type)} />
              ))}
            </View>
            <Field
              label="Search catalog"
              value={recipeSearch}
              onChangeText={setRecipeSearch}
              placeholder="chicken, salmon, quinoa"
              style={styles.recipeSearch}
            />
            <View style={styles.pickerList}>
              {pickerRecipes.length === 0 ? (
                <Text style={styles.cardCopy}>No matching recipes. Try a different meal type or search term.</Text>
              ) : (
                pickerRecipes.map((recipe) => (
                  <Pressable
                    key={recipe.id}
                    accessibilityRole="button"
                    onPress={() => handleChooseRecipe(recipe)}
                    style={({ pressed }) => [styles.recipeOption, pressed && styles.recipeOptionPressed]}>
                    <View style={styles.recipeOptionCopy}>
                      <Text style={styles.recipeOptionType}>{recipe.mealType}</Text>
                      <Text style={styles.recipeOptionTitle}>{recipe.title}</Text>
                      <Text style={styles.recipeOptionMeta} numberOfLines={1}>
                        {recipe.ingredients.slice(0, 4).join(', ')}
                      </Text>
                    </View>
                    <Text style={styles.recipeOptionCalories}>{formatCalories(recipe.calories)}</Text>
                  </Pressable>
                ))
              )}
            </View>
          </Card>
        ) : null}

        <View style={styles.planGrid}>
          {draftPlan.days.map((day) => {
            const total = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
            return (
              <View key={day.date} style={styles.dayColumn}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <Text style={styles.dayDate}>{day.date.slice(5)}</Text>
                </View>
                <Card tone="low" style={styles.dayCard}>
                  {day.meals.map((meal) => {
                    const filled = Boolean(meal.recipeId);
                    return (
                      <View key={meal.id} style={styles.mealSlot}>
                        <Text style={styles.mealType}>{meal.mealType}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Choose ${meal.mealType} for ${day.dayLabel}`}
                          onPress={() => openPicker(day, meal)}
                          style={({ pressed }) => [styles.mealPick, pressed && styles.mealPickPressed]}>
                          <Text style={[styles.mealTitle, !filled && styles.mealTitlePlaceholder]}>{meal.title}</Text>
                          <Text style={styles.mealCalories}>{filled ? formatCalories(meal.calories) : 'Tap to choose'}</Text>
                        </Pressable>
                        {filled ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Clear ${meal.mealType} for ${day.dayLabel}`}
                            onPress={() => handleClearMeal(day.date, meal.id)}
                            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                            <Text style={styles.clearButtonText}>Clear</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                  <View style={styles.totalRow}>
                    <Text style={styles.cardLabel}>Total</Text>
                    <Text style={styles.cardTitle}>{formatCalories(total)}</Text>
                  </View>
                </Card>
              </View>
            );
          })}
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Dietitian workspace"
        title="Assigned clients"
        subtitle="Open a client to build their weekly meal plan, meal by meal."
      />

      <View style={styles.summaryGrid}>
        <Card tone="soft" style={styles.summaryCard}>
          <Users size={28} color={colors.primary} />
          <Text style={styles.summaryValue}>{assignedClients.length}</Text>
          <Text style={styles.cardCopy}>Assigned clients</Text>
        </Card>
      </View>

      <SectionTitle title="Client list" />
      {assignedClients.length ? (
        <View style={styles.clientGrid}>
          {assignedClients.map((client) => (
            <Card key={client.id} style={styles.clientCard}>
              <View style={styles.clientTop}>
                <View style={styles.clientCopy}>
                  <Text style={styles.cardTitle}>{client.name}</Text>
                  <Text style={styles.cardCopy}>{client.email}</Text>
                </View>
                <View style={styles.goalPill}>
                  <Text style={styles.goalText}>{client.dailyGoal.toLocaleString()} kcal</Text>
                </View>
              </View>
              <View style={styles.preferenceRow}>
                <Text style={styles.metaText}>{client.preferences.vegan ? 'Vegan' : 'Flexible'}</Text>
                <Text style={styles.metaText}>{client.preferences.intermittentFasting ? 'Fasting' : '3 meals'}</Text>
                <Text style={styles.metaText}>{client.allergens.length ? client.allergens.join(', ') : 'No allergens'}</Text>
              </View>
              <View style={styles.clientActions}>
                <Button icon={CalendarPlus} variant="secondary" onPress={() => openBuilder(client, 'current')}>
                  Modify current plan
                </Button>
                <Button icon={CalendarPlus} onPress={() => openBuilder(client, 'empty')}>
                  New weekly plan
                </Button>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card tone="low">
          <Text style={styles.cardTitle}>No assigned clients yet</Text>
          <Text style={styles.cardCopy}>Ask an admin to assign clients to your account from the Admin page.</Text>
        </Card>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    minWidth: 240,
    gap: spacing.sm,
  },
  summaryValue: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 46,
  },
  clientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  clientCard: {
    flex: 1,
    minWidth: 300,
    gap: spacing.md,
  },
  clientTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  clientActions: {
    gap: spacing.sm,
  },
  clientCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  cardCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    lineHeight: 21,
  },
  goalPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  goalText: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  preferenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  builderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLow,
  },
  pressed: {
    opacity: 0.7,
  },
  pickerCard: {
    gap: spacing.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pickerTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recipeSearch: {
    maxWidth: 520,
  },
  pickerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recipeOption: {
    flex: 1,
    minWidth: 240,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceLow,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recipeOptionPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHigh,
  },
  recipeOptionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  recipeOptionType: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  recipeOptionTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    lineHeight: 18,
  },
  recipeOptionMeta: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  recipeOptionCalories: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 12,
    minWidth: 74,
    textAlign: 'right',
  },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  dayColumn: {
    flex: 1,
    minWidth: 175,
    gap: spacing.sm,
  },
  dayHeader: {
    paddingHorizontal: spacing.sm,
  },
  dayLabel: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  dayDate: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  dayCard: {
    minHeight: 420,
    gap: spacing.sm,
  },
  mealSlot: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mealType: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  mealPick: {
    gap: spacing.xs,
  },
  mealPickPressed: {
    opacity: 0.7,
  },
  mealTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    lineHeight: 18,
  },
  mealTitlePlaceholder: {
    color: colors.muted,
    fontFamily: fonts.semibold,
  },
  mealCalories: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceLow,
  },
  clearButtonText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  totalRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
