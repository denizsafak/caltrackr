import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getRecipeDetails } from '@/services/spoonacular/client';
import { useDiaryStore } from '@/stores/diary';
import { useAuthStore } from '@/stores/auth';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { SpoonacularRecipe, MealType } from '@/types';

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

function getMealTypeGuess(recipe: SpoonacularRecipe): MealType {
  const title = recipe.title.toLowerCase();
  if (title.includes('breakfast') || title.includes('pancake') || title.includes('oat') || title.includes('egg')) return 'breakfast';
  if (title.includes('salad') || title.includes('sandwich') || title.includes('wrap') || title.includes('bowl')) return 'lunch';
  return 'dinner';
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addMeal } = useDiaryStore();
  const { user } = useAuthStore();

  const [recipe, setRecipe] = useState<SpoonacularRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [isLogging, setIsLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getRecipeDetails(Number(id))
      .then((data) => {
        setRecipe(data);
        setMealType(getMealTypeGuess(data));
      })
      .catch((err) => Alert.alert('Error', err.message || 'Could not load recipe details.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleLog = async () => {
    if (!recipe || !user) return;
    setIsLogging(true);
    try {
      await addMeal({
        name: recipe.title,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        servingSize: recipe.servings,
        servingUnit: 'serving',
        imageUrl: recipe.image,
        sourceId: recipe.id,
        sourceType: 'recipe',
        mealType,
      });
      setLogged(true);
      Alert.alert('Logged!', `${recipe.title} added to your ${mealType}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLogging(false);
    }
  };

  const handleShare = async () => {
    if (!recipe) return;
    await Share.share({ message: `Check out this recipe: ${recipe.title}` });
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading recipe...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.loading}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.outlineVariant} />
        <Text style={styles.loadingText}>Recipe not found.</Text>
        <Button 
          label="Go Back" 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} 
          variant="secondary" 
          style={{ alignSelf: 'center' }} 
        />
      </View>
    );
  }

  const nutrients = recipe.nutrition?.nutrients ?? [];
  const fiber = Math.round(nutrients.find((n) => n.name === 'Fiber')?.amount ?? 0);
  const sodium = Math.round(nutrients.find((n) => n.name === 'Sodium')?.amount ?? 0);
  const iron = nutrients.find((n) => n.name === 'Iron')?.percentOfDailyNeeds ?? 0;

  const instructions: string[] = Array.isArray(recipe.instructions)
    ? recipe.instructions as unknown as string[]
    : typeof recipe.instructions === 'string'
    ? recipe.instructions.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10)
    : [];

  const totalMacros = recipe.protein + recipe.carbs + recipe.fat || 1;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: recipe.image }} style={styles.hero} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          />
          <View style={[styles.heroContent, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <Badge label={mealType} variant="primary" style={styles.mealBadge} />
            <Text style={styles.heroTitle}>{recipe.title}</Text>
          </View>
        </View>

        {/* Nav buttons */}
        <View style={[styles.navBar, { top: insets.top + Spacing.md }]}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatBlock icon="flame-outline" label="Calories" value={`${recipe.calories}`} unit="kcal" />
            <StatBlock icon="time-outline" label="Prep Time" value={`${recipe.readyInMinutes}`} unit="min" />
            <StatBlock icon="leaf-outline" label="Carbs" value={`${recipe.carbs}`} unit="g" />
            <StatBlock icon="barbell-outline" label="Protein" value={`${recipe.protein}`} unit="g" />
          </View>

          {/* Ingredients */}
          {recipe.extendedIngredients && recipe.extendedIngredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="basket-outline" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Ingredients</Text>
              </View>
              {recipe.extendedIngredients.map((ing, i) => (
                <View key={`${ing.id}-${i}`} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientAmount}>{ing.amount} {ing.unit}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Step-by-Step</Text>
              </View>
              {instructions.slice(0, 8).map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Macro Breakdown */}
          <View style={[styles.section, styles.macroSection]}>
            <Text style={styles.sectionTitle}>Macro Breakdown</Text>

            <MacroProgress
              label="Protein"
              value={recipe.protein}
              total={totalMacros}
              color={Colors.primary}
            />
            <MacroProgress
              label="Carbohydrates"
              value={recipe.carbs}
              total={totalMacros}
              color={Colors.secondaryContainer}
            />
            <MacroProgress
              label="Healthy Fats"
              value={recipe.fat}
              total={totalMacros}
              color={Colors.tertiary}
            />

            <View style={styles.microSection}>
              <Text style={styles.microTitle}>MICRONUTRIENTS</Text>
              <View style={styles.microRow}>
                <MicroItem label="Fiber" value={`${fiber}g`} />
                <MicroItem label="Sodium" value={`${sodium}mg`} />
                <MicroItem label="Iron" value={`${Math.round(iron)}% DV`} />
              </View>
            </View>
          </View>

          {/* Meal type selector */}
          <View style={styles.section}>
            <Text style={styles.mealTypeTitle}>Log as</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((mt) => (
                <TouchableOpacity
                  key={mt.key}
                  style={[styles.mealTypeChip, mealType === mt.key && styles.mealTypeChipActive]}
                  onPress={() => setMealType(mt.key)}
                >
                  <Text style={[styles.mealTypeChipText, mealType === mt.key && styles.mealTypeChipTextActive]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Log button */}
          <View style={styles.logSection}>
            <Button
              label={logged ? '✓ Logged!' : 'Log this Meal'}
              onPress={handleLog}
              loading={isLogging}
              fullWidth
              icon={!logged ? <Ionicons name="checkmark-circle-outline" size={20} color={Colors.onPrimary} /> : undefined}
              variant={logged ? 'secondary' : 'primary'}
            />
          </View>

          {/* Chef's tip */}
          {recipe.summary && (
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Text style={styles.tipDot}>●</Text>
                <Text style={styles.tipTitle}>Chef&apos;s Tip</Text>
              </View>
              <Text style={styles.tipText} numberOfLines={4}>
                {recipe.summary.replace(/<[^>]*>/g, '').split('.').slice(0, 2).join('.') + '.'}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatBlock({ icon, label, value, unit }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; unit: string }) {
  return (
    <View style={statStyles.block}>
      <Ionicons name={icon} size={16} color={Colors.onSurfaceVariant} style={statStyles.icon} />
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.unit}>{unit}</Text>
    </View>
  );
}

function MacroProgress({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.round((value / total) * 100);
  return (
    <View style={macroStyles.row}>
      <View style={macroStyles.labelRow}>
        <Text style={macroStyles.label}>{label.toUpperCase()}</Text>
        <Text style={macroStyles.value}>{value}G ({pct}%)</Text>
      </View>
      <View style={macroStyles.track}>
        <View style={[macroStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MicroItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={microStyles.item}>
      <Text style={microStyles.value}>{value}</Text>
      <Text style={microStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: Colors.background },
  loadingText: { ...Typography.bodyLg, color: Colors.onSurfaceVariant },
  heroContainer: { height: 300, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  mealBadge: { alignSelf: 'flex-start' },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    zIndex: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLowest + 'ee',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  content: { paddingTop: Spacing.xl },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceHigh,
  },
  ingredientName: { ...Typography.bodyLg, color: Colors.onSurface },
  ingredientAmount: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { ...Typography.labelLg, color: Colors.onPrimary },
  stepText: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1, lineHeight: 22 },
  macroSection: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  microSection: { marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.surfaceHigh, paddingTop: Spacing.lg },
  microTitle: { ...Typography.labelMd, color: Colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: Spacing.md },
  microRow: { flexDirection: 'row', justifyContent: 'space-around' },
  mealTypeTitle: { ...Typography.titleMd, color: Colors.onSurface, marginBottom: Spacing.md },
  mealTypeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  mealTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
  },
  mealTypeChipActive: { backgroundColor: Colors.primary },
  mealTypeChipText: { ...Typography.labelLg, color: Colors.onSurfaceVariant },
  mealTypeChipTextActive: { color: Colors.onPrimary },
  logSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  tipCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tipDot: { color: Colors.primary, fontSize: 16 },
  tipTitle: { ...Typography.titleSm, color: Colors.onSurface },
  tipText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 22, fontStyle: 'italic' },
});

const statStyles = StyleSheet.create({
  block: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
  },
  icon: { marginBottom: 4 },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.onSurface, letterSpacing: -0.5, marginTop: 4 },
  unit: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
});

const macroStyles = StyleSheet.create({
  row: { marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  value: { ...Typography.labelMd, color: Colors.onSurface },
  track: { height: 6, backgroundColor: Colors.surfaceHigh, borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
});

const microStyles = StyleSheet.create({
  item: { alignItems: 'center' },
  value: { ...Typography.titleSm, color: Colors.onSurface },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: 2 },
});
