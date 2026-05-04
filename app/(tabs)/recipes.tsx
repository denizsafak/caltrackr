import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { findRecipesByIngredients } from '@/services/spoonacular/client';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';
import type { SpoonacularRecipe } from '@/types';

export default function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<SpoonacularRecipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed.toLowerCase())) {
      setIngredients((prev) => [...prev, trimmed.toLowerCase()]);
    }
    setIngredientInput('');
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients((prev) => prev.filter((i) => i !== ingredient));
  };

  const handleSearch = useCallback(async () => {
    if (ingredients.length === 0) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await findRecipesByIngredients(ingredients, 12);
      setRecipes(results);
    } catch (err: any) {
      setRecipes([]);
      Alert.alert('Search Error', err.message || 'Could not load recipes.');
    } finally {
      setIsSearching(false);
    }
  }, [ingredients]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        numColumns={1}
        renderItem={({ item }) => (
          <RecipeCard recipe={item} onPress={() => router.push(`/recipe/${item.id}`)} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Recipe Finder</Text>
              <Text style={styles.subtitle}>
                What&apos;s in your fridge? We&apos;ll find the perfect recipe.
              </Text>
            </View>

            {/* Ingredient Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Add ingredient..."
                  placeholderTextColor={Colors.outlineVariant}
                  value={ingredientInput}
                  onChangeText={setIngredientInput}
                  onSubmitEditing={addIngredient}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addBtn} onPress={addIngredient}>
                  <Ionicons name="add" size={22} color={Colors.onPrimary} />
                </TouchableOpacity>
              </View>

              {/* Ingredient chips */}
              {ingredients.length > 0 && (
                <View style={styles.chips}>
                  {ingredients.map((ing) => (
                    <TouchableOpacity
                      key={ing}
                      style={styles.chip}
                      onPress={() => removeIngredient(ing)}
                    >
                      <Text style={styles.chipText}>{ing}</Text>
                      <Ionicons name="close" size={14} color={Colors.secondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Search button */}
              <TouchableOpacity
                style={[styles.searchBtn, ingredients.length === 0 && styles.searchBtnDisabled]}
                onPress={handleSearch}
                disabled={ingredients.length === 0 || isSearching}
              >
                <Ionicons name="sparkles-outline" size={18} color={Colors.onPrimary} />
                <Text style={styles.searchBtnText}>
                  {isSearching ? 'Searching...' : `Find Recipes (${ingredients.length} ingredient${ingredients.length !== 1 ? 's' : ''})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Smart Match info */}
            {recipes.length > 0 && (
              <View style={styles.matchInfo}>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchCount}>{recipes.length}</Text>
                  <Text style={styles.matchLabel}>matches found</Text>
                </View>
                <Text style={styles.matchSub}>Ranked by ingredients you have</Text>
              </View>
            )}

            {/* Loading */}
            {isSearching && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Finding the best recipes for you...</Text>
              </View>
            )}

            {/* Empty state */}
            {hasSearched && !isSearching && recipes.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color={Colors.outlineVariant} />
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptySubtitle}>Try adding different ingredients or fewer restrictions.</Text>
              </View>
            )}

            {/* Prompt */}
            {!hasSearched && (
              <View style={styles.promptState}>
                <Ionicons name="leaf-outline" size={48} color={Colors.outlineVariant} />
                <Text style={styles.promptTitle}>Add your ingredients</Text>
                <Text style={styles.promptSubtitle}>
                  Type each ingredient and press enter or the + button, then tap &quot;Find Recipes.&quot;
                </Text>
              </View>
            )}

            {recipes.length > 0 && <Text style={styles.resultsHeader}>Curated Pairings</Text>}
          </View>
        }
        ListFooterComponent={
          recipes.length > 0 ? (
            <View style={styles.footer}>
              <View style={styles.footerCard}>
                <Ionicons name="refresh-outline" size={24} color={Colors.primary} />
                <Text style={styles.footerTitle}>Keep Your Pantry Updated</Text>
                <Text style={styles.footerText}>
                  Update your ingredients before each search for the most precise recipe suggestions.
                </Text>
                <TouchableOpacity
                  style={styles.footerBtn}
                  onPress={() => { setIngredients([]); setRecipes([]); setHasSearched(false); }}
                >
                  <Text style={styles.footerBtnText}>Sync Pantry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function RecipeCard({ recipe, onPress }: { recipe: SpoonacularRecipe; onPress: () => void }) {
  const usedPct = recipe.usedIngredientCount && recipe.missedIngredientCount !== undefined
    ? Math.round((recipe.usedIngredientCount / ((recipe.usedIngredientCount ?? 0) + (recipe.missedIngredientCount ?? 0))) * 100)
    : null;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: recipe.image }} style={cardStyles.image} contentFit="cover" />
      <View style={cardStyles.overlay}>
        {usedPct !== null && (
          <Badge label={`${usedPct}% match`} variant={usedPct >= 80 ? 'primary' : 'success'} />
        )}
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.title} numberOfLines={2}>{recipe.title}</Text>
        <View style={cardStyles.meta}>
          <View style={cardStyles.metaItem}>
            <Ionicons name="flame-outline" size={14} color={Colors.primary} />
            <Text style={cardStyles.metaText}>{recipe.calories} kcal</Text>
          </View>
          <View style={cardStyles.metaItem}>
            <Ionicons name="time-outline" size={14} color={Colors.onSurfaceVariant} />
            <Text style={cardStyles.metaText}>{recipe.readyInMinutes} min</Text>
          </View>
          {recipe.missedIngredientCount !== undefined && (
            <View style={cardStyles.metaItem}>
              <Ionicons name="add-circle-outline" size={14} color={Colors.outlineVariant} />
              <Text style={[cardStyles.metaText, { color: Colors.outlineVariant }]}>
                {recipe.missedIngredientCount} missing
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="arrow-forward-circle-outline" size={24} color={Colors.primary} style={cardStyles.arrow} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: 100 },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  title: { ...Typography.headlineLg, color: Colors.onSurface },
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginTop: Spacing.xs, lineHeight: 22 },
  inputSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceHighest,
    borderRadius: Radius.lg,
    paddingLeft: Spacing.md,
    paddingRight: 4,
    paddingVertical: 4,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  input: { flex: 1, ...Typography.bodyLg, color: Colors.onSurface, paddingVertical: 10 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondaryContainer + '50',
    borderRadius: Radius.full,
  },
  chipText: { ...Typography.labelLg, color: Colors.secondary },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { ...Typography.titleSm, color: Colors.onPrimary },
  matchInfo: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  matchCount: { fontSize: 36, fontFamily: 'Inter_700Bold', color: Colors.primary, letterSpacing: -1 },
  matchLabel: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  matchSub: { ...Typography.bodySm, color: Colors.outlineVariant },
  loadingState: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.md },
  loadingText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  emptySubtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  promptState: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  promptTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  promptSubtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  resultsHeader: { ...Typography.headlineSm, color: Colors.onSurface, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  footerCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerTitle: { ...Typography.headlineSm, color: Colors.onSurface, textAlign: 'center' },
  footerText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  footerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  footerBtnText: { ...Typography.titleSm, color: Colors.onPrimary },
});

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  image: { width: '100%', height: 180 },
  overlay: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  info: { padding: Spacing.lg, paddingBottom: Spacing.md },
  title: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  meta: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  arrow: { position: 'absolute', bottom: Spacing.lg, right: Spacing.lg },
});
