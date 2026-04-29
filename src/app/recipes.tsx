import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ArrowRight, Plus, Search, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Protected } from '@/components/protected';
import { AppShell, Button, Card, Chip, Field, LoadingState, PageHeader, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, formatCalories, spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data';
import { searchMealDbAndSpoonacularRecipes, searchMealDbRecipes } from '@/services/recipes';
import { Recipe } from '@/types/domain';

const prepFilters = ['Any time', 'Under 15m', '15-30m', '30m+'] as const;
type PrepFilter = (typeof prepFilters)[number];
const matchModes = ['Best pantry fit', 'Must include all'] as const;
type MatchMode = (typeof matchModes)[number];
const pageSize = 72;
const pantryStaples = new Set(['lemon', 'olive oil', 'herbs', 'salt', 'pepper', 'water', 'spices', 'garlic', 'onion']);

type RecipeMatch = {
  recipe: Recipe;
  matchedTerms: string[];
  missingTerms: string[];
  score: number;
};

const normalizeIngredient = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');

const singularize = (value: string) => value.replace(/ies$/, 'y').replace(/s$/, '');

const isStaple = (value: string) => pantryStaples.has(normalizeIngredient(value));

const isExternalRecipe = (recipe: Recipe) => Boolean(recipe.source && recipe.source !== 'local');

const sourceLabel = (recipe: Recipe) => {
  if (recipe.source === 'themealdb') return 'TheMealDB';
  if (recipe.source === 'spoonacular') return 'Spoonacular';
  return 'External';
};

const ingredientMatches = (recipeIngredient: string, pantryTerm: string) => {
  const ingredient = singularize(normalizeIngredient(recipeIngredient));
  const term = singularize(normalizeIngredient(pantryTerm));

  if (!ingredient || !term) return false;
  return ingredient.includes(term) || term.includes(ingredient);
};

export default function RecipesScreen() {
  return (
    <Protected>
      <RecipesContent />
    </Protected>
  );
}

function RecipesContent() {
  const { profile, recipes, cookAndLog, loading } = useAppData();
  const [ingredientInput, setIngredientInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(profile?.pantry ?? []);
  const [prep, setPrep] = useState<PrepFilter>('Any time');
  const [matchMode, setMatchMode] = useState<MatchMode>('Best pantry fit');
  const [excluded, setExcluded] = useState(profile?.allergens.join(', ') ?? '');
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [liveRecipes, setLiveRecipes] = useState<Recipe[]>([]);
  const [liveSource, setLiveSource] = useState('');
  const [liveLoading, setLiveLoading] = useState<'mealdb' | 'both' | null>(null);

  useEffect(() => {
    if (!profile) return;
    setIngredients((current) => (current.length ? current : profile.pantry));
    setExcluded((current) => current || profile.allergens.join(', '));
  }, [profile]);

  const results = useMemo<RecipeMatch[]>(() => {
    const exclusions = excluded
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const ingredientTerms = ingredients.map(normalizeIngredient).filter(Boolean);
    const coreTerms = ingredientTerms.filter((item) => !isStaple(item));
    const activeTerms = coreTerms.length ? coreTerms : ingredientTerms;
    const search = searchQuery.trim().toLowerCase();

    const allRecipes = [...liveRecipes, ...recipes.filter((recipe) => !liveRecipes.some((live) => live.id === recipe.id))];

    return allRecipes
      .filter((recipe) => {
        if (search) {
          const haystack = `${recipe.title} ${recipe.summary} ${recipe.tags.join(' ')} ${recipe.ingredients.join(' ')}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        if (prep === 'Any time') return !recipe.allergens.some((allergen) => exclusions.includes(allergen.toLowerCase()));
        if (prep === 'Under 15m' && recipe.prepMinutes >= 15) return false;
        if (prep === '15-30m' && (recipe.prepMinutes < 15 || recipe.prepMinutes > 30)) return false;
        if (prep === '30m+' && recipe.prepMinutes < 30) return false;
        return !recipe.allergens.some((allergen) => exclusions.includes(allergen.toLowerCase()));
      })
      .map((recipe) => {
        const matchedTerms = activeTerms.filter((term) =>
          recipe.ingredients.some((ingredient) => ingredientMatches(ingredient, term)),
        );
        const missingTerms = activeTerms.filter((term) => !matchedTerms.includes(term));
        const ingredientHits = recipe.ingredients.filter((ingredient) =>
          activeTerms.some((term) => ingredientMatches(ingredient, term)),
        ).length;
        const score = matchedTerms.length * 10 + ingredientHits;

        return { recipe, matchedTerms, missingTerms, score };
      })
      .filter((match) => {
        if (isExternalRecipe(match.recipe)) return true;
        if (!activeTerms.length) return true;
        if (matchMode === 'Must include all') return match.missingTerms.length === 0;
        return match.matchedTerms.length > 0;
      })
      .sort((a, b) => {
        const externalRank = Number(isExternalRecipe(b.recipe)) - Number(isExternalRecipe(a.recipe));
        return externalRank || b.score - a.score || a.recipe.prepMinutes - b.recipe.prepMinutes;
      });
  }, [excluded, ingredients, liveRecipes, matchMode, prep, recipes, searchQuery]);

  const visibleRecipes = results.slice(0, visibleCount);
  const apiResultCount = results.filter((match) => isExternalRecipe(match.recipe)).length;

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [excluded, ingredients, matchMode, prep, searchQuery]);

  if (loading || !profile) return <LoadingState />;

  const addIngredient = () => {
    const next = ingredientInput.trim();
    if (!next) return;
    setIngredients((items) => (items.includes(next) ? items : [...items, next]));
    setIngredientInput('');
  };

  const fetchLiveRecipes = async (mode: 'mealdb' | 'both') => {
    setLiveLoading(mode);
    try {
      const searchParams = {
        ingredients,
        query: searchQuery,
        number: 24,
      };
      const response =
        mode === 'mealdb'
          ? await searchMealDbRecipes(searchParams)
          : await searchMealDbAndSpoonacularRecipes(searchParams);
      if (!response || !response.recipes.length) {
        Alert.alert('No external recipes found', 'The selected API search did not return recipes for the current ingredients. The local catalog is still available.');
        setLiveRecipes([]);
        setLiveSource('');
        return;
      }
      setLiveRecipes(response.recipes);
      setLiveSource(response.source);
      setVisibleCount(pageSize);
    } catch (error) {
      Alert.alert('External recipe search failed', error instanceof Error ? error.message : 'Could not reach the recipe API.');
    } finally {
      setLiveLoading(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Smart recipe engine"
        title="Recipe Finder"
        subtitle="Rank recipes by what is already in your pantry, then log the selected dish directly into today's journal."
      />

      <View style={styles.searchGrid}>
        <Card tone="low" style={styles.inputCard}>
          <Text style={styles.label}>Pantry ingredients</Text>
          <View style={styles.chipRow}>
            {ingredients.map((ingredient) => (
              <Chip
                key={ingredient}
                label={ingredient}
                active
                onPress={() => setIngredients((items) => items.filter((item) => item !== ingredient))}
              />
            ))}
          </View>
          <View style={styles.addRow}>
            <Field
              label="Search catalog"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="chicken, curry, tofu, salmon"
              style={styles.addInput}
            />
            <Field
              label="Add ingredient"
              value={ingredientInput}
              onChangeText={setIngredientInput}
              onSubmitEditing={addIngredient}
              style={styles.addInput}
            />
            <Button icon={Plus} onPress={addIngredient} style={styles.addButton}>
              Add
            </Button>
            <Button icon={Sparkles} onPress={() => fetchLiveRecipes('mealdb')} disabled={Boolean(liveLoading)} style={styles.addButton}>
              {liveLoading === 'mealdb' ? 'Searching...' : 'MealDB search'}
            </Button>
            <Button icon={Sparkles} onPress={() => fetchLiveRecipes('both')} disabled={Boolean(liveLoading)} style={styles.addButton}>
              {liveLoading === 'both' ? 'Searching...' : 'Both APIs'}
            </Button>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterBlock}>
              <Text style={styles.label}>Prep time</Text>
              <View style={styles.chipRow}>
                {prepFilters.map((filter) => (
                  <Chip key={filter} label={filter} active={prep === filter} onPress={() => setPrep(filter)} />
                ))}
              </View>
            </View>
            <View style={styles.filterBlock}>
              <Text style={styles.label}>Ingredient match</Text>
              <View style={styles.chipRow}>
                {matchModes.map((mode) => (
                  <Chip key={mode} label={mode} active={matchMode === mode} onPress={() => setMatchMode(mode)} />
                ))}
              </View>
            </View>
            <Field label="Allergen exclusions" value={excluded} onChangeText={setExcluded} placeholder="tree nuts, dairy" style={styles.excludeField} />
          </View>
          <View style={styles.utilityRow}>
            <Button variant="secondary" onPress={() => setIngredients([])}>
              Browse all
            </Button>
            <Button variant="ghost" onPress={() => setIngredients(profile.pantry)}>
              Use my pantry
            </Button>
            {liveRecipes.length ? (
              <Button
                variant="ghost"
                onPress={() => {
                  setLiveRecipes([]);
                  setLiveSource('');
                }}>
                Clear live
              </Button>
            ) : null}
          </View>
        </Card>

        <Card tone="primary" style={styles.matchCard}>
          <Search size={28} color={colors.white} />
          <View>
            <Text style={styles.matchNumber}>{results.length}</Text>
            <Text style={styles.matchText}>Matching recipes</Text>
            <Text style={styles.catalogText}>
              {recipes.length.toLocaleString()} local recipes{liveRecipes.length ? ` + ${apiResultCount} visible from ${liveSource}` : ''}
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle title="Catalog results" />
        <Text style={styles.resultCopy}>
          Showing {visibleRecipes.length.toLocaleString()} of {results.length.toLocaleString()} recipes for the current filters.
          {liveRecipes.length
            ? ` ${apiResultCount.toLocaleString()} ${liveSource} results are pinned first; local results follow pantry match rules.`
            : ''}
        </Text>
        <View style={styles.recipeGrid}>
          {visibleRecipes.map(({ recipe, matchedTerms, missingTerms }) => (
            <Card key={recipe.id} style={styles.recipeCard}>
              <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} contentFit="cover" />
              <View style={styles.recipeBody}>
                <View style={styles.recipeTop}>
                  <View style={styles.recipeTitleBlock}>
                    <Text style={styles.recipeTag}>{recipe.tags[0]}</Text>
                    <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  </View>
                  <Text style={styles.calories}>{formatCalories(recipe.calories)}</Text>
                </View>
                {recipe.source && recipe.source !== 'local' ? <Text style={styles.liveBadge}>{sourceLabel(recipe)} result</Text> : null}
                <Text style={styles.summary}>{recipe.summary}</Text>
                {ingredients.length ? (
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchInfoText}>
                      Has {matchedTerms.length ? matchedTerms.join(', ') : 'no pantry items'}
                    </Text>
                    {missingTerms.length ? <Text style={styles.missingText}>Needs {missingTerms.join(', ')}</Text> : null}
                  </View>
                ) : null}
                <View style={styles.miniMacro}>
                  <Text style={styles.macroText}>Protein {recipe.macros.protein}g</Text>
                  <Text style={styles.macroText}>Carbs {recipe.macros.carbs}g</Text>
                </View>
                <ProgressBar value={Math.min((recipe.macros.protein / 50) * 100, 100)} />
                <View style={styles.recipeActions}>
                  <Button onPress={() => cookAndLog(recipe)}>Cook and log</Button>
                  <Link href={`/recipe/${recipe.id}` as never} asChild>
                    <Pressable style={styles.detailLink}>
                      <Text style={styles.detailText}>Details</Text>
                      <ArrowRight size={16} color={colors.primary} />
                    </Pressable>
                  </Link>
                </View>
              </View>
            </Card>
          ))}
        </View>
        {!results.length ? (
          <Card tone="low">
            <Text style={styles.emptyTitle}>No recipes match those ingredients yet.</Text>
            <Text style={styles.resultCopy}>Try Best pantry fit, remove one pantry chip, or browse all recipes.</Text>
          </Card>
        ) : null}
        {visibleCount < results.length ? (
          <Button variant="secondary" onPress={() => setVisibleCount((current) => current + pageSize)} style={styles.loadMore}>
            Load more recipes
          </Button>
        ) : null}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  searchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  inputCard: {
    flex: 2,
    minWidth: 320,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  addInput: {
    flex: 1,
    minWidth: 220,
  },
  addButton: {
    minWidth: 110,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  filterBlock: {
    flex: 1,
    minWidth: 240,
    gap: spacing.sm,
  },
  excludeField: {
    flex: 1,
    minWidth: 240,
  },
  utilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  matchCard: {
    flex: 1,
    minWidth: 240,
    justifyContent: 'space-between',
    minHeight: 240,
  },
  matchNumber: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 64,
    lineHeight: 68,
  },
  matchText: {
    color: '#e6ffeecc',
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  catalogText: {
    color: '#e6ffeeaa',
    fontFamily: fonts.medium,
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  resultCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
  },
  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  recipeCard: {
    flex: 1,
    minWidth: 310,
    padding: 0,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 230,
    backgroundColor: colors.surfaceHigh,
  },
  recipeBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  recipeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recipeTitleBlock: {
    flex: 1,
    gap: 4,
  },
  recipeTag: {
    color: colors.primary,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#92f7c344',
    borderRadius: 999,
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
  },
  recipeTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 21,
    lineHeight: 25,
  },
  calories: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
  },
  summary: {
    color: colors.muted,
    fontFamily: fonts.regular,
    lineHeight: 21,
  },
  matchInfo: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
  },
  matchInfoText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  missingText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  miniMacro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  macroText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  recipeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  detailText: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  loadMore: {
    alignSelf: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
});
