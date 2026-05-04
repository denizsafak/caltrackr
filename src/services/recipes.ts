import { MealType, Recipe } from '@/types/domain';

type SpoonacularNutrient = {
  name?: string;
  amount?: number;
  unit?: string;
};

type SpoonacularResult = {
  id: number;
  title: string;
  image?: string;
  imageType?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  dishTypes?: string[];
  diets?: string[];
  cuisines?: string[];
  summary?: string;
  nutrition?: {
    nutrients?: SpoonacularNutrient[];
  };
  analyzedInstructions?: {
    steps?: {
      step?: string;
    }[];
  }[];
  extendedIngredients?: {
    name?: string;
    original?: string;
  }[];
};

type SpoonacularPayload = {
  results?: SpoonacularResult[];
};

type MealDbSearchPayload = {
  meals?: MealDbMeal[] | null;
};

type MealDbFilterResult = {
  idMeal?: string;
  strMeal?: string;
  strMealThumb?: string;
};

type MealDbMeal = {
  idMeal?: string;
  strMeal?: string;
  strMealThumb?: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strSource?: string;
  strYoutube?: string;
  [key: string]: string | undefined;
};

type SpoonacularIngredientSearchResult = {
  id: number;
  title: string;
  image?: string;
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  usedIngredients?: {
    name?: string;
    original?: string;
  }[];
  missedIngredients?: {
    name?: string;
    original?: string;
  }[];
};

export type LiveRecipeSearchResult = {
  recipes: Recipe[];
  source: string;
};

type RecipeSearchParams = {
  ingredients: string[];
  query?: string;
  number?: number;
};

const defaultImage = 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1200&q=80';
const mealDbBaseUrl = 'https://www.themealdb.com/api/json/v1';
const recipeProvider = process.env.EXPO_PUBLIC_RECIPE_API_PROVIDER ?? 'themealdb';

