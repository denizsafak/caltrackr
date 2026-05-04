import { Platform } from 'react-native';
import type { SpoonacularRecipe, FoodSearchResult, DayPlan, PlannedMeal } from '@/types';

const BASE = Platform.OS === 'web'
  ? 'https://corsproxy.io/?' + encodeURIComponent('https://api.spoonacular.com')
  : 'https://api.spoonacular.com';
const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY!;

async function get<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const url = new URL(Platform.OS === 'web' ? `${BASE}${encodeURIComponent(path)}` : `${BASE}${path}`);
  url.searchParams.set('apiKey', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Spoonacular ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Recipe Search ─────────────────────────────────────────────────────────────

export async function searchRecipes(query: string, number = 10): Promise<FoodSearchResult[]> {
  const data = await get<{ results: SpoonacularSearchResult[] }>('/recipes/complexSearch', {
    query,
    number,
    addRecipeNutrition: true,
  });
  return data.results.map(mapSearchResultToFood);
}

interface SpoonacularSearchResult {
  id: number;
  title: string;
  image: string;
  nutrition: {
    nutrients: Array<{ name: string; amount: number; unit: string }>;
  };
}

function nutrientVal(nutrients: Array<{ name: string; amount: number }>, name: string) {
  return Math.round(nutrients.find((n) => n.name === name)?.amount ?? 0);
}

function mapSearchResultToFood(r: SpoonacularSearchResult): FoodSearchResult {
  const n = r.nutrition?.nutrients ?? [];
  return {
    id: r.id,
    name: r.title,
    image: r.image,
    calories: nutrientVal(n, 'Calories'),
    protein: nutrientVal(n, 'Protein'),
    carbs: nutrientVal(n, 'Carbohydrates'),
    fat: nutrientVal(n, 'Fat'),
    servingSize: 1,
    servingUnit: 'serving',
    sourceType: 'recipe',
  };
}

// ─── Ingredient Search ─────────────────────────────────────────────────────────

interface IngredientSearchResult {
  id: number;
  name: string;
  image: string;
}

export async function searchIngredients(query: string, number = 10): Promise<FoodSearchResult[]> {
  const data = await get<{ results: IngredientSearchResult[] }>('/food/ingredients/search', {
    query,
    number,
    metaInformation: true,
  });
  const details = await Promise.all(data.results.slice(0, number).map((r) => getIngredientInfo(r.id)));
  return details;
}

async function getIngredientInfo(id: number): Promise<FoodSearchResult> {
  interface IngredientInfo {
    id: number;
    name: string;
    image: string;
    nutrition: {
      nutrients: Array<{ name: string; amount: number }>;
    };
  }
  const r = await get<IngredientInfo>(`/food/ingredients/${id}/information`, {
    amount: 100,
    unit: 'g',
  });
  const n = r.nutrition?.nutrients ?? [];
  return {
    id: r.id,
    name: r.name,
    image: `https://spoonacular.com/cdn/ingredients_100x100/${r.image}`,
    calories: nutrientVal(n, 'Calories'),
    protein: nutrientVal(n, 'Protein'),
    carbs: nutrientVal(n, 'Carbohydrates'),
    fat: nutrientVal(n, 'Fat'),
    servingSize: 100,
    servingUnit: 'g',
    sourceType: 'ingredient',
  };
}

// ─── Recipe by Ingredients ─────────────────────────────────────────────────────

interface FindByIngredientResult {
  id: number;
  title: string;
  image: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
}

export async function findRecipesByIngredients(
  ingredients: string[],
  number = 12
): Promise<SpoonacularRecipe[]> {
  const results = await get<FindByIngredientResult[]>('/recipes/findByIngredients', {
    ingredients: ingredients.join(','),
    number,
    ranking: 1,
    ignorePantry: true,
  });

  const detailedRecipes = await Promise.all(
    results.map((r) =>
      getRecipeDetails(r.id).then((detail) => ({
        ...detail,
        usedIngredientCount: r.usedIngredientCount,
        missedIngredientCount: r.missedIngredientCount,
      }))
    )
  );
  return detailedRecipes;
}

// ─── Recipe Details ────────────────────────────────────────────────────────────

interface RecipeInfoResponse {
  id: number;
  title: string;
  image: string;
  imageType: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  instructions: string;
  extendedIngredients: Array<{
    id: number;
    name: string;
    original: string;
    amount: number;
    unit: string;
    image: string;
  }>;
  nutrition?: {
    nutrients: Array<{ name: string; amount: number; unit: string; percentOfDailyNeeds: number }>;
  };
  analyzedInstructions?: Array<{
    steps: Array<{ number: number; step: string }>;
  }>;
}

export async function getRecipeDetails(id: number): Promise<SpoonacularRecipe> {
  const r = await get<RecipeInfoResponse>(`/recipes/${id}/information`, {
    includeNutrition: true,
  });
  const n = r.nutrition?.nutrients ?? [];
  return {
    id: r.id,
    title: r.title,
    image: r.image,
    imageType: r.imageType,
    readyInMinutes: r.readyInMinutes,
    servings: r.servings,
    calories: nutrientVal(n, 'Calories'),
    protein: nutrientVal(n, 'Protein'),
    carbs: nutrientVal(n, 'Carbohydrates'),
    fat: nutrientVal(n, 'Fat'),
    summary: r.summary?.replace(/<[^>]*>/g, '') ?? '',
    instructions: r.analyzedInstructions?.[0]?.steps.map((s) => s.step) as unknown as string ?? r.instructions,
    extendedIngredients: r.extendedIngredients?.map((i) => ({
      id: i.id,
      name: i.name,
      original: i.original,
      amount: i.amount,
      unit: i.unit,
      image: `https://spoonacular.com/cdn/ingredients_100x100/${i.image}`,
    })),
    nutrition: r.nutrition,
  };
}

// ─── Meal Plan Generation ──────────────────────────────────────────────────────

interface MealPlanResponse {
  week: Record<
    string,
    {
      meals: Array<{
        id: number;
        title: string;
        readyInMinutes: number;
        servings: number;
        imageType: string;
      }>;
      nutrients: { calories: number; protein: number; fat: number; carbohydrates: number };
    }
  >;
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export async function generateWeeklyMealPlan(
  targetCalories: number,
  diet?: string,
  exclude?: string[],
  weekStartDate?: Date
): Promise<DayPlan[]> {
  const params: Record<string, string | number | boolean> = {
    timeFrame: 'week',
    targetCalories,
  };
  if (diet) params.diet = diet;
  if (exclude?.length) params.exclude = exclude.join(',');

  let data;
  try {
    data = await get<MealPlanResponse>('/mealplanner/generate', params);
  } catch (error: any) {
    const is502Error = error.message && (error.message.includes('502') || error.message.includes('Failed to fetch'));
    if (is502Error && diet) {
      console.warn('Spoonacular API returned 502 or CORS error with diet param, trying without diet fallback...');
      delete params.diet;
      data = await get<MealPlanResponse>('/mealplanner/generate', params);
    } else {
      throw error;
    }
  }

  const start = weekStartDate ?? getMonday(new Date());

  return DAY_ORDER.map((dayKey, i) => {
    const dayData = data.week[dayKey];
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const meals = dayData?.meals ?? [];

    const planned: PlannedMeal[] = meals.map((m) => ({
      id: m.id,
      title: m.title,
      calories: Math.round((dayData.nutrients.calories ?? 0) / 3),
      image: `https://spoonacular.com/recipeImages/${m.id}-312x231.${m.imageType ?? 'jpg'}`,
      readyInMinutes: m.readyInMinutes,
      servings: m.servings,
    }));

    return {
      date: dateStr,
      dayName: DAY_LABELS[i],
      meals: {
        breakfast: planned[0] ?? null,
        lunch: planned[1] ?? null,
        dinner: planned[2] ?? null,
      },
      totalCalories: Math.round(dayData?.nutrients.calories ?? 0),
      totalProtein: Math.round(dayData?.nutrients.protein ?? 0),
      totalCarbs: Math.round(dayData?.nutrients.carbohydrates ?? 0),
      totalFat: Math.round(dayData?.nutrients.fat ?? 0),
    };
  });
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
