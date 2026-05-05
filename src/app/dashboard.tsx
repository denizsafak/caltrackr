import { Image } from 'expo-image';
import { RecipeImage } from '@/components/RecipeImage';
import { Link, router } from 'expo-router';
import { CalendarDays, ChefHat, Plus, ShoppingBasket, TriangleAlert } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, LinkButton, LoadingState, MacroBars, PageHeader, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, formatCalories, radii, shadow, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';

export default function DashboardScreen() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}

function DashboardContent() {
  const { width } = useWindowDimensions();
  const { profile, recipes, todayMeals, totals, loading } = useAppData();
  const isWide = width >= 880;

  if (loading || !profile) return <LoadingState />;

  const progress = (totals.calories / profile.dailyGoal) * 100;
  const remaining = Math.max(profile.dailyGoal - totals.calories, 0);
  const nearLimit = progress >= 90;
  const exceeded = progress > 100;

  return (
    <AppShell>
      <PageHeader
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        title="Today"
        subtitle={`Welcome back, ${profile.name}. Your planner, calories, recipes, and shopping list stay synced across your account.`}
        action={
          <Button icon={Plus} onPress={() => router.push('/tracker')}>
            Log meal
          </Button>
        }
      />

      <View style={[styles.heroGrid, isWide && styles.heroGridWide]}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.kcal}>{totals.calories.toLocaleString()}</Text>
              <Text style={styles.goal}>/ {profile.dailyGoal.toLocaleString()} kcal</Text>
            </View>
            <View style={styles.remaining}>
              <Text style={styles.label}>Remaining</Text>
              <Text style={styles.remainingValue}>{formatCalories(remaining)}</Text>
            </View>
          </View>
          <ProgressBar value={progress} color={exceeded ? colors.warning : colors.primary} />
          <MacroBars totals={totals} targets={profile.macroTargets} />
          {nearLimit ? (
            <View style={styles.alert}>
              <TriangleAlert size={22} color={colors.warning} />
              <Text style={styles.alertText}>
                {exceeded
                  ? 'You are over the daily calorie goal. Tomorrow can adjust with a lighter plan.'
                  : 'You are within 10% of the daily limit. Dinner should stay intentionally light.'}
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.quickGrid}>
          <Link href="/tracker" asChild>
            <Pressable style={styles.primaryAction}>
              <Plus size={34} color={colors.white} />
              <View>
                <Text style={styles.primaryActionTitle}>Log Meal</Text>
                <Text style={styles.primaryActionText}>Quick add calories and macros</Text>
              </View>
            </Pressable>
          </Link>
          <View style={styles.quickRow}>
            <QuickLink href="/recipes" icon={ChefHat} label="Find Recipe" />
            <QuickLink href="/planner" icon={CalendarDays} label="Weekly Plan" />
            <QuickLink href="/shopping" icon={ShoppingBasket} label="Shopping List" />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Today Meals" action={<LinkButton href="/tracker" label="Edit journal" />} />
        <View style={styles.mealGrid}>
          {todayMeals.map((meal) => {
            const recipe = recipes.find((item) => item.id === meal.recipeId);
            return (
              <Card key={meal.id} style={styles.mealCard}>
                {recipe ? <RecipeImage title={recipe.title} fallbackUrl={recipe.imageUrl} style={styles.mealImage} contentFit="cover" /> : null}
                <View style={styles.mealBody}>
                  <Text style={styles.mealType}>{meal.mealType}</Text>
                  <Text style={styles.mealTitle}>{meal.title}</Text>
                  <Text style={styles.mealMeta}>{formatCalories(meal.calories)}</Text>
                </View>
              </Card>
            );
          })}
          {!todayMeals.length ? (
            <Card tone="low" style={styles.emptyMeal}>
              <Text style={styles.mealTitle}>No meals logged yet</Text>
              <Text style={styles.mealMeta}>Start with a recipe or quick entry.</Text>
            </Card>
          ) : null}
        </View>
      </View>

      <Card tone="low" style={styles.insight}>
        <Text style={styles.insightEyebrow}>Curated insight</Text>
        <Text style={styles.insightTitle}>Consistency is your superpower.</Text>
        <Text style={styles.insightText}>
          CalTrackr connects the report modules for weekly planning, real-time calorie observation, and ingredient recipes into one persisted workflow.
        </Text>
      </Card>
    </AppShell>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof ChefHat; label: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.quickLink}>
        <Icon size={24} color={colors.primary} />
        <Text style={styles.quickLabel}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  heroGrid: {
    gap: spacing.lg,
  },
  heroGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryCard: {
    flex: 1.35,
    minHeight: 380,
    justifyContent: 'space-between',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  kcal: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 56,
    lineHeight: 60,
  },
  goal: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
  remaining: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  remainingValue: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
  alert: {
    backgroundColor: '#fa775018',
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.medium,
    lineHeight: 21,
  },
  quickGrid: {
    flex: 1,
    gap: spacing.md,
  },
  primaryAction: {
    flex: 1,
    minHeight: 190,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    justifyContent: 'space-between',
    ...shadow,
  },
  primaryActionTitle: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 26,
  },
  primaryActionText: {
    color: '#e6ffeeaa',
    fontFamily: fonts.medium,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickLink: {
    flex: 1,
    minWidth: 145,
    minHeight: 118,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    ...shadow,
  },
  quickLabel: {
    color: colors.text,
    fontFamily: fonts.extraBold,
  },
  section: {
    gap: spacing.md,
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  mealCard: {
    flex: 1,
    minWidth: 230,
    padding: 0,
    overflow: 'hidden',
  },
  mealImage: {
    height: 150,
    width: '100%',
  },
  mealBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  mealType: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  mealTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
  mealMeta: {
    color: colors.muted,
    fontFamily: fonts.semibold,
  },
  emptyMeal: {
    minWidth: 230,
    flex: 1,
  },
  insight: {
    padding: spacing.xl,
  },
  insightEyebrow: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  insightTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 28,
  },
  insightText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 720,
  },
});
