import { router, useLocalSearchParams } from 'expo-router';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List as ListIcon, Sparkles, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, Chip, Field, LoadingState, MacroBars, PageHeader, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, formatCalories, radii, spacing } from '@/constants/theme';
import { useAppData, normalizePlanMeal } from '@/context/app-data';
import { addDaysISO, todayISO } from '@/data/defaults';
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
  const { profile, todayMeals, mealLogs, totals, loading, logMeal, updateMeal, deleteMeal, activePlan, recipes } = useAppData();
  const params = useLocalSearchParams();
  const [draft, setDraft] = useState<MealDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<MealDraft[]>([]);
  const [totalInQueue, setTotalInQueue] = useState(0);
  const [estimateQuery, setEstimateQuery] = useState('');
  const [estimateSource, setEstimateSource] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parts = todayISO().split('-');
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
  });

  const handlePrevMonth = () => {
    setCalendarMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  };
  const handleNextMonth = () => {
    setCalendarMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  };
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const weeks = useMemo(() => {
    const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const result = [];
    let dayCount = 1;
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          week.push(null);
        } else if (dayCount > daysInMonth) {
          week.push(null);
        } else {
          week.push(dayCount);
          dayCount++;
        }
      }
      result.push(week);
      if (dayCount > daysInMonth) break;
    }
    return result;
  }, [calendarMonth]);

  useEffect(() => {
    if (params.action === 'cookAndLog' && params.recipeId) {
      setDraft({
        title: params.title as string,
        mealType: (params.mealType as MealType) || 'Lunch',
        calories: Number(params.calories) || 0,
        protein: Number(params.protein) || 0,
        carbs: Number(params.carbs) || 0,
        fats: Number(params.fats) || 0,
        ingredients: (params.ingredients as string) || '',
        recipeId: params.recipeId as string,
        date: todayISO(),
      });
      router.setParams({ action: '' });
    } else if (params.action === 'logPlanDay' && params.date && activePlan) {
      const targetDay = activePlan.days.find(d => d.date === params.date);
      if (targetDay && targetDay.meals.length > 0) {
        const queueDrafts = targetDay.meals.map(meal => {
          const log = normalizePlanMeal(targetDay.date, meal, activePlan.id, recipes);
          return {
            title: log.title,
            mealType: log.mealType,
            calories: log.calories,
            protein: log.macros.protein,
            carbs: log.macros.carbs,
            fats: log.macros.fats,
            ingredients: Array.isArray(log.ingredients) ? log.ingredients.join(', ') : log.ingredients,
            recipeId: log.recipeId,
            date: log.date,
          };
        });
        setReviewQueue(queueDrafts.slice(1));
        setDraft(queueDrafts[0]);
        setTotalInQueue(queueDrafts.length);
        setEditingId(null);
      }
      router.setParams({ action: '', date: '' });
    }
  }, [params.action, params.calories, params.carbs, params.date, params.fats, params.ingredients, params.mealType, params.protein, params.recipeId, params.title, activePlan, recipes]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, { date: string, logs: MealLog[], totals: { calories: number; protein: number; carbs: number; fats: number } }> = {};
    mealLogs.forEach(log => {
      if (!groups[log.date]) {
        groups[log.date] = { date: log.date, logs: [], totals: { calories: 0, protein: 0, carbs: 0, fats: 0 } };
      }
      groups[log.date].logs.push(log);
      groups[log.date].totals.calories += log.calories;
      groups[log.date].totals.protein += log.macros.protein;
      groups[log.date].totals.carbs += log.macros.carbs;
      groups[log.date].totals.fats += log.macros.fats;
    });
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [mealLogs]);

  if (loading || !profile) return <LoadingState />;

  const submit = async () => {
    if (!draft.title.trim()) {
      Alert.alert('Missing meal name', 'Add a meal name before saving.');
      return;
    }
    if (editingId) {
      await updateMeal(editingId, draft);
      setDraft(emptyDraft);
      setEditingId(null);
    } else {
      await logMeal(draft);
      if (reviewQueue.length > 0) {
        setDraft(reviewQueue[0]);
        setReviewQueue(reviewQueue.slice(1));
      } else {
        setDraft(emptyDraft);
        setTotalInQueue(0);
      }
    }
  };

  const skipQueueItem = () => {
    if (reviewQueue.length > 0) {
      setDraft(reviewQueue[0]);
      setReviewQueue(reviewQueue.slice(1));
    } else {
      setDraft(emptyDraft);
      setTotalInQueue(0);
    }
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
          <SectionTitle 
            title={totalInQueue > 0 ? `Reviewing meal ${totalInQueue - reviewQueue.length} of ${totalInQueue}` : editingId ? 'Edit meal' : 'Log a meal'} 
          />
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
            <Button onPress={submit}>{editingId ? 'Save changes' : totalInQueue > 0 ? 'Log & next' : 'Log meal'}</Button>
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
            {totalInQueue > 0 ? (
              <Button variant="secondary" onPress={skipQueueItem}>
                Skip
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
        <SectionTitle
          title="Journal"
          action={
            <Pressable onPress={() => setViewMode(v => v === 'list' ? 'calendar' : 'list')} style={styles.viewToggle}>
              {viewMode === 'list' ? <CalendarIcon size={18} color={colors.primary} /> : <ListIcon size={18} color={colors.primary} />}
              <Text style={styles.viewToggleText}>{viewMode === 'list' ? 'Calendar view' : 'List view'}</Text>
            </Pressable>
          }
        />

        {viewMode === 'calendar' && (
          <Card style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={handlePrevMonth} style={styles.calendarNav}><ChevronLeft size={24} color={colors.text} /></Pressable>
              <Text style={styles.calendarMonthText}>{monthNames[calendarMonth.month]} {calendarMonth.year}</Text>
              <Pressable onPress={handleNextMonth} style={styles.calendarNav}><ChevronRight size={24} color={colors.text} /></Pressable>
            </View>
            <View style={styles.calendarGrid}>
              <View style={styles.calendarRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <Text key={i} style={styles.calendarDayHeader}>{day}</Text>)}
              </View>
              {weeks.map((week, i) => (
                <View key={i} style={styles.calendarRow}>
                  {week.map((day, j) => {
                    if (!day) return <View key={j} style={styles.calendarCell} />;
                    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasLogs = mealLogs.some(l => l.date === dateStr);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === todayISO();
                    return (
                      <Pressable key={j} style={[styles.calendarCell, isSelected && styles.calendarCellSelected]} onPress={() => setSelectedDate(dateStr)}>
                        <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected, isToday && !isSelected && styles.calendarDayTextToday]}>{day}</Text>
                        {hasLogs && <View style={[styles.calendarDot, isSelected && styles.calendarDotSelected]} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Card>
        )}

        {viewMode === 'calendar' && !groupedLogs.some(g => g.date === selectedDate) && (
          <Card tone="low">
            <Text style={styles.emptyDateText}>No meals logged for this date.</Text>
          </Card>
        )}

        <View style={styles.logList}>
          {groupedLogs
            .filter(group => viewMode === 'list' || group.date === selectedDate)
            .map((group) => {
            const isToday = group.date === todayISO();
            const isYesterday = group.date === addDaysISO(todayISO(), -1);
            const isEditable = isToday || isYesterday;
            return (
              <View key={group.date} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayDate}>{isToday ? 'Today' : isYesterday ? 'Yesterday' : group.date}</Text>
                  <Text style={styles.dayTotals}>
                    {formatCalories(group.totals.calories)} - P {group.totals.protein}g / C {group.totals.carbs}g / F {group.totals.fats}g
                  </Text>
                </View>
                {group.logs.map((meal) => (
                  <Pressable key={meal.id} onPress={isEditable ? () => edit(meal) : undefined} style={[styles.logItem, !isEditable && { opacity: 0.7 }]}>
                    <View style={styles.logCopy}>
                      <Text style={styles.logMealType}>{meal.mealType}</Text>
                      <Text style={styles.logTitle}>{meal.title}</Text>
                      <Text style={styles.logMeta}>
                        {formatCalories(meal.calories)} - P {meal.macros.protein}g / C {meal.macros.carbs}g / F {meal.macros.fats}g
                      </Text>
                    </View>
                    {isEditable && (
                      <Pressable onPress={() => deleteMeal(meal.id)} style={styles.deleteButton}>
                        <Trash2 size={18} color={colors.danger} />
                      </Pressable>
                    )}
                  </Pressable>
                ))}
              </View>
            );
          })}
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
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  viewToggleText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  calendarCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarNav: {
    padding: spacing.xs,
  },
  calendarMonthText: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 16,
  },
  calendarGrid: {
    gap: spacing.xs,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calendarDayHeader: {
    width: 36,
    textAlign: 'center',
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  calendarCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  calendarCellSelected: {
    backgroundColor: colors.primary,
  },
  calendarDayText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  calendarDayTextSelected: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  calendarDayTextToday: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    position: 'absolute',
    bottom: 4,
  },
  calendarDotSelected: {
    backgroundColor: colors.white,
  },
  emptyDateText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    textAlign: 'center',
    padding: spacing.md,
  },
  logList: {
    gap: spacing.md,
  },
  dayGroup: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayDate: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  dayTotals: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
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