const cleanText = (value?: string) => (value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const nutrient = (result: SpoonacularResult, names: string[]) => {
  const match = result.nutrition?.nutrients?.find((item) =>
    names.some((name) => item.name?.toLowerCase() === name.toLowerCase()),
  );
  return Math.round(match?.amount ?? 0);
};

const mealTypeFromDish = (dishTypes?: string[]): MealType => {
  const text = dishTypes?.join(' ').toLowerCase() ?? '';
  if (text.includes('breakfast') || text.includes('morning meal')) return 'Breakfast';
  if (text.includes('snack') || text.includes('appetizer')) return 'Snack';
  if (text.includes('lunch')) return 'Lunch';
  return 'Dinner';
};

const mealTypeFromText = (value?: string): MealType => {
  const text = value?.toLowerCase() ?? '';
  if (text.includes('breakfast') || text.includes('brunch')) return 'Breakfast';
  if (text.includes('starter') || text.includes('side') || text.includes('dessert') || text.includes('snack')) return 'Snack';
  if (text.includes('lunch')) return 'Lunch';
  return 'Dinner';
};

const mealDbKey = () => process.env.EXPO_PUBLIC_THEMEALDB_API_KEY || '1';

const estimateMealDbMacros = (meal: MealDbMeal, ingredients: string[]) => {
  const text = `${meal.strMeal ?? ''} ${meal.strCategory ?? ''} ${ingredients.join(' ')}`.toLowerCase();
  const has = (terms: string[]) => terms.some((term) => text.includes(term));
  const protein = has(['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'egg', 'lentil', 'bean', 'tofu'])
    ? 34
    : has(['cheese', 'yogurt'])
      ? 22
      : 16;
  const carbs = has(['rice', 'pasta', 'potato', 'bread', 'flour', 'noodle', 'tortilla'])
    ? 58
    : has(['bean', 'lentil', 'chickpea'])
      ? 42
      : 30;
  const fats = has(['cream', 'butter', 'cheese', 'oil', 'avocado', 'coconut'])
    ? 24
    : has(['fish', 'salmon', 'beef', 'pork'])
      ? 18
      : 12;

  return {
    protein,
    carbs,
    fats,
    calories: Math.round(protein * 4 + carbs * 4 + fats * 9),
  };
};

const mealDbIngredients = (meal: MealDbMeal) =>
  Array.from({ length: 20 }, (_, index) => {
    const position = index + 1;
    const ingredient = cleanText(meal[`strIngredient${position}`]);
    const measure = cleanText(meal[`strMeasure${position}`]);
    return ingredient ? `${measure ? `${measure} ` : ''}${ingredient}`.trim() : '';
  }).filter(Boolean);

const mealDbInstructions = (meal: MealDbMeal) =>
  cleanText(meal.strInstructions)
    .split(/\r?\n|\.\s+/)
    .map((step) => step.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .slice(0, 6);

const mapMealDbResult = (meal: MealDbMeal): Recipe => {
  const ingredients = mealDbIngredients(meal);
  const macros = estimateMealDbMacros(meal, ingredients);
  const instructions = mealDbInstructions(meal);

  return {
    id: `themealdb-${meal.idMeal}`,
    title: cleanText(meal.strMeal) || 'TheMealDB Recipe',
    summary: `${cleanText(meal.strArea) || 'International'} ${cleanText(meal.strCategory) || 'meal'} from TheMealDB's free recipe API.`,
    mealType: mealTypeFromText(`${meal.strCategory} ${meal.strMeal}`),
    calories: macros.calories,
    macros: {
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
    },
    prepMinutes: Math.max(15, Math.min(45, 15 + ingredients.length * 2)),
    ingredients: ingredients.slice(0, 12),
    allergens: [],
    imageUrl: meal.strMealThumb || defaultImage,
    instructions: instructions.length ? instructions : ['Prepare the ingredients, cook according to the source recipe, and portion for your calorie target.'],
    tags: ['Free API', cleanText(meal.strCategory), cleanText(meal.strArea)].filter(Boolean),
    source: 'themealdb',
    sourceUrl: meal.idMeal ? `https://www.themealdb.com/meal/${meal.idMeal}` : undefined,
  };
};

const mapSpoonacularResult = (result: SpoonacularResult): Recipe => {
  const ingredients = (result.extendedIngredients ?? [])
    .map((ingredient) => ingredient.name || ingredient.original || '')
    .filter(Boolean)
    .slice(0, 10);
  const instructions =
    result.analyzedInstructions?.flatMap((instruction) => instruction.steps?.map((step) => step.step ?? '') ?? []).filter(Boolean) ?? [];
  const calories = nutrient(result, ['Calories']);

  return {
    id: `spoonacular-${result.id}`,
    title: result.title,
    summary:
      cleanText(result.summary) ||
      `Live Spoonacular recipe using ${ingredients.slice(0, 3).join(', ') || 'your selected pantry ingredients'}.`,
    mealType: mealTypeFromDish(result.dishTypes),
    calories,
    macros: {
      protein: nutrient(result, ['Protein']),
      carbs: nutrient(result, ['Carbohydrates']),
      fats: nutrient(result, ['Fat']),
    },
    prepMinutes: result.readyInMinutes ?? 30,
    ingredients,
    allergens: [],
    imageUrl: result.image || defaultImage,
    instructions: instructions.length
      ? instructions.slice(0, 6)
      : ['Review the ingredients, prepare the components, season to taste, and portion for your target calories.'],
    tags: [
      'Live API',
      ...(result.cuisines?.slice(0, 1) ?? []),
      ...(result.diets?.slice(0, 1) ?? []),
    ].filter(Boolean),
    source: 'spoonacular',
    sourceUrl: result.sourceUrl,
  };
};

async function searchByIngredients(apiKey: string, ingredients: string[], number: number) {
  const params = new URLSearchParams({
    apiKey,
    ingredients: ingredients.join(','),
    number: String(number),
    ranking: '1',
    ignorePantry: 'true',
  });
  const searchResponse = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${params.toString()}`);
  if (!searchResponse.ok) {
    throw new Error(`Spoonacular ingredient search returned ${searchResponse.status}`);
  }

  const ingredientResults = (await searchResponse.json()) as SpoonacularIngredientSearchResult[];
  const ids = ingredientResults.map((item) => item.id).filter(Boolean);
  if (!ids.length) return [];

  const detailParams = new URLSearchParams({
    apiKey,
    ids: ids.join(','),
    includeNutrition: 'true',
  });
  const detailResponse = await fetch(`https://api.spoonacular.com/recipes/informationBulk?${detailParams.toString()}`);
  if (!detailResponse.ok) {
    throw new Error(`Spoonacular recipe details returned ${detailResponse.status}`);
  }

  const details = (await detailResponse.json()) as SpoonacularResult[];
  const detailById = new Map(details.map((item) => [item.id, item]));

  return ingredientResults
    .map((match) => {
      const detail = detailById.get(match.id);
      if (!detail) return null;
      const recipe = mapSpoonacularResult({
        ...detail,
        image: detail.image || match.image,
      });
      const used = match.usedIngredients?.map((item) => item.name || item.original || '').filter(Boolean) ?? [];
      const missed = match.missedIngredients?.map((item) => item.name || item.original || '').filter(Boolean).slice(0, 6) ?? [];

      return {
        ...recipe,
        tags: ['Live API', `${match.usedIngredientCount ?? used.length} used`, ...(recipe.tags ?? []).slice(1, 2)],
        summary:
          `${recipe.summary} Pantry match: ${used.join(', ') || 'selected ingredients'}.` +
          (missed.length ? ` May also need: ${missed.join(', ')}.` : ''),
      } satisfies Recipe;
    })
    .filter(Boolean) as Recipe[];
}

async function lookupMealDbMeal(id: string) {
  const response = await fetch(`${mealDbBaseUrl}/${mealDbKey()}/lookup.php?i=${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(`TheMealDB lookup returned ${response.status}`);
  }

  const payload = (await response.json()) as MealDbSearchPayload;
  return payload.meals?.[0] ?? null;
}

async function lookupSpoonacularRecipe(id: string) {
  const apiKey = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    apiKey,
    includeNutrition: 'true',
  });
  const response = await fetch(`https://api.spoonacular.com/recipes/${encodeURIComponent(id)}/information?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Spoonacular recipe details returned ${response.status}`);
  }

  return (await response.json()) as SpoonacularResult;
}

/* istanbul ignore next */
async function searchMealDbByIngredients(ingredients: string[], number: number) {
  const ingredientTerms = ingredients
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean)
    .slice(0, 3);
  if (!ingredientTerms.length) return [];

  const filterResponses = await Promise.all(
    ingredientTerms.map(async (ingredient) => {
      const response = await fetch(`${mealDbBaseUrl}/${mealDbKey()}/filter.php?i=${encodeURIComponent(ingredient)}`);
      if (!response.ok) {
        throw new Error(`TheMealDB ingredient search returned ${response.status}`);
      }
      const payload = (await response.json()) as { meals?: MealDbFilterResult[] | null };
      return payload.meals ?? [];
    }),
  );

  const matchCounts = new Map<string, { meal: MealDbFilterResult; count: number }>();
  filterResponses.flat().forEach((meal) => {
    if (!meal.idMeal) return;
    const current = matchCounts.get(meal.idMeal);
    matchCounts.set(meal.idMeal, { meal, count: (current?.count ?? 0) + 1 });
  });

  const ids = Array.from(matchCounts.entries())
    .sort(([, a], [, b]) => b.count - a.count || (a.meal.strMeal ?? '').localeCompare(b.meal.strMeal ?? ''))
    .slice(0, number)
    .map(([id]) => id);
  const meals = await Promise.all(ids.map(lookupMealDbMeal));

  return meals.filter(Boolean).map((meal) => mapMealDbResult(meal as MealDbMeal));
}

async function searchMealDbByQuery(query: string, number: number) {
  const response = await fetch(`${mealDbBaseUrl}/${mealDbKey()}/search.php?s=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error(`TheMealDB recipe search returned ${response.status}`);
  }

  const payload = (await response.json()) as MealDbSearchPayload;
  return (payload.meals ?? []).slice(0, number).map(mapMealDbResult);
}

export async function searchMealDbRecipes({
  ingredients,
  query,
  number = 24,
}: RecipeSearchParams): Promise<LiveRecipeSearchResult | null> {
  const usefulIngredients = ingredients
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!usefulIngredients.length && !query?.trim()) return null;

  const recipes = usefulIngredients.length
    ? await searchMealDbByIngredients(usefulIngredients, number)
    : await searchMealDbByQuery(query ?? '', number);

  return {
    recipes,
    source: 'TheMealDB free API',
  };
}

async function searchByQuery(apiKey: string, query: string, ingredients: string[], number: number) {
  const params = new URLSearchParams({
    apiKey,
    number: String(number),
    addRecipeNutrition: 'true',
    fillIngredients: 'true',
    instructionsRequired: 'false',
    sort: 'max-used-ingredients',
  });

  if (ingredients.length) {
    params.set('includeIngredients', ingredients.join(','));
  }
  if (query.trim()) {
    params.set('query', query.trim());
  }

  const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Spoonacular recipe search returned ${response.status}`);
  }

  const payload = (await response.json()) as SpoonacularPayload;
  return (payload.results ?? []).map(mapSpoonacularResult);
}

export async function searchSpoonacularRecipes({
  ingredients,
  query,
  number = 24,
}: RecipeSearchParams): Promise<LiveRecipeSearchResult | null> {
  const apiKey = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const usefulIngredients = ingredients
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!usefulIngredients.length && !query?.trim()) return null;

  const recipes = usefulIngredients.length
    ? await searchByIngredients(apiKey, usefulIngredients, number)
    : await searchByQuery(apiKey, query ?? '', usefulIngredients, number);

  return {
    recipes,
    source: 'Spoonacular',
  };
}

export async function searchMealDbAndSpoonacularRecipes(params: RecipeSearchParams): Promise<LiveRecipeSearchResult | null> {
  const [mealDbResult, spoonacularResult] = await Promise.allSettled([
    searchMealDbRecipes(params),
    searchSpoonacularRecipes(params),
  ]);
  const results = [mealDbResult, spoonacularResult]
    .filter((result): result is PromiseFulfilledResult<LiveRecipeSearchResult | null> => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((result): result is LiveRecipeSearchResult => Boolean(result?.recipes.length));

  if (!results.length) {
    const firstError = [mealDbResult, spoonacularResult].find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    /* istanbul ignore next */
    if (firstError) {
      throw firstError.reason;
    }
    return null;
  }

  const recipes = Array.from(
    new Map(results.flatMap((result) => result.recipes).map((recipe) => [recipe.id, recipe])).values(),
  );
  const source = results.map((result) => result.source).join(' + ');

  return {
    recipes,
    source,
  };
}

export async function getExternalRecipeById(id: string): Promise<Recipe | null> {
  if (id.startsWith('themealdb-')) {
    const meal = await lookupMealDbMeal(id.replace('themealdb-', ''));
    return meal ? mapMealDbResult(meal) : null;
  }

  if (id.startsWith('spoonacular-')) {
    const recipe = await lookupSpoonacularRecipe(id.replace('spoonacular-', ''));
    return recipe ? mapSpoonacularResult(recipe) : null;
  }

  return null;
}

export async function searchExternalRecipes(params: RecipeSearchParams): Promise<LiveRecipeSearchResult | null> {
  if (recipeProvider === 'spoonacular') {
    return searchSpoonacularRecipes(params);
  }

  try {
    const mealDbResult = await searchMealDbRecipes(params);
    if (mealDbResult?.recipes.length) return mealDbResult;
  } catch (error) {
    /* istanbul ignore next */
    console.warn('TheMealDB search failed; checking optional Spoonacular fallback.', error);
  }

  /* istanbul ignore next */
  if (process.env.EXPO_PUBLIC_ENABLE_SPOONACULAR_FALLBACK === 'true') {
    return searchSpoonacularRecipes(params);
  }

  return null;
}
