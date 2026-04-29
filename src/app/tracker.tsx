import { Sparkles, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, Chip, Field, LoadingState, MacroBars, PageHeader, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, formatCalories, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';
import { estimateNutrition, estimateToMealDraft } from '@/services/nutrition';
import { MealDraft, MealLog, MealType } from '@/types/domain';

const emptyDraft: MealDraft = {
  title: '',
  mealType: 'Lunch',
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  ingredients: '',
};

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function TrackerScreen() {
  return (
    <Protected>
      <TrackerContent />
    </Protected>
  );
}

function TrackerContent() {
  const { profile, todayMeals, mealLogs, totals, loading, logMeal, updateMeal, deleteMeal } = useAppData();
  const [draft, setDraft] = useState<MealDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [estimateQuery, setEstimateQuery] = useState('');
  const [estimateSource, setEstimateSource] = useState('');
  const [estimating, setEstimating] = useState(false);
  const sortedLogs = useMemo(() => [...mealLogs].sort((a, b) => b.date.localeCompare(a.date)), [mealLogs]);

  if (loading || !profile) return <LoadingState />;

  const submit = async () => {
    if (!draft.title.trim()) {
      Alert.alert('Missing meal name', 'Add a meal name before saving.');
      return;
    }
    if (editingId) {
      await updateMeal(editingId, draft);
    } else {
      await logMeal(draft);
    }
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const estimateMeal = async () => {
    setEstimating(true);
    try {
      const estimate = await estimateNutrition(estimateQuery);
      setDraft(estimateToMealDraft(estimate, draft.mealType));
      setEstimateSource(
        `${estimate.source}${estimate.servingSize ? ` - serving ${estimate.servingSize}` : ''}`,
      );
    } catch (error) {
      Alert.alert('Estimate failed', error instanceof Error ? error.message : 'Could not estimate this food.');
    } finally {
      setEstimating(false);
    }
  };

  const edit = (meal: MealLog) => {
    setEditingId(meal.id);
    setDraft({
      title: meal.title,
      mealType: meal.mealType,
      calories: meal.calories,
      protein: meal.macros.protein,
      carbs: meal.macros.carbs,
      fats: meal.macros.fats,
      ingredients: meal.ingredients.join(', '),
      recipeId: meal.recipeId,
      date: meal.date,
    });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Real-time tracking"
        title="Meal Journal"
        subtitle="Log meals and watch the dashboard observer update calories, macros, and alerts instantly."
      />

      <View style={styles.grid}>
        <Card style={styles.formCard}>
          <SectionTitle title={editingId ? 'Edit meal' : 'Log a meal'} />
          <View style={styles.estimatePanel}>
            <Field
              label="Describe meal"
              value={estimateQuery}
              onChangeText={setEstimateQuery}
              placeholder="grilled chicken rice bowl"
              style={styles.estimateField}
              onSubmitEditing={estimateMeal}
            />
            <Button icon={Sparkles} onPress={estimateMeal} disabled={estimating} style={styles.estimateButton}>
              {estimating ? 'Estimating...' : 'Estimate'}
            </Button>
            {estimateSource ? <Text style={styles.estimateSource}>Filled from {estimateSource}</Text> : null}
          </View>
          <Field label="Meal name" value={draft.title} onChangeText={(title) => setDraft((item) => ({ ...item, title }))} />
          <View style={styles.chipRow}>
            {mealTypes.map((type) => (
              <Chip key={type} label={type} active={draft.mealType === type} onPress={() => setDraft((item) => ({ ...item, mealType: type }))} />
            ))}
          </View>
          <View style={styles.twoCol}>
            <Field
              label="Calories"
              value={String(draft.calories || '')}
              onChangeText={(value) => setDraft((item) => ({ ...item, calories: Number(value) }))}
              keyboardType="numeric"
            />
            <Field
              label="Protein"
              value={String(draft.protein || '')}
              onChangeText={(value) => setDraft((item) => ({ ...item, protein: Number(value) }))}
              keyboardType="numeric"
            />
            <Field
              label="Carbs"
              value={String(draft.carbs || '')}
              onChangeText={(value) => setDraft((item) => ({ ...item, carbs: Number(value) }))}
              keyboardType="numeric"
            />
            <Field
              label="Fats"
              value={String(draft.fats || '')}
              onChangeText={(value) => setDraft((item) => ({ ...item, fats: Number(value) }))}
              keyboardType="numeric"
            />
          </View>
          <Field
            label="Ingredients"
            value={draft.ingredients}
            onChangeText={(ingredients) => setDraft((item) => ({ ...item, ingredients }))}
            placeholder="chicken, spinach, quinoa"
          />
          <View style={styles.actionRow}>
            <Button onPress={submit}>{editingId ? 'Save changes' : 'Log meal'}</Button>
            {editingId ? (
              <Button
                variant="secondary"
                onPress={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                }}>
                Cancel
              </Button>
            ) : null}
          </View>
        </Card>

        <Card tone="low" style={styles.summary}>
          <Text style={styles.summaryLabel}>Today</Text>
          <Text style={styles.summaryValue}>{formatCalories(totals.calories)}</Text>
          <ProgressBar value={(totals.calories / profile.dailyGoal) * 100} color={totals.calories > profile.dailyGoal ? colors.warning : colors.primary} />
          <MacroBars totals={totals} targets={profile.macroTargets} />
          <Text style={styles.summaryCopy}>{todayMeals.length} meals logged against a {profile.dailyGoal.toLocaleString()} kcal target.</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Journal" />
        <View style={styles.logList}>
          {sortedLogs.map((meal) => (
            <Pressable key={meal.id} onPress={() => edit(meal)} style={styles.logItem}>
              <View style={styles.logCopy}>
                <Text style={styles.logMealType}>{meal.mealType} - {meal.date}</Text>
                <Text style={styles.logTitle}>{meal.title}</Text>
                <Text style={styles.logMeta}>
                  {formatCalories(meal.calories)} - P {meal.macros.protein}g / C {meal.macros.carbs}g / F {meal.macros.fats}g
                </Text>
              </View>
              <Pressable onPress={() => deleteMeal(meal.id)} style={styles.deleteButton}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    alignItems: 'stretch',
  },
  formCard: {
    flex: 1.4,
    minWidth: 320,
  },
  summary: {
    flex: 1,
    minWidth: 280,
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  estimatePanel: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  estimateField: {
    minWidth: 220,
  },
  estimateButton: {
    alignSelf: 'flex-start',
  },
  estimateSource: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  summaryLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  summaryValue: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 46,
  },
  summaryCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    lineHeight: 22,
  },
  section: {
    gap: spacing.md,
  },
  logList: {
    gap: spacing.md,
  },
  logItem: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  logCopy: {
    flex: 1,
    gap: 3,
  },
  logMealType: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  logTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
  logMeta: {
    color: colors.muted,
    fontFamily: fonts.medium,
  },
  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa746f22',
  },
});
