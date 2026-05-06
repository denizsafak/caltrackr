import { MealType, PlanDay, Recipe, ShoppingList, UserProfile, WeeklyPlan } from '@/types/domain';

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const todayISO = () => getLocalDateString(new Date());

export const addDaysISO = (start: string, offset: number) => {
  const date = new Date(`${start}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return getLocalDateString(date);
};

export const getCurrentMondayISO = () => {
  const date = new Date();
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const daysToSubtract = day === 0 ? 6 : day - 1;
  return addDaysISO(todayISO(), -daysToSubtract);
};

const planMealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

export const defaultProfile = (uid: string, email: string, name = 'New user'): UserProfile => ({
  id: uid,
  name,
  email,
  role: 'user',
  dailyGoal: 1800,
  macroTargets: { protein: 115, carbs: 220, fats: 60 },
  weightKg: 78,
  targetWeightKg: 70,
  preferences: {
    vegan: false,
    nutAllergy: false,
    intermittentFasting: false,
  },
  allergens: [],
  dietitianId: null,
});

const randomRecipe = (pool: Recipe[], currentRecipeId?: string) => {
  const candidates = pool.filter((recipe) => recipe.id !== currentRecipeId);
  const options = candidates.length ? candidates : pool;
  return options[Math.floor(Math.random() * options.length)];
};

const measuredIngredientPattern = /^\s*(\d+(?:\.\d+)?)\s*g(?:rams?)?\s+(.+?)\s*$/i;

const normalizeShoppingIngredientLabel = (ingredient: string) =>
  ingredient
    .replace(measuredIngredientPattern, '$2')
    .toLowerCase()
    .replace(/[^a-z0-9\s&'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const estimateIngredientGrams = (ingredient: string) => {
  const label = normalizeShoppingIngredientLabel(ingredient);

  if (!label) return 0;
  if (/garlic|ginger|chili|chile|jalapeno|cilantro|parsley|basil|dill|mint|thyme|oregano|cumin|paprika|cinnamon|turmeric|masala|powder|seed|spice|extract/.test(label)) return 5;
  if (/oil|vinegar|sauce|paste|mustard|honey|syrup|jam|dressing/.test(label)) return 20;
  if (/butter|cream|cheese|yogurt|milk|custard/.test(label)) return 60;
  if (/chicken|beef|pork|lamb|turkey|fish|salmon|tuna|cod|shrimp|prawn|crab|meat|tofu|tempeh/.test(label)) return 170;
  if (/bean|lentil|chickpea|edamame/.test(label)) return 150;
  if (/rice|pasta|noodle|orzo|couscous|quinoa|flour|oat/.test(label)) return 75;
  if (/bread|bun|roll|tortilla|pita|pastry|cracker|crumb/.test(label)) return 65;
  if (/potato|sweet potato/.test(label)) return 220;
  if (/apple|banana|mango|pineapple|orange|berries|strawberr|blueberr|fruit/.test(label)) return 100;
  if (/almond|walnut|cashew|peanut|pecan|pistachio|nut/.test(label)) return 25;
  if (/eggs?\b/.test(label)) return 55;
  if (/sugar|chocolate|cocoa/.test(label)) return 30;
  if (/onion|carrot|tomato|pepper|broccoli|cauliflower|cabbage|lettuce|spinach|kale|cucumber|mushroom|corn|peas|asparagus|vegetable|greens/.test(label)) return 100;

  return 80;
};

const ingredientForShopping = (ingredient: string) => {
  const measured = ingredient.match(measuredIngredientPattern);
  const label = normalizeShoppingIngredientLabel(ingredient);
  const grams = measured ? Number(measured[1]) : estimateIngredientGrams(ingredient);

  return {
    label,
    grams: Number.isFinite(grams) ? Math.max(0, Math.round(grams)) : 0,
  };
};

export const buildPlanFromRecipes = (
  recipes: Recipe[],
  id = `week-${todayISO()}`,
  start = todayISO(),
  mealTypes = planMealTypes,
  currentPlan?: WeeklyPlan | null,
): WeeklyPlan => {
  if (!recipes.length) {
    throw new Error('Add recipes to Firestore or fetch live API recipes before generating a weekly plan.');
  }

  const days: PlanDay[] = Array.from({ length: 7 }).map((_, dayIndex) => {
    const date = addDaysISO(start, dayIndex);
    const dateObj = new Date(`${date}T12:00:00`);
    const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObj);
    const meals = mealTypes.map((mealType, mealIndex) => {
      const recipePool = recipes.filter((recipe) => recipe.mealType === mealType);
      const currentMeal = currentPlan?.days[dayIndex]?.meals[mealIndex];
      const recipe = randomRecipe(recipePool.length ? recipePool : recipes, currentMeal?.recipeId);

      return {
        id: `${dayIndex}-${mealType.toLowerCase()}-${recipe.id}`,
        mealType,
        title: recipe.title,
        calories: recipe.calories,
        recipeId: recipe.id,
      };
    });

    return {
      date,
      dayLabel,
      meals,
    };
  });

  return {
    id,
    title: 'Generated weekly meal plan',
    weekStart: start,
    days,
  };
};

export const buildShoppingList = (plan: WeeklyPlan, recipes: Recipe[]): ShoppingList => {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const totals = new Map<string, number>();

  plan.days.forEach((day) => {
    day.meals.forEach((meal) => {
      const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : recipes.find((item) => item.title === meal.title);
      recipe?.ingredients.forEach((ingredient) => {
        const item = ingredientForShopping(ingredient);
        if (!item.label || !item.grams) return;
        totals.set(item.label, (totals.get(item.label) ?? 0) + item.grams);
      });
    });
  });

  return {
    id: `shopping-${plan.id}`,
    title: 'This Week Shopping List',
    createdFromPlanId: plan.id,
    items: Array.from(totals.entries()).map(([label, grams], index) => ({
      id: `${index}-${label.replace(/\s+/g, '-')}`,
      label,
      quantity: `${Math.round(grams)} g`,
      checked: false,
    })),
  };
};
