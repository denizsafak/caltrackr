import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { searchRecipes, searchIngredients } from '@/services/spoonacular/client';
import { useDiaryStore } from '@/stores/diary';
import { useAuthStore } from '@/stores/auth';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { FoodSearchResult, MealType } from '@/types';

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '☕' },
  { key: 'lunch', label: 'Lunch', icon: '🥗' },
  { key: 'dinner', label: 'Dinner', icon: '🍽️' },
  { key: 'snack', label: 'Snack', icon: '🍎' },
];

export default function TrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { addMeal } = useDiaryStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'ingredients'>('recipes');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [servings, setServings] = useState('1');
  const [isAdding, setIsAdding] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data =
          activeTab === 'recipes'
            ? await searchRecipes(text)
            : await searchIngredients(text);
        setResults(data);
      } catch (err: any) {
        Alert.alert('Search Error', err.message || 'Could not complete search.');
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [activeTab]);

  const handleTabChange = (tab: 'recipes' | 'ingredients') => {
    setActiveTab(tab);
    if (query.trim()) handleSearch(query);
  };

  const openAddModal = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setServings('1');
    setAddModalVisible(true);
  };

  const handleAddMeal = async () => {
    if (!selectedFood || !user) return;
    const servingsNum = parseFloat(servings) || 1;
    setIsAdding(true);
    try {
      await addMeal({
        name: selectedFood.name,
        calories: Math.round(selectedFood.calories * servingsNum),
        protein: Math.round(selectedFood.protein * servingsNum),
        carbs: Math.round(selectedFood.carbs * servingsNum),
        fat: Math.round(selectedFood.fat * servingsNum),
        servingSize: selectedFood.servingSize * servingsNum,
        servingUnit: selectedFood.servingUnit,
        imageUrl: selectedFood.image,
        sourceId: selectedFood.id,
        sourceType: selectedFood.sourceType,
        mealType: selectedMealType,
      });
      setAddModalVisible(false);
      Alert.alert('Added!', `${selectedFood.name} logged to ${selectedMealType}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add meal.');
    } finally {
      setIsAdding(false);
    }
  };

  const scaledCals = selectedFood ? Math.round(selectedFood.calories * (parseFloat(servings) || 1)) : 0;

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Log a Meal</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Meal type selector */}
      <ScrollableChips
        items={MEAL_TYPES}
        selected={selectedMealType}
        onSelect={(key) => setSelectedMealType(key as MealType)}
      />

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={Colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food or recipe..."
          placeholderTextColor={Colors.outlineVariant}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color={Colors.outlineVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Source tabs */}
      <View style={styles.tabs}>
        {(['recipes', 'ingredients'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {isSearching ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : query && results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={40} color={Colors.outlineVariant} />
          <Text style={styles.emptyText}>No results for &quot;{query}&quot;</Text>
          <Text style={styles.emptySubtext}>Try a different search term.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.sourceType}-${item.id}`}
          renderItem={({ item }) => (
            <FoodResultCard food={item} onAdd={() => openAddModal(item)} onView={() => item.sourceType === 'recipe' && router.push(`/recipe/${item.id}`)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            !query ? (
              <View style={styles.placeholder}>
                <Ionicons name="nutrition-outline" size={48} color={Colors.outlineVariant} />
                <Text style={styles.placeholderTitle}>Search for food</Text>
                <Text style={styles.placeholderText}>
                  Find recipes or ingredients to log to your {selectedMealType}.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Add Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {selectedFood && (
              <>
                <Text style={styles.modalFoodName}>{selectedFood.name}</Text>
                <Text style={styles.modalMeta}>
                  Per {selectedFood.servingSize} {selectedFood.servingUnit}: {selectedFood.calories} kcal
                </Text>

                <View style={styles.modalMacros}>
                  <MacroChip label="Protein" value={Math.round(selectedFood.protein * (parseFloat(servings) || 1))} />
                  <MacroChip label="Carbs" value={Math.round(selectedFood.carbs * (parseFloat(servings) || 1))} />
                  <MacroChip label="Fat" value={Math.round(selectedFood.fat * (parseFloat(servings) || 1))} />
                </View>

                <Text style={styles.servingsLabel}>Servings</Text>
                <View style={styles.servingsRow}>
                  <TouchableOpacity
                    style={styles.servingBtn}
                    onPress={() => setServings((s) => String(Math.max(0.5, (parseFloat(s) || 1) - 0.5)))}
                  >
                    <Ionicons name="remove" size={20} color={Colors.onSurface} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.servingsInput}
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.servingBtn}
                    onPress={() => setServings((s) => String((parseFloat(s) || 1) + 0.5))}
                  >
                    <Ionicons name="add" size={20} color={Colors.onSurface} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.totalCals}>{scaledCals} kcal total</Text>

                <Button
                  label={`Add to ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}`}
                  onPress={handleAddMeal}
                  loading={isAdding}
                  fullWidth
                />
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ScrollableChips({ items, selected, onSelect }: { items: typeof MEAL_TYPES; selected: string; onSelect: (key: string) => void }) {
  return (
    <View style={chipStyles.row}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[chipStyles.chip, selected === item.key && chipStyles.chipActive]}
          onPress={() => onSelect(item.key)}
        >
          <Text style={chipStyles.icon}>{item.icon}</Text>
          <Text style={[chipStyles.label, selected === item.key && chipStyles.labelActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function FoodResultCard({ food, onAdd, onView }: { food: FoodSearchResult; onAdd: () => void; onView: () => void }) {
  return (
    <View style={foodStyles.card}>
      {food.image ? (
        <Image source={{ uri: food.image }} style={foodStyles.image} contentFit="cover" />
      ) : (
        <View style={[foodStyles.image, foodStyles.imagePlaceholder]}>
          <Ionicons name="fast-food-outline" size={20} color={Colors.outlineVariant} />
        </View>
      )}
      <TouchableOpacity style={foodStyles.info} onPress={onView} activeOpacity={food.sourceType === 'recipe' ? 0.7 : 1}>
        <Text style={foodStyles.name} numberOfLines={2}>{food.name}</Text>
        <Text style={foodStyles.meta}>
          {food.calories} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F
        </Text>
        <Text style={foodStyles.serving}>{food.servingSize} {food.servingUnit}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={foodStyles.addBtn} onPress={onAdd}>
        <Ionicons name="add-circle" size={32} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function MacroChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={macroStyles.chip}>
      <Text style={macroStyles.value}>{value}g</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighest,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    paddingVertical: 14,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.surfaceLowest,
    ...Shadow.card,
  },
  tabText: { ...Typography.labelLg, color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  listContent: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxxl, gap: Spacing.sm },
  emptyText: { ...Typography.titleMd, color: Colors.onSurface },
  emptySubtext: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  placeholder: { alignItems: 'center', paddingTop: Spacing.xxxl, gap: Spacing.md },
  placeholderTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  placeholderText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surfaceLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    ...Shadow.modal,
  },
  modalFoodName: { ...Typography.headlineMd, color: Colors.onSurface, marginBottom: Spacing.xs },
  modalMeta: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.lg },
  modalMacros: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  servingsLabel: { ...Typography.labelMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  servingBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsInput: {
    flex: 1,
    ...Typography.headlineMd,
    color: Colors.onSurface,
    textAlign: 'center',
    backgroundColor: Colors.surfaceHighest,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  totalCals: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.lg },
});

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
  },
  chipActive: { backgroundColor: Colors.secondaryContainer },
  icon: { fontSize: 14 },
  label: { ...Typography.labelLg, color: Colors.onSurfaceVariant },
  labelActive: { color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
});

const foodStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.card,
  },
  image: { width: 56, height: 56, borderRadius: Radius.md },
  imagePlaceholder: { backgroundColor: Colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { ...Typography.titleSm, color: Colors.onSurface },
  meta: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  serving: { ...Typography.labelSm, color: Colors.outlineVariant, marginTop: 2 },
  addBtn: { padding: Spacing.xs },
});

const macroStyles = StyleSheet.create({
  chip: { flex: 1, backgroundColor: Colors.surfaceLow, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  value: { ...Typography.titleMd, color: Colors.onSurface },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: 2 },
});
