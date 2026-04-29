import { CalendarPlus, CheckCircle2, ListFilter, Save, ShoppingBasket, Shuffle, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, Chip, Field, LoadingState, Metric, PageHeader, SectionTitle, TotalLine } from '@/components/ui';
import { colors, fonts, formatCalories, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';
import { MealType, PlanDay, PlanMeal, Recipe } from '@/types/domain';

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type PickerState = {
  dayDate: string;
  dayLabel: string;
  mealId: string;
  currentTitle: string;
};

export default function PlannerScreen() {
  return (
    <Protected>
      <PlannerContent />
    </Protected>
  );
}

function PlannerContent() {
  const {
    profile,
    activePlan,
    mealLogs,
    recipes,
    templates,
    loading,
    generatePlan,
    swapMeal,
    choosePlanMeal,
    saveTemplate,
    loadTemplate,
    generateShoppingList,
    logPlanDay,
  } = useAppData();
  const [loggingDay, setLoggingDay] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [pickerMealType, setPickerMealType] = useState<MealType>('Breakfast');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [choosingRecipe, setChoosingRecipe] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const loggedPlanMeals = useMemo(() => {
    if (!activePlan) return new Set<string>();
    return new Set(
      mealLogs
        .filter((meal) => meal.sourcePlanId === activePlan.id && meal.sourcePlanMealId)
        .map((meal) => `${meal.date}:${meal.sourcePlanMealId}`),
    );
  }, [activePlan, mealLogs]);

  const pickerRecipes = useMemo(() => {
    const term = recipeSearch.trim().toLowerCase();
    return recipes
      .filter((recipe) => recipe.mealType === pickerMealType)
      .filter((recipe) => {
        if (!term) return true;
        return [recipe.title, recipe.summary, ...recipe.ingredients, ...recipe.tags].join(' ').toLowerCase().includes(term);
      })
      .slice(0, 18);
  }, [pickerMealType, recipeSearch, recipes]);

  if (loading || !profile) return <LoadingState />;

  const dailyAverage = activePlan
    ? Math.round(
        activePlan.days.reduce((sum, day) => sum + day.meals.reduce((inner, meal) => inner + meal.calories, 0), 0) /
          activePlan.days.length,
      )
    : 0;

  const handleGeneratePlan = async () => {
    try {
      await generatePlan();
    } catch (error) {
      Alert.alert('Could not generate plan', error instanceof Error ? error.message : 'Add saved recipes and try again.');
    }
  };

  const handleSaveTemplate = async () => {
    if (!activePlan) return;
    setSavingTemplate(true);
    try {
      await saveTemplate(templateName);
      setTemplateName('');
      Alert.alert('Template saved', 'Your weekly plan template is ready to reuse.');
    } catch (error) {
      Alert.alert('Could not save template', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLogDay = async (dayDate: string) => {
    setLoggingDay(dayDate);
    try {
      const count = await logPlanDay(dayDate);
      Alert.alert('Day logged', `${count} planned meals were added to your journal.`);
    } catch (error) {
      Alert.alert('Could not log day', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setLoggingDay(null);
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

  const handleChooseRecipe = async (recipe: Recipe) => {
    if (!picker) return;
    setChoosingRecipe(recipe.id);
    try {
      await choosePlanMeal(picker.dayDate, picker.mealId, recipe.id);
      setPicker(null);
    } catch (error) {
      Alert.alert('Could not update meal', error instanceof Error ? error.message : 'Try another recipe.');
    } finally {
      setChoosingRecipe(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Weekly planner"
        title={activePlan?.title ?? 'Plan your week'}
        subtitle="Generate, swap, template, and turn meals into a persistent shopping list."
        action={
          <>
            <Button icon={activePlan ? Shuffle : CalendarPlus} onPress={handleGeneratePlan}>
              {activePlan ? 'Regenerate plan' : 'Generate plan'}
            </Button>
          </>
        }
      />

      <View style={styles.statsGrid}>
        <Metric label="Daily average" value={dailyAverage || profile.dailyGoal} unit="kcal" />
        <Metric label="Protein target" value={profile.macroTargets.protein} unit="g / day" tone="primary" />
        <Card style={styles.shoppingCard}>
          <View>
            <Text style={styles.cardLabel}>Shopping list</Text>
            <Text style={styles.cardTitle}>Ready from this plan</Text>
          </View>
          <Button variant="secondary" icon={ShoppingBasket} onPress={generateShoppingList}>
            Generate
          </Button>
        </Card>
      </View>

      {picker ? (
        <Card style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <View style={styles.pickerTitleBlock}>
              <Text style={styles.cardLabel}>{picker.dayLabel} replacement</Text>
              <Text style={styles.cardTitle}>Choose a planned meal</Text>
              <Text style={styles.cardCopy}>Replacing {picker.currentTitle}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close meal picker"
              onPress={() => setPicker(null)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.swapButtonPressed]}>
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
            {pickerRecipes.map((recipe) => (
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
                <Text style={styles.recipeOptionCalories}>
                  {choosingRecipe === recipe.id ? 'Saving...' : formatCalories(recipe.calories)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {activePlan ? (
        <View style={styles.planGrid}>
          {activePlan.days.map((day) => {
            const total = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
            const dayLogged = day.meals.every((meal) => loggedPlanMeals.has(`${day.date}:${meal.id}`));
            return (
              <View key={day.date} style={styles.dayColumn}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <Text style={styles.dayDate}>{day.date.slice(5)}</Text>
                </View>
                <Card tone="low" style={styles.dayCard}>
                  {day.meals.map((meal) => (
                    <View key={meal.id} style={styles.mealSlot}>
                      <View style={styles.mealSlotTop}>
                        <Text style={styles.mealType}>{meal.mealType}</Text>
                      </View>
                      <Text style={styles.mealTitle}>{meal.title}</Text>
                      <Text style={styles.mealCalories}>{formatCalories(meal.calories)}</Text>
                      <View style={styles.mealActions}>
                        <Pressable
                          accessibilityLabel={`Randomize ${meal.title}`}
                          accessibilityRole="button"
                          onPress={() => swapMeal(day.date, meal.id)}
                          style={({ pressed }) => [styles.mealActionButton, pressed && styles.swapButtonPressed]}>
                          <Shuffle size={14} color={colors.primary} />
                          <Text style={styles.mealActionText}>Random</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Choose replacement for ${meal.title}`}
                          accessibilityRole="button"
                          onPress={() => openPicker(day, meal)}
                          style={({ pressed }) => [styles.mealActionButton, pressed && styles.swapButtonPressed]}>
                          <ListFilter size={14} color={colors.primary} />
                          <Text style={styles.mealActionText}>Choose</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <View style={styles.totalWrap}>
                    <TotalLine label="Total" value={total} />
                    <Button
                      icon={CheckCircle2}
                      variant={dayLogged ? 'secondary' : 'primary'}
                      onPress={() => handleLogDay(day.date)}
                      disabled={loggingDay === day.date}
                      style={styles.logDayButton}>
                      {loggingDay === day.date ? 'Logging...' : dayLogged ? 'Update log' : 'Log day'}
                    </Button>
                  </View>
                </Card>
              </View>
            );
          })}
        </View>
      ) : (
        <Card tone="low">
          <Text style={styles.cardTitle}>No active plan yet</Text>
          <Text style={styles.cardCopy}>Save recipes to Firestore, then generate a weekly plan.</Text>
        </Card>
      )}

      <View style={styles.templates}>
        <SectionTitle title="Saved templates" />
        {activePlan ? (
          <Card tone="low" style={styles.templateSaveCard}>
            <Field
              label="Template name"
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Work week, cutting plan, high protein"
              style={styles.templateNameField}
            />
            <Button icon={Save} onPress={handleSaveTemplate} disabled={savingTemplate}>
              {savingTemplate ? 'Saving...' : 'Save template'}
            </Button>
          </Card>
        ) : null}
        <View style={styles.templateGrid}>
          {templates.map((template) => (
            <Card key={template.id} style={styles.templateCard}>
              <Text style={styles.cardTitle}>{template.title}</Text>
              <Text style={styles.cardCopy}>{formatCalories(template.averageCalories)} average</Text>
              <Button variant="secondary" onPress={() => loadTemplate(template.id)}>
                Load template
              </Button>
            </Card>
          ))}
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  shoppingCard: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLow,
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
  dayColumn: {
    flex: 1,
    minWidth: 155,
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
  },
  mealSlot: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mealSlotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealType: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  mealTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 14,
    lineHeight: 18,
  },
  mealCalories: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  mealActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  mealActionButton: {
    minHeight: 34,
    flexGrow: 1,
    flexBasis: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  mealActionText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  totalWrap: {
    marginTop: 'auto',
    gap: spacing.sm,
  },
  swapButton: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButtonPressed: {
    backgroundColor: colors.surfaceLow,
  },
  logDayButton: {
    alignSelf: 'stretch',
  },
  templates: {
    gap: spacing.md,
  },
  templateSaveCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  templateNameField: {
    flex: 1,
    minWidth: 240,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  templateCard: {
    flex: 1,
    minWidth: 260,
  },
});
