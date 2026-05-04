import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { updateUserProfile } from '@/services/firebase/firestore';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { Gender, ActivityLevel, DietaryPreference } from '@/types';

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string; description: string; icon: string }[] = [
  { key: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', icon: '🪑' },
  { key: 'light', label: 'Light', description: '1–3 days/week', icon: '🚶' },
  { key: 'moderate', label: 'Moderate', description: '3–5 days/week', icon: '🏃' },
  { key: 'active', label: 'Active', description: '6–7 days/week', icon: '💪' },
  { key: 'very_active', label: 'Very Active', description: 'Twice per day', icon: '🔥' },
];

const DIETARY_OPTIONS: { key: DietaryPreference; label: string; icon: string }[] = [
  { key: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { key: 'vegan', label: 'Vegan', icon: '🌱' },
  { key: 'keto', label: 'Keto', icon: '🥩' },
  { key: 'paleo', label: 'Paleo', icon: '🍖' },
  { key: 'gluten_free', label: 'Gluten Free', icon: '🌾' },
  { key: 'dairy_free', label: 'Dairy Free', icon: '🥛' },
];

function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [dietPrefs, setDietPrefs] = useState<DietaryPreference[]>([]);
  const [customCalories, setCustomCalories] = useState('');

  const suggestedCalories = (() => {
    const a = parseInt(age);
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!a || !w || !h) return 2000;
    return Math.round(calculateBMR(w, h, a, gender) * ACTIVITY_MULTIPLIER[activity]);
  })();

  const toggleDiet = (key: DietaryPreference) => {
    setDietPrefs((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    const calories = parseInt(customCalories) || suggestedCalories;
    const ageN = parseInt(age) || null;
    const weightN = parseFloat(weight) || null;
    const heightN = parseFloat(height) || null;
    const protein = Math.round((calories * 0.30) / 4);
    const carbs = Math.round((calories * 0.40) / 4);
    const fat = Math.round((calories * 0.30) / 9);

    try {
      await updateUserProfile(user.uid, {
        dailyCalorieGoal: calories,
        age: ageN,
        weight: weightN,
        height: heightN,
        gender,
        activityLevel: activity,
        dietaryPreferences: dietPrefs,
        macroGoals: { protein, carbs, fat },
        onboardingComplete: true,
      });
      updateProfile({
        dailyCalorieGoal: calories,
        age: ageN,
        weight: weightN,
        height: heightN,
        gender,
        activityLevel: activity,
        dietaryPreferences: dietPrefs,
        macroGoals: { protein, carbs, fat },
        onboardingComplete: true,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    // Step 0: Body stats
    <View key="stats">
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>We&apos;ll calculate your ideal daily calorie goal.</Text>

      <View style={styles.genderRow}>
        {(['male', 'female', 'other'] as Gender[]).map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderChip, gender === g && styles.genderChipActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsGrid}>
        <Input label="Age" value={age} onChangeText={setAge} placeholder="28" keyboardType="number-pad" containerStyle={styles.statInput} />
        <Input label="Weight (kg)" value={weight} onChangeText={setWeight} placeholder="70" keyboardType="decimal-pad" containerStyle={styles.statInput} />
        <Input label="Height (cm)" value={height} onChangeText={setHeight} placeholder="175" keyboardType="decimal-pad" containerStyle={styles.statInput} />
      </View>
    </View>,

    // Step 1: Activity level
    <View key="activity">
      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepSubtitle}>Your daily movement shapes your calorie needs.</Text>
      <View style={styles.optionsList}>
        {ACTIVITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionRow, activity === opt.key && styles.optionRowActive]}
            onPress={() => setActivity(opt.key)}
          >
            <Text style={styles.optionIcon}>{opt.icon}</Text>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, activity === opt.key && styles.optionLabelActive]}>{opt.label}</Text>
              <Text style={styles.optionDesc}>{opt.description}</Text>
            </View>
            {activity === opt.key && (
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>,

    // Step 2: Dietary preferences
    <View key="diet">
      <Text style={styles.stepTitle}>Dietary preferences</Text>
      <Text style={styles.stepSubtitle}>We&apos;ll tailor recipe suggestions for you. Skip if none apply.</Text>
      <View style={styles.dietGrid}>
        {DIETARY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.dietChip, dietPrefs.includes(opt.key) && styles.dietChipActive]}
            onPress={() => toggleDiet(opt.key)}
          >
            <Text style={styles.dietIcon}>{opt.icon}</Text>
            <Text style={[styles.dietLabel, dietPrefs.includes(opt.key) && styles.dietLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>,

    // Step 3: Calorie goal confirmation
    <View key="calories">
      <Text style={styles.stepTitle}>Your calorie goal</Text>
      <Text style={styles.stepSubtitle}>Based on your profile, we suggest this daily target.</Text>

      <View style={styles.calorieCard}>
        <Text style={styles.calorieNumber}>{suggestedCalories.toLocaleString()}</Text>
        <Text style={styles.calorieUnit}>kcal / day</Text>
        <Text style={styles.calorieDesc}>For weight maintenance</Text>
      </View>

      <Text style={styles.customLabel}>Or set your own goal:</Text>
      <Input
        value={customCalories}
        onChangeText={setCustomCalories}
        placeholder={String(suggestedCalories)}
        keyboardType="number-pad"
        leftIcon="flame-outline"
      />
    </View>,
  ];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progressContainer}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        <View style={styles.stepContainer}>
          {steps[step]}
        </View>

        <View style={styles.nav}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
              <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          )}
          <Button
            label={step === steps.length - 1 ? "Let's Go!" : 'Continue'}
            onPress={() => {
              if (step < steps.length - 1) setStep((s) => s + 1);
              else handleFinish();
            }}
            loading={loading && step === steps.length - 1}
            fullWidth={step === 0}
            style={{ flex: step > 0 ? 1 : undefined, marginLeft: step > 0 ? Spacing.md : 0 }}
          />
        </View>

        {step === 0 && (
          <TouchableOpacity
            style={styles.skip}
            onPress={async () => {
              setLoading(true);
              try {
                if (!user) return;
                await updateUserProfile(user.uid, { onboardingComplete: true });
                updateProfile({ onboardingComplete: true });
                router.replace('/(tabs)');
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, paddingTop: 60, paddingHorizontal: Spacing.xl },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  progressDot: {
    height: 4,
    flex: 1,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  stepContainer: {
    flex: 1,
    marginBottom: Spacing.xxl,
  },
  stepTitle: {
    ...Typography.headlineLg,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: Colors.primary,
  },
  genderChipText: {
    ...Typography.labelLg,
    color: Colors.onSurfaceVariant,
  },
  genderChipTextActive: {
    color: Colors.onPrimary,
  },
  statsGrid: {
    gap: Spacing.md,
  },
  statInput: {
    flex: 1,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceLow,
  },
  optionRowActive: {
    backgroundColor: Colors.secondaryContainer + '40',
  },
  optionIcon: { fontSize: 24 },
  optionText: { flex: 1 },
  optionLabel: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  optionLabelActive: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  optionDesc: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  dietChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
  },
  dietChipActive: {
    backgroundColor: Colors.secondaryContainer,
  },
  dietIcon: { fontSize: 16 },
  dietLabel: {
    ...Typography.labelLg,
    color: Colors.onSurfaceVariant,
  },
  dietLabelActive: {
    color: Colors.secondary,
    fontFamily: 'Inter_600SemiBold',
  },
  calorieCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  calorieNumber: {
    fontSize: 56,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: -2,
  },
  calorieUnit: {
    ...Typography.titleMd,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  calorieDesc: {
    ...Typography.bodySm,
    color: Colors.outlineVariant,
    marginTop: Spacing.xs,
  },
  customLabel: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: {
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.sm,
  },
  skipText: {
    ...Typography.bodyMd,
    color: Colors.outlineVariant,
  },
});
