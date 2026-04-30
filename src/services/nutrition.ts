import { MealDraft } from '@/types/domain';

export type NutritionEstimate = {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  source: string;
  servingSize?: string;
};

type NinjasItem = {
  name?: string;
  calories?: number | string;
  protein_g?: number | string;
  carbohydrates_total_g?: number | string;
  fat_total_g?: number | string;
  serving_size_g?: number;
};

type UsdaFood = {
  description?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: {
    nutrientId?: number;
    nutrientName?: string;
    nutrientNumber?: string;
    unitName?: string;
    value?: number;
  }[];
};

const rounded = (value: number) => Math.max(0, Math.round(value));

const asNumber = (value: number | string | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const portionMultiplier = (query: string) => {
  const value = query.toLowerCase();
  if (value.includes('double')) return 1.7;
  if (value.includes('large')) return 1.4;
  if (value.includes('small')) return 0.75;
  if (value.includes('half')) return 0.5;
  if (value.includes('kids') || value.includes('kid')) return 0.6;
  return 1;
};

const titleFromQuery = (query: string) => query.trim().replace(/\b\w/g, (letter) => letter.toUpperCase());

function fromNinjasItems(query: string, items: NinjasItem[], source: string): NutritionEstimate {
  const multiplier = portionMultiplier(query);
  const totals = items.reduce<{ calories: number; protein: number; carbs: number; fats: number }>(
    (sum, item) => ({
      calories: sum.calories + asNumber(item.calories),
      protein: sum.protein + asNumber(item.protein_g),
      carbs: sum.carbs + asNumber(item.carbohydrates_total_g),
      fats: sum.fats + asNumber(item.fat_total_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  totals.calories = asNumber(totals.calories);
  if (!totals.calories || !totals.protein) {
    throw new Error(`${source} did not return usable calories and protein for this query.`);
  }

  return {
    title: items.map((item) => item.name).filter(Boolean).join(', ') || titleFromQuery(query),
    calories: rounded(totals.calories * multiplier),
    protein: rounded(totals.protein * multiplier),
    carbs: rounded(totals.carbs * multiplier),
    fats: rounded(totals.fats * multiplier),
    ingredients: items.map((item) => item.name ?? '').filter(Boolean),
    source,
    servingSize: items.length === 1 && items[0].serving_size_g ? `${items[0].serving_size_g}g` : undefined,
  };
}

async function estimateWithNinjas(query: string, apiKey: string, host: 'api-ninjas' | 'calorie-ninjas') {
  const baseUrl =
    host === 'api-ninjas'
      ? 'https://api.api-ninjas.com/v1/nutrition'
      : 'https://api.calorieninjas.com/v1/nutrition';
  const response = await fetch(`${baseUrl}?query=${encodeURIComponent(query)}`, {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Nutrition API returned ${response.status}`);
  }

  const payload = await response.json();
  const items: NinjasItem[] = Array.isArray(payload) ? payload : payload.items;
  if (!items?.length) {
    throw new Error('Nutrition API did not return food items.');
  }

  return fromNinjasItems(query, items, host === 'api-ninjas' ? 'API Ninjas Nutrition API' : 'CalorieNinjas Nutrition API');
}

const getUsdaNutrient = (food: UsdaFood, aliases: (string | number)[]) => {
  const nutrient = food.foodNutrients?.find((item) =>
    aliases.some((alias) => {
      if (typeof alias === 'number') return item.nutrientId === alias;
      const haystack = `${item.nutrientName ?? ''} ${item.nutrientNumber ?? ''}`.toLowerCase();
      return haystack.includes(alias.toLowerCase());
    }),
  );
  return nutrient?.value ?? 0;
};

async function estimateWithUsda(query: string) {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(
      query,
    )}&pageSize=5`,
  );

  if (!response.ok) {
    throw new Error(`USDA FoodData Central returned ${response.status}`);
  }

  const payload = await response.json();
  const food: UsdaFood | undefined = payload.foods?.[0];
  if (!food) {
    throw new Error('USDA FoodData Central did not return a matching food.');
  }

  const multiplier = portionMultiplier(query);
  const calories = getUsdaNutrient(food, [1008, 208, 'energy']);
  const protein = getUsdaNutrient(food, [1003, 203, 'protein']);
  const carbs = getUsdaNutrient(food, [1005, 205, 'carbohydrate']);
  const fats = getUsdaNutrient(food, [1004, 204, 'total lipid', 'fat']);
  const servingSize = food.servingSize && food.servingSizeUnit ? `${food.servingSize}${food.servingSizeUnit}` : undefined;

  return {
    title: food.description ? titleFromQuery(food.description.toLowerCase()) : titleFromQuery(query),
    calories: rounded(calories * multiplier),
    protein: rounded(protein * multiplier),
    carbs: rounded(carbs * multiplier),
    fats: rounded(fats * multiplier),
    ingredients: [query],
    source: 'USDA FoodData Central',
    servingSize,
  } satisfies NutritionEstimate;
}

function localEstimate(query: string): NutritionEstimate {
  const lower = query.toLowerCase();
  const match =
    [
      { key: 'cheeseburger', calories: 620, protein: 32, carbs: 42, fats: 36 },
      { key: 'burger', calories: 540, protein: 28, carbs: 40, fats: 30 },
      { key: 'pizza', calories: 310, protein: 14, carbs: 36, fats: 13 },
      { key: 'burrito', calories: 680, protein: 30, carbs: 78, fats: 25 },
      { key: 'pasta', calories: 560, protein: 22, carbs: 82, fats: 16 },
      { key: 'salad', calories: 360, protein: 24, carbs: 22, fats: 20 },
      { key: 'sandwich', calories: 460, protein: 24, carbs: 48, fats: 18 },
      { key: 'soup', calories: 280, protein: 14, carbs: 34, fats: 9 },
      { key: 'yogurt', calories: 220, protein: 20, carbs: 28, fats: 4 },
    ].find((item) => lower.includes(item.key)) ?? { key: query, calories: 450, protein: 24, carbs: 48, fats: 16 };
  const multiplier = portionMultiplier(query);

  return {
    title: titleFromQuery(query),
    calories: rounded(match.calories * multiplier),
    protein: rounded(match.protein * multiplier),
    carbs: rounded(match.carbs * multiplier),
    fats: rounded(match.fats * multiplier),
    ingredients: [query],
    source: 'Local estimate fallback',
  };
}

export async function estimateNutrition(query: string): Promise<NutritionEstimate> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Enter a food description first.');
  }

  const apiNinjasKey = process.env.EXPO_PUBLIC_API_NINJAS_KEY;
  const calorieNinjasKey = process.env.EXPO_PUBLIC_CALORIE_NINJAS_API_KEY;

  if (apiNinjasKey) {
    try {
      return await estimateWithNinjas(trimmed, apiNinjasKey, 'api-ninjas');
    } catch (error) {
      console.warn('API Ninjas estimate failed; trying next nutrition source.', error);
    }
  }

  if (calorieNinjasKey) {
    try {
      return await estimateWithNinjas(trimmed, calorieNinjasKey, 'calorie-ninjas');
    } catch (error) {
      console.warn('CalorieNinjas estimate failed; trying USDA.', error);
    }
  }

  try {
    return await estimateWithUsda(trimmed);
  } catch (error) {
    console.warn('USDA estimate failed; using local fallback.', error);
    return localEstimate(trimmed);
  }
}

export function estimateToMealDraft(estimate: NutritionEstimate, mealType: MealDraft['mealType']): MealDraft {
  return {
    title: estimate.title,
    mealType,
    calories: estimate.calories,
    protein: estimate.protein,
    carbs: estimate.carbs,
    fats: estimate.fats,
    ingredients: estimate.ingredients.join(', '),
  };
}
