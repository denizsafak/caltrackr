import { router } from 'expo-router';
import { LogOut, Save, TrendingDown } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, Field, LoadingState, PageHeader, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';
import { useAuth } from '@/context/auth';

export default function ProfileScreen() {
  return (
    <Protected>
      <ProfileContent />
    </Protected>
  );
}

function ProfileContent() {
  const { signOut } = useAuth();
  const { profile, weeklyPlans, templates, totals, loading, updateProfile } = useAppData();
  const [dailyGoal, setDailyGoal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [allergens, setAllergens] = useState('');

  useEffect(() => {
    if (!profile) return;
    setDailyGoal(String(profile.dailyGoal));
    setProtein(String(profile.macroTargets.protein));
    setCarbs(String(profile.macroTargets.carbs));
    setFats(String(profile.macroTargets.fats));
    setAllergens(profile.allergens.join(', '));
  }, [profile]);

  if (loading || !profile) return <LoadingState />;

  const saveGoals = async () => {
    await updateProfile({
      dailyGoal: Number(dailyGoal) || profile.dailyGoal,
      macroTargets: {
        protein: Number(protein) || profile.macroTargets.protein,
        carbs: Number(carbs) || profile.macroTargets.carbs,
        fats: Number(fats) || profile.macroTargets.fats,
      },
      allergens: allergens
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    Alert.alert('Saved', 'Profile goals updated.');
  };

  const togglePreference = async (key: keyof typeof profile.preferences) => {
    await updateProfile({
      preferences: {
        ...profile.preferences,
        [key]: !profile.preferences[key],
      },
    });
  };

  const exit = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Personal overview - ${profile.role}`}
        title={profile.name}
        subtitle="Refine goals, allergen safety, saved plans, and account state."
        action={
          <Button variant="secondary" icon={LogOut} onPress={exit}>
            Sign out
          </Button>
        }
      />

      <View style={styles.heroGrid}>
        <Card style={styles.goalCard}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardLabel}>Daily calorie goal</Text>
              <Text style={styles.cardCopy}>Target intake for the active plan</Text>
            </View>
            <Save size={26} color={colors.primary} />
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalNumber}>{profile.dailyGoal.toLocaleString()}</Text>
            <Text style={styles.goalUnit}>kcal</Text>
          </View>
          <ProgressBar value={(totals.calories / Math.max(profile.dailyGoal, 1)) * 100} />
        </Card>

        <Card tone="soft" style={styles.weightCard}>
          <Text style={styles.cardLabelPrimary}>{profile.role === 'dietitian' ? 'Dietitian workspace' : profile.role === 'admin' ? 'Admin workspace' : 'Weight progress'}</Text>
          <Text style={styles.weightNumber}>{profile.weightKg} kg</Text>
          <View style={styles.trend}>
            <TrendingDown size={18} color={colors.primary} />
            <Text style={styles.trendText}>
              {profile.role === 'user'
                ? `Target ${profile.targetWeightKg} kg`
                : profile.role === 'dietitian'
                  ? `${profile.clientIds?.length ?? 0} assigned clients`
                  : 'System management role'}
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.settingsGrid}>
        <Card style={styles.settingsCard}>
          <SectionTitle title="Goals" />
          <View style={styles.twoCol}>
            <Field label="Daily kcal" value={dailyGoal} onChangeText={setDailyGoal} keyboardType="numeric" />
            <Field label="Protein target" value={protein} onChangeText={setProtein} keyboardType="numeric" />
            <Field label="Carbs target" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
            <Field label="Fats target" value={fats} onChangeText={setFats} keyboardType="numeric" />
          </View>
          <Field label="Allergens" value={allergens} onChangeText={setAllergens} placeholder="tree nuts, dairy" />
          <Button icon={Save} onPress={saveGoals}>
            Save goals
          </Button>
        </Card>

        <Card tone="low" style={styles.settingsCard}>
          <SectionTitle title="Dietary preferences" />
          <Toggle label="Plant-based / Vegan" value={profile.preferences.vegan} onPress={() => togglePreference('vegan')} />
          <Toggle label="Nut allergies" value={profile.preferences.nutAllergy} onPress={() => togglePreference('nutAllergy')} />
          <Toggle
            label="Intermittent fasting"
            value={profile.preferences.intermittentFasting}
            onPress={() => togglePreference('intermittentFasting')}
          />
        </Card>
      </View>

      <View style={styles.templates}>
        <SectionTitle title="Saved plans" />
        <View style={styles.templateGrid}>
          {weeklyPlans.map((plan) => {
            const average = Math.round(
              plan.days.reduce((sum, day) => sum + day.meals.reduce((inner, meal) => inner + meal.calories, 0), 0) /
                plan.days.length,
            );
            return (
              <Card key={plan.id} style={styles.templateCard}>
                <Text style={styles.templateTitle}>{plan.title}</Text>
                <Text style={styles.cardCopy}>{average.toLocaleString()} kcal average</Text>
              </Card>
            );
          })}
        </View>
      </View>
    </AppShell>
  );
}

function Toggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  goalCard: {
    flex: 2,
    minWidth: 320,
    minHeight: 260,
    justifyContent: 'space-between',
  },
  weightCard: {
    flex: 1,
    minWidth: 260,
    minHeight: 260,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 22,
  },
  cardLabelPrimary: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 22,
  },
  cardCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    lineHeight: 21,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  goalNumber: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 58,
  },
  goalUnit: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
  weightNumber: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 46,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trendText: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  settingsCard: {
    flex: 1,
    minWidth: 320,
  },
  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  toggleRow: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    color: colors.text,
    fontFamily: fonts.bold,
    flex: 1,
  },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHighest,
    padding: 4,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  toggleKnobActive: {
    marginLeft: 24,
  },
  templates: {
    gap: spacing.md,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  templateCard: {
    flex: 1,
    minWidth: 240,
  },
  templateTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
});
