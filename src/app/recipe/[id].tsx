import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bookmark, ExternalLink, Share2, Utensils } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, LoadingState, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';
import { getExternalRecipeById } from '@/services/recipes';
import { Recipe } from '@/types/domain';

const isExternalRecipeId = (id?: string) => Boolean(id?.startsWith('themealdb-') || id?.startsWith('spoonacular-'));

export default function RecipeDetailScreen() {
  return (
    <Protected>
      <RecipeDetailContent />
    </Protected>
  );
}

function RecipeDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, loading } = useAppData();
  const localRecipe = recipes.find((item) => item.id === id);
  const [externalRecipe, setExternalRecipe] = useState<Recipe | null>(null);
  const [externalLoading, setExternalLoading] = useState(false);
  const recipe = localRecipe ?? externalRecipe;

  useEffect(() => {
    let cancelled = false;

    if (!id || localRecipe || !isExternalRecipeId(id)) {
      setExternalRecipe(null);
      setExternalLoading(false);
      return;
    }

    setExternalLoading(true);
    getExternalRecipeById(id)
      .then((nextRecipe) => {
        if (!cancelled) {
          setExternalRecipe(nextRecipe);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          Alert.alert('Recipe unavailable', error instanceof Error ? error.message : 'Could not load this API recipe.');
          setExternalRecipe(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setExternalLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, localRecipe]);

  if (loading || externalLoading) return <LoadingState />;

  if (!recipe) {
    return (
      <AppShell>
        <Card>
          <Text style={styles.title}>Recipe not found</Text>
          <Button variant="secondary" onPress={() => router.replace('/recipes')}>
            Back to recipes
          </Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Stack.Screen options={{ title: recipe.title }} />
      <View style={styles.topActions}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.rightActions}>
          <Pressable style={styles.iconButton}>
            <Share2 size={20} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Bookmark size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroOverlay}>
          <Text style={styles.tag}>{recipe.mealType}</Text>
          <Text style={styles.heroTitle}>{recipe.title}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="Calories" value={recipe.calories} unit="kcal" primary />
        <Metric label="Prep time" value={recipe.prepMinutes} unit="min" />
        <Metric label="Carbs" value={recipe.macros.carbs} unit="g" />
        <Metric label="Protein" value={recipe.macros.protein} unit="g" />
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.leftColumn}>
          <SectionTitle title="Ingredients" />
          <View style={styles.list}>
            {recipe.ingredients.map((ingredient) => (
              <View key={ingredient} style={styles.ingredient}>
                <Text style={styles.ingredientText}>{ingredient}</Text>
                <Text style={styles.ingredientQty}>1 portion</Text>
              </View>
            ))}
          </View>

          <SectionTitle title="Step by step" />
          <View style={styles.steps}>
            {recipe.instructions.map((instruction, index) => (
              <View key={instruction} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{instruction}</Text>
              </View>
            ))}
          </View>
        </View>

        <Card style={styles.analysis}>
          <SectionTitle title="Macro breakdown" />
          <Macro label="Protein" value={recipe.macros.protein} percent={Math.min(recipe.macros.protein * 2, 100)} />
          <Macro label="Carbohydrates" value={recipe.macros.carbs} percent={Math.min(recipe.macros.carbs, 100)} />
          <Macro label="Fats" value={recipe.macros.fats} percent={Math.min(recipe.macros.fats * 2, 100)} warning />
          <Button icon={Utensils} onPress={() => {
            router.push({
              pathname: '/tracker',
              params: {
                action: 'cookAndLog',
                recipeId: recipe.id,
                title: recipe.title,
                calories: recipe.calories,
                protein: recipe.macros.protein,
                carbs: recipe.macros.carbs,
                fats: recipe.macros.fats,
                ingredients: recipe.ingredients.join(', '),
                mealType: recipe.mealType || 'Lunch',
              }
            });
          }}>
            Cook and log
          </Button>
          {recipe.sourceUrl ? (
            <Button variant="secondary" icon={ExternalLink} onPress={() => Linking.openURL(recipe.sourceUrl as string)}>
              Source
            </Button>
          ) : null}
        </Card>
      </View>
    </AppShell>
  );
}

function Metric({ label, value, unit, primary }: { label: string; value: number; unit: string; primary?: boolean }) {
  return (
    <Card tone="low" style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, primary && styles.metricPrimary]}>
        {value}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </Card>
  );
}

function Macro({ label, value, percent, warning }: { label: string; value: number; percent: number; warning?: boolean }) {
  return (
    <View style={styles.macro}>
      <View style={styles.macroTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.macroValue}>{value}g</Text>
      </View>
      <ProgressBar value={percent} color={warning ? colors.warning : colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 380,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#92f7c3dd',
    color: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontFamily: fonts.extraBold,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 42,
    lineHeight: 46,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    minWidth: 150,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  metricValue: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 34,
  },
  metricPrimary: {
    color: colors.primary,
  },
  metricUnit: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1.4,
    minWidth: 320,
    gap: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  ingredient: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ingredientText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    textTransform: 'capitalize',
  },
  ingredientQty: {
    color: colors.muted,
    fontFamily: fonts.medium,
  },
  steps: {
    gap: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
  },
  stepText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 26,
  },
  analysis: {
    flex: 1,
    minWidth: 300,
  },
  macro: {
    gap: spacing.sm,
  },
  macroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroValue: {
    color: colors.text,
    fontFamily: fonts.bold,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
});
